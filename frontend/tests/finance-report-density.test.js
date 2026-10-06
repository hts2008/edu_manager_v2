import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (name) => readFileSync(new URL(`../src/pages/${name}.jsx`, import.meta.url), 'utf8');

for (const name of ['FeeCollectionPage', 'PaymentsPage', 'ReceiptsPage', 'HistoryPage', 'ReportsPage']) {
  test(`${name} retains its own visual heading`, () => {
    const source = read(name);
    assert.match(source, /<h1\b/);
    assert.doesNotMatch(source, /<PageIntro\b/);
  });
}

test('fee and report summaries do not repeat header KPIs', () => {
  assert.doesNotMatch(read('ReportsPage'), /HeroMetric/);
  assert.doesNotMatch(read('FeeCollectionPage'), /label: 'Tổng dòng học phí'|label: 'Chờ thu'|label: 'Đã thu', value:/);
  assert.match(read('FeeCollectionPage'), /Mỗi dòng là một học viên - một lớp - một tháng/);
  assert.match(read('ReportsPage'), /grain student-class-month/);
  assert.match(read('FeeCollectionPage'), /data-testid="fee-grain-note"/);
  assert.match(read('ReportsPage'), /data-testid="report-grain-note"/);
  assert.doesNotMatch(read('FeeCollectionPage'), /description=/);
  assert.doesNotMatch(read('ReportsPage'), /description=/);
});

test('finance presentation keeps its former visual surfaces and safe fee filters', () => {
  assert.match(read('PaymentsPage'), /bg-gradient-to-br/);
  assert.match(read('HistoryPage'), /backdrop-blur-xl/);
  assert.match(read('ReportsPage'), /linear-gradient\(120deg/);
  assert.match(read('FeeCollectionPage'), /sm:grid-cols-2/);
  assert.match(read('FeeCollectionPage'), /grid-cols-\[2\.75rem_minmax\(0,1fr\)_2\.75rem\]/);
});

test('ordinary finance actions use tenant-aware buttons and retain their handlers', () => {
  const payments = read('PaymentsPage');
  assert.doesNotMatch(payments, /bg-gradient-to-r from-orange/);
  assert.match(payments, /type="submit"[\s\S]{0,150}className="btn-primary/);
  assert.match(payments, /paymentsService\.create/);
  assert.match(read('ReceiptsPage'), /receiptsService\.correct\(receipt.id, \{ reason \}\)/);
  assert.match(read('FeeCollectionPage'), /collectRows\(payableRows, 'cash'\)/);
  assert.match(read('FeeCollectionPage'), /collectRows\(payableRows, 'transfer'\)/);
  assert.match(read('HistoryPage'), /exportTransactions\(transactions\)/);
});
