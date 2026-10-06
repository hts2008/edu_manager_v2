import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('receipt PDF offers formatted amount binding without changing canonical amount', () => {
  const source=readFileSync(new URL('../server/api/receipts/[id]/pdf.ts',import.meta.url),'utf8');
  assert.match(source,/amount_display:\s*new Intl\.NumberFormat\("vi-VN",\s*\{\s*style:\s*"currency",\s*currency:\s*"VND"\s*\}\)\.format\(receipt\.amount\)/);
  assert.match(source,/total_amount:\s*receipt\.amount/);
  assert.match(source,/amount_in_words:\s*numberToWords\(receipt\.amount\)/);
});
