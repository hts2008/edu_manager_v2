export const PRINT_PAPERS = Object.freeze({ A4:[210,297], A5:[148,210], Letter:[215.9,279.4] });

export function paperDimensions(paper = 'A4', orientation = 'portrait') {
  const [short,long] = Object.hasOwn(PRINT_PAPERS,paper) ? PRINT_PAPERS[paper] : PRINT_PAPERS.A4;
  return orientation === 'landscape' ? {width:long,height:short} : {width:short,height:long};
}

// Shared, trusted rules only: no learner content is interpolated into CSS.
export const PRINT_CSS = `
.progress-print-document{box-sizing:border-box;background:#f8fafc;color:#283249;font:12px/1.55 Arial,sans-serif;padding:12mm;margin:0 auto;overflow-wrap:anywhere;letter-spacing:0}
.progress-print-document *{box-sizing:border-box}
.progress-print-document h1{font-size:24px;line-height:1.25;margin:16px 0 8px;color:#0f172a}
.progress-print-document h2{font-size:14px;margin:18px 0 8px;color:#0f172a}
.progress-print-document p{margin:6px 0;white-space:pre-wrap}
.progress-print-document header{border-bottom:1px solid #dddfee;padding:0 0 14px}
.progress-print-document .pp-brand{display:flex;align-items:center;gap:10px;color:#4f46e5}
.progress-print-document .pp-brand>svg{flex-shrink:0;filter:drop-shadow(0 2px 2px #64748b18)}
.progress-print-document .pp-kicker span{display:block;font-size:9px;color:#626879;text-transform:none;font-weight:400}
.progress-print-document .pp-period{margin-left:auto;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:4px 10px;font-size:10px;font-weight:700;color:#475569;white-space:nowrap}
.progress-print-document .pp-kicker{font-size:10px;text-transform:uppercase;color:#475569;font-weight:700}
.progress-print-document .pp-learner{font-size:20px;font-weight:700;line-height:1.3}
.progress-print-document .pp-muted{color:#596477;font-size:10px}
.progress-print-document .pp-clay{background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 3px 8px #0f172a0a,inset 0 2px 4px #ffffffdf,inset 0 -2px 4px #64748b0a;break-inside:avoid}
.progress-print-document .pp-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:16px 0}
.progress-print-document.pp-compact .pp-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
.progress-print-document .pp-metric{position:relative;padding:12px;min-width:0}
.progress-print-document .pp-metric>svg{position:absolute;right:10px;top:12px;color:#626879}
.progress-print-document .pp-metric-label{padding-right:18px;font-size:10px;min-height:30px}
.progress-print-document .pp-metrics strong{display:block;font-size:19px;color:#0f172a;margin:2px 0 8px}
.progress-print-document .pp-bar{height:5px;border-radius:8px;background:#58678418;overflow:hidden;box-shadow:inset 0 1px 2px #28324916;margin-top:6px;width:100%}
.progress-print-document .pp-bar span{display:block;height:100%;background:#4f46e5;border-radius:8px}
.progress-print-document .pp-charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin:16px 0}
.progress-print-document .pp-radar,.progress-print-document .pp-effort{padding:12px}
.progress-print-document figure{margin:0;break-inside:avoid;min-width:0}
.progress-print-document figcaption{font-weight:700;font-size:12px;color:#0f172a;margin-bottom:4px}
.progress-print-document .pp-chart{width:260px;max-width:100%;margin:auto}
.progress-print-document .pp-legend{display:flex;justify-content:center;gap:14px;font-size:10px;color:#475569}
.progress-print-document .pp-legend span:before{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:4px;background:#4f46e5}.progress-print-document .pp-legend .pp-previous:before{background:#64748b}
.progress-print-document table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:11px}
.progress-print-document th{background:#f1f5f9;text-align:left;color:#475569}
.progress-print-document th,.progress-print-document td{padding:7px 8px;border-bottom:1px solid #dce8eb;overflow-wrap:anywhere}
.progress-print-document tr{break-inside:avoid}
.progress-print-document thead{display:table-header-group}
.progress-print-document ul{padding-left:18px;margin:8px 0}
.progress-print-document li{margin:5px 0}
.progress-print-document .pp-timeline{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px 16px}
.progress-print-document .pp-timeline li{border-left:2px solid #cbd5e1;padding:0 0 0 10px;position:relative;break-inside:avoid}
.progress-print-document .pp-timeline li:before{content:'';position:absolute;left:-4px;top:5px;width:6px;height:6px;border-radius:50%;background:#4f46e5}
.progress-print-document time{display:block;font-size:10px;color:#596477}.progress-print-document .pp-timeline strong{font-size:11px}
.progress-print-document .pp-note{border-left:3px solid #cbd5e1;padding-left:12px;background:#ffffffaa;backdrop-filter:blur(8px)}
.progress-print-document .pp-note h2{padding-top:8px}.progress-print-document .pp-note p{padding-bottom:8px}
.progress-print-document .pp-steps{list-style:none;padding:0}.progress-print-document .pp-steps li{display:flex;align-items:flex-start;gap:10px;break-inside:avoid}
.progress-print-document .pp-step-number{flex:0 0 22px;height:22px;text-align:center;line-height:22px;background:#f1f5f9;color:#475569;border-radius:8px;box-shadow:inset 0 2px 3px #ffffff,inset 0 -2px 3px #64748b0a;font-size:10px;font-weight:700}
.progress-print-document footer{border-top:1px solid #cadfe3;margin-top:20px;padding-top:10px;font-size:10px;color:#526b74}
@media print{html,body{margin:0;padding:0;background:#fff}.progress-print-document{width:auto!important;min-height:0!important;padding:0;box-shadow:none;background:#fff}.progress-print-document .pp-clay{border-color:#e2e8f0;box-shadow:0 2px 5px #0f172a08,inset 0 2px 4px #ffffffdf,inset 0 -2px 4px #64748b0a}.progress-print-document .pp-note{backdrop-filter:none;background:#ffffff}*{print-color-adjust:exact;-webkit-print-color-adjust:exact}h2{break-after:avoid}}
`;

export function buildPrintDocument(root, paper, orientation) {
  if (!root || typeof root.innerHTML !== 'string') throw new Error('Bản xem trước chưa sẵn sàng.');
  if (Array.from(root.querySelectorAll?.('.recharts-wrapper') || []).some(chart => !chart.querySelector('svg'))) {
    throw new Error('Biểu đồ chưa sẵn sàng. Vui lòng thử lại sau khi tải xong.');
  }
  const {width,height} = paperDimensions(paper,orientation);
  // root is the mounted, React-escaped document, never an arbitrary HTML payload.
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Báo cáo học tập</title><style>${PRINT_CSS}\n@page{size: ${width}mm ${height}mm;margin:12mm}</style></head><body><article class="progress-print-document${width < 180 ? ' pp-compact' : ''}" style="width:${width}mm;min-height:${height}mm">${root.innerHTML}</article></body></html>`;
}

async function waitForPrintResources(popup,signal) {
  const images = Array.from(popup.document.images || []).map(image => {
    if (image.complete) return image.naturalWidth > 0 ? Promise.resolve() : Promise.reject(new Error('Không tải được ảnh trong báo cáo.'));
    return new Promise((resolve,reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Không tải được ảnh trong báo cáo.'));
    });
  });
  let timeout;
  let abort;
  try {
    await Promise.race([
      Promise.all([popup.document.fonts?.ready || Promise.resolve(),...images]),
      new Promise((_,reject) => {timeout = setTimeout(() => reject(new Error('Báo cáo chưa tải xong. Vui lòng thử lại.')),10000);}),
      new Promise((_,reject) => {abort=()=>reject(new Error('Đã hủy chuẩn bị in.'));signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted) abort();}),
    ]);
  } finally {clearTimeout(timeout);signal?.removeEventListener('abort',abort);}
}

export async function printProgressDocument(root,paper,orientation,openWindow = () => window.open('','_blank','width=1000,height=800'),signal) {
  const html = buildPrintDocument(root,paper,orientation);
  const popup = openWindow();
  if (!popup) throw new Error('Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép cửa sổ bật lên.');
  try {
    popup.opener = null;
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    await waitForPrintResources(popup,signal);
    if (popup.closed) throw new Error('Cửa sổ in đã đóng. Vui lòng thử lại.');
    if (signal?.aborted) throw new Error('Đã hủy chuẩn bị in.');
    popup.focus();
    popup.print();
  } catch (error) {popup.close?.();throw error;}
}
