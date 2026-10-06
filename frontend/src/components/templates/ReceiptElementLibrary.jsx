import { LayoutTemplate, GripVertical } from 'lucide-react';
import { RECEIPT_ELEMENT_CATALOG } from './receiptDesignerElements.js';
import { DESIGNER_ELEMENT_MIME } from './designerPlacement.js';
import ReceiptElementPreview from './ReceiptElementPreview.jsx';

export default function ReceiptElementLibrary({ disabled, onAdd, onLayout }) {
  return <section className="mb-5" aria-label="Thư viện thiết kế">
    <h2 className="mb-3 font-bold text-slate-950">Mẫu phiếu thu</h2>
    <div className="mb-5 grid grid-cols-2 gap-2">
      {['a4', 'a5'].map(paper => <button key={paper} type="button" disabled={disabled}
        onClick={() => onLayout(paper)} data-testid={`receipt-layout-${paper}`}
        className="rounded-lg border border-slate-200 bg-white p-3 text-left text-sm font-semibold shadow-sm hover:border-primary-300 disabled:opacity-50">
        <LayoutTemplate className="mb-2 text-primary-600" size={22} aria-hidden="true" />
        Phiếu thu {paper.toUpperCase()}
      </button>)}
    </div>
    <h2 className="mb-3 font-bold text-slate-950">Khối thiết kế</h2>
    <div className="grid grid-cols-2 gap-2">
      {RECEIPT_ELEMENT_CATALOG.map(item => <button key={item.id} type="button" draggable={!disabled}
        disabled={disabled} data-testid={`receipt-element-${item.id}`} title={item.label}
        onDragStart={event => { event.dataTransfer.setData(DESIGNER_ELEMENT_MIME, item.id); event.dataTransfer.effectAllowed = 'copy'; }}
        onClick={() => onAdd(item.id)}
        className="group rounded-lg border border-slate-200 bg-white p-2 text-left text-xs font-semibold text-slate-700 shadow-sm hover:border-primary-300 focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50">
        <div aria-hidden="true" className="mb-2 flex h-[60px] items-center justify-center overflow-hidden rounded-md bg-slate-50">
          <ReceiptElementPreview elementId={item.id} />
        </div>
        <span className="flex items-center justify-between gap-1"><span>{item.label}</span><GripVertical size={12} aria-hidden="true" /></span>
      </button>)}
    </div>
  </section>;
}
