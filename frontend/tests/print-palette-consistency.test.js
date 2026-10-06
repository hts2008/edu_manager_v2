import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createClayReceiptLayout} from '../src/components/templates/clayReceiptTemplate.js';
import {PRINT_CSS} from '../src/components/student-progress/progressPrint.js';

test('receipt cards are neutral with one shell-teal soft amount accent',()=>{
  for (const paper of ['a4','a5']) {
    const layout=createClayReceiptLayout({paper});
    assert.deepEqual([...new Set(layout.cards.map(card=>card.tone))].sort(),['#eaf2f0','#ffffff']);
    assert.equal(layout.cards.filter(card=>card.tone==='#eaf2f0').length,1);
    assert.equal(layout.cards.find(card=>card.label==='Số tiền đã thu').tone,'#eaf2f0');
  }
});

test('report cards and charts use neutral surfaces and established chart series',()=>{
  assert.doesNotMatch(PRINT_CSS, /#eeebfb|#e5f5ed|#fff0e8|#e7f3fb|#f0edfc|#eaf6f5/);
  assert.match(PRINT_CSS,/\.pp-clay\{[^}]*background:#ffffff/);
  const source=readFileSync(new URL('../src/components/student-progress/ProgressPrintPreview.jsx',import.meta.url),'utf8');
  assert.doesNotMatch(source, /#0891b2|#8b7ab8|#329478|#348aac/);
  assert.match(source, /#4f46e5/);
  assert.match(source, /#64748b/);
});
