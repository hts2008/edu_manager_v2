import test from 'node:test';
import assert from 'node:assert/strict';
import { canvasDropPoint } from '../src/components/templates/designerPlacement.js';

test('drop positions account for CSS zoom and scrolling bounds', () => {
  assert.deepEqual(canvasDropPoint({ x: 220, y: 250 }, { left: 20, top: 50, width: 400, height: 600 }, { width: 800, height: 1200 }), { left: 400, top: 400 });
  assert.deepEqual(canvasDropPoint({ x: -1, y: 9999 }, { left: 0, top: 0, width: 400, height: 600 }, { width: 800, height: 1200 }), { left: 0, top: 1200 });
  assert.throws(() => canvasDropPoint({ x: 0, y: 0 }, { width: 0, height: 0 }, { width: 1, height: 1 }));
});
