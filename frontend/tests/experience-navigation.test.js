import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

test('experience browser navigation protects drafts and pending publication', async t => {
  const directory = fileURLToPath(new URL('../', import.meta.url));
  const bundle = await build({ stdin: { contents: `
    import React from 'react'; import {createRoot} from 'react-dom/client';
    import {BrowserRouter,Routes,Route,Link,useNavigate,UNSAFE_NavigationContext} from 'react-router-dom';
    import ExperiencePage from './src/console/ExperiencePage.jsx';
    import {ExperienceProvider} from './src/context/ExperienceContext.jsx';
    import {TestAuthProvider} from 'test-auth';
    window.confirmations=0; window.accept=false; window.edit=true; window.saves=[];
    window.confirm=()=>{window.confirmations++;return window.accept};
    window.experienceApi={get:async()=>({success:true,data:{copy:{},theme:{preset:'mint',radius:'standard',depth:'clay'},config_version:2}}),
      save:value=>new Promise((resolve,reject)=>{window.saves.push(value);window.resolveSave=resolve;window.rejectSave=reject})};
    function Shell(){
      const navigate=useNavigate(); const {navigator}=React.useContext(UNSAFE_NavigationContext);
      React.useLayoutEffect(()=>{window.originals={push:navigator.push,replace:navigator.replace,go:navigator.go};window.navigatorRef=navigator},[navigator]);
      window.navigate=navigate;
      return <><Link to='/other'>Other route</Link><Link to='/other' target='_blank'>New tab</Link>
        <Routes><Route path='/experience' element={<ExperiencePage/>}/><Route path='*' element={<p id='other'>Other page</p>}/></Routes></>;
    }
    const root=createRoot(document.getElementById('root'));
    window.render=()=>root.render(<TestAuthProvider value={{user:{id:'actor',tenant_id:'tenant'},hasPermission:key=>key==='console.experience.view'||window.edit}}>
      <ExperienceProvider><BrowserRouter><Shell/></BrowserRouter></ExperienceProvider></TestAuthProvider>);
    window.render();
  `, resolveDir: directory, loader: 'jsx' }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', loader: { '.css': 'empty' }, plugins: [{ name: 'boundaries', setup(builder) {
    builder.onResolve({ filter: /test-auth|AuthContext$/ }, () => ({ path: 'auth', namespace: 'unit' }));
    builder.onResolve({ filter: /services\/api$/ }, () => ({ path: 'api', namespace: 'unit' }));
    builder.onResolve({ filter: /SettingsHistoryModal$/ }, () => ({ path: 'history', namespace: 'unit' }));
    builder.onLoad({ filter: /.*/, namespace: 'unit' }, ({ path }) => ({ resolveDir: directory, loader: 'jsx', contents: path === 'auth'
      ? "import React from 'react';const C=React.createContext(null);export const TestAuthProvider=C.Provider;export const useAuth=()=>React.useContext(C);"
      : path === 'api' ? 'export const experienceService={get:()=>window.experienceApi.get(),save:value=>window.experienceApi.save(value)};'
        : 'export default function History(){return null}' }));
  } }] });
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/app.js' ? 'text/javascript' : 'text/html');
    res.end(req.url === '/app.js' ? bundle.outputFiles[0].text : '<div id="root"></div><script src="/app.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const base = `http://127.0.0.1:${server.address().port}`;
    const open = async () => {
      const page = await browser.newPage();
      await page.goto(`${base}/other`);
      await page.evaluate(() => window.navigate('/experience'));
      await page.getByLabel('common.save', { exact: true }).waitFor();
      return page;
    };
    const draft = page => page.getByLabel('common.save', { exact: true });
    const unloadPrevented = page => page.evaluate(() => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event); return event.defaultPrevented;
    });
    await t.test('anchor, push and replace cancel without losing draft; approved anchor prompts once', async () => {
      const page = await open();
      await draft(page).fill('Draft save');
      await page.getByRole('link', { name: 'Other route', exact: true }).click();
      await page.evaluate(() => window.navigate('/other'));
      await page.evaluate(() => window.navigate('/other', { replace: true }));
      assert.equal(await draft(page).inputValue(), 'Draft save');
      assert.equal(await page.evaluate(() => window.confirmations), 3);
      assert.equal(await unloadPrevented(page), true);
      await page.evaluate(() => {window.accept=true});
      await page.getByRole('link', { name: 'Other route', exact: true }).click();
      await page.locator('#other').waitFor();
      assert.equal(await page.evaluate(() => window.confirmations), 4);
      assert.equal(await page.evaluate(() => ['push','replace','go'].every(key=>window.navigatorRef[key]===window.originals[key])), true);
      assert.equal(await unloadPrevented(page), false);
      await page.close();
    });
    await t.test('programmatic go and native back/forward restore the exact entry on cancellation', async () => {
      const page = await open();
      await draft(page).fill('Retained');
      await page.evaluate(() => window.navigate(-1));
      assert.equal(await draft(page).inputValue(), 'Retained');
      // Native Back bypasses navigator.go, so verify URL restoration as well as mounted state.
      await page.evaluate(() => window.history.back());
      await page.waitForFunction(() => window.location.pathname === '/experience' && window.confirmations === 2);
      assert.equal(await draft(page).inputValue(), 'Retained');
      await page.evaluate(() => {window.accept=true;window.navigate('/experience?second=1')});
      await page.waitForURL('**/experience?second=1');
      await page.evaluate(() => {window.accept=false;window.history.back()});
      await page.waitForFunction(() => window.location.search === '?second=1' && window.confirmations === 4);
      assert.equal(await draft(page).inputValue(), 'Retained');
      await page.evaluate(() => {window.accept=true;window.history.back()});
      await page.waitForFunction(() => window.location.search === '');
      await page.evaluate(() => {window.accept=false;window.history.forward()});
      await page.waitForFunction(() => window.location.search === '' && window.confirmations === 6);
      assert.equal(await draft(page).inputValue(), 'Retained');
      await page.close();
    });
    await t.test('out-of-range go does not authorize a later dirty native pop', async () => {
      const page = await open();
      await page.evaluate(() => window.navigate(1));
      await draft(page).fill('Still protected');
      await page.evaluate(() => window.history.back());
      await page.waitForFunction(() => window.location.pathname === '/experience' && window.confirmations === 1);
      assert.equal(await draft(page).inputValue(), 'Still protected');
      await page.close();
    });
    for (const outcome of ['success', 'conflict', 'unknown']) await t.test(`pending publish blocks navigation until ${outcome}`, async () => {
      const page = await open();
      await draft(page).fill('Publishing');
      await page.getByRole('button', { name: 'Xuất bản', exact: true }).click();
      await page.waitForFunction(() => window.saves.length === 1);
      // Permission changes must not remove the pending-publication guard.
      await page.evaluate(() => {window.edit=false;window.accept=true;window.render()});
      await page.getByRole('link', { name: 'Other route', exact: true }).click();
      await page.evaluate(() => {window.navigate('/other');window.navigate('/other',{replace:true});window.navigate(-1);window.history.back()});
      await page.waitForFunction(() => window.location.pathname === '/experience');
      assert.equal(await draft(page).inputValue(), 'Publishing');
      assert.equal(await page.evaluate(() => window.confirmations), 0);
      assert.equal(await unloadPrevented(page), true);
      await page.evaluate(outcome => {
        window.edit=true;window.render();
        if(outcome==='success') window.resolveSave({success:true,data:{copy:{'common.save':'Publishing'},theme:{preset:'mint',radius:'standard',depth:'clay'},config_version:4}});
        else if(outcome==='conflict') window.resolveSave({success:false,status:409,error:{code:'SETTING_CONFIG_CONFLICT'}});
        else window.rejectSave(new Error('Response lost'));
      }, outcome);
      await page.getByRole('status').filter({hasText:outcome==='success' ? 'Đã xuất bản.' : outcome==='conflict' ? 'Bản nháp được giữ lại' : 'Chưa xác định kết quả lưu'}).waitFor();
      assert.equal(await draft(page).inputValue(), 'Publishing');
      assert.equal(await unloadPrevented(page), outcome !== 'success');
      await page.evaluate(() => {window.accept=false;window.navigate('/other')});
      if(outcome==='success') await page.locator('#other').waitFor();
      else assert.equal(await draft(page).inputValue(), 'Publishing');
      await page.close();
    });
    await t.test('readonly changes are not dirty and clean navigation does not prompt', async () => {
      const page = await open();
      await draft(page).fill('Permission revoked draft');
      await page.evaluate(() => {window.edit=false;window.render()});
      assert.equal(await draft(page).isDisabled(), true);
      assert.equal(await unloadPrevented(page), false);
      await page.getByRole('link', { name: 'Other route', exact: true }).click();
      await page.locator('#other').waitFor();
      assert.equal(await page.evaluate(() => window.confirmations), 0);
      await page.close();
    });
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
