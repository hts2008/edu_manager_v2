import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { templatesService } from "../services/api";
import { useToast } from "../components/ui/Toast";

const PAPER_SIZES = {
  a4: { width: 210, height: 297, label: "A4" },
  a5: { width: 148, height: 210, label: "A5" },
  letter: { width: 216, height: 279, label: "Letter" },
  thermal_80mm: { width: 80, height: 200, label: "Thermal 80mm" },
};

const BINDING_FIELDS = [
  { field: "receipt_id", label: "Mã phiếu" },
  { field: "receipt_date", label: "Ngày thu" },
  { field: "student_name", label: "Tên học viên" },
  { field: "class_name", label: "Tên lớp" },
  { field: "total_amount", label: "Số tiền" },
  { field: "amount_in_words", label: "Số tiền bằng chữ" },
  { field: "month", label: "Tháng" },
  { field: "payment_method", label: "Phương thức" },
  { field: "parent_name", label: "Tên phụ huynh" },
  { field: "center_name", label: "Tên trung tâm" },
];

const CUSTOM_JSON_PROPS = [
  "customType",
  "bindingField",
  "bindingLabel",
  "imageUrl",
  "excludeFromExport",
  "lockMovementX",
  "lockMovementY",
  "lockScalingX",
  "lockScalingY",
  "lockRotation",
];

const mmToPx = (mm) => Math.round(mm * 3.7795275591);

const countExportableObjects = (canvas) =>
  canvas?.getObjects().filter((object) => !object.excludeFromExport).length || 0;

const getTemplateFromResponse = (response) =>
  response?.data?.template || response?.data || null;

const parseTemplateConfig = (jsonConfig) => {
  if (!jsonConfig) return null;
  if (typeof jsonConfig === "string") return JSON.parse(jsonConfig);
  return jsonConfig;
};

const getObjectLabel = (object) => {
  if (!object) return "Chua chon";
  if (object.bindingField) return `Field: ${object.bindingField}`;
  if (object.customType === "background_image") return "Background image";
  if (object.customType === "image" || object.type === "image") return "Image";
  if (object.customType === "heading") return "Heading";
  if (object.customType === "qr_placeholder") return "QR";
  if (object.type === "rect") return "Rectangle";
  if (object.type === "circle") return "Circle";
  if (object.type === "line") return "Line";
  if (object.type === "textbox") return "Text";
  return object.customType || object.type || "Object";
};

const getStatusTone = (type) => {
  if (type === "error") return "border-red-200 bg-red-50 text-red-700";
  if (type === "loading") return "border-blue-200 bg-blue-50 text-blue-700";
  if (type === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-white text-slate-600";
};

export default function TemplateDesignerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const canvasElRef = useRef(null);
  const canvasRef = useRef(null);
  const fabricModuleRef = useRef(null);
  const imageInputRef = useRef(null);
  const imageUploadModeRef = useRef("object");
  const keyboardCleanupRef = useRef(null);
  const historyRef = useRef([]);
  const redoRef = useRef([]);
  const restoringRef = useRef(false);
  const newObjectOffsetRef = useRef(0);

  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedObject, setSelectedObject] = useState(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [canvasError, setCanvasError] = useState("");
  const [canvasObjectCount, setCanvasObjectCount] = useState(0);
  const [uploadState, setUploadState] = useState({
    status: "idle",
    message: "",
  });
  const [designerNotice, setDesignerNotice] = useState("");
  const [zoom, setZoom] = useState(1);
  const [, setSelectionVersion] = useState(0);

  useEffect(() => {
    if (id) {
      loadTemplate();
    } else {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (loading) return undefined;

    keyboardCleanupRef.current?.();
    keyboardCleanupRef.current = null;
    canvasRef.current?.dispose();
    canvasRef.current = null;
    setCanvasReady(false);
    setCanvasError("");
    setCanvasObjectCount(0);
    historyRef.current = [];
    redoRef.current = [];
    newObjectOffsetRef.current = 0;
    initCanvas();

    return () => {
      keyboardCleanupRef.current?.();
      keyboardCleanupRef.current = null;
      canvasRef.current?.dispose();
      canvasRef.current = null;
    };
  }, [loading, template?.id]);

  const getFabric = async () => {
    if (!fabricModuleRef.current) {
      fabricModuleRef.current = await import("fabric");
    }
    return fabricModuleRef.current;
  };

  const refreshSelection = () => {
    const canvas = canvasRef.current;
    setSelectedObject(canvas?.getActiveObject() || null);
    setCanvasObjectCount(countExportableObjects(canvas));
    setSelectionVersion((value) => value + 1);
  };

  const loadTemplate = async () => {
    setLoading(true);
    try {
      const response = await templatesService.getById(id);
      if (response.success) {
        setTemplate(getTemplateFromResponse(response));
      } else {
      toast.error("Không tải được mẫu in.");
    }
    } catch (error) {
      const message = error?.message || "Khong tai duoc mau in.";
      setDesignerNotice(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const captureHistory = () => {
    if (restoringRef.current || !canvasRef.current) return;
    const snapshot = canvasRef.current.toJSON(CUSTOM_JSON_PROPS);
    snapshot.objects = (snapshot.objects || []).filter((object) => !object.excludeFromExport);
    historyRef.current = [...historyRef.current.slice(-30), snapshot];
    redoRef.current = [];
  };

  const initCanvas = async () => {
    setCanvasReady(false);
    setCanvasError("");
    const fabric = await getFabric();
    const FabricCanvas = fabric.Canvas || fabric.default?.Canvas;
    if (!FabricCanvas || !canvasElRef.current) {
      setCanvasError("Khong khoi tao duoc canvas.");
      setDesignerNotice("Khong khoi tao duoc canvas.");
      toast.error("Không khởi tạo được Fabric canvas.");
      return;
    }

    const paperSize = PAPER_SIZES[template?.paper_size || "a4"];
    const isLandscape = template?.orientation === "landscape";
    const width = mmToPx(isLandscape ? paperSize.height : paperSize.width);
    const height = mmToPx(isLandscape ? paperSize.width : paperSize.height);

    const canvas = new FabricCanvas(canvasElRef.current, {
      width,
      height,
      backgroundColor: "#ffffff",
      selection: true,
      preserveObjectStacking: true,
    });

    canvasRef.current = canvas;
    canvas.on("selection:created", refreshSelection);
    canvas.on("selection:updated", refreshSelection);
    canvas.on("selection:cleared", refreshSelection);
    canvas.on("object:modified", refreshSelection);
    canvas.on("object:added", captureHistory);
    canvas.on("object:modified", captureHistory);
    canvas.on("object:removed", captureHistory);

    if (template?.json_config) {
      try {
        await canvas.loadFromJSON(parseTemplateConfig(template.json_config));
        canvas.backgroundColor = "#ffffff";
      } catch {
        setDesignerNotice("JSON mau in loi, da mo scaffold mac dinh.");
        toast.error("JSON mẫu in lỗi, đã mở canvas trống.");
      }
    }

    const hasObjects = canvas.getObjects().some((object) => !object.excludeFromExport);
    if (!hasObjects) {
      await createDefaultTemplate(fabric, canvas, width, height);
    }

    drawGrid(canvas, width, height, fabric);
    canvas.renderAll();
    setCanvasReady(true);
    setDesignerNotice((current) => current || "Canvas san sang.");
    refreshSelection();
    captureHistory();

    const handleKeyDown = (event) => {
      const activeObject = canvas.getActiveObject();
      if ((event.key === "Delete" || event.key === "Backspace") && activeObject) {
        if (!activeObject.isEditing) {
          canvas.remove(activeObject);
          canvas.renderAll();
          refreshSelection();
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelected();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    keyboardCleanupRef.current = () => document.removeEventListener("keydown", handleKeyDown);
  };

  const createDefaultTemplate = async (fabric, canvas, width, height) => {
    const Textbox = fabric.Textbox || fabric.default?.Textbox;
    const Line = fabric.Line || fabric.default?.Line;
    const Rect = fabric.Rect || fabric.default?.Rect;
    if (!Textbox || !Line || !Rect) return;

    const centerX = width / 2;
    const addText = (text, options = {}) => {
      const item = new Textbox(text, {
        left: 56,
        top: 56,
        width: width - 112,
        fontSize: 16,
        fontFamily: "Arial",
        fill: "#0f172a",
        ...options,
      });
      canvas.add(item);
      return item;
    };

    canvas.add(new Rect({
      left: 28,
      top: 28,
      width: width - 56,
      height: Math.min(height - 56, 520),
      fill: "rgba(255,255,255,0)",
      stroke: "#e2e8f0",
      strokeWidth: 1,
      rx: 14,
      ry: 14,
      customType: "shape",
    }));
    addText(template?.type === "payment" ? "PHIẾU CHI" : "PHIẾU THU", {
      top: 56,
      fontSize: 28,
      fontWeight: "bold",
      textAlign: "center",
      customType: "heading",
    });
    addText("Mã phiếu: {{receipt_id}}", { top: 120, bindingField: "receipt_id", bindingLabel: "Mã phiếu", customType: "binding" });
    addText("Ngày: {{receipt_date}}", { top: 150, bindingField: "receipt_date", bindingLabel: "Ngày thu", customType: "binding" });
    addText("Học viên: {{student_name}}", { top: 190, fontSize: 18, bindingField: "student_name", bindingLabel: "Tên học viên", customType: "binding" });
    addText("Lớp: {{class_name}}", { top: 225, bindingField: "class_name", bindingLabel: "Tên lớp", customType: "binding" });
    addText("Số tiền: {{total_amount}}", { top: 260, fontSize: 18, fontWeight: "bold", bindingField: "total_amount", bindingLabel: "Số tiền", customType: "binding" });
    addText("Bằng chữ: {{amount_in_words}}", { top: 295, bindingField: "amount_in_words", bindingLabel: "Số tiền bằng chữ", customType: "binding" });
    addText("Nội dung: Học phí tháng {{month}}", { top: 330, bindingField: "month", bindingLabel: "Tháng", customType: "binding" });
    canvas.add(new Line([56, 390, width - 56, 390], { stroke: "#cbd5e1", strokeWidth: 1, customType: "line" }));
    addText("Người lập phiếu", { left: 80, top: 420, width: 180, textAlign: "center", fontWeight: "bold", customType: "text" });
    addText("Người nộp tiền", { left: width - 260, top: 420, width: 180, textAlign: "center", fontWeight: "bold", customType: "text" });
    canvas.setActiveObject(addText("EduManager V2", {
      left: centerX - 80,
      top: 500,
      width: 160,
      fontSize: 12,
      fill: "#64748b",
      textAlign: "center",
      customType: "text",
    }));
  };

  const drawGrid = (canvas, width, height, fabric) => {
    const Line = fabric.Line || fabric.default?.Line;
    if (!Line) return;

    const gridSize = 20;
    for (let x = 0; x <= width; x += gridSize) {
      const line = new Line([x, 0, x, height], {
        stroke: "#e2e8f0",
        strokeWidth: x % 100 === 0 ? 1.2 : 0.6,
        selectable: false,
        evented: false,
        excludeFromExport: true,
      });
      canvas.add(line);
      canvas.sendObjectToBack(line);
    }

    for (let y = 0; y <= height; y += gridSize) {
      const line = new Line([0, y, width, y], {
        stroke: "#e2e8f0",
        strokeWidth: y % 100 === 0 ? 1.2 : 0.6,
        selectable: false,
        evented: false,
        excludeFromExport: true,
      });
      canvas.add(line);
      canvas.sendObjectToBack(line);
    }
  };

  const addObjectToCanvas = (object, label, options = {}) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setDesignerNotice("Canvas chua san sang.");
      return;
    }

    if (!options.preservePlacement) {
      const offset = newObjectOffsetRef.current;
      const objectWidth =
        typeof object.getScaledWidth === "function" ? object.getScaledWidth() : object.width || 160;
      const objectHeight =
        typeof object.getScaledHeight === "function" ? object.getScaledHeight() : object.height || 40;
      const maxLeft = Math.max(32, canvas.getWidth() - objectWidth - 32);
      const maxTop = Math.max(32, canvas.getHeight() - objectHeight - 32);
      const left = Math.min(maxLeft, Math.max(32, (canvas.getWidth() - objectWidth) / 2 + offset));
      const top = Math.min(maxTop, Math.max(32, (canvas.getHeight() - objectHeight) / 3 + offset));
      object.set({ left, top });
      newObjectOffsetRef.current = (offset + 28) % 140;
    }

    canvas.add(object);
    if (options.background) {
      canvas.sendObjectToBack(object);
    } else {
      canvas.bringObjectToFront(object);
    }
    canvas.setActiveObject(object);
    canvas.renderAll();
    setDesignerNotice(`Da them ${label}.`);
    refreshSelection();
  };

  const addTextObject = async (text, options = {}) => {
    const fabric = await getFabric();
    const Textbox = fabric.Textbox || fabric.default?.Textbox;
    const textbox = new Textbox(text, {
      left: 56,
      top: 56,
      width: 240,
      fontSize: 16,
      fontFamily: "Arial",
      fill: "#0f172a",
      ...options,
    });

    addObjectToCanvas(textbox, options.bindingField ? `field ${options.bindingField}` : getObjectLabel(textbox));
  };

  const addHeading = () =>
    addTextObject("TIÊU ĐỀ", {
      width: 340,
      fontSize: 26,
      fontWeight: "bold",
      textAlign: "center",
      customType: "heading",
    });

  const addText = () => addTextObject("Nhập nội dung...", { customType: "text" });

  const addBindingField = (fieldName, label) =>
    addTextObject(`{{${fieldName}}}`, {
      fill: "#1d4ed8",
      backgroundColor: "#dbeafe",
      customType: "binding",
      bindingField: fieldName,
      bindingLabel: label,
    });

  const addRectangle = async () => {
    const fabric = await getFabric();
    const Rect = fabric.Rect || fabric.default?.Rect;
    const rect = new Rect({
      left: 60,
      top: 70,
      width: 220,
      height: 110,
      rx: 8,
      ry: 8,
      fill: "rgba(255,255,255,0)",
      stroke: "#334155",
      strokeWidth: 1,
      customType: "shape",
    });

    addObjectToCanvas(rect, "rectangle");
  };

  const addCircle = async () => {
    const fabric = await getFabric();
    const Circle = fabric.Circle || fabric.default?.Circle;
    const circle = new Circle({
      left: 80,
      top: 80,
      radius: 48,
      fill: "rgba(219,234,254,0.55)",
      stroke: "#2563eb",
      strokeWidth: 1,
      customType: "shape",
    });

    addObjectToCanvas(circle, "circle");
  };

  const addLine = async () => {
    const fabric = await getFabric();
    const Line = fabric.Line || fabric.default?.Line;
    const line = new Line([60, 80, 320, 80], {
      stroke: "#334155",
      strokeWidth: 1.5,
      customType: "line",
    });

    addObjectToCanvas(line, "line");
  };

  const addQrPlaceholder = async () => {
    const fabric = await getFabric();
    const Rect = fabric.Rect || fabric.default?.Rect;
    const Textbox = fabric.Textbox || fabric.default?.Textbox;
    const Group = fabric.Group || fabric.default?.Group;
    const rect = new Rect({
      width: 96,
      height: 96,
      fill: "#f8fafc",
      stroke: "#0f172a",
      strokeWidth: 1,
    });
    const text = new Textbox("QR", {
      left: 28,
      top: 34,
      width: 48,
      fontSize: 18,
      fontWeight: "bold",
      fill: "#0f172a",
      textAlign: "center",
    });
    const group = new Group([rect, text], {
      left: 80,
      top: 80,
      customType: "qr_placeholder",
    });

    addObjectToCanvas(group, "QR");
  };

  const openImagePicker = (mode) => {
    imageUploadModeRef.current = mode;
    imageInputRef.current?.click();
  };

  const handleImagePicked = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const mode = imageUploadModeRef.current;
    if (!file.type.startsWith("image/")) {
      const message = "Chi chap nhan file anh.";
      setUploadState({ status: "error", message });
      toast.error(message);
      return;
    }

    setUploadState({
      status: "loading",
      message: mode === "background" ? "Dang upload anh nen..." : "Dang upload anh...",
    });

    try {
      const response = await templatesService.uploadImage(file);
      if (!response.success) {
        const message = response.error?.message || "Upload anh that bai.";
        setUploadState({ status: "error", message });
      toast.error(response.error?.message || "Upload ảnh thất bại.");
      return;
    }

      const imageUrl = response.data?.url || response.data?.path;
      if (!imageUrl) throw new Error("Upload khong tra ve URL anh.");

      await addImageFromUrl(imageUrl, mode);
      setUploadState({
        status: "success",
        message: mode === "background" ? "Da them anh nen." : "Da them anh.",
      });
    toast.success("Đã thêm ảnh vào mẫu.");
    } catch (error) {
      const message = error?.message || "Upload anh that bai.";
      setUploadState({ status: "error", message });
      toast.error(message);
    }
  };

  const addImageFromUrl = async (url, mode = "object") => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("Canvas chua san sang.");
    const fabric = await getFabric();
    const FabricImage = fabric.FabricImage || fabric.Image || fabric.default?.FabricImage;
    if (!FabricImage?.fromURL) throw new Error("Fabric image loader is not available.");
    const image = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
    const maxWidth = mode === "background" ? canvas.getWidth() : 260;
    const maxHeight = mode === "background" ? canvas.getHeight() : 180;
    const scale = Math.min(maxWidth / (image.width || maxWidth), maxHeight / (image.height || maxHeight), 1);

    image.set({
      left: mode === "background" ? 0 : 70,
      top: mode === "background" ? 0 : 70,
      scaleX: scale,
      scaleY: scale,
      opacity: mode === "background" ? 0.24 : 1,
      customType: mode === "background" ? "background_image" : "image",
      imageUrl: url,
      selectable: true,
      evented: true,
    });

    addObjectToCanvas(image, mode === "background" ? "background image" : "image", {
      background: mode === "background",
      preservePlacement: mode === "background",
    });
  };

  const deleteSelected = () => {
    const activeObject = canvasRef.current?.getActiveObject();
    if (!activeObject) return;
    canvasRef.current.remove(activeObject);
    canvasRef.current.renderAll();
    refreshSelection();
  };

  const duplicateSelected = async () => {
    const activeObject = canvasRef.current?.getActiveObject();
    if (!activeObject) return;
    const clone = await activeObject.clone(CUSTOM_JSON_PROPS);
    clone.set({
      left: (activeObject.left || 0) + 18,
      top: (activeObject.top || 0) + 18,
    });
    canvasRef.current.add(clone);
    canvasRef.current.setActiveObject(clone);
    canvasRef.current.renderAll();
    refreshSelection();
  };

  const moveLayer = (direction) => {
    const canvas = canvasRef.current;
    const activeObject = canvas?.getActiveObject();
    if (!canvas || !activeObject) return;

    if (direction === "front") canvas.bringObjectToFront(activeObject);
    if (direction === "forward") canvas.bringObjectForward(activeObject);
    if (direction === "backward") canvas.sendObjectBackwards(activeObject);
    if (direction === "back") canvas.sendObjectToBack(activeObject);
    canvas.renderAll();
    refreshSelection();
  };

  const alignSelected = (align) => {
    const canvas = canvasRef.current;
    const activeObject = canvas?.getActiveObject();
    if (!canvas || !activeObject) return;

    if (align === "left") activeObject.set("left", 24);
    if (align === "center") {
      activeObject.set("left", (canvas.getWidth() - activeObject.getScaledWidth()) / 2);
    }
    if (align === "right") {
      activeObject.set("left", canvas.getWidth() - activeObject.getScaledWidth() - 24);
    }
    canvas.renderAll();
    refreshSelection();
  };

  const updateSelected = (field, value) => {
    const activeObject = canvasRef.current?.getActiveObject();
    if (!activeObject) return;
    activeObject.set(field, value);
    canvasRef.current.renderAll();
    refreshSelection();
  };

  const toggleLock = () => {
    const activeObject = canvasRef.current?.getActiveObject();
    if (!activeObject) return;
    const locked = !activeObject.lockMovementX;
    activeObject.set({
      lockMovementX: locked,
      lockMovementY: locked,
      lockScalingX: locked,
      lockScalingY: locked,
      lockRotation: locked,
    });
    canvasRef.current.renderAll();
    refreshSelection();
  };

  const restoreCanvasSnapshot = async (snapshot) => {
    const canvas = canvasRef.current;
    if (!canvas || !snapshot) return;
    restoringRef.current = true;
    await canvas.loadFromJSON(snapshot);
    const fabric = await getFabric();
    const paperSize = PAPER_SIZES[template?.paper_size || "a4"];
    const isLandscape = template?.orientation === "landscape";
    const width = mmToPx(isLandscape ? paperSize.height : paperSize.width);
    const height = mmToPx(isLandscape ? paperSize.width : paperSize.height);
    drawGrid(canvas, width, height, fabric);
    canvas.discardActiveObject();
    canvas.renderAll();
    restoringRef.current = false;
    refreshSelection();
  };

  const undo = async () => {
    if (historyRef.current.length <= 1) return;
    const current = historyRef.current.pop();
    redoRef.current.push(current);
    await restoreCanvasSnapshot(historyRef.current[historyRef.current.length - 1]);
  };

  const redo = async () => {
    const snapshot = redoRef.current.pop();
    if (!snapshot) return;
    historyRef.current.push(snapshot);
    await restoreCanvasSnapshot(snapshot);
  };

  const resetView = () => setZoom(1);

  const changeZoom = (delta) => {
    setZoom((current) => Math.min(1.4, Math.max(0.55, Number((current + delta).toFixed(2)))));
  };

  const handleSave = async () => {
    if (!canvasRef.current || !template) return;
    setSaving(true);
    setDesignerNotice("Dang luu mau...");

    const json = canvasRef.current.toJSON(CUSTOM_JSON_PROPS);
    json.objects = (json.objects || []).filter((object) => !object.excludeFromExport);

    const response = await templatesService.update(template.id, {
      ...template,
      json_config: JSON.stringify(json),
    });

    setSaving(false);
    if (response.success) {
      const savedTemplate = getTemplateFromResponse(response);
      if (savedTemplate) {
        setTemplate((current) => ({ ...current, ...savedTemplate }));
      }
      setDesignerNotice("Da luu mau.");
      toast.success("Đã lưu mẫu thành công.");
    } else {
      toast.error(response.error?.message || "Không thể lưu mẫu.");
    }
  };

  const toggleBold = () => {
    if (!selectedObject || selectedObject.type !== "textbox") return;
    updateSelected("fontWeight", selectedObject.fontWeight === "bold" ? "normal" : "bold");
  };

  const toggleItalic = () => {
    if (!selectedObject || selectedObject.type !== "textbox") return;
    updateSelected("fontStyle", selectedObject.fontStyle === "italic" ? "normal" : "italic");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="spinner h-8 w-8" />
      </div>
    );
  }

  const paperSize = PAPER_SIZES[template?.paper_size || "a4"];
  const selectedIsText = selectedObject?.type === "textbox";
  const selectedIsShape = ["rect", "circle", "line", "image", "group"].includes(selectedObject?.type);
  const selectedLabel = getObjectLabel(selectedObject);
  const uploadBusy = uploadState.status === "loading";
  const statusMessage =
    (uploadBusy ? uploadState.message : "") ||
    designerNotice ||
    uploadState.message ||
    (canvasReady ? "Canvas san sang." : "Dang khoi tao canvas...");
  const statusType =
    uploadBusy
      ? uploadState.status
      : canvasError
        ? "error"
        : designerNotice
          ? "success"
          : uploadState.status;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-100">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        disabled={uploadBusy}
        className="hidden"
        onChange={handleImagePicked}
      />

      <header className="flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate("/templates")} className="btn-secondary px-3 py-2">
            Back
          </button>
          <div>
            <h1 className="font-bold text-slate-950">{template?.template_name || "Template Designer"}</h1>
            <p className="text-xs font-medium text-slate-500">
              {template?.type === "payment" ? "Phiếu chi" : "Phiếu thu"} - {paperSize.label}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={undo} className="btn-secondary px-3 py-2">
            Undo
          </button>
          <button type="button" onClick={redo} className="btn-secondary px-3 py-2">
            Redo
          </button>
          <button type="button" onClick={() => changeZoom(-0.1)} className="btn-secondary px-3 py-2">
            -
          </button>
          <button type="button" onClick={resetView} className="btn-secondary px-3 py-2">
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" onClick={() => changeZoom(0.1)} className="btn-secondary px-3 py-2">
            +
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !template || !canvasReady}
            className="btn-primary disabled:opacity-50"
            data-testid="save-template"
          >
            {saving ? "Đang lưu..." : "Lưu mẫu"}
          </button>
        </div>
      </header>

      <div
        role="status"
        aria-live="polite"
        data-testid="designer-status"
        className={`border-b px-4 py-2 text-sm font-semibold ${getStatusTone(statusType)}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>{statusMessage}</span>
          <span data-testid="canvas-object-count">{canvasObjectCount} object(s)</span>
        </div>
      </div>

      <main className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)_300px]">
        <aside className="overflow-y-auto border-r border-slate-200 bg-white p-4">
          <PanelTitle title="Thành phần" subtitle="Thêm nhanh các khối dùng trong phiếu." />
          <div className="grid grid-cols-2 gap-2">
            <ToolButton label="Tiêu đề" onClick={addHeading} />
            <ToolButton
              label="Text"
              onClick={addText}
              active={selectedObject?.customType === "text"}
              testId="tool-text"
            />
            <ToolButton
              label="Khung"
              onClick={addRectangle}
              active={selectedObject?.type === "rect"}
              testId="tool-rect"
            />
            <ToolButton label="Tròn" onClick={addCircle} />
            <ToolButton label="Line" onClick={addLine} />
            <ToolButton label="QR" onClick={addQrPlaceholder} />
          </div>

          <div className="mt-6">
            <PanelTitle title="Hình ảnh" subtitle="Upload logo, watermark, nền mẫu in." />
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => openImagePicker("object")}
                disabled={uploadBusy}
                data-testid="upload-image"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-bold text-slate-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-wait disabled:opacity-60"
              >
                Upload ảnh
              </button>
              <button
                type="button"
                onClick={() => openImagePicker("background")}
                disabled={uploadBusy}
                data-testid="upload-background"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-bold text-slate-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-wait disabled:opacity-60"
              >
                Upload làm nền
              </button>
              <p
                aria-live="polite"
                data-testid="upload-status"
                className={`rounded-lg border px-3 py-2 text-xs font-semibold ${getStatusTone(uploadState.status)}`}
              >
                {uploadState.message || "Chua co upload nao."}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <PanelTitle title="Dữ liệu động" subtitle="Gắn trường để backend thay bằng dữ liệu thật." />
            <div className="space-y-1">
              {BINDING_FIELDS.map((field) => (
                <button
                  key={field.field}
                  type="button"
                  onClick={() => addBindingField(field.field, field.label)}
                  data-testid={`field-${field.field}`}
                  aria-pressed={selectedObject?.bindingField === field.field}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition hover:bg-blue-100 ${
                    selectedObject?.bindingField === field.field
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {field.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="min-w-0 overflow-auto bg-slate-100 p-4 lg:p-8">
          <div
            className="mx-auto w-max rounded-[1.5rem] bg-white p-5 shadow-inner ring-1 ring-slate-200 transition-transform"
            style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
            data-testid="canvas-stage"
          >
            <div className="relative overflow-hidden rounded-sm bg-white shadow-2xl shadow-slate-900/20">
              {!canvasReady && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 text-sm font-semibold text-slate-600">
                  {canvasError || "Dang khoi tao canvas..."}
                </div>
              )}
              <canvas ref={canvasElRef} data-testid="template-canvas" className="block bg-white" />
            </div>
          </div>
        </section>

        <aside className="overflow-y-auto border-l border-slate-200 bg-white p-4">
          <PanelTitle title="Thuộc tính" subtitle="Chọn object trên canvas để chỉnh." />
          <div
            data-testid="selection-summary"
            className={`mb-4 rounded-xl border px-3 py-2 text-sm font-semibold ${
              selectedObject
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-slate-50 text-slate-500"
            }`}
          >
            Dang chon: {selectedObject ? selectedLabel : "Chua co object"}
          </div>
          {selectedObject ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Layer</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <ToolButton label="Lên trên" onClick={() => moveLayer("forward")} />
                  <ToolButton label="Xuống" onClick={() => moveLayer("backward")} />
                  <ToolButton label="Top" onClick={() => moveLayer("front")} />
                  <ToolButton label="Back" onClick={() => moveLayer("back")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <NumberField label="X" value={selectedObject.left || 0} onChange={(value) => updateSelected("left", value)} />
                <NumberField label="Y" value={selectedObject.top || 0} onChange={(value) => updateSelected("top", value)} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">Opacity</label>
                <input
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  value={selectedObject.opacity ?? 1}
                  onChange={(event) => updateSelected("opacity", Number(event.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">Canh lề</label>
                <div className="grid grid-cols-3 gap-2">
                  <ToolButton label="Left" onClick={() => alignSelected("left")} />
                  <ToolButton label="Center" onClick={() => alignSelected("center")} />
                  <ToolButton label="Right" onClick={() => alignSelected("right")} />
                </div>
              </div>

              {selectedIsText && (
                <div className="space-y-4 rounded-2xl border border-slate-200 p-3">
                  <NumberField
                    label="Cỡ chữ"
                    value={selectedObject.fontSize || 14}
                    onChange={(value) => updateSelected("fontSize", value)}
                  />
                  <ColorField
                    label="Màu chữ"
                    value={selectedObject.fill || "#0f172a"}
                    onChange={(value) => updateSelected("fill", value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={toggleBold}
                      className={`rounded-lg px-3 py-2 font-black ${
                        selectedObject.fontWeight === "bold" ? "bg-primary-100 text-primary-700" : "bg-slate-100"
                      }`}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={toggleItalic}
                      className={`rounded-lg px-3 py-2 font-bold italic ${
                        selectedObject.fontStyle === "italic" ? "bg-primary-100 text-primary-700" : "bg-slate-100"
                      }`}
                    >
                      I
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {["left", "center", "right"].map((align) => (
                      <ToolButton key={align} label={align} onClick={() => updateSelected("textAlign", align)} />
                    ))}
                  </div>
                </div>
              )}

              {selectedIsShape && selectedObject.type !== "image" && (
                <div className="space-y-4 rounded-2xl border border-slate-200 p-3">
                  <ColorField
                    label="Fill"
                    value={typeof selectedObject.fill === "string" ? selectedObject.fill : "#ffffff"}
                    onChange={(value) => updateSelected("fill", value)}
                  />
                  <ColorField
                    label="Stroke"
                    value={selectedObject.stroke || "#334155"}
                    onChange={(value) => updateSelected("stroke", value)}
                  />
                  <NumberField
                    label="Độ dày viền"
                    value={selectedObject.strokeWidth || 0}
                    onChange={(value) => updateSelected("strokeWidth", value)}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={duplicateSelected} className="btn-secondary px-3">
                  Duplicate
                </button>
                <button type="button" onClick={toggleLock} className="btn-secondary px-3">
                  {selectedObject.lockMovementX ? "Unlock" : "Lock"}
                </button>
              </div>
              <button type="button" onClick={deleteSelected} className="btn-danger w-full">
                Xóa phần tử
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              Chọn một phần tử để hiện bảng thuộc tính.
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="font-bold text-slate-900">Canvas</p>
            <div className="mt-3 space-y-2 text-slate-600">
              <p>Khổ giấy: {paperSize.label}</p>
              <p>Hướng: {template?.orientation === "landscape" ? "Ngang" : "Dọc"}</p>
              <p>Grid: 20px</p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function PanelTitle({ title, subtitle }) {
  return (
    <div className="mb-3">
      <h2 className="font-bold text-slate-950">{title}</h2>
      <p className="text-xs leading-5 text-slate-500">{subtitle}</p>
    </div>
  );
}

function ToolButton({ label, onClick, active = false, disabled = false, testId }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      aria-pressed={active}
      className={`rounded-xl border px-3 py-2 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-60 ${
        active
          ? "border-primary-300 bg-primary-50 text-primary-700 ring-2 ring-primary-100"
          : "border-slate-200 bg-white text-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-600">{label}</span>
      <input
        type="number"
        value={Math.round(value || 0)}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="input"
      />
    </label>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-600">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white"
      />
    </label>
  );
}
