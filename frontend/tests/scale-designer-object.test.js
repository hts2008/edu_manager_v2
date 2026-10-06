import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { scaleDesignerObject } from '../src/components/templates/scaleDesignerObject.js';

function object(type, props = {}) {
  return { type, left: 40, top: 50, width: 100, fontSize: 14, scaleX: 1, scaleY: 1,
    ...props, set(value) { Object.assign(this, value); }, setCoords() { this.coordsUpdated = true; } };
}

test('plain text retains width/font resize and allocated height scales on Y', () => {
  const text = object('Textbox', { bindingBoxHeight: 80, scaleX: 2, scaleY: 2 });
  scaleDesignerObject(text, .5, .75);
  assert.deepEqual([text.left, text.top, text.width, text.fontSize, text.bindingBoxHeight, text.scaleX, text.scaleY],
    [20, 37.5, 50, 7, 60, 2, 2]);
  assert.ok(text.coordsUpdated);
  const plain = object('i-text');
  scaleDesignerObject(plain, .1, .1, { scalePosition: false });
  assert.deepEqual([plain.left, plain.top, plain.width, plain.fontSize], [40, 50, 24, 7]);
  assert.equal('bindingBoxHeight' in plain, false);
  const fitted = object('textbox', { bindingBoxHeight: 80 });
  scaleDesignerObject(fitted, .5, .5, { scalePosition: false });
  assert.deepEqual([fitted.left, fitted.top, fitted.bindingBoxHeight], [40, 50, 40]);
});

test('groups use a uniform multiplier, shapes retain independent scaling; invalid sizes do not mutate', () => {
  for (const type of ['group', 'Group', 'activeSelection']) {
    const group = object(type, { getObjects: () => [], scaleX: 2, scaleY: 2 });
    scaleDesignerObject(group, .5, .75, { scalePosition: false });
    assert.deepEqual([group.left, group.top, group.scaleX, group.scaleY], [40, 50, 1, 1]);
  }
  const shape = object('rect'); scaleDesignerObject(shape, .5, .75);
  assert.deepEqual([shape.left, shape.top, shape.scaleX, shape.scaleY], [20, 37.5, .5, .75]);
  for (const scales of [[0, 1], [1, -1], [NaN, 1], [1, Infinity]]) {
    const text = object('textbox');
    assert.throws(() => scaleDesignerObject(text, ...scales), /positive and finite/);
    assert.equal(text.left, 40);
  }
  assert.throws(() => scaleDesignerObject(object('textbox', { bindingBoxHeight: -1 }), 1, 1), /bindingBoxHeight/);
});

test('actual Fabric payment group survives A4 to A5 and orientation scaling, export and reload', async () => {
  const bundle = await build({ stdin: { contents: `
    import * as fabric from 'fabric';
    import { createReceiptElement } from './src/components/templates/receiptDesignerElements.js';
    import { buildDesignerPrintConfig } from './src/components/templates/receiptDesignerExport.js';
    import { scaleDesignerObject } from './src/components/templates/scaleDesignerObject.js';
    window.scaleFixture = { fabric, createReceiptElement, buildDesignerPrintConfig, scaleDesignerObject };`,
    resolveDir: fileURLToPath(new URL('../', import.meta.url)),
  }, bundle: true, write: false, format: 'iife' });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const results = await page.evaluate(async () => {
      const { fabric, createReceiptElement, buildDesignerPrintConfig, scaleDesignerObject } = window.scaleFixture;
      const output = [];
      for (const target of [{ width: 559, height: 794, preset: 'a5', orientation: 'portrait' },
        { width: 1123, height: 794, preset: 'a4', orientation: 'landscape' }]) {
        const canvas = new fabric.StaticCanvas(null, { width: 794, height: 1123 });
        try {
          const children = await createReceiptElement(fabric, 'payment', { left: 0, top: 0, width: 500 });
          const group = new fabric.Group(children, { originX: 'left', originY: 'top', left: 80, top: 150 });
          canvas.add(group);
          const originalHeights = children.filter(o => o.bindingField).map(o => o.bindingBoxHeight);
          const sx = target.width / 794, sy = target.height / 1123;
          scaleDesignerObject(group, sx, sy);
          canvas.setDimensions({ width: target.width, height: target.height });
          const extra = { paper: { preset: target.preset }, orientation: target.orientation };
          const first = await buildDesignerPrintConfig(canvas, extra);
          await canvas.loadFromJSON(first.editor_source);
          const second = await buildDesignerPrintConfig(canvas, extra);
          const restoredGroup = canvas.getObjects()[0];
          output.push({ target, first: first.bindings, second: second.bindings,
            position: [group.left, group.top], expectedPosition: [80 * sx, 150 * sy],
            scales: [group.scaleX, group.scaleY], expectedScale: Math.min(sx, sy),
            originalHeights, restoredHeights: restoredGroup.getObjects().filter(o => o.bindingField).map(o => o.bindingBoxHeight) });
        } finally { await canvas.dispose(); }
      }
      return output;
    });
    for (const result of results) {
      assert.equal(result.first.length, 4);
      assert.deepEqual(result.position, result.expectedPosition);
      assert.deepEqual(result.scales, [result.expectedScale, result.expectedScale]);
      assert.deepEqual(result.restoredHeights, result.originalHeights);
      for (let i = 0; i < result.first.length; i++) {
        const binding = result.first[i];
        assert.ok(binding.x >= 0 && binding.y >= 0);
        assert.ok(binding.x + binding.width <= result.target.width);
        assert.ok(binding.y + binding.height <= result.target.height);
        for (const key of ['x', 'y', 'width', 'height', 'fontSize']) {
          assert.ok(Math.abs(binding[key] - result.second[i][key]) < .001, key);
        }
        assert.equal(binding.field, result.second[i].field);
      }
    }
  } finally { await browser.close(); }
});
