const CUSTOM_PROPS = ['customType', 'designerLabel', 'receiptElementId', 'bindingField', 'bindingLabel', 'bindingBoxHeight', 'imageUrl',
  'excludeFromExport', 'lockMovementX', 'lockMovementY', 'lockScalingX', 'lockScalingY', 'lockRotation'];
const PAPER_MM = { a4: [210, 297], a5: [148, 210], a6: [105, 148],
  letter: [216, 279], thermal_80mm: [80, 200] };
const fail = (code) => { throw new Error(code); };

export function bindingBoxFromMatrix(width, height, matrix, allocatedHeight = height) {
  if (!Array.isArray(matrix) || matrix.length !== 6 ||
      ![width, height, allocatedHeight, ...matrix].every(Number.isFinite) || width <= 0 || height <= 0 || allocatedHeight <= 0) {
    fail('INVALID_BINDING_GEOMETRY');
  }
  const [a, b, c, d, e, f] = matrix;
  if (Math.abs(b) > 1e-7 || Math.abs(c) > 1e-7 || a <= 0 || d <= 0) {
    fail('UNSUPPORTED_BINDING_TRANSFORM: rotation, skew and reflection cannot print as V2 text');
  }
  return { x: e - width * a / 2, y: f - height * d / 2,
    width: width * a, height: allocatedHeight * d, scaleY: d };
}

function paperWidthPoints(snapshot) {
  const paper = snapshot.paper || {};
  const preset = PAPER_MM[paper.preset || snapshot.paper_size || 'a4'] || PAPER_MM.a4;
  const dimensions = paper.mode === 'custom'
    ? [Number(paper.width_mm ?? paper.width), Number(paper.height_mm ?? paper.height)] : preset;
  if (!dimensions.every(value => Number.isFinite(value) && value >= 40 && value <= 500)) fail('INVALID_PAPER_SIZE');
  return dimensions[snapshot.orientation === 'landscape' ? 1 : 0] * 72 / 25.4;
}

function containsBinding(objects) {
  return objects.some(object => object.visible !== false && !object.excludeFromExport &&
    (object.getObjects ? containsBinding(object.getObjects()) :
      object.bindingField || /\{\{|\$\{/.test(String(object.text ?? ''))));
}

function collectBindings(objects, output, hidden, page, pointScale, ancestorsVisible = true) {
  for (const object of objects) {
    const visible = ancestorsVisible && object.visible !== false && !object.excludeFromExport;
    if (!visible) { hidden.push(object); continue; }
    if (object.getObjects) {
      if (containsBinding(object.getObjects()) &&
          (object.clipPath || object.shadow || object.opacity !== undefined && object.opacity !== 1)) {
        fail('UNSUPPORTED_GROUP_STYLE: binding groups require opacity 1 and no shadow or clip');
      }
      collectBindings(object.getObjects(), output, hidden, page, pointScale, visible);
      continue;
    }
    const text = String(object.text ?? '');
    if (!object.bindingField && !/\{\{|\$\{/.test(text)) continue;
    if (!['text', 'textbox', 'i-text'].includes(String(object.type).toLowerCase())) fail('UNSUPPORTED_BINDING_OBJECT');
    const match = text.match(/^(.*?)\{\{([\w.]+)\}\}(.*?)$/s) || text.match(/^(.*?)\$\{([\w.]+)\}(.*?)$/s);
    if (!match || /\{\{|\$\{/.test(match[1] + match[3]) ||
        (object.bindingField && object.bindingField !== match[2])) fail('INVALID_BINDING_TEXT: use one matching placeholder per text box');
    if (object.shadow || object.clipPath || object.path ||
        object.opacity !== undefined && object.opacity !== 1 ||
        object.styles && Object.keys(object.styles).length) fail('UNSUPPORTED_BINDING_STYLE');
    // Fabric's matrix is centered on natural text height, not the allocated print box.
    const box = bindingBoxFromMatrix(object.width, object.height, object.calcTransformMatrix(), object.bindingBoxHeight);
    const matrix = object.calcTransformMatrix();
    if (Math.abs(matrix[0] - matrix[3]) > 1e-7) fail('UNSUPPORTED_BINDING_TRANSFORM: nonuniform text scaling cannot print as V2 text');
    if (box.x < 0 || box.y < 0 || box.x + box.width > page.width + 1e-7 || box.y + box.height > page.height + 1e-7) fail('BINDING_OUTSIDE_PAGE');
    output.push({ field: match[2], x: box.x, y: box.y, width: box.width, height: box.height,
      fontSize: (object.fontSize || 12) * box.scaleY * pointScale,
      color: typeof object.fill === 'string' ? object.fill : '#111827',
      align: object.textAlign || 'left', bold: object.fontWeight === 'bold' || Number(object.fontWeight) >= 600,
      italic: object.fontStyle === 'italic', prefix: match[1], suffix: match[3] });
    hidden.push(object);
  }
}

// Export a detached clone: failures and asynchronous image work cannot alter the editor.
export async function buildDesignerPrintConfig(canvas, extraSnapshot = {}) {
  const page = { width: canvas.getWidth(), height: canvas.getHeight() };
  if (![page.width, page.height].every(value => Number.isFinite(value) && value > 0)) fail('INVALID_CANVAS_SIZE');
  const serialized = canvas.toObject ? canvas.toObject(CUSTOM_PROPS) : canvas.toJSON(CUSTOM_PROPS);
  const editorSource = structuredClone({ ...extraSnapshot, ...serialized });
  const clone = await canvas.clone(CUSTOM_PROPS);
  const hidden = [];
  const previous = [];
  try {
    const bindings = [];
    collectBindings(clone.getObjects(), bindings, hidden, page, paperWidthPoints(extraSnapshot) / page.width);
    for (const object of hidden) { previous.push([object, object.visible]); object.visible = false; }
    const dirty = (objects) => objects.forEach(object => {
      object.dirty = true;
      if (object.getObjects) dirty(object.getObjects());
    });
    dirty(clone.getObjects());
    clone.setViewportTransform([1, 0, 0, 1, 0, 0]);
    clone.renderAll();
    const src = clone.toDataURL({ format: 'png', multiplier: 1, enableRetinaScaling: false });
    if (!src.startsWith('data:image/png;base64,') || (src.length - src.indexOf(',') - 1) * .75 > 8 * 1024 * 1024) fail('INVALID_OR_OVERSIZED_PRINT_BACKGROUND');
    return { ...structuredClone(extraSnapshot), version: 2, background: { src }, bindings,
      canvas: page, designer_print: { schemaVersion: 1 }, editor_source: editorSource };
  } finally {
    for (const [object, visible] of previous) object.visible = visible;
    await clone.dispose();
  }
}
