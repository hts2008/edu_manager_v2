export const CLAY_RECEIPT_DEFAULTS = Object.freeze({
  paper: 'a4', centerName: 'TRUNG TÂM GIÁO DỤC', contact: 'Địa chỉ · Điện thoại',
  heading: 'PHIẾU THU HỌC PHÍ', footer: 'Cảm ơn quý phụ huynh đã đồng hành cùng trung tâm.',
});
export const CLAY_RECEIPT_PREVIEW = Object.freeze({
  receipt_id: 'cmfxreceiptpreview0000001', receipt_date: '06/10/2026', student_name: 'Nguyễn Minh An',
  parent_name: 'Trần Thu Hà', parent_phone: '0900 000 000', class_name: 'Tiếng Anh · Movers',
  month: '2026-10', amount_display: '1.250.000 ₫', amount_in_words: 'Một triệu hai trăm năm mươi nghìn đồng',
  payment_method: 'Chuyển khoản', notes: 'Học phí tháng 10',
});

export function readClayReceiptOptions(template) {
  let config = template?.json_config;
  if (typeof config === 'string') {
    try { config = JSON.parse(config); } catch { return null; }
  }
  if (template?.type !== 'receipt' || config?.version !== 2 || config?.clay_receipt?.schemaVersion !== 1) return null;
  return config.clay_receipt;
}

export function isClayReceiptTemplate(template) {
  return Boolean(readClayReceiptOptions(template));
}

function cleanText(value, fallback, max) {
  return (typeof value === 'string' ? value : fallback).trim().slice(0, max);
}

export function createClayReceiptLayout(options = {}) {
  const paper = options.paper ?? 'a4';
  if (!['a4', 'a5'].includes(paper)) throw new Error('Chỉ hỗ trợ A4/A5 dọc');
  const width = (paper === 'a4' ? 210 : 148) * 72 / 25.4;
  const height = (paper === 'a4' ? 297 : 210) * 72 / 25.4;
  const metadata = { schemaVersion: 1, paper };
  for (const [key, max] of [['centerName', 100], ['contact', 180], ['heading', 80], ['footer', 240]]) {
    metadata[key] = cleanText(options[key], CLAY_RECEIPT_DEFAULTS[key], max);
  }
  const margin = 24, inner = width - margin * 2, gap = 12, half = (inner - gap) / 2;
  const labels = {
    student_name: 'Học viên', parent_name: 'Phụ huynh', parent_phone: 'Điện thoại',
    class_name: 'Lớp học', month: 'Tháng học phí', receipt_date: 'Ngày thu',
    receipt_id: 'Mã phiếu', amount_display: 'Số tiền đã thu', amount_in_words: 'Bằng chữ',
    payment_method: 'Hình thức thanh toán', notes: 'Nội dung',
  };
  const cards = [], bindings = [], compact = paper === 'a5';
  const add = (field, x, y, w, h, fontSize = 11) => {
    labels[field] = cleanText(options.labels?.[field], labels[field], 40) || labels[field];
    cards.push({ x, y, width: w, height: h, tone: field === 'amount_display' ? '#eaf2f0' : '#ffffff', label: labels[field] });
    const insetY = compact ? 23 : 28;
    bindings.push({ field, x: x + 12, y: y + insetY, width: w - 24, height: h - insetY,
      fontSize, color: '#24343d', bold: field === 'amount_display', align: 'left' });
  };
  const rowHeight = compact ? 50 : 66, rowStep = compact ? 56 : 76;
  let y = compact ? 90 : 127;
  add('receipt_id', margin, y, half, compact ? 48 : 55, compact ? 10 : 11);
  add('receipt_date', margin + half + gap, y, half, compact ? 48 : 55);
  y += compact ? 54 : 65;
  add('student_name', margin, y, inner, compact ? 44 : 57);
  y += compact ? 50 : 67;
  add('parent_name', margin, y, half, rowHeight);
  add('parent_phone', margin + half + gap, y, half, rowHeight);
  y += rowStep;
  add('class_name', margin, y, half, rowHeight);
  add('month', margin + half + gap, y, half, rowHeight);
  y += rowStep;
  add('amount_display', margin, y, half, rowHeight, compact ? 14 : 16);
  add('payment_method', margin + half + gap, y, half, rowHeight);
  y += rowStep;
  add('amount_in_words', margin, y, inner, compact ? 50 : 65);
  y += compact ? 56 : 75;
  add('notes', margin, y, inner, compact ? 40 : 55, compact ? 10 : 11);
  y += compact ? 46 : 65;
  metadata.labels = labels;
  const section = (kind, first, last) => ({ kind, x: margin, y: cards[first].y,
    width: inner, height: cards[last].y + cards[last].height - cards[first].y });
  const sections = [section('reference', 0, 1), section('learner', 2, 6), section('payment', 7, 10)];
  const signatureY = y + 4, qrSize = compact ? 42 : 60, qrX = width - margin - qrSize;
  const signature = (label, x, availableWidth) => ({ label, x, y: signatureY, width: availableWidth,
    handwritingY: signatureY + 30, handwritingHeight: height - 39 - signatureY - 30 });
  const header = [
    { key: 'centerName', x: margin, y: compact ? 18 : 24, width: inner, height: compact ? 24 : 34, fontSize: compact ? 12 : 14, bold: true },
    { key: 'contact', x: margin, y: compact ? 45 : 61, width: inner, height: compact ? 24 : 26, fontSize: 10 },
    { key: 'heading', x: margin, y: compact ? 73 : 96, width: inner, height: compact ? 16 : 24, fontSize: compact ? 12 : 17, bold: true },
  ];
  return { canvas: { width, height }, bindings, cards, metadata, qrLabel: 'Vùng mã QR',
    header, sections, signatures: [signature('Người nộp tiền', margin, half),
      signature('Người thu tiền', margin + half + gap, qrX - margin - half - gap - 12)],
    qr: { x: qrX, y: signatureY, width: qrSize, height: qrSize } };
}

function rounded(ctx, x, y, width, height, radius = 8) {
  ctx.beginPath(); ctx.roundRect(x, y, width, height, radius);
}

function drawText(ctx, text, box, fontSize, bold = false, color = '#24343d') {
  ctx.save();
  ctx.beginPath(); ctx.rect(box.x, box.y, box.width, box.height); ctx.clip();
  ctx.font = `${bold ? '700' : '400'} ${fontSize}px Roboto, Arial, sans-serif`;
  ctx.fillStyle = color; ctx.textBaseline = 'top';
  const lines = [], lineHeight = fontSize * 1.2;
  let line = '';
  for (const word of String(text).split(/\s+/)) {
    if (ctx.measureText(`${line} ${word}`.trim()).width > box.width && line) { lines.push(line); line = ''; }
    for (const char of word) {
      if (ctx.measureText(line + char).width > box.width && line) { lines.push(line); line = ''; }
      line += char;
    }
    line += ' ';
  }
  if (line.trim()) lines.push(line.trim());
  const maxLines = Math.max(1, Math.floor(box.height / lineHeight));
  lines.slice(0, maxLines).forEach((value, i) => {
    if (i === maxLines - 1 && lines.length > maxLines) {
      while (value && ctx.measureText(`${value}…`).width > box.width) value = value.slice(0, -1);
      value += '…';
    }
    ctx.fillText(value, box.x, box.y + i * lineHeight);
  });
  ctx.restore();
}

export function renderClayReceiptBackground(layout) {
  const canvas = document.createElement('canvas');
  const scale = 2;
  canvas.width = Math.ceil(layout.canvas.width * scale);
  canvas.height = Math.ceil(layout.canvas.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Không thể tạo nền phiếu thu');
  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, layout.canvas.width, layout.canvas.height);
  const width = layout.canvas.width - 48;
  ctx.fillStyle = '#2d6660'; ctx.fillRect(24, 8, 38, 3);
  for (const block of layout.header) drawText(ctx, layout.metadata[block.key], block, block.fontSize, block.bold);
  for (const section of layout.sections) {
    ctx.save(); ctx.shadowColor = '#0f172a0a'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1;
    rounded(ctx, section.x, section.y, section.width, section.height, 8);
    ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.restore();
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 0.7;
    rounded(ctx, section.x, section.y, section.width, section.height, 8); ctx.stroke();
  }
  for (const card of layout.cards) {
    if (card.tone !== '#ffffff') {
      ctx.fillStyle = card.tone;
      rounded(ctx, card.x + 5, card.y + 5, card.width - 10, card.height - 10, 5); ctx.fill();
      ctx.fillStyle = '#2d6660'; ctx.fillRect(card.x + 5, card.y + 12, 2, card.height - 24);
    }
    drawText(ctx, card.label, { x: card.x + 12, y: card.y + 9, width: card.width - 24, height: 15 }, 10, true, '#52656f');
  }
  for (const signature of layout.signatures) {
    drawText(ctx, signature.label, { ...signature, height: 17 }, 10, true);
    drawText(ctx, 'Ký, ghi rõ họ tên', { ...signature, y: signature.y + 17, height: 13 }, 8);
  }
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(24, layout.canvas.height - 48);
  ctx.lineTo(layout.canvas.width - 24, layout.canvas.height - 48); ctx.stroke();
  const qr = layout.qr;
  ctx.strokeStyle = '#9aabb5'; ctx.setLineDash([3, 3]);
  ctx.strokeRect(qr.x, qr.y, qr.width, qr.height); ctx.setLineDash([]);
  drawText(ctx, layout.qrLabel, { x: qr.x + 4, y: qr.y + 12, width: qr.width - 8, height: 25 }, 8);
  drawText(ctx, layout.metadata.footer, { x: 24, y: layout.canvas.height - 39, width, height: 30 }, 9);
  return canvas.toDataURL('image/png');
}

export async function renderClayReceiptPreview(canvas, layout, background, values = CLAY_RECEIPT_PREVIEW) {
  const image = new Image();
  image.src = background;
  await image.decode();
  const pointToPixel = 96 / 72, resolution = 2;
  canvas.width = Math.ceil(layout.canvas.width * pointToPixel * resolution);
  canvas.height = Math.ceil(layout.canvas.height * pointToPixel * resolution);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Không thể xem trước phiếu thu');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  ctx.save(); ctx.scale(resolution, resolution);
  for (const binding of layout.bindings) {
    const box = Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, binding[key] * pointToPixel]));
    drawText(ctx, values[binding.field] ?? '', box, binding.fontSize * pointToPixel, binding.bold);
  }
  ctx.restore();
}

export function buildClayReceiptPayload({ name, layout, background }) {
  if (!name?.trim() || name.trim().length > 120) throw new Error('Tên mẫu phải có từ 1 đến 120 ký tự');
  if (!/^data:image\/png;base64,iVBORw0KGgo/.test(background || '')) throw new Error('Nền phải là ảnh PNG');
  return { template_name: name.trim(), type: 'receipt', paper_size: layout.metadata.paper,
    orientation: 'portrait', json_config: { version: 2, background: { src: background },
      canvas: layout.canvas, bindings: layout.bindings,
      clay_receipt: { ...layout.metadata, updatedAt: new Date().toISOString() } } };
}
