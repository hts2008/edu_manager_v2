import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getConsoleNavigation } from '../src/console/consoleManifest.js';

test('experience navigation requires view permission', () => {
  assert.equal(getConsoleNavigation().some(item => item.id === 'experience'), false);
  assert.equal(getConsoleNavigation({ permissions: ['console.experience.view'] }).find(item => item.id === 'experience').path, '/admin/experience');
});
test('provider is under auth and experience route is protected', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(app, /<AuthProvider>\s*<ExperienceProvider>/);
  assert.match(app, /path="experience".*permission="console.experience.view"/);
  const api = readFileSync(new URL('../src/services/api.js', import.meta.url), 'utf8');
  assert.match(api, /get: \(\) => request\("\/ui-experience", \{ cache: "no-store", skipCache: true \}\)/);
  assert.match(api, /save: \(data\) => request\("\/ui-experience", \{ method: "PUT"/);
});
