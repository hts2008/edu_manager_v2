import test from 'node:test';
import assert from 'node:assert/strict';
import { designerErrorMessage } from '../src/components/templates/designerErrors.js';

test('print guard failures are actionable without leaking internal codes', () => {
  assert.match(designerErrorMessage(new Error('BINDING_OUTSIDE_PAGE')), /khổ giấy/);
  assert.match(designerErrorMessage(new Error('UNSUPPORTED_BINDING_TRANSFORM: rotation')), /tỷ lệ/);
  assert.match(designerErrorMessage(new Error('INVALID_BINDING_TEXT: mismatch')), /trường dữ liệu/);
  assert.equal(designerErrorMessage(new Error('Không có quyền lưu mẫu.')), 'Không có quyền lưu mẫu.');
});
