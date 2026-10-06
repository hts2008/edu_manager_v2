import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { CLAY_RECEIPT_PREVIEW, createClayReceiptLayout, buildClayReceiptPayload, isClayReceiptTemplate } from '../src/components/templates/clayReceiptTemplate.js';

test('A4/A5 portrait bindings use page points, bounded readable geometry and financial display fields', () => {
  for (const paper of ['a4', 'a5']) {
    const layout = createClayReceiptLayout({ paper });
    assert.equal(layout.canvas.width, (paper === 'a4' ? 210 : 148) * 72 / 25.4);
    for (const binding of layout.bindings) {
      assert.ok(binding.x >= 0 && binding.y >= 0);
      assert.ok(binding.x + binding.width <= layout.canvas.width);
      assert.ok(binding.y + binding.height <= layout.canvas.height);
      assert.ok(binding.fontSize >= 10);
    }
    for (const field of ['student_name', 'parent_name', 'class_name', 'month', 'receipt_date', 'receipt_id', 'amount_display', 'amount_in_words', 'payment_method']) {
      assert.ok(layout.bindings.some(b => b.field === field), field);
    }
    assert.equal(layout.qrLabel, 'Vùng mã QR');
    assert.equal(layout.qr.width, paper === 'a5' ? 42 : 60);
    assert.equal(layout.qr.height, layout.qr.width);
    assert.ok(layout.qr.y + layout.qr.height <= layout.canvas.height - 39);
    for (const signature of layout.signatures) {
      assert.ok(signature.handwritingHeight >= 55);
      assert.ok(signature.handwritingY + signature.handwritingHeight <= layout.canvas.height - 39);
      assert.ok(signature.x + signature.width <= layout.qr.x - 12);
    }
    assert.ok(layout.bindings.some(binding => binding.field === 'notes'));
    for (const card of layout.cards) assert.ok(card.y + card.height + 4 <= layout.signatures[0].y);
    for (const header of layout.header) assert.ok(header.y + header.height <= layout.cards[0].y);
    if (paper === 'a5') {
      const id = layout.bindings.find(binding => binding.field === 'receipt_id');
      assert.equal(id.fontSize, 10);
      assert.ok(id.height >= id.fontSize * 1.2 * 2);
    }
    assert.ok(!layout.bindings.some(b => /qr|balance/.test(b.field)));
  }
  assert.throws(() => createClayReceiptLayout({ paper: 'letter' }));
  assert.match(CLAY_RECEIPT_PREVIEW.receipt_id, /^c[a-z0-9]{24}$/);
});

test('long static metadata wraps with ellipsis inside its header and footer bounds', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const source = await readFile(new URL('../src/components/templates/clayReceiptTemplate.js', import.meta.url), 'utf8');
    const results = await page.evaluate(async source => {
      const module = await import(URL.createObjectURL(new Blob([source], { type: 'text/javascript' })));
      const original = CanvasRenderingContext2D.prototype.fillText;
      const calls = [];
      CanvasRenderingContext2D.prototype.fillText = function(text, x, y) {
        calls.push({ text, x, y, width: this.measureText(text).width, fontSize: Number(this.font.match(/([\d.]+)px/)[1]) });
        return original.call(this, text, x, y);
      };
      try {
        return ['a4', 'a5'].map(paper => {
          calls.length = 0;
          const layout = module.createClayReceiptLayout({ paper, centerName: 'W'.repeat(100),
            contact: 'W'.repeat(180), heading: 'W'.repeat(80), footer: 'W'.repeat(240) });
          module.renderClayReceiptBackground(layout);
          const blocks = [...layout.header, { x: 24, y: layout.canvas.height - 39, width: layout.canvas.width - 48, height: 30 }];
          return blocks.map(block => ({ block, lines: calls.filter(call => call.y >= block.y && call.y < block.y + block.height) }));
        });
      } finally { CanvasRenderingContext2D.prototype.fillText = original; }
    }, source);
    for (const blocks of results) for (const { block, lines } of blocks) {
      assert.ok(lines.length > 0);
      assert.ok(lines.at(-1).text.endsWith('…'));
      for (const line of lines) {
        assert.ok(line.x + line.width <= block.x + block.width + 0.01);
        assert.ok(line.y + line.fontSize <= block.y + block.height);
      }
    }
  } finally { await browser.close(); }
});

test('browser raster is valid PNG and payload round trips metadata without default or sample persistence', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const source = await readFile(new URL('../src/components/templates/clayReceiptTemplate.js', import.meta.url), 'utf8');
    const outputs = await page.evaluate(async source => {
      const module = await import(URL.createObjectURL(new Blob([source], { type: 'text/javascript' })));
      return ['a4', 'a5'].map(paper => {
        const layout = module.createClayReceiptLayout({ paper, centerName: 'Trung tâm kiểm thử', heading: 'PHIẾU THU' });
        const src = module.renderClayReceiptBackground(layout);
        return module.buildClayReceiptPayload({ name: 'Clay test', layout, background: src });
      });
    }, source);
    for (const payload of outputs) {
      const config = payload.json_config;
      assert.equal(config.version, 2);
      assert.equal(config.clay_receipt.schemaVersion, 1);
      assert.ok(Number.isFinite(Date.parse(config.clay_receipt.updatedAt)));
      assert.equal(payload.orientation, 'portrait');
      assert.equal(payload.type, 'receipt');
      assert.ok(!('is_default' in payload));
      const png = Buffer.from(config.background.src.split(',')[1], 'base64');
      assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
      assert.ok(png.length > 1000);
      assert.ok(isClayReceiptTemplate(payload));
      assert.ok(isClayReceiptTemplate({ ...payload, json_config: JSON.stringify(config) }));
      assert.ok(!JSON.stringify(payload).includes('PREVIEW-001'));
    }
  } finally { await browser.close(); }
});

test('mounted dialog saves only explicitly, guards double save, retries errors and updates existing Clay', async () => {
  const bundle = await build({ stdin: { contents: `
    import React from 'react'; import {createRoot} from 'react-dom/client';
    import Dialog from './src/components/templates/ClayReceiptTemplateDialog.jsx';
    window.calls=[]; window.events=[];
    const root=createRoot(document.getElementById('root'));
    window.mount=(template=null)=>root.render(<Dialog key={template?.id || 'new'} template={template} initialPaper="a5"
      onSaved={data=>window.events.push(['saved',data])} onClose={()=>window.events.push(['close'])}/>);
    window.mount();`, resolveDir: fileURLToPath(new URL('../', import.meta.url)), loader: 'jsx' },
    bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
    plugins: [{ name: 'test-service', setup(builder) {
      builder.onLoad({ filter: /services[\\/]api\.js$/ }, () => ({ loader: 'js', contents: `
        const request=(id,payload)=>{window.calls.push({id,payload});return new Promise(resolve=>window.finish=resolve)};
        export const templatesService={create:payload=>request(null,payload),update:request};` }));
    } }],
  });
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/app.js' ? 'text/javascript' : 'text/html');
    res.end(req.url === '/app.js' ? bundle.outputFiles[0].text : '<div id="root"></div><script src="/app.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const save = page.getByRole('button', { name: 'Lưu mẫu', exact: true });
    await save.waitFor();
    await page.waitForFunction(() => ![...document.querySelectorAll('button')].find(b => b.textContent === 'Lưu mẫu')?.disabled);
    assert.equal(await page.getByLabel('Khổ giấy', { exact: true }).inputValue(), 'a5');
    assert.equal(await page.evaluate(() => window.calls.length), 0);
    const pixels = await page.locator('canvas').evaluate(canvas => {
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let nonWhite = 0; for (let i = 0; i < data.length; i += 4) if (data[i] < 230) nonWhite++;
      return { width: canvas.width, nonWhite };
    });
    assert.ok(pixels.nonWhite > 5000);
    assert.equal(pixels.width, Math.ceil(148 * 72 / 25.4 * 96 / 72 * 2));
    await save.evaluate(button => { button.click(); button.click(); });
    assert.equal(await page.evaluate(() => window.calls.length), 1);
    assert.equal(await page.getByRole('button', { name: 'Đang lưu…', exact: true }).isDisabled(), true);
    await page.evaluate(() => window.finish({ success: false, error: { message: 'Save failed' } }));
    await page.getByRole('alert').filter({ hasText: 'Save failed' }).waitFor();
    assert.equal(await page.evaluate(() => window.events.length), 0);
    await save.click();
    await page.evaluate(() => window.finish({ success: true, data: { id: 'new-clay' } }));
    await page.waitForFunction(() => window.events.length === 2);
    assert.deepEqual(await page.evaluate(() => window.events.map(e => e[0])), ['saved', 'close']);
    await page.evaluate(() => window.mount({ id: 'existing-clay', template_name: 'Existing', type: 'receipt', is_default: true,
      json_config: window.calls[0].payload.json_config }));
    await page.waitForFunction(() => document.querySelector('input')?.value === 'Existing' && ![...document.querySelectorAll('button')].find(b => b.textContent === 'Lưu mẫu')?.disabled);
    await save.click();
    const call = await page.evaluate(() => window.calls.at(-1));
    assert.equal(call.id, 'existing-clay');
    assert.equal(call.payload.type, 'receipt');
    assert.ok(!('is_default' in call.payload));
    await page.evaluate(() => window.finish({ success: true, data: { id: 'existing-clay' } }));
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});

test('recognition rejects malformed, payment and unknown metadata; persistence rejects invalid input', () => {
  for (const value of [null, {}, { json_config: '{' }, { type: 'payment', json_config: { version: 2, clay_receipt: { schemaVersion: 1 } } }]) assert.equal(isClayReceiptTemplate(value), false);
  const layout = createClayReceiptLayout();
  assert.throws(() => buildClayReceiptPayload({ name: '', layout, background: 'data:image/png;base64,eA==' }));
  assert.throws(() => buildClayReceiptPayload({ name: 'test', layout, background: 'https://example.com/image' }));
});
