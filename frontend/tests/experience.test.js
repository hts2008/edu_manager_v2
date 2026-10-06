import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

test('browser: actor isolation, readonly permissions and retained conflict draft', async () => {
  const directory = fileURLToPath(new URL('../', import.meta.url));
  const result = await build({ stdin: { contents: `
    import React from 'react'; import {createRoot} from 'react-dom/client';
    import {ExperienceProvider,useExperience} from './src/context/ExperienceContext.jsx';
    import ExperiencePage from './src/console/ExperiencePage.jsx'; import {TestAuthProvider} from 'test-auth';
    window.requests=[];window.saves=[];
    window.experienceApi={get:()=>new Promise(resolve=>window.requests.push(resolve)),save:async value=>{window.saves.push(value);return {success:false,status:409,error:{code:'VERSION_CONFLICT'}}}};
    function Probe(){window.experience=useExperience();return <span id="copy">{window.experience.text('common.save')}</span>}
    const root=createRoot(document.getElementById('root'));
    window.renderActor=(id,edit=true)=>root.render(<TestAuthProvider value={{user:id?{id,tenant_id:'tenant'}:null,hasPermission:key=>key==='console.experience.view'||edit}}><ExperienceProvider><Probe/><ExperiencePage/></ExperienceProvider></TestAuthProvider>);
    window.renderActor('one');
  `, resolveDir: directory, loader: 'jsx' }, bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic', loader: { '.css': 'empty' }, plugins: [{ name: 'unit-boundaries', setup(builder) {
    builder.onResolve({ filter: /test-auth|AuthContext$/ }, () => ({ path: 'auth', namespace: 'unit' }));
    builder.onResolve({ filter: /services\/api$/ }, () => ({ path: 'api', namespace: 'unit' }));
    builder.onResolve({ filter: /SettingsHistoryModal$/ }, () => ({ path: 'history', namespace: 'unit' }));
    builder.onLoad({ filter: /.*/, namespace: 'unit' }, ({ path }) => ({ resolveDir: directory, contents: path === 'auth' ? "import React from 'react'; const C=React.createContext(null); export const TestAuthProvider=C.Provider; export const useAuth=()=>React.useContext(C);" : path === 'api' ? 'export const experienceService={get:()=>window.experienceApi.get(),save:x=>window.experienceApi.save(x)};' : 'export default function History(){return null}', loader: 'jsx' }));
  } }] });
  const server = createServer((request, response) => { response.setHeader('Content-Type', request.url === '/app.js' ? 'text/javascript' : 'text/html'); response.end(request.url === '/app.js' ? result.outputFiles[0].text : '<div id="root"></div><script src="/app.js"></script>'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(() => window.requests.length === 1);
    await page.evaluate(() => window.renderActor('two'));
    await page.waitForFunction(() => window.requests.length === 2);
    const respond = (index, label, version) => page.evaluate(({ index, label, version }) => window.requests[index]({ success: true, data: { copy: { 'common.save': label }, theme: { preset: 'mint', radius: 'standard', depth: 'clay' }, config_version: version } }), { index, label, version });
    await respond(0, 'Old actor', 1);
    assert.equal(await page.locator('#copy').textContent(), 'Lưu');
    await respond(1, 'Current actor', 2);
    await page.getByLabel('common.save', { exact: true }).fill('Draft save');
    await page.getByRole('button', { name: 'Xuất bản', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Bản nháp được giữ lại' }).waitFor();
    assert.equal(await page.getByLabel('common.save', { exact: true }).inputValue(), 'Draft save');
    assert.equal(await page.evaluate(() => window.saves[0].expected_config_version), 2);
    await page.getByRole('button', { name: 'Tải bản mới' }).click();
    await page.waitForFunction(() => window.requests.length === 3);
    await respond(2, 'Remote save', 3);
    assert.equal(await page.getByLabel('common.save', { exact: true }).inputValue(), 'Draft save');
    await page.getByRole('button', { name: 'Dùng version mới, giữ bản nháp' }).click();
    assert.equal(await page.locator('ins').filter({ hasText: 'Draft save' }).count(), 1);
    await page.evaluate(() => window.renderActor('readonly', false));
    await page.waitForFunction(() => window.requests.length === 4);
    await respond(3, 'Readonly', 4);
    assert.equal(await page.getByRole('button', { name: 'Xuất bản', exact: true }).count(), 0);
    assert.equal(await page.getByLabel('common.save', { exact: true }).isDisabled(), true);
    await page.evaluate(() => window.renderActor(null, false));
    await page.waitForFunction(() => window.experience.text('common.save') === 'Lưu');
    assert.equal(await page.evaluate(() => window.saves.length), 1);
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
});
