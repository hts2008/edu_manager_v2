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

  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedObject, setSelectedObject] = useState(null);
  const [, setSelectionVersion] = useState(0);

  useEffect(() => {
    if (id) {
      loadTemplate();
    } else {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!loading && !canvasRef.current) {
      initCanvas();
    }

    return () => {
      keyboardCleanupRef.current?.();
      keyboardCleanupRef.current = null;
      canvasRef.current?.dispose();
      canvasRef.current = null;
    };
  }, [loading]);

  const getFabric = async () => {
    if (!fabricModuleRef.current) {
      fabricModuleRef.current = await import("fabric");
    }
    return fabricModuleRef.current;
  };

  const refreshSelection = () => {
    setSelectedObject(canvasRef.current?.getActiveObject() || null);
    setSelectionVersion((value) => value + 1);
  };

  const loadTemplate = async () => {
    const response = await templatesService.getById(id);
    if (response.success) {
      setTemplate(response.data.template);
    } else {
      toast.error("Không tải được mẫu in.");
    }
    setLoading(false);
  };

  const initCanvas = async () => {
    const fabric = await getFabric();
    const FabricCanvas = fabric.Canvas || fabric.default?.Canvas;
    if (!FabricCanvas || !canvasElRef.current) {
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

    if (template?.json_config) {
      try {
        await canvas.loadFromJSON(JSON.parse(template.json_config));
      } catch (error) {
        console.error("Template JSON load error:", error);
        toast.error("JSON mẫu in lỗi, đã mở canvas trống.");
      }
    }

    drawGrid(canvas, width, height, fabric);
    canvas.renderAll();

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
    };

    document.addEventListener("keydown", handleKeyDown);
    keyboardCleanupRef.current = () => document.removeEventListener("keydown", handleKeyDown);
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

    canvasRef.current?.add(textbox);
    canvasRef.current?.setActiveObject(textbox);
    canvasRef.current?.renderAll();
    refreshSelection();
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

    canvasRef.current?.add(rect);
    canvasRef.current?.setActiveObject(rect);
    canvasRef.current?.renderAll();
    refreshSelection();
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

    canvasRef.current?.add(circle);
    canvasRef.current?.setActiveObject(circle);
    canvasRef.current?.renderAll();
    refreshSelection();
  };

  const addLine = async () => {
    const fabric = await getFabric();
    const Line = fabric.Line || fabric.default?.Line;
    const line = new Line([60, 80, 320, 80], {
      stroke: "#334155",
      strokeWidth: 1.5,
      customType: "line",
    });

    canvasRef.current?.add(line);
    canvasRef.current?.setActiveObject(line);
    canvasRef.current?.renderAll();
    refreshSelection();
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

    canvasRef.current?.add(group);
    canvasRef.current?.setActiveObject(group);
    canvasRef.current?.renderAll();
    refreshSelection();
  };

  const openImagePicker = (mode) => {
    imageUploadModeRef.current = mode;
    imageInputRef.current?.click();
  };

  const handleImagePicked = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const response = await templatesService.uploadImage(file);
    if (!response.success) {
      toast.error(response.error?.message || "Upload ảnh thất bại.");
      return;
    }

    await addImageFromUrl(response.data.url, imageUploadModeRef.current);
    toast.success("Đã thêm ảnh vào mẫu.");
  };

  const addImageFromUrl = async (url, mode = "object") => {
    const fabric = await getFabric();
    const FabricImage = fabric.FabricImage || fabric.Image || fabric.default?.FabricImage;
    const image = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
    const maxWidth = mode === "background" ? canvasRef.current.getWidth() : 260;
    const maxHeight = mode === "background" ? canvasRef.current.getHeight() : 180;
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

    canvasRef.current.add(image);
    if (mode === "background") {
      canvasRef.current.sendObjectToBack(image);
    }
    canvasRef.current.setActiveObject(image);
    canvasRef.current.renderAll();
    refreshSelection();
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

  const handleSave = async () => {
    if (!canvasRef.current || !template) return;
    setSaving(true);

    const json = canvasRef.current.toJSON(CUSTOM_JSON_PROPS);
    json.objects = (json.objects || []).filter((object) => !object.excludeFromExport);

    const response = await templatesService.update(template.id, {
      ...template,
      json_config: JSON.stringify(json),
    });

    setSaving(false);
    if (response.success) {
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

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
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
        <button type="button" onClick={handleSave} disabled={saving || !template} className="btn-primary">
          {saving ? "Đang lưu..." : "Lưu mẫu"}
        </button>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[280px_1fr_300px] overflow-hidden">
        <aside className="overflow-y-auto border-r border-slate-200 bg-white p-4">
          <PanelTitle title="Thành phần" subtitle="Thêm nhanh các khối dùng trong phiếu." />
          <div className="grid grid-cols-2 gap-2">
            <ToolButton label="Tiêu đề" onClick={addHeading} />
            <ToolButton label="Text" onClick={addText} />
            <ToolButton label="Khung" onClick={addRectangle} />
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
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-bold text-slate-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
              >
                Upload ảnh
              </button>
              <button
                type="button"
                onClick={() => openImagePicker("background")}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-bold text-slate-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
              >
                Upload làm nền
              </button>
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
                  className="w-full rounded-lg bg-blue-50 px-3 py-2 text-left text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  {field.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="overflow-auto bg-slate-200 p-8">
          <div className="mx-auto w-max rounded-[1.5rem] bg-slate-900/10 p-5 shadow-inner">
            <div className="shadow-2xl shadow-slate-900/20">
              <canvas ref={canvasElRef} />
            </div>
          </div>
        </section>

        <aside className="overflow-y-auto border-l border-slate-200 bg-white p-4">
          <PanelTitle title="Thuộc tính" subtitle="Chọn object trên canvas để chỉnh." />
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

function ToolButton({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
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
