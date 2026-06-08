import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { templatesService } from "../services/api";
import { useToast } from "../components/ui/Toast";

const PAPER_SIZES = {
  a4: { width: 210, height: 297, label: "A4" },
  a5: { width: 148, height: 210, label: "A5" },
  a6: { width: 105, height: 148, label: "A6" },
  letter: { width: 216, height: 279, label: "Letter" },
  thermal_80mm: { width: 80, height: 200, label: "Thermal 80mm" },
};

const DB_PAPER_SIZES = new Set(["a4", "a5", "letter", "thermal_80mm"]);
const DEFAULT_PAPER_KEY = "a4";
const MIN_PAPER_MM = 40;
const MAX_PAPER_MM = 500;

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

const clampPaperMm = (value, fallback = 100) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(MAX_PAPER_MM, Math.max(MIN_PAPER_MM, Math.round(number)));
};

const parseJsonConfigSafe = (jsonConfig) => {
  try {
    return parseTemplateConfig(jsonConfig);
  } catch {
    return null;
  }
};

const normalizePaperConfig = (paper, fallbackKey = DEFAULT_PAPER_KEY) => {
  const fallback = PAPER_SIZES[fallbackKey] ? fallbackKey : DEFAULT_PAPER_KEY;
  if (paper && typeof paper === "object") {
    const mode = paper.mode || paper.kind;
    const preset = paper.preset || paper.paper_size || paper.paperSize;
    const width = clampPaperMm(paper.width_mm ?? paper.widthMm ?? paper.width, PAPER_SIZES[fallback].width);
    const height = clampPaperMm(paper.height_mm ?? paper.heightMm ?? paper.height, PAPER_SIZES[fallback].height);

    if (mode === "custom" || preset === "custom") {
      return {
        mode: "custom",
        preset: "custom",
        width,
        height,
        label: `Tùy chỉnh ${width}x${height}mm`,
      };
    }

    if (preset && PAPER_SIZES[preset]) {
      return {
        mode: "preset",
        preset,
        width: PAPER_SIZES[preset].width,
        height: PAPER_SIZES[preset].height,
        label: PAPER_SIZES[preset].label,
      };
    }
  }

  return {
    mode: "preset",
    preset: fallback,
    width: PAPER_SIZES[fallback].width,
    height: PAPER_SIZES[fallback].height,
    label: PAPER_SIZES[fallback].label,
  };
};

const getPaperConfigFromTemplate = (template) => {
  const config = parseJsonConfigSafe(template?.json_config);
  return normalizePaperConfig(config?.paper, template?.paper_size || DEFAULT_PAPER_KEY);
};

const serializePaperConfig = (paperConfig) => ({
  mode: paperConfig.mode,
  preset: paperConfig.preset,
  width_mm: paperConfig.width,
  height_mm: paperConfig.height,
  label: paperConfig.label,
});

const paperToCanvasSize = (paperConfig, orientation = "portrait") => {
  const isLandscape = orientation === "landscape";
  return {
    width: mmToPx(isLandscape ? paperConfig.height : paperConfig.width),
    height: mmToPx(isLandscape ? paperConfig.width : paperConfig.height),
  };
};

const getCanvasSizeFromConfig = (config, fallbackPaperKey = DEFAULT_PAPER_KEY, orientation = "portrait") => {
  const canvas = config?.canvas;
  const width = Number(canvas?.width);
  const height = Number(canvas?.height);
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return { width, height };
  }

  if (config?.paper) {
    return paperToCanvasSize(normalizePaperConfig(config.paper, fallbackPaperKey), config.orientation || orientation);
  }

  return null;
};

const getPersistedPaperSize = (paperConfig, fallback = DEFAULT_PAPER_KEY) => {
  if (paperConfig.mode === "preset" && DB_PAPER_SIZES.has(paperConfig.preset)) {
    return paperConfig.preset;
  }
  return DB_PAPER_SIZES.has(fallback) ? fallback : DEFAULT_PAPER_KEY;
};

const countExportableObjects = (canvas) =>
  canvas?.getObjects().filter((object) => !object.excludeFromExport).length || 0;

const getTemplateFromResponse = (response) =>
  response?.data?.template || response?.data || null;

const parseTemplateConfig = (jsonConfig) => {
  if (!jsonConfig) return null;
  if (typeof jsonConfig === "string") return JSON.parse(jsonConfig);
  return jsonConfig;
};

const normalizeTemplateConfig = (jsonConfig) => {
  const config = parseTemplateConfig(jsonConfig);
  if (!config || typeof config !== "object") return null;
  if (Array.isArray(config.objects)) return config;
  if (Array.isArray(config.elements)) return null;
  return null;
};

const disposeCanvasSafely = (canvas) => {
  if (!canvas) return;
  try {
    const result = canvas.dispose();
    if (result && typeof result.catch === "function") {
      result.catch(() => {});
    }
  } catch {
    // Fabric may throw if React StrictMode cleans an already-disposed canvas.
  }
};

const canvasIsDisposed = (canvas) => Boolean(canvas?.disposed || canvas?.destroyed);

const moveToBack = (canvas, object) => {
  if (!canvas || !object || canvasIsDisposed(canvas)) return;
  if (typeof canvas.sendObjectToBack === "function") canvas.sendObjectToBack(object);
  else if (typeof canvas.sendToBack === "function") canvas.sendToBack(object);
};

const moveToFront = (canvas, object) => {
  if (!canvas || !object || canvasIsDisposed(canvas)) return;
  if (typeof canvas.bringObjectToFront === "function") canvas.bringObjectToFront(object);
  else if (typeof canvas.bringToFront === "function") canvas.bringToFront(object);
};

const moveForward = (canvas, object) => {
  if (!canvas || !object || canvasIsDisposed(canvas)) return;
  if (typeof canvas.bringObjectForward === "function") canvas.bringObjectForward(object);
  else if (typeof canvas.bringForward === "function") canvas.bringForward(object);
};

const moveBackward = (canvas, object) => {
  if (!canvas || !object || canvasIsDisposed(canvas)) return;
  if (typeof canvas.sendObjectBackwards === "function") canvas.sendObjectBackwards(object);
  else if (typeof canvas.sendBackwards === "function") canvas.sendBackwards(object);
};

const scaleImageForMode = (image, canvas, mode) => {
  const imageWidth = image.width || canvas.getWidth();
  const imageHeight = image.height || canvas.getHeight();
  const maxWidth = mode === "background" ? canvas.getWidth() : 260;
  const maxHeight = mode === "background" ? canvas.getHeight() : 180;
  const fitScale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight);
  return mode === "background" ? fitScale : Math.min(fitScale, 1);
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
  const canvasInitIdRef = useRef(0);

  const [template, setTemplate] = useState(null);
  const [paperConfig, setPaperConfig] = useState(() => normalizePaperConfig(null));
  const [paperDraft, setPaperDraft] = useState(() => normalizePaperConfig(null));
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

    const initId = canvasInitIdRef.current + 1;
    canvasInitIdRef.current = initId;
    keyboardCleanupRef.current?.();
    keyboardCleanupRef.current = null;
    disposeCanvasSafely(canvasRef.current);
    canvasRef.current = null;
    setCanvasReady(false);
    setCanvasError("");
    setCanvasObjectCount(0);
    historyRef.current = [];
    redoRef.current = [];
    newObjectOffsetRef.current = 0;
    initCanvas(initId);

    return () => {
      canvasInitIdRef.current += 1;
      keyboardCleanupRef.current?.();
      keyboardCleanupRef.current = null;
      disposeCanvasSafely(canvasRef.current);
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
    if (!canvas || canvasIsDisposed(canvas)) return;
    setSelectedObject(canvas?.getActiveObject() || null);
    setCanvasObjectCount(countExportableObjects(canvas));
    setSelectionVersion((value) => value + 1);
  };

  const getUsableCanvas = () => {
    const canvas = canvasRef.current;
    if (
      !canvasReady ||
      !canvas ||
      canvasIsDisposed(canvas) ||
      (canvas.lowerCanvasEl && !canvas.lowerCanvasEl.isConnected)
    ) {
      setDesignerNotice("Canvas chua san sang.");
      return null;
    }
    return canvas;
  };

  const loadTemplate = async () => {
    setLoading(true);
    try {
      const response = await templatesService.getById(id);
      if (response.success) {
        const loadedTemplate = getTemplateFromResponse(response);
        const loadedPaper = getPaperConfigFromTemplate(loadedTemplate);
        setPaperConfig(loadedPaper);
        setPaperDraft(loadedPaper);
        setTemplate(loadedTemplate);
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

  const captureHistory = (paperOverride, orientationOverride) => {
    if (restoringRef.current || !canvasRef.current) return;
    const effectivePaper = paperOverride?.mode ? paperOverride : paperConfig;
    const effectiveOrientation = orientationOverride || template?.orientation || "portrait";
    const snapshot = canvasRef.current.toJSON(CUSTOM_JSON_PROPS);
    snapshot.objects = (snapshot.objects || []).filter((object) => !object.excludeFromExport);
    snapshot.paper = serializePaperConfig(effectivePaper);
    snapshot.canvas = {
      width: canvasRef.current.getWidth(),
      height: canvasRef.current.getHeight(),
      unit: "px",
      mm_to_px: 3.7795275591,
    };
    snapshot.orientation = effectiveOrientation;
    historyRef.current = [...historyRef.current.slice(-30), snapshot];
    redoRef.current = [];
  };

  const isActiveCanvasInit = (initId, canvas) =>
    canvasInitIdRef.current === initId &&
    canvasRef.current === canvas &&
    !canvasIsDisposed(canvas);

  const initCanvas = async (initId) => {
    setCanvasReady(false);
    setCanvasError("");
    const fabric = await getFabric();
    if (canvasInitIdRef.current !== initId) return;

    const FabricCanvas = fabric.Canvas || fabric.default?.Canvas;
    if (!FabricCanvas || !canvasElRef.current) {
      setCanvasError("Khong khoi tao duoc canvas.");
      setDesignerNotice("Khong khoi tao duoc canvas.");
      toast.error("Không khởi tạo được Fabric canvas.");
      return;
    }

    const orientation = template?.orientation || "portrait";
    const { width, height } = paperToCanvasSize(paperConfig, orientation);

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
        const config = normalizeTemplateConfig(template.json_config);
        if (config) {
          const sourceSize = getCanvasSizeFromConfig(config, template?.paper_size, orientation);
          await canvas.loadFromJSON(config);
          if (!isActiveCanvasInit(initId, canvas)) return;
          if (typeof canvas.setDimensions === "function") {
            canvas.setDimensions({ width, height });
          } else {
            canvas.setWidth(width);
            canvas.setHeight(height);
          }
          applyLoadedCanvasAlignment(canvas, width, height, sourceSize);
          canvas.backgroundColor = "#ffffff";
        } else {
          setDesignerNotice("Canvas san sang. JSON mau in cu da duoc scaffold mac dinh.");
        }
      } catch {
        if (!isActiveCanvasInit(initId, canvas)) return;
        setDesignerNotice("JSON mau in loi, da mo scaffold mac dinh.");
        toast.error("JSON mẫu in lỗi, đã mở canvas trống.");
      }
    }

    if (!isActiveCanvasInit(initId, canvas)) return;
    const hasObjects = canvas.getObjects().some((object) => !object.excludeFromExport);
    if (!hasObjects) {
      await createDefaultTemplate(fabric, canvas, width, height);
    }

    if (!isActiveCanvasInit(initId, canvas)) return;
    try {
      drawGrid(canvas, width, height, fabric);
      canvas.renderAll();
    } catch (error) {
      if (!isActiveCanvasInit(initId, canvas)) return;
      const message = error?.message || "Khong khoi tao duoc canvas.";
      setCanvasError(message);
      setDesignerNotice(message);
      return;
    }
    setCanvasReady(true);
    setDesignerNotice((current) => current || "Canvas san sang.");
    refreshSelection();
    captureHistory();

    const handleKeyDown = (event) => {
      if (!isActiveCanvasInit(initId, canvas)) return;
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
      moveToBack(canvas, line);
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
      moveToBack(canvas, line);
    }
  };

  const removeGrid = (canvas) => {
    canvas
      .getObjects()
      .filter((object) => object.excludeFromExport)
      .forEach((object) => canvas.remove(object));
  };

  const getExportableObjects = (canvas) =>
    canvas.getObjects().filter((object) => !object.excludeFromExport);

  const scaleCanvasObject = (object, scaleX, scaleY, options = {}) => {
    const shouldScalePosition = options.scalePosition !== false;
    const left = shouldScalePosition ? Number(object.left || 0) * scaleX : Number(object.left || 0);
    const top = shouldScalePosition ? Number(object.top || 0) * scaleY : Number(object.top || 0);
    const objectType = String(object.type || "").toLowerCase();
    const textScale = Math.min(scaleX, scaleY);

    object.set({ left, top });

    if (["textbox", "text", "i-text"].includes(objectType)) {
      object.set({
        width: Math.max(24, Number(object.width || 120) * scaleX),
        fontSize: Math.max(7, Number(object.fontSize || 14) * textScale),
        scaleX: Number(object.scaleX || 1),
        scaleY: Number(object.scaleY || 1),
      });
    } else {
      object.set({
        scaleX: Number(object.scaleX || 1) * scaleX,
        scaleY: Number(object.scaleY || 1) * scaleY,
      });
    }

    if (typeof object.setCoords === "function") object.setCoords();
  };

  const scaleExportableObjects = (canvas, scaleX, scaleY) => {
    getExportableObjects(canvas).forEach((object) => scaleCanvasObject(object, scaleX, scaleY));
  };

  const getObjectBounds = (canvas) => {
    const objects = getExportableObjects(canvas);
    if (!objects.length) return null;

    return objects.reduce(
      (bounds, object) => {
        const rect = object.getBoundingRect ? object.getBoundingRect() : object;
        const left = Number(rect.left ?? object.left ?? 0);
        const top = Number(rect.top ?? object.top ?? 0);
        const width = Number(rect.width ?? object.width ?? 0);
        const height = Number(rect.height ?? object.height ?? 0);
        return {
          left: Math.min(bounds.left, left),
          top: Math.min(bounds.top, top),
          right: Math.max(bounds.right, left + width),
          bottom: Math.max(bounds.bottom, top + height),
        };
      },
      { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
    );
  };

  const translateExportableObjects = (canvas, dx, dy) => {
    getExportableObjects(canvas).forEach((object) => {
      object.set({
        left: Number(object.left || 0) + dx,
        top: Number(object.top || 0) + dy,
      });
      if (typeof object.setCoords === "function") object.setCoords();
    });
  };

  const fitObjectsInsideCanvas = (canvas, width, height, margin = 24) => {
    let bounds = getObjectBounds(canvas);
    if (!bounds) return;

    const boundsWidth = bounds.right - bounds.left;
    const boundsHeight = bounds.bottom - bounds.top;
    const maxWidth = Math.max(1, width - margin * 2);
    const maxHeight = Math.max(1, height - margin * 2);
    const fitScale = Math.min(1, maxWidth / Math.max(1, boundsWidth), maxHeight / Math.max(1, boundsHeight));

    if (fitScale < 0.995) {
      getExportableObjects(canvas).forEach((object) => {
        object.set({
          left: (Number(object.left || 0) - bounds.left) * fitScale + margin,
          top: (Number(object.top || 0) - bounds.top) * fitScale + margin,
        });
        scaleCanvasObject(object, fitScale, fitScale, { scalePosition: false });
      });
      bounds = getObjectBounds(canvas);
    }

    if (!bounds) return;
    const dx = bounds.left < margin ? margin - bounds.left : bounds.right > width - margin ? width - margin - bounds.right : 0;
    const dy = bounds.top < margin ? margin - bounds.top : bounds.bottom > height - margin ? height - margin - bounds.bottom : 0;
    if (dx || dy) translateExportableObjects(canvas, dx, dy);
  };

  const applyLoadedCanvasAlignment = (canvas, width, height, sourceSize) => {
    const sourceWidth = Number(sourceSize?.width);
    const sourceHeight = Number(sourceSize?.height);
    if (sourceWidth > 0 && sourceHeight > 0) {
      const scaleX = width / sourceWidth;
      const scaleY = height / sourceHeight;
      if (Math.abs(scaleX - 1) > 0.01 || Math.abs(scaleY - 1) > 0.01) {
        scaleExportableObjects(canvas, scaleX, scaleY);
      }
    }

    fitObjectsInsideCanvas(canvas, width, height);
  };

  const addObjectToCanvas = (object, label, options = {}) => {
    const canvas = getUsableCanvas();
    if (!canvas) {
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
    if (typeof object.setCoords === "function") object.setCoords();
    if (options.background) {
      moveToBack(canvas, object);
    } else {
      moveToFront(canvas, object);
    }
    canvas.setActiveObject(object);
    if (typeof canvas.requestRenderAll === "function") canvas.requestRenderAll();
    else canvas.renderAll();
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
    if (!getUsableCanvas()) return;
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
    const canvas = getUsableCanvas();
    if (!canvas) throw new Error("Canvas chua san sang.");
    const fabric = await getFabric();
    const FabricImage = fabric.FabricImage || fabric.Image || fabric.default?.FabricImage;
    if (!FabricImage?.fromURL) throw new Error("Fabric image loader is not available.");
    const image = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
    const scale = scaleImageForMode(image, canvas, mode);

    image.set({
      left: mode === "background" ? 0 : 70,
      top: mode === "background" ? 0 : 70,
      scaleX: scale,
      scaleY: scale,
      opacity: mode === "background" ? 0.72 : 1,
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

    if (direction === "front") moveToFront(canvas, activeObject);
    if (direction === "forward") moveForward(canvas, activeObject);
    if (direction === "backward") moveBackward(canvas, activeObject);
    if (direction === "back") moveToBack(canvas, activeObject);
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
    try {
      const snapshotPaper = normalizePaperConfig(snapshot.paper, template?.paper_size || DEFAULT_PAPER_KEY);
      const orientation = snapshot.orientation || template?.orientation || "portrait";
      const { width, height } = paperToCanvasSize(snapshotPaper, orientation);
      await canvas.loadFromJSON(snapshot);
      const fabric = await getFabric();
      if (typeof canvas.setDimensions === "function") {
        canvas.setDimensions({ width, height });
      } else {
        canvas.setWidth(width);
        canvas.setHeight(height);
      }
      setPaperConfig(snapshotPaper);
      setPaperDraft(snapshotPaper);
      setTemplate((current) =>
        current
          ? {
              ...current,
              paper_size: getPersistedPaperSize(snapshotPaper, current.paper_size),
              orientation,
            }
          : current
      );
      removeGrid(canvas);
      applyLoadedCanvasAlignment(canvas, width, height, getCanvasSizeFromConfig(snapshot, template?.paper_size, orientation));
      drawGrid(canvas, width, height, fabric);
      canvas.discardActiveObject();
      canvas.renderAll();
      refreshSelection();
    } finally {
      restoringRef.current = false;
    }
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

  const applyCanvasPage = async (nextPaperConfig, nextOrientation = template?.orientation || "portrait") => {
    const normalizedPaper = normalizePaperConfig(nextPaperConfig, template?.paper_size || DEFAULT_PAPER_KEY);
    const canvas = canvasRef.current;
    const previousWidth = canvas?.getWidth?.() || paperToCanvasSize(paperConfig, template?.orientation).width;
    const previousHeight = canvas?.getHeight?.() || paperToCanvasSize(paperConfig, template?.orientation).height;
    const { width, height } = paperToCanvasSize(normalizedPaper, nextOrientation);

    setPaperConfig(normalizedPaper);
    setPaperDraft(normalizedPaper);
    setTemplate((current) =>
      current
        ? {
            ...current,
            paper_size: getPersistedPaperSize(normalizedPaper, current.paper_size),
            orientation: nextOrientation,
          }
        : current
    );

    if (!canvas || canvasIsDisposed(canvas)) return;

    const fabric = await getFabric();
    const wasRestoring = restoringRef.current;
    restoringRef.current = true;
    try {
      removeGrid(canvas);
      if (typeof canvas.setDimensions === "function") {
        canvas.setDimensions({ width, height });
      } else {
        canvas.setWidth(width);
        canvas.setHeight(height);
      }

      if (previousWidth > 0 && previousHeight > 0) {
        scaleExportableObjects(canvas, width / previousWidth, height / previousHeight);
      }
      fitObjectsInsideCanvas(canvas, width, height);
      drawGrid(canvas, width, height, fabric);
    } finally {
      restoringRef.current = wasRestoring;
    }

    canvas.discardActiveObject();
    if (typeof canvas.requestRenderAll === "function") canvas.requestRenderAll();
    else canvas.renderAll();
    refreshSelection();
    captureHistory(normalizedPaper, nextOrientation);
    setDesignerNotice(`Da cap nhat kho giay ${normalizedPaper.label}.`);
  };

  const handlePaperPresetChange = (value) => {
    const nextPaper =
      value === "custom"
        ? normalizePaperConfig({
            mode: "custom",
            preset: "custom",
            width_mm: paperDraft.width,
            height_mm: paperDraft.height,
          })
        : normalizePaperConfig({ mode: "preset", preset: value });
    setPaperDraft(nextPaper);
    if (value !== "custom") {
      void applyCanvasPage(nextPaper);
    }
  };

  const updateCustomPaperDraft = (field, value) => {
    setPaperDraft((current) =>
      normalizePaperConfig({
        mode: "custom",
        preset: "custom",
        width_mm: field === "width" ? value : current.width,
        height_mm: field === "height" ? value : current.height,
      })
    );
  };

  const handleSave = async () => {
    if (!canvasRef.current || !template) return;
    setSaving(true);
    setDesignerNotice("Dang luu mau...");

    const json = canvasRef.current.toJSON(CUSTOM_JSON_PROPS);
    json.objects = (json.objects || []).filter((object) => !object.excludeFromExport);
    json.paper = serializePaperConfig(paperConfig);
    json.canvas = {
      width: canvasRef.current.getWidth(),
      height: canvasRef.current.getHeight(),
      unit: "px",
      mm_to_px: 3.7795275591,
    };
    json.orientation = template?.orientation || "portrait";

    const response = await templatesService.update(template.id, {
      ...template,
      paper_size: getPersistedPaperSize(paperConfig, template?.paper_size),
      orientation: template?.orientation || "portrait",
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

  const paperSize = paperConfig;
  const selectedIsText = selectedObject?.type === "textbox";
  const selectedIsShape = ["rect", "circle", "line", "image", "group"].includes(selectedObject?.type);
  const selectedLabel = getObjectLabel(selectedObject);
  const uploadBusy = uploadState.status === "loading";
  const controlsDisabled = !canvasReady || Boolean(canvasError);
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
          <PanelTitle title="Khổ giấy" subtitle="Chọn preset hoặc nhập kích thước riêng cho canvas." />
          <div className="mb-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Preset</span>
              <select
                value={paperDraft.mode === "custom" ? "custom" : paperDraft.preset}
                onChange={(event) => handlePaperPresetChange(event.target.value)}
                disabled={controlsDisabled}
                data-testid="paper-size-select"
                className="input"
              >
                <option value="a4">A4 - 210 x 297 mm</option>
                <option value="a5">A5 - 148 x 210 mm</option>
                <option value="a6">A6 - 105 x 148 mm</option>
                <option value="thermal_80mm">Thermal 80mm - 80 x 200 mm</option>
                <option value="custom">Tùy chỉnh</option>
              </select>
            </label>

            {paperDraft.mode === "custom" && (
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Rộng mm</span>
                  <input
                    type="number"
                    min={MIN_PAPER_MM}
                    max={MAX_PAPER_MM}
                    value={paperDraft.width}
                    onChange={(event) => updateCustomPaperDraft("width", event.target.value)}
                    data-testid="paper-width-mm"
                    className="input"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Cao mm</span>
                  <input
                    type="number"
                    min={MIN_PAPER_MM}
                    max={MAX_PAPER_MM}
                    value={paperDraft.height}
                    onChange={(event) => updateCustomPaperDraft("height", event.target.value)}
                    data-testid="paper-height-mm"
                    className="input"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => applyCanvasPage(paperDraft)}
                  disabled={controlsDisabled}
                  data-testid="apply-paper-size"
                  className="btn-secondary col-span-2 px-3 py-2"
                >
                  Áp dụng khổ giấy
                </button>
              </div>
            )}

            <p className="text-xs font-semibold text-slate-500" data-testid="paper-size-summary">
              Đang dùng: {paperConfig.label} ({paperConfig.width} x {paperConfig.height} mm)
            </p>
          </div>

          <PanelTitle title="Thành phần" subtitle="Thêm nhanh các khối dùng trong phiếu." />
          <div className="grid grid-cols-2 gap-2">
            <ToolButton label="Tiêu đề" onClick={addHeading} disabled={controlsDisabled} />
            <ToolButton
              label="Text"
              onClick={addText}
              active={selectedObject?.customType === "text"}
              disabled={controlsDisabled}
              testId="tool-text"
            />
            <ToolButton
              label="Khung"
              onClick={addRectangle}
              active={selectedObject?.type === "rect"}
              disabled={controlsDisabled}
              testId="tool-rect"
            />
            <ToolButton label="Tròn" onClick={addCircle} disabled={controlsDisabled} />
            <ToolButton label="Line" onClick={addLine} disabled={controlsDisabled} />
            <ToolButton label="QR" onClick={addQrPlaceholder} disabled={controlsDisabled} />
          </div>

          <div className="mt-6">
            <PanelTitle title="Hình ảnh" subtitle="Upload logo, watermark, nền mẫu in." />
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => openImagePicker("object")}
                disabled={uploadBusy || controlsDisabled}
                data-testid="upload-image"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-bold text-slate-700 shadow-sm transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-wait disabled:opacity-60"
              >
                Upload ảnh
              </button>
              <button
                type="button"
                onClick={() => openImagePicker("background")}
                disabled={uploadBusy || controlsDisabled}
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
                  disabled={controlsDisabled}
                  data-testid={`field-${field.field}`}
                  aria-pressed={selectedObject?.bindingField === field.field}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 ${
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
              <canvas ref={canvasElRef} data-testid="template-canvas" className="block" />
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
