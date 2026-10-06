import { createRequire } from 'node:module';
import { ApiError } from './api-utils.js';

const require = createRequire(import.meta.url);
const PDFDocument = require('pdfkit');
const bundled = require('pdfmake/build/vfs_fonts.js');
const vfs = bundled.pdfMake?.vfs || bundled.default?.pdfMake?.vfs || bundled.default || bundled;
const measure = new PDFDocument({ autoFirstPage: false });
for (const [name, file] of Object.entries({
  regular: 'Roboto-Regular.ttf', bold: 'Roboto-Medium.ttf',
  italic: 'Roboto-Italic.ttf', bolditalic: 'Roboto-MediumItalic.ttf',
})) measure.registerFont(name, Buffer.from(vfs[file], 'base64'));
const critical = new Set(['receipt_id', 'payment_id', 'amount_display', 'amount_in_words', 'total_amount', 'amount']);

interface TextBox {
  text: string;
  field: string;
  width: number;
  height: number;
  fontSize: number;
  bold?: boolean;
  italic?: boolean;
}

function cannotFit(field: string): never {
  throw new ApiError('CLAY_RECEIPT_TEXT_OVERFLOW', `Clay receipt field ${field} cannot fit its text box`, 422);
}

// Explicit lines and noWrap keep PDFMake from choosing different wrap boundaries.
function wrap(text: string, width: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (!word) continue;
    const candidate = line ? `${line} ${word}` : word;
    if (measure.widthOfString(candidate) <= width) { line = candidate; continue; }
    if (line) { lines.push(line); line = ''; }
    for (const char of word) {
      if (line && measure.widthOfString(line + char) > width) { lines.push(line); line = ''; }
      line += char;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function fitClayReceiptText(box: TextBox) {
  if (![box.width, box.height, box.fontSize].every(value => Number.isFinite(value) && value > 0)) cannotFit(box.field);
  if (box.text.length > 100_000 || box.fontSize > 1_000) cannotFit(box.field);
  const font = box.bold ? (box.italic ? 'bolditalic' : 'bold') : (box.italic ? 'italic' : 'regular');
  measure.font(font);
  const minimum = Math.min(9, box.fontSize);
  const normalized = box.text.trim().replace(/\s+/g, ' ');
  let size = box.fontSize;
  let lines: string[] = [];
  let lineHeight = 0;
  const width = box.width - 0.01;
  while (true) {
    measure.fontSize(size);
    lineHeight = measure.currentLineHeight(true);
    lines = wrap(normalized, width);
    if (lines.length * lineHeight <= box.height && lines.every(line => measure.widthOfString(line) <= width)) break;
    if (size <= minimum) {
      if (critical.has(box.field)) cannotFit(box.field);
      const count = Math.floor(box.height / lineHeight);
      if (count < 1 || measure.widthOfString('…') > width) cannotFit(box.field);
      lines = lines.slice(0, count);
      let last = Array.from(lines.at(-1) || '');
      while (last.length && measure.widthOfString(last.join('') + '…') > width) last.pop();
      lines[lines.length - 1] = last.join('') + '…';
      break;
    }
    size = Math.max(minimum, size - 0.25);
  }
  return { text: lines.join('\n'), fontSize: size, noWrap: true,
    height: lines.length * lineHeight,
    maxWidth: Math.max(0, ...lines.map(line => measure.widthOfString(line))) };
}
