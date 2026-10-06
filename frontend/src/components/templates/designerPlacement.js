export const DESIGNER_ELEMENT_MIME = 'application/x-edu-receipt-element';

export function canvasDropPoint(client, bounds, size) {
  if (!(bounds.width > 0 && bounds.height > 0)) throw new Error('Canvas chưa sẵn sàng');
  const x = (client.x - bounds.left) * size.width / bounds.width;
  const y = (client.y - bounds.top) * size.height / bounds.height;
  return { left: Math.max(0, Math.min(size.width, x)), top: Math.max(0, Math.min(size.height, y)) };
}
