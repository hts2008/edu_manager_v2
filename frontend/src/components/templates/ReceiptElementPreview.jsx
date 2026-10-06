import { useEffect, useRef } from 'react';
import { createReceiptElement } from './receiptDesignerElements.js';

export default function ReceiptElementPreview({ elementId }) {
  const target = useRef(null);
  useEffect(() => {
    let disposed = false;
    let canvas;
    void (async () => {
      const fabric = await import('fabric');
      const objects = await createReceiptElement(fabric, elementId, { paper: 'a5', width: 88, left: 0, top: 0 });
      if (disposed || !target.current) return;
      canvas = new fabric.StaticCanvas(target.current, { width: 100, height: 60, backgroundColor: '#f8fafc', enableRetinaScaling: true });
      const maxBottom = Math.max(...objects.map(object => { const box = object.getBoundingRect(); return box.top + box.height; }));
      const scale = Math.min(1, 48 / maxBottom);
      objects.forEach(object => object.set({ left: object.left * scale + 6, top: object.top * scale + 6, scaleX: object.scaleX * scale, scaleY: object.scaleY * scale }));
      canvas.add(...objects); canvas.renderAll();
    })().catch(() => { if (target.current) target.current.setAttribute('aria-label', 'Không thể tải hình xem trước'); });
    return () => { disposed = true; void canvas?.dispose(); };
  }, [elementId]);
  return <canvas ref={target} className="pointer-events-none mx-auto max-w-full" aria-hidden="true" />;
}
