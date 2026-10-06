import { createClayReceiptLayout } from './clayReceiptTemplate.js';

export const RECEIPT_ELEMENT_CATALOG = Object.freeze([
  { id: 'header', label: 'Tiêu đề' },
  { id: 'learner', label: 'Học viên' },
  { id: 'payment', label: 'Thanh toán' },
  { id: 'qr', label: 'Vùng QR' },
  { id: 'signatures', label: 'Chữ ký' },
  { id: 'clay-card', label: 'Khối Clay' },
  { id: 'bento-pair', label: 'Bento đôi' },
  { id: 'material', label: 'Material mềm' },
].map(Object.freeze));

const COLORS = Object.freeze({ paper: '#ffffff', surface: '#f8fafc', border: '#e2e8f0',
  text: '#24343d', muted: '#52656f', accent: '#2d6660', soft: '#eaf2f0' });
const POINT_TO_PIXEL = 96 / 72;
const CUSTOM_PROPS = ['customType', 'bindingField', 'bindingLabel', 'bindingBoxHeight'];

function primitives(fabric, layout) {
  const Rect = fabric?.Rect || fabric?.default?.Rect;
  const Textbox = fabric?.Textbox || fabric?.default?.Textbox;
  const Shadow = fabric?.Shadow || fabric?.default?.Shadow;
  if (!Rect || !Textbox) throw new TypeError('Fabric Rect and Textbox are required');
  const objects = [];
  const base = { originX: 'left', originY: 'top', selectable: true, evented: true };
  const keep = object => {
    // Per-instance export preserves bindings without changing Fabric global defaults.
    const toObject = object.toObject;
    object.toObject = function(properties = []) {
      return toObject.call(this, [...new Set([...properties, ...CUSTOM_PROPS])]);
    };
    objects.push(object);
    return object;
  };
  const rect = (x, y, width, height, options = {}) => keep(new Rect({ ...base,
    left: x * POINT_TO_PIXEL, top: y * POINT_TO_PIXEL,
    width: width * POINT_TO_PIXEL, height: height * POINT_TO_PIXEL,
    fill: COLORS.surface, stroke: COLORS.border, strokeWidth: 0.7 * POINT_TO_PIXEL,
    rx: 8, ry: 8, shadow: Shadow ? new Shadow({ color: '#00000008', blur: 3, offsetX: 0, offsetY: 1 }) : undefined,
    customType: 'shape', ...options }));
  const text = (value, box, options = {}) => keep(new Textbox(value, { ...base,
    left: box.x * POINT_TO_PIXEL, top: box.y * POINT_TO_PIXEL,
    width: box.width * POINT_TO_PIXEL, fontSize: (box.fontSize || 10) * POINT_TO_PIXEL,
    fontFamily: 'Arial', fill: COLORS.text, lineHeight: 1.1,
    fontWeight: box.bold ? 'bold' : 'normal', customType: 'text', ...options }));
  const card = card => {
    text(card.label, { x: card.x + 12, y: card.y + 9, width: card.width - 24 },
      { fill: COLORS.muted, fontWeight: 'bold' });
    const binding = layout.bindings.find(item => item.x === card.x + 12 && item.y > card.y && item.y < card.y + card.height);
    text(`{{${binding.field}}}`, binding, { customType: 'binding', bindingBoxHeight: binding.height * POINT_TO_PIXEL,
      bindingField: binding.field, bindingLabel: card.label });
  };
  return { objects, rect, text, card };
}

function buildBlock(fabric, id, layout) {
  const { objects, rect, text, card } = primitives(fabric, layout);
  const section = kind => {
    const box = layout.sections.find(item => item.kind === kind);
    rect(box.x, box.y, box.width, box.height);
    layout.cards.filter(item => item.y >= box.y && item.y < box.y + box.height).forEach(item => {
      if (item.tone !== COLORS.paper) rect(item.x + 5, item.y + 5, item.width - 10, item.height - 10,
        { fill: COLORS.soft, strokeWidth: 0, rx: 5, ry: 5 });
      card(item);
    });
  };
  switch (id) {
    case 'header':
      rect(24, 8, 38, 3, { fill: COLORS.accent, strokeWidth: 0, rx: 0, ry: 0 });
      layout.header.forEach(box => text(layout.metadata[box.key], box, { textAlign: 'center' }));
      break;
    case 'learner': section('learner'); break;
    case 'payment': section('payment'); break;
    case 'bento-pair': section('reference'); break;
    case 'clay-card': {
      const box = layout.cards[2];
      rect(box.x, box.y, box.width, box.height);
      card(box);
      break;
    }
    case 'material': {
      const box = layout.cards[2];
      rect(box.x, box.y, box.width, box.height, { fill: '#f8fafccc', stroke: '#ffffff', strokeWidth: 2 });
      card(box);
      break;
    }
    case 'qr':
      rect(layout.qr.x, layout.qr.y, layout.qr.width, layout.qr.height,
        { fill: COLORS.paper, stroke: '#9aabb5', strokeDashArray: [4, 4], rx: 0, ry: 0, customType: 'qr_placeholder' });
      text(layout.qrLabel, { x: layout.qr.x + 4, y: layout.qr.y + 12, width: layout.qr.width - 8, fontSize: 8 });
      break;
    case 'signatures':
      layout.signatures.forEach(box => {
        text(box.label, { ...box, bold: true });
        text('Ký, ghi rõ họ tên', { ...box, y: box.y + 17, fontSize: 8 });
      });
      break;
    default: throw new RangeError(`Unknown receipt element: ${id}`);
  }
  return objects;
}

/** Returns independently editable native objects; bindings stay at canvas level. */
export async function createReceiptElement(fabric, id, options = {}) {
  if (!RECEIPT_ELEMENT_CATALOG.some(item => item.id === id)) throw new RangeError(`Unknown receipt element: ${id}`);
  const layout = createClayReceiptLayout(options);
  const objects = buildBlock(fabric, id, layout);
  const left = Math.min(...objects.map(object => object.left));
  const top = Math.min(...objects.map(object => object.top));
  const naturalWidth = Math.max(...objects.map(object => object.getBoundingRect().left + object.getBoundingRect().width)) - left;
  const scale = options.width === undefined ? 1 : positiveDimension(options.width, 'width') / naturalWidth;
  for (const key of ['left', 'top']) {
    if (options[key] !== undefined && !Number.isFinite(options[key])) throw new TypeError(`${key} must be finite`);
  }
  objects.forEach(object => {
    object.set({ left: (object.left - left) * scale + (options.left ?? left),
      top: (object.top - top) * scale + (options.top ?? top), scaleX: scale, scaleY: scale });
    object.setCoords();
  });
  return objects;
}

function positiveDimension(value, name) {
  if (!Number.isFinite(value) || value <= 0) throw new TypeError(`${name} must be positive and finite`);
  return value;
}

/** Adds only the requested block; never clears or saves the supplied canvas. */
export async function addReceiptElement(canvas, fabric, id, options = {}) {
  if (typeof canvas?.add !== 'function') throw new TypeError('A Fabric canvas is required');
  const objects = await createReceiptElement(fabric, id, options);
  canvas.add(...objects);
  canvas.requestRenderAll?.();
  return objects;
}

/** Detaches a top-level block in place, retaining world transforms and layer order. */
export function ungroupReceiptBlock(canvas, fabric, group) {
  const applyTransform = fabric?.util?.applyTransformToObject || fabric?.default?.util?.applyTransformToObject;
  if (!applyTransform || typeof group?.removeAll !== 'function' || typeof group?.getObjects !== 'function' ||
      typeof canvas?.getObjects !== 'function' || typeof canvas?.insertAt !== 'function' ||
      typeof canvas?.remove !== 'function') throw new TypeError('Fabric canvas, group and transform utility are required');
  const index = canvas.getObjects().indexOf(group);
  if (index < 0 || group.group) throw new TypeError('Receipt block must be a top-level canvas group');
  const snapshots = group.getObjects().map(object => ({ object, matrix: [...object.calcTransformMatrix()] }));
  canvas.discardActiveObject?.();
  group.removeAll();
  canvas.remove(group);
  const objects = snapshots.map(({ object, matrix }) => {
    applyTransform(object, matrix);
    object.setCoords();
    return object;
  });
  if (objects.length) canvas.insertAt(index, ...objects);
  canvas.requestRenderAll?.();
  return objects;
}

/** Complete portrait page, matching TemplateDesignerPage's rounded 96-DPI pixels. */
export async function createReceiptDesignerLayout(fabric, options = {}) {
  const layout = createClayReceiptLayout({ ...options, paper: options.paper ?? options.type ?? 'a4' });
  const objects = ['header', 'bento-pair', 'learner', 'payment', 'signatures', 'qr']
    .flatMap(id => buildBlock(fabric, id, layout));
  const footer = primitives(fabric, layout);
  footer.text(layout.metadata.footer, { x: 24, y: layout.canvas.height - 39,
    width: layout.canvas.width - 48, fontSize: 9 });
  const canvas = { width: Math.round(layout.canvas.width * POINT_TO_PIXEL), height: Math.round(layout.canvas.height * POINT_TO_PIXEL) };
  const width = options.width === undefined ? canvas.width : positiveDimension(options.width, 'width');
  const height = options.height === undefined ? canvas.height : positiveDimension(options.height, 'height');
  const scale = Math.min(width / canvas.width, height / canvas.height);
  const allObjects = [...objects, ...footer.objects];
  allObjects.forEach(object => {
    object.set({ left: object.left * scale, top: object.top * scale, scaleX: scale, scaleY: scale });
    object.setCoords();
  });
  return { objects: allObjects,
    canvas: { width, height },
    paper: { mode: 'preset', preset: layout.metadata.paper,
      width_mm: layout.metadata.paper === 'a4' ? 210 : 148,
      height_mm: layout.metadata.paper === 'a4' ? 297 : 210, label: layout.metadata.paper.toUpperCase() },
    orientation: 'portrait', backgroundColor: COLORS.paper };
}
