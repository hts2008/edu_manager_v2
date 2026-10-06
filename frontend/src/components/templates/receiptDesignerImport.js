export async function importPrintTemplate(fabric, config, size) {
  if (config.editor_source?.objects) return config.editor_source;
  if (config.version !== 2 || !config.background?.src || !Array.isArray(config.bindings)) return null;
  const image = await fabric.FabricImage.fromURL(config.background.src, { crossOrigin: 'anonymous' });
  image.set({ left: 0, top: 0, originX: 'left', originY: 'top', scaleX: size.width / image.width,
    scaleY: size.height / image.height, customType: 'background_image', imageUrl: config.background.src });
  const sx = config.canvas ? size.width / config.canvas.width : 96 / 25.4;
  const sy = config.canvas ? size.height / config.canvas.height : 96 / 25.4;
  const objects = [image, ...config.bindings.map(binding => new fabric.Textbox(`${binding.prefix || ''}{{${binding.field}}}${binding.suffix || ''}`, {
    originX: 'left', originY: 'top', left: binding.x * sx, top: binding.y * sy,
    strokeWidth: 0,
    ...(binding.height === undefined ? {} : { bindingBoxHeight: binding.height * sy }),
    width: (binding.width ?? 80) * sx, fontSize: (binding.fontSize || 12) * 96 / 72,
    fill: binding.color || '#24343d', fontWeight: binding.bold ? 'bold' : 'normal',
    fontStyle: binding.italic ? 'italic' : 'normal', textAlign: binding.align || 'left',
    fontFamily: 'Arial', customType: 'binding', bindingField: binding.field,
  }))];
  return { objects: objects.map(object => object.toObject(['customType', 'bindingField', 'bindingBoxHeight', 'imageUrl'])), canvas: size, background: '#ffffff' };
}
