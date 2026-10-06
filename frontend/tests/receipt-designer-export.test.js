import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { bindingBoxFromMatrix, buildDesignerPrintConfig } from '../src/components/templates/receiptDesignerExport.js';

test('binding box uses full world matrix and centered Fabric coordinates', () => {
  assert.deepEqual(bindingBoxFromMatrix(100, 20, [2, 0, 0, 3, 150, 80]), {
    x: 50, y: 50, width: 200, height: 60, scaleY: 3,
  });
  for (const matrix of [[0, 1, -1, 0, 100, 100], [1, 0, .2, 1, 100, 100], [-1, 0, 0, 1, 100, 100]]) {
    assert.throws(() => bindingBoxFromMatrix(100, 20, matrix), /UNSUPPORTED_BINDING_TRANSFORM/);
  }
});

test('allocated height changes the bottom edge without moving the natural text anchor', () => {
  assert.deepEqual(bindingBoxFromMatrix(100, 20, [2, 0, 0, 3, 150, 80], 80), {
    x: 50, y: 50, width: 200, height: 240, scaleY: 3,
  });
  for (const height of [0, -1, NaN, Infinity]) {
    assert.throws(() => bindingBoxFromMatrix(100, 20, [1, 0, 0, 1, 100, 100], height), /INVALID_BINDING_GEOMETRY/);
  }
});

test('real V2 import preserves allocated height and top-left through grouped export and reload', async () => {
  const bundle = await build({ stdin: { contents: `
    import * as fabric from 'fabric';
    import { importPrintTemplate } from './src/components/templates/receiptDesignerImport.js';
    import { buildDesignerPrintConfig } from './src/components/templates/receiptDesignerExport.js';
    window.heightFixture = { fabric, importPrintTemplate, buildDesignerPrintConfig };`,
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
  }, bundle: true, write: false, format: 'iife' });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const result = await page.evaluate(async () => {
      const { fabric, importPrintTemplate, buildDesignerPrintConfig } = window.heightFixture;
      const original = { version: 2,
        background: { src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=' },
        canvas: { width: 400, height: 600 },
        bindings: [{ field: 'amount_in_words', x: 40, y: 50, width: 180, height: 80, fontSize: 12 }] };
      const before = JSON.stringify(original);
      const canvas = new fabric.StaticCanvas(null, { width: 400, height: 600 });
      const imported = await importPrintTemplate(fabric, original, { width: 400, height: 600 });
      await canvas.loadFromJSON(imported);
      const text = canvas.getObjects()[1];
      const naturalHeight = text.height;
      const first = await buildDesignerPrintConfig(canvas);
      canvas.remove(text);
      canvas.add(new fabric.Group([text]));
      const grouped = await buildDesignerPrintConfig(canvas);
      await canvas.loadFromJSON(grouped.editor_source);
      const reloaded = canvas.getObjects()[1].getObjects()[0];
      reloaded.set('fontSize', 20);
      const afterEdit = await buildDesignerPrintConfig(canvas);
      reloaded.set('bindingBoxHeight', 700);
      let outsideRejected = false;
      try { await buildDesignerPrintConfig(canvas); } catch (error) { outsideRejected = /BINDING_OUTSIDE_PAGE/.test(error.message); }
      await canvas.dispose();
      return { naturalHeight, first: first.bindings[0], grouped: grouped.bindings[0],
        afterEdit: afterEdit.bindings[0], allocated: grouped.editor_source.objects[1].objects[0].bindingBoxHeight,
        unchanged: before === JSON.stringify(original), outsideRejected };
    });
    assert.ok(result.naturalHeight < 80);
    assert.equal(result.allocated, 80);
    for (const binding of [result.first, result.grouped, result.afterEdit]) {
      assert.ok(Math.abs(binding.x - 40) < 1e-4);
      assert.ok(Math.abs(binding.y - 50) < 1e-4);
      assert.equal(binding.height, 80);
    }
    assert.equal(result.unchanged, true);
    assert.equal(result.outsideRejected, true);
  } finally { await browser.close(); }
});

function fixture(fail = false) {
  const text = { type: 'textbox', text: 'Fee: {{total_amount}} VND', bindingField: 'total_amount',
    width: 100, height: 20, fontSize: 12, fill: '#111827', visible: true,
    calcTransformMatrix: () => [1, 0, 0, 1, 100, 50] };
  const group = { visible: true, getObjects: () => [text] };
  const clone = { getObjects: () => [group], setViewportTransform: () => {},
    renderAll: () => {}, dispose: async () => {},
    toDataURL: () => { assert.equal(text.visible, false); if (fail) throw new Error('raster failure'); return 'data:image/png;base64,AA=='; } };
  const source = { version: '7.1.0', objects: [{ type: 'Group', objects: [{ type: 'Textbox', bindingField: 'total_amount', text: text.text }] }] };
  return { text, source, canvas: { getWidth: () => 400, getHeight: () => 600,
    toJSON: () => source, clone: async () => clone } };
}

test('V2 export hides nested bindings only on clone and retains independent editable source', async () => {
  const { canvas, source, text } = fixture();
  const result = await buildDesignerPrintConfig(canvas, { paper: { preset: 'a5' } });
  assert.equal(result.version, 2);
  assert.deepEqual(result.canvas, { width: 400, height: 600 });
  assert.deepEqual(result.bindings[0], { field: 'total_amount', x: 50, y: 40,
    width: 100, height: 20, fontSize: 12 * ((148 * 72 / 25.4) / 400),
    color: '#111827', align: 'left', bold: false, italic: false, prefix: 'Fee: ', suffix: ' VND' });
  assert.equal(text.visible, true);
  assert.deepEqual(result.editor_source.objects, source.objects);
  result.editor_source.objects.length = 0;
  assert.equal(source.objects.length, 1);
});

test('failed raster export restores clone visibility and does not return a partial contract', async () => {
  const { canvas, text } = fixture(true);
  await assert.rejects(buildDesignerPrintConfig(canvas), /raster failure/);
  assert.equal(text.visible, true);
});

test('real Fabric grouped shadow/radius raster keeps editable source and hides bound ink', async () => {
  const bundled = await build({ stdin: { contents: `
    import { StaticCanvas, Group, Rect, Textbox } from 'fabric';
    import { buildDesignerPrintConfig } from './src/components/templates/receiptDesignerExport.js';
    window.fixture = { StaticCanvas, Group, Rect, Textbox, buildDesignerPrintConfig };`,
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
  }, bundle: true, write: false, format: 'iife' });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.addScriptTag({ content: bundled.outputFiles[0].text });
    const result = await page.evaluate(async () => {
      const { StaticCanvas, Group, Rect, Textbox, buildDesignerPrintConfig } = window.fixture;
      const canvas = new StaticCanvas(null, { width: 400, height: 600 });
      const text = new Textbox('{{total_amount}}', { width: 100, left: 20, top: 20,
        fill: '#ff0000', fontSize: 12, bindingField: 'total_amount' });
      const group = new Group([new Rect({ width: 160, height: 80, rx: 15, ry: 15,
        fill: '#ffffff', shadow: { color: '#000000', blur: 4, offsetX: 2, offsetY: 2 } }), text],
      { left: 40, top: 40, scaleX: 1.2, scaleY: 1.2 });
      canvas.add(group);
      const before = JSON.stringify(canvas.toJSON(['bindingField']));
      canvas.setViewportTransform([2, 0, 0, 2, 30, 30]);
      const config = await buildDesignerPrintConfig(canvas);
      const image = new Image(); image.src = config.background.src; await image.decode();
      const raster = document.createElement('canvas'); raster.width = image.width; raster.height = image.height;
      const ctx = raster.getContext('2d'); ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
      let red = 0, ink = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] > 180 && pixels[i + 1] < 100 && pixels[i + 2] < 100 && pixels[i + 3]) red++;
        if (pixels[i + 3]) ink++;
      }
      const unchanged = before === JSON.stringify(canvas.toJSON(['bindingField']));
      await canvas.loadFromJSON(config.editor_source);
      const reloadedGroup = canvas.getObjects()[0];
      const reloadedText = reloadedGroup.getObjects().find(object => object.bindingField);
      if (reloadedText?.bindingField !== 'total_amount') throw new Error('Nested binding metadata lost');
      const roundtrip = await buildDesignerPrintConfig(canvas);
      reloadedText.set('bindingField', 'wrong_field');
      let mismatchRejected = false;
      try { await buildDesignerPrintConfig(canvas); } catch (error) { mismatchRejected = /INVALID_BINDING_TEXT/.test(error.message); }
      reloadedText.set('bindingField', 'total_amount');
      reloadedGroup.set('opacity', .5);
      let opacityRejected = false;
      try { await buildDesignerPrintConfig(canvas); } catch (error) { opacityRejected = /UNSUPPORTED_GROUP_STYLE/.test(error.message); }
      reloadedGroup.set('opacity', 1);
      canvas.add(new Group([new Rect({ width: 10, height: 10, fill: '#000000' })], { opacity: .5 }));
      await buildDesignerPrintConfig(canvas);
      reloadedText.set('angle', 15);
      let rejected = false;
      try { await buildDesignerPrintConfig(canvas); } catch (error) { rejected = /UNSUPPORTED_BINDING_TRANSFORM/.test(error.message); }
      await canvas.dispose();
      return { config, roundtrip, mismatchRejected, opacityRejected, unchanged, red, ink, rejected, dimensions: [image.width, image.height] };
    });
    assert.equal(result.unchanged, true);
    assert.equal(result.red, 0);
    assert.ok(result.ink > 100);
    assert.deepEqual(result.dimensions, [400, 600]);
    assert.equal(result.config.bindings[0].field, 'total_amount');
    assert.ok(result.config.editor_source.objects[0].objects.some(o => o.bindingField === 'total_amount'));
    assert.equal(result.rejected, true);
    assert.equal(result.mismatchRejected, true);
    assert.equal(result.opacityRejected, true);
    assert.deepEqual(result.roundtrip.bindings, result.config.bindings);
  } finally { await browser.close(); }
});
