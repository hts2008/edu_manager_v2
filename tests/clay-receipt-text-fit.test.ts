import assert from 'node:assert/strict';
import { it } from 'node:test';
import { inflateSync } from 'node:zlib';
import { fitClayReceiptText } from '../lib/clay-receipt-text-fit.js';
import { generatePdf } from '../lib/pdf.js';
import { onePixelPngDataUri } from './fixtures/template-render-v2.js';

it('shrinks full critical text and preserves every character', () => {
  const text = 'RCPT-12345678901234567890';
  const fit = fitClayReceiptText({ text, field: 'receipt_id', width: 145, height: 28, fontSize: 16 });
  assert.equal(fit.text.replace(/\n/g, ''), text);
  assert.ok(fit.fontSize >= 9 && fit.fontSize < 16);
  assert.ok(fit.height <= 28 && fit.maxWidth <= 145);
});

it('ellipsizes nonfinancial text only after trying minimum font', () => {
  const fit = fitClayReceiptText({ text: 'Lớp học tiếng Anh rất dài '.repeat(50), field: 'class_name', width: 150, height: 28, fontSize: 11 });
  assert.equal(fit.fontSize, 9);
  assert.ok(fit.text.endsWith('…'));
  assert.ok(fit.height <= 28 && fit.maxWidth <= 150);
});

for (const field of ['receipt_id', 'amount_display', 'amount_in_words']) {
  it(`rejects ${field} rather than silently truncating`, () => {
    assert.throws(() => fitClayReceiptText({ text: '1234567890'.repeat(100), field, width: 100, height: 27, fontSize: 14 }), /cannot fit/i);
  });
}

const template = (schemaVersion: number, field: string, width = 150, height = 28) => ({
  type: 'receipt', paper_size: 'a5', orientation: 'portrait',
  json_config: { version: 2, clay_receipt: { schemaVersion }, background: { src: onePixelPngDataUri },
    canvas: { width: 419.5276, height: 595.2756 },
    bindings: [{ field, x: 36, y: 200, width, height, fontSize: 11 }] },
});

it('renders long nonfinancial Clay fields on one PDF page', async () => {
  const pdf = await generatePdf(template(1, 'class_name'), { class_name: 'Lớp tiếng Anh '.repeat(500) });
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length, 1);
  const streams = Array.from(pdf.toString('latin1').matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g), match => {
    try { return inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1'); }
    catch { return ''; }
  }).join('\n');
  const positions = Array.from(streams.matchAll(/1 0 0 1 ([\d.-]+) ([\d.-]+) Tm/g), match => [Number(match[1]), Number(match[2])]);
  assert.equal(positions.length, 2, 'PDF preserves both separately fitted text lines');
  for (const [x, y] of positions) {
    assert.ok(x >= 35.99 && x <= 186.1);
    assert.ok(y >= 595.35 - 228.1 && y <= 595.35 - 199.9, `baseline ${y} stays inside binding`);
  }
});

for (const field of ['receipt_id', 'amount_display', 'amount_in_words']) {
  it(`renders full fitting ${field} into a single PDF page`, async () => {
    const value = field === 'receipt_id' ? 'RCPT-12345678901234567890'
      : field === 'amount_display' ? '123.456.789.000 ₫' : 'Một trăm hai mươi ba triệu đồng';
    const fit = fitClayReceiptText({ field, text: value, width: 150, height: 28, fontSize: 11 });
    assert.equal(fit.text.replace(/\s+/g, ''), value.replace(/\s+/g, ''));
    const pdf = await generatePdf(template(1, field), { [field]: value });
    assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length, 1);
  });
}

it('rejects an overflowing critical value during PDF generation', async () => {
  await assert.rejects(generatePdf(template(1, 'amount_in_words'), { amount_in_words: 'Một tỷ đồng '.repeat(100) }), /cannot fit/i);
});

it('preserves non-Clay V2 behavior even with an unknown Clay schema', async () => {
  const pdf = await generatePdf(template(2, 'amount_display', 5, 1), { amount_display: '1.250.000 ₫' });
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
});
