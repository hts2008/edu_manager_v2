import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { RECEIPT_ELEMENT_CATALOG, createReceiptElement, createReceiptDesignerLayout } from '../src/components/templates/receiptDesignerElements.js';

test('catalog has eight editable receipt blocks and rejects unsupported inputs', async () => {
  assert.deepEqual(RECEIPT_ELEMENT_CATALOG.map(item => item.id),
    ['header', 'learner', 'payment', 'qr', 'signatures', 'clay-card', 'bento-pair', 'material']);
  await assert.rejects(createReceiptElement({}, 'unknown'), /Unknown/);
  await assert.rejects(createReceiptDesignerLayout({}, { paper: 'letter' }), /A4\/A5/);
});

test('ungroup translated/scaled native Fabric block preserves world bounds, layers and print bindings', async () => {
  const bundle = await build({ stdin: { contents: `
    import * as fabric from 'fabric';
    import * as library from './src/components/templates/receiptDesignerElements.js';
    import { buildDesignerPrintConfig } from './src/components/templates/receiptDesignerExport.js';
    window.ungroupTest = { fabric, library, buildDesignerPrintConfig };`,
    resolveDir: fileURLToPath(new URL('../', import.meta.url)) }, bundle: true, write: false, format: 'iife' });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const result = await page.evaluate(async () => {
      const { fabric, library, buildDesignerPrintConfig } = window.ungroupTest;
      const canvas = new fabric.Canvas(document.createElement('canvas'), { width: 794, height: 1123 });
      try {
        const children = await library.createReceiptElement(fabric, 'payment', { left: 0, top: 0 });
        const group = new fabric.Group(children, { originX: 'left', originY: 'top', left: 110, top: 160, scaleX: 0.75, scaleY: 0.75,
          subTargetCheck: true, interactive: true });
        const back = new fabric.Rect({ width: 10, height: 10 });
        const front = new fabric.Rect({ left: 700, top: 900, width: 10, height: 10 });
        canvas.add(back, group, front);
        canvas.setActiveObject(group);
        const beforeBounds = children.map(o => o.getBoundingRect());
        const before = await buildDesignerPrintConfig(canvas);
        const detached = await library.ungroupReceiptBlock(canvas, fabric, group);
        const after = await buildDesignerPrintConfig(canvas);
        return { beforeBounds, afterBounds: detached.map(o => o.getBoundingRect()),
          beforeBindings: before.bindings, afterBindings: after.bindings,
          order: canvas.getObjects()[0] === back && canvas.getObjects().at(-1) === front,
          detached: detached.every((o, i) => o === children[i] && !o.group && o.canvas === canvas),
          groupRemoved: !canvas.getObjects().includes(group) && group.getObjects().length === 0,
          fields: after.editor_source.objects.filter(o => o.bindingField).map(o => [o.bindingField, o.text]) };
      } finally { await canvas.dispose(); }
    });
    assert.ok(result.order && result.detached && result.groupRemoved);
    for (let i = 0; i < result.beforeBounds.length; i++) {
      for (const key of ['left', 'top', 'width', 'height']) {
        assert.ok(Math.abs(result.beforeBounds[i][key] - result.afterBounds[i][key]) < 1e-7, `${i}:${key}`);
      }
    }
    assert.equal(result.beforeBindings.length, 4);
    result.beforeBindings.forEach((before, i) => {
      const after = result.afterBindings[i];
      for (const key of Object.keys(before)) {
        // Clone serialization rounds Fabric coordinates to four decimal places.
        if (typeof before[key] === 'number') assert.ok(Math.abs(before[key] - after[key]) < 0.001, `${key}: ${before[key]} -> ${after[key]}`);
        else assert.equal(after[key], before[key]);
      }
    });
    for (const [field, text] of result.fields) assert.equal(text, `{{${field}}}`);
  } finally { await browser.close(); }
});

test('native Fabric blocks export bindings, deterministic A4/A5 dimensions and editable primitives', async () => {
  const bundle = await build({ stdin: { contents: `import * as fabric from 'fabric';
    import * as library from './src/components/templates/receiptDesignerElements.js';
    import { buildDesignerPrintConfig } from './src/components/templates/receiptDesignerExport.js';
    window.receiptTest = { fabric, library, buildDesignerPrintConfig };`, resolveDir: fileURLToPath(new URL('../', import.meta.url)) },
    bundle: true, write: false, format: 'iife', platform: 'browser' });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const results = await page.evaluate(async () => {
      const { fabric, library, buildDesignerPrintConfig } = window.receiptTest;
      const outputs = [];
      const resized = await library.createReceiptDesignerLayout(fabric, { type: 'a5', width: 400, height: 600 });
      const resizedBlock = await library.createReceiptElement(fabric, 'learner', { width: 300, left: 10, top: 15 });
      if (resized.canvas.width !== 400 || resized.canvas.height !== 600) throw new Error('Custom page dimensions lost');
      const bounds = resizedBlock.map(o => o.getBoundingRect());
      const span = Math.max(...bounds.map(b => b.left + b.width)) - Math.min(...bounds.map(b => b.left));
      if (Math.abs(span - 300) > 0.01) throw new Error('Block width not scaled');
      await library.createReceiptElement(fabric, 'learner', { width: 0 }).then(
        () => { throw new Error('Invalid width accepted'); }, error => {
          if (!/positive/.test(error.message)) throw error;
        });
      for (const paper of ['a4', 'a5']) {
        const layout = await library.createReceiptDesignerLayout(fabric, { paper, centerName: 'TRUNG TÂM KIỂM THỬ' });
        const second = await library.createReceiptDesignerLayout(fabric, { paper, centerName: 'TRUNG TÂM KIỂM THỬ' });
        const canvas = new fabric.Canvas(document.createElement('canvas'), layout.canvas);
        canvas.add(...layout.objects);
        const json = canvas.toJSON(['customType', 'bindingField', 'bindingLabel']);
        await canvas.loadFromJSON(json);
        const print = await buildDesignerPrintConfig(canvas, { paper: layout.paper, orientation: layout.orientation });
        outputs.push({ paper, canvas: layout.canvas, json, print, reloaded: canvas.toObject(['bindingField']),
          deterministic: JSON.stringify(json.objects) === JSON.stringify(second.objects.map(o => o.toObject(['customType', 'bindingField', 'bindingLabel']))),
          blocks: await Promise.all(library.RECEIPT_ELEMENT_CATALOG.map(async item => {
            const objects = await library.createReceiptElement(fabric, item.id, { paper, left: 20, top: 30 });
            const blockCanvas = new fabric.StaticCanvas(null, layout.canvas);
            blockCanvas.add(...objects);
            const exported = await buildDesignerPrintConfig(blockCanvas, { paper: layout.paper });
            await blockCanvas.dispose();
            return { id: item.id, editable: objects.every(o => o.selectable && o.evented),
              exportedFields: exported.bindings.map(b => b.field),
              native: objects.every(o => o instanceof fabric.Rect || o instanceof fabric.Textbox),
              bounds: objects.map(o => o.getBoundingRect()),
              fields: objects.filter(o => o.bindingField).map(o => o.bindingField) };
          })) });
        const added = await library.addReceiptElement(canvas, fabric, 'qr', { paper });
        outputs.at(-1).added = added.every(o => canvas.getObjects().includes(o));
        await canvas.dispose();
      }
      return outputs;
    });
    for (const result of results) {
      assert.deepEqual(result.canvas, result.paper === 'a4' ? { width: 794, height: 1123 } : { width: 559, height: 794 });
      assert.ok(result.deterministic);
      assert.ok(result.added);
      const fields = result.json.objects.filter(o => o.bindingField).map(o => o.bindingField);
      const header = result.json.objects.find(o => o.text === 'TRUNG TÂM KIỂM THỬ');
      assert.ok(header && !header.bindingField);
      assert.equal(header.textAlign, 'center');
      for (const object of result.json.objects.filter(o => o.bindingField)) {
        assert.ok(object.bindingBoxHeight > 0);
        if (object.bindingField === 'amount_in_words') assert.equal(object.fontSize, 11 * 96 / 72);
      }
      assert.ok(!result.print.bindings.some(b => b.field === 'center_name'));
      for (const binding of result.print.bindings) {
        assert.ok(binding.x >= 0 && binding.y >= 0);
        assert.ok(binding.x + binding.width <= result.canvas.width);
        assert.ok(binding.y + binding.height <= result.canvas.height);
        assert.equal(binding.prefix, '');
        assert.equal(binding.suffix, '');
      }
      assert.deepEqual(fields.sort(), ['receipt_id', 'receipt_date', 'student_name', 'parent_name',
        'parent_phone', 'class_name', 'month', 'amount_display', 'payment_method', 'amount_in_words', 'notes'].sort());
      assert.deepEqual(result.reloaded.objects.filter(o => o.bindingField).map(o => o.bindingField).sort(), fields);
      for (const block of result.blocks) {
        assert.ok(block.editable && block.native, block.id);
        assert.deepEqual(block.exportedFields, block.fields);
        for (const box of block.bounds) {
          assert.ok(box.left >= 19.99 && box.top >= 29.99, block.id);
          assert.ok(box.left + box.width <= result.canvas.width && box.top + box.height <= result.canvas.height, block.id);
        }
        if (block.id === 'qr') assert.deepEqual(block.fields, []);
      }
      assert.ok(!JSON.stringify(result.json).includes('data:image'));
    }
    const pdfCheck = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
      import { generatePdf, numberToWords } from './lib/pdf.ts';
      let input = ''; for await (const chunk of process.stdin) input += chunk;
      const results = [];
      for (const {paper, print} of JSON.parse(input)) {
        const data = { receipt_id: 'cmfxreceiptpreview0000001', receipt_date: '06/10/2026',
          student_name: 'Nguyễn Minh An', parent_name: 'Trần Thu Hà', parent_phone: '0900000000',
          class_name: 'Tiếng Anh', month: '2026-10', payment_method: 'Chuyển khoản', notes: 'Học phí' };
        for (const amount of [1250000, 999999999]) {
          const pdf = await generatePdf({type:'receipt',paper_size:paper,orientation:'portrait',json_config:print},
            {...data,amount,total_amount:amount,amount_display:amount.toLocaleString('vi-VN')+' ₫',amount_in_words:numberToWords(amount)});
          if (pdf.subarray(0,4).toString() !== '%PDF') throw new Error('Invalid PDF');
          results.push({paper,amount,bytes:pdf.length});
        }
      }
      process.stdout.write(JSON.stringify(results));`], {
      cwd: fileURLToPath(new URL('../../', import.meta.url)),
      input: JSON.stringify(results.map(({paper,print}) => ({paper,print}))), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
    });
    assert.equal(pdfCheck.status, 0, pdfCheck.stderr);
    assert.equal(JSON.parse(pdfCheck.stdout).length, 4);
  } finally { await browser.close(); }
});
