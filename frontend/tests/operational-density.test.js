import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/ui/OperationalPage.jsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/design/experience.css', import.meta.url), 'utf8');

test('shared operational heading has compact actions separate from its single metrics strip', () => {
  assert.match(source, /className="operational-heading"/);
  assert.match(source, /className="operational-heading-actions"/);
  assert.match(source, /className="operational-metrics"/);
  assert.doesNotMatch(source, /w-2\/5|tracking-tight|xl:grid-cols-\[minmax\(0,1fr\)_minmax\(360px/);
});

test('metric values remain readable without fabricated progress bars', () => {
  assert.match(source, /className="operational-metric-value"/);
  assert.doesNotMatch(source, /truncate text-2xl|classes\.accent/);
});

test('density changes preserve established route palette, panels and dialogs', () => {
  assert.doesNotMatch(styles, /\.teacher-shell main \.btn-primary/);
  assert.doesNotMatch(styles, /\.teacher-shell main \.eduflow-panel/);
  assert.match(styles, /\.operational-metrics/);
  assert.doesNotMatch(styles, /body:has\(|main h1 \{/);
  assert.match(source, /eduflow-eyebrow/);
  assert.match(source, /eduflow-muted/);
});
