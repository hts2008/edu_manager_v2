import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
test('shell reserves fixed 240/72 rail and owns content scrolling', () => {
  const css = read('../src/index.css');
  assert.match(css, /--teacher-rail-width: 240px/);
  assert.match(css, /--teacher-rail-width: 72px/);
  assert.match(css, /margin-left: var\(--teacher-rail-width\)/);
  assert.match(css, /\.teacher-shell \.teacher-shell-rail\s*\{[^}]*position: fixed/s);
  assert.match(css, /\.teacher-shell \.eduflow-main\s*\{[^}]*overflow: auto/s);
  assert.match(css, /\.teacher-shell \.teacher-shell-nav\s*\{[^}]*overflow-y: auto/s);
});
test('drawer traps keyboard, restores focus and hides background', () => {
  const sidebar = read('../src/components/layout/Sidebar.jsx');
  const layout = read('../src/components/layout/MainLayout.jsx');
  assert.match(sidebar, /event.key === "Escape"/);
  assert.match(sidebar, /event.key !== "Tab"/);
  assert.match(sidebar, /previousFocus\?\.focus\(\)/);
  assert.match(sidebar, /aria-modal/);
  assert.match(layout, /inert=\{sidebarOpen\}/);
  assert.match(layout, /matchMedia/);
});
test('collapse keeps permission-filtered links named and active', () => {
  const sidebar = read('../src/components/layout/Sidebar.jsx');
  assert.match(sidebar, /hasPermission\(item.requiredPermission\)/);
  assert.match(sidebar, /aria-label=\{item.title\}/);
  assert.match(sidebar, /title=\{item.title\}/);
  assert.match(sidebar, /collapsed \|\|/);
  assert.match(read('../src/components/layout/Header.jsx'), /aria-controls="teacher-shell-navigation"/);
});
