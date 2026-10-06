import test from 'node:test';
import assert from 'node:assert/strict';
import { importPrintTemplate } from '../src/components/templates/receiptDesignerImport.js';

test('saved editable source reloads without flattening or rebuilding user layers', async () => {
  const source = { objects: [{ text: 'Edited' }] };
  assert.equal(await importPrintTemplate({}, { editor_source: source }, {}), source);
});

test('V2 background and dynamic overlays import in correct pixel coordinates', async () => {
  class ObjectStub {
    constructor(text, options) { Object.assign(this, options, { text }); }
    set(options) { Object.assign(this, options); }
    toObject() { return { ...this }; }
  }
  const image = new ObjectStub('', { width: 400, height: 600 });
  const fabric = { FabricImage: { fromURL: async () => image }, Textbox: ObjectStub };
  const result = await importPrintTemplate(fabric, { version: 2, background: { src: 'data:image/png;base64,test' }, canvas: { width: 400, height: 600 },
    bindings: [{ field: 'amount_display', x: 10, y: 20, width: 100, fontSize: 12, prefix: 'Số tiền: ', bold: true }] }, { width: 800, height: 1200 });
  assert.equal(result.objects[0].scaleX, 2);
  assert.equal(result.objects[1].left, 20);
  assert.equal(result.objects[1].top, 40);
  assert.equal(result.objects[1].fontSize, 16);
  assert.equal(result.objects[1].text, 'Số tiền: {{amount_display}}');
  assert.equal(await importPrintTemplate({}, { version: 1 }, {}), null);
});
