import test from 'node:test';
import assert from 'node:assert/strict';
import {createClayReceiptLayout} from '../src/components/templates/clayReceiptTemplate.js';

test('receipt uses grouped document sections rather than eleven floating cards', () => {
  for (const paper of ['a4', 'a5']) {
    const layout = createClayReceiptLayout({paper});
    assert.equal(layout.sections.length, 3);
    assert.deepEqual(layout.sections.map(section => section.kind), ['reference', 'learner', 'payment']);
    assert.equal(layout.bindings.length, 11);
    assert.ok(layout.sections.every(section => section.width === layout.canvas.width - 48));
  }
});
