import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../src/pages/TemplateDesignerPage.jsx', import.meta.url), 'utf8');

test('designer history retains custom properties and never refits persisted geometry', () => {
  assert.doesNotMatch(page, /toJSON\(CUSTOM_JSON_PROPS\)/);
  const restore = page.slice(page.indexOf('const restoreCanvasSnapshot'), page.indexOf('const undo ='));
  assert.doesNotMatch(restore, /applyLoadedCanvasAlignment|fitObjectsInsideCanvas/);
  assert.match(page, /raw\.version !== 2 && !raw\.editor_source/);
});

test('receipt block insertion is a single undo transaction', () => {
  const insertion = page.slice(page.indexOf('const addReceiptElement ='), page.indexOf('const applyReceiptLayout ='));
  assert.match(insertion, /restoringRef\.current = true/);
  assert.match(insertion, /restoringRef\.current = false;\s*captureHistory\(\)/);
  assert.match(insertion, /new fabric\.Group\(objects, \{ originX: "left", originY: "top"/);
});
