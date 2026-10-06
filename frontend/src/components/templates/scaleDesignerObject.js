function positive(value, name) {
  if (!Number.isFinite(value) || value <= 0) throw new TypeError(`${name} must be positive and finite`);
  return value;
}

/** Resizes one Fabric object without canvas, persistence or global state changes. */
export function scaleDesignerObject(object, scaleX, scaleY, options = {}) {
  positive(scaleX, 'scaleX');
  positive(scaleY, 'scaleY');
  if (typeof object?.set !== 'function') throw new TypeError('A Fabric object is required');
  const type = String(object.type || '').toLowerCase();
  const isText = ['textbox', 'text', 'i-text'].includes(type);
  const isGroup = ['group', 'activeselection'].includes(type) || typeof object.getObjects === 'function';
  const uniform = Math.min(scaleX, scaleY);
  const changes = {
    left: Number(object.left || 0) * (options.scalePosition === false ? 1 : scaleX),
    top: Number(object.top || 0) * (options.scalePosition === false ? 1 : scaleY),
  };
  if (isText) {
    Object.assign(changes, {
      width: Math.max(24, Number(object.width || 120) * scaleX),
      fontSize: Math.max(7, Number(object.fontSize || 14) * uniform),
      scaleX: Number(object.scaleX || 1), scaleY: Number(object.scaleY || 1),
    });
    if (object.bindingBoxHeight !== undefined) {
      changes.bindingBoxHeight = positive(positive(object.bindingBoxHeight, 'bindingBoxHeight') * scaleY, 'bindingBoxHeight');
    }
  } else {
    Object.assign(changes, {
      scaleX: Number(object.scaleX || 1) * (isGroup ? uniform : scaleX),
      scaleY: Number(object.scaleY || 1) * (isGroup ? uniform : scaleY),
    });
  }
  // Allocated boxes stay local inside groups; their world height scales via the group matrix.
  object.set(changes);
  object.setCoords?.();
  return object;
}
