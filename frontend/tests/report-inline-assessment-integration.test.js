import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const source = readFileSync(new URL('../src/pages/StudentProgressReportPage.jsx', import.meta.url), 'utf8');

test('report is default with only report/overview tabs and inline current-month assessment', () => {
  assert.match(source, /useState\("report"\)/);
  assert.match(source, /from: month,\s+to: month/);
  assert.match(source, /\[\["report", "Báo cáo"\], \["overview", "Tổng quan"\]\]/);
  assert.doesNotMatch(source, /ProgressRosterWorkspace|progress-panel-update|progress-tab-update|type="date"/);
  assert.match(source, />Chấm điểm<\/th>/);
  assert.doesNotMatch(source, /row\.month === currentBusinessMonth\(\)/);
  assert.match(source, /<ReportInlineAssessment/);
  assert.match(source, /<tr key=\{rowKey\(row\)\}/);
});

test('report table replaces standalone month and average/delta cells with two row chart cells', () => {
  const table = source.slice(source.indexOf('<table className="min-w-full divide-y'), source.indexOf('</table>', source.indexOf('<table className="min-w-full divide-y')));
  assert.match(source, /import RowProgressCharts, \{ reportEvidenceLabel as progressEvidenceLabel \} from "\.\.\/components\/student-progress\/ReportRowCharts"/);
  assert.match(table, />Kỹ năng<\/th>/);
  assert.match(table, />Nỗ lực cộng dồn<\/th>/);
  assert.match(table, /<RowProgressCharts row=\{row\} \/>/);
  assert.doesNotMatch(table, />Tháng<\/th>|Điểm TB \/ Delta|daily_average_score|daily_score_delta|progressReportScoreNote/);
  assert.match(table, /row\.class_name[\s\S]*monthLabel\(row\.month\)/);
  assert.match(table, /month=\$\{encodeURIComponent\(row\.month\)\}/);
  assert.match(table, /<tr key=\{rowKey\(row\)\}/);
});

test('both print actions open the shared preview with canonical report rows', () => {
  assert.match(source, /import ProgressPrintPreview from "\.\.\/components\/student-progress\/ProgressPrintPreview"/);
  assert.match(source, /const \[printRow, setPrintRow\] = useState\(null\)/);
  assert.match(source, /onClick=\{\(\) => openPrintPreview\(row\)\}/);
  assert.match(source, /onClick=\{\(\) => openPrintPreview\(selectedRow\)\}/);
  assert.match(source, /data\?\.__requestKey !== requestKey/);
  assert.match(source, /if \(navigationState\.current\.saving \|\| printUnavailable\) return/);
  assert.match(source, /<ProgressPrintPreview row=\{printRow\} onClose=\{\(\) => setPrintRow\(null\)\} \/>/);
  assert.doesNotMatch(source, /printProgressReport|escapeHtml|window\.open|document\.write|<!doctype html>/);
});

test('mounted report guards every scope change and preserves another real inline draft after save', async () => {
  const directory = fileURLToPath(new URL('../', import.meta.url));
  const bundle = await build({ stdin: { contents: `
    import React from 'react'; import {createRoot} from 'react-dom/client';
    import {BrowserRouter,Routes,Route,Link} from 'react-router-dom';
    import Page from './src/pages/StudentProgressReportPage.jsx';
    import {businessMonth} from './src/components/student-progress/ReportInlineAssessment.jsx';
    const month=businessMonth(); window.month=month; window.accept=false; window.confirmations=0;
    window.confirm=message=>{window.confirmations++;window.lastPrompt=message;return window.accept};
    window.queries=[]; window.submissions=[];
    const row=id=>({student_id:id,class_id:'class',student_name:id,class_name:'Class',month,
      track_label:'Movers',cefr_level:'A1',readiness_band:'on_track',daily_average_score:50,
      daily_assessment_count:4,assessment_submission_count:0,evidence_version:'v1',
      next_actions:[],evidence_notes:[],skill_scores:[],chart_timeline:['initial']});
    window.rows=[row('A'),row('B')];
    window.api={report:async query=>{window.queries.push(query);return {success:true,data:{students:window.rows,
      summary:{},charts:{},framework:{tracks:{}},meta:{classes:[{id:'class',class_name:'Class'}]},
      pagination:{page:query.page,total_pages:2,total_items:window.rows.length}}}},
      get:async scope=>({success:true,data:{row:{...row(scope.student_id),...scope},entry_date:month+'-06'}}),
      save:payload=>new Promise(resolve=>{window.submissions.push(payload);window.resolveSave=()=>{
        const saved={...row(payload.student_id),evidence_version:'v2',assessment_submission_count:1,chart_timeline:['saved']};
        window.rows=[saved];resolve({success:true,data:{row:saved}});
      }})};
    createRoot(document.getElementById('root')).render(<BrowserRouter><Link to='/other'>Other</Link>
      <Routes><Route path='/' element={<Page/>}/><Route path='/other' element={<p>Other page</p>}/></Routes></BrowserRouter>);
  `, resolveDir: directory, loader: 'jsx' }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', plugins: [{ name: 'test-boundaries', setup(builder) {
    builder.onResolve({ filter: /services\/api$/ }, () => ({ path: 'api', namespace: 'test' }));
    builder.onResolve({ filter: /AuthContext$/ }, () => ({ path: 'auth', namespace: 'test' }));
    builder.onResolve({ filter: /ExperienceContext$/ }, () => ({ path: 'experience', namespace: 'test' }));
    builder.onResolve({ filter: /^recharts$/ }, () => ({ path: 'charts', namespace: 'test' }));
    builder.onResolve({ filter: /ReportRowCharts$/ }, () => ({ path: 'row-charts', namespace: 'test' }));
    builder.onResolve({ filter: /ProgressPrintPreview$/ }, () => ({ path: 'print-preview', namespace: 'test' }));
    builder.onLoad({ filter: /.*/, namespace: 'test' }, ({ path }) => ({ resolveDir: directory, loader: 'jsx', contents: path === 'api'
      ? 'export const reportsService={getStudentProgress:q=>window.api.report(q)};export const studentProgressService={getSubmission:s=>window.api.get(s),submitAssessment:p=>window.api.save(p)};'
      : path === 'auth' ? "export const useAuth=()=>({user:{id:'actor',tenant_id:'tenant'},hasPermission:()=>true});"
        : path === 'experience' ? "export const useExperience=()=>({text:()=> 'Tiến bộ học viên'});"
          : path === 'row-charts' ? "export const reportEvidenceLabel = () => ''; export default function RowProgressCharts({row}){return <><td data-testid={'skills-'+row.student_id}>{JSON.stringify(row.chart_timeline)}</td><td data-testid={'effort-'+row.student_id}>{JSON.stringify(row.chart_timeline)}</td></>}"
            : path === 'print-preview' ? "export default function ProgressPrintPreview({row,onClose}){return <div role='dialog' aria-label='Print preview'><p data-testid='preview-row'>{JSON.stringify(row)}</p><button onClick={onClose}>Close preview</button></div>}"
          : "export const Bar=()=>null,BarChart=()=>null,CartesianGrid=()=>null,Cell=()=>null,Line=()=>null,LineChart=()=>null,Pie=()=>null,PieChart=()=>null,ResponsiveContainer=()=>null,Tooltip=()=>null,XAxis=()=>null,YAxis=()=>null;" }));
  } }] });
  const server = createServer((request, response) => {
    response.setHeader('Content-Type', request.url === '/app.js' ? 'text/javascript' : 'text/html');
    response.end(request.url === '/app.js' ? bundle.outputFiles[0].text : '<div id="root"></div><script src="/app.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const a = page.getByLabel('A · Nghe', { exact: true });
    const b = page.getByLabel('B · Nghe', { exact: true });
    await a.waitFor();
    assert.equal(await page.getByRole('columnheader', { name: 'Tháng', exact: true }).count(), 0);
    assert.equal(await page.getByRole('columnheader', { name: 'Điểm TB / Delta', exact: true }).count(), 0);
    assert.equal(await page.getByRole('columnheader', { name: 'Kỹ năng', exact: true }).count(), 1);
    assert.equal(await page.getByRole('columnheader', { name: 'Nỗ lực cộng dồn', exact: true }).count(), 1);
    assert.equal(await page.getByTestId('skills-A').locator('..').locator('td').count(), 10);
    assert.equal(await page.getByRole('tab').count(), 2);
    assert.equal(await page.getByRole('tab', { name: 'Báo cáo', exact: true }).getAttribute('aria-selected'), 'true');
    const initial = await page.evaluate(() => window.queries[0]);
    assert.equal(initial.from, initial.to);
    await a.fill('70'); await b.fill('80');
    await page.getByTestId('skills-A').locator('..').getByRole('button', { name: 'In', exact: true }).click();
    const preview = page.getByRole('dialog', { name: 'Print preview' });
    await preview.waitFor();
    const printData = JSON.parse(await preview.getByTestId('preview-row').textContent());
    assert.equal(printData.student_id, 'A');
    assert.deepEqual(printData.chart_timeline, ['initial']);
    assert.equal(printData.assessment_submission_count, 0);
    assert.equal(printData.daily_average_score, 50);
    await preview.getByRole('button', { name: 'Close preview' }).click();
    await preview.waitFor({ state: 'detached' });
    assert.equal(await a.inputValue(), '70');
    assert.equal(await b.inputValue(), '80');
    const initialRequests = await page.evaluate(() => window.queries.length);
    await page.getByLabel('Tìm học viên/lớp/track').fill('Changed');
    await page.getByLabel('Từ tháng').fill('2026-01');
    await page.getByLabel('Lop hoc').selectOption('class');
    await page.getByRole('button', { name: 'Sau', exact: true }).click();
    await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
    await page.getByRole('tab', { name: 'Tổng quan', exact: true }).click();
    await page.getByRole('link', { name: 'Other', exact: true }).click();
    assert.equal(await page.evaluate(() => window.queries.length), initialRequests);
    assert.equal(await page.getByLabel('Tìm học viên/lớp/track').inputValue(), '');
    assert.equal(await b.inputValue(), '80');
    assert.equal(await page.evaluate(() => window.confirmations), 7);
    await page.getByRole('form', { name: 'Bài mới · A', exact: true }).getByRole('button', { name: 'Cập nhật', exact: true }).click();
    await page.waitForFunction(() => window.submissions.length === 1);
    await page.evaluate(() => { window.accept = true; });
    await page.getByRole('button', { name: 'Sau', exact: true }).click();
    await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
    await page.getByRole('tab', { name: 'Tổng quan', exact: true }).click();
    assert.equal(await page.evaluate(() => window.queries.length), initialRequests);
    await page.evaluate(() => window.resolveSave());
    await page.getByText('1 lần cập nhật', { exact: true }).waitFor();
    assert.equal(await page.getByTestId('skills-A').textContent(), '["saved"]');
    assert.equal(await page.getByTestId('effort-A').textContent(), '["saved"]');
    await page.getByTestId('print-selected-progress').click();
    await preview.waitFor();
    const savedPrintData = JSON.parse(await preview.getByTestId('preview-row').textContent());
    assert.equal(savedPrintData.student_id, 'A');
    assert.deepEqual(savedPrintData.chart_timeline, ['saved']);
    assert.equal(savedPrintData.assessment_submission_count, 1);
    await preview.getByRole('button', { name: 'Close preview' }).click();
    await preview.waitFor({ state: 'detached' });
    assert.equal(await a.inputValue(), '');
    assert.equal(await b.inputValue(), '80');
    assert.equal(await page.getByText('evidence kỹ năng', { exact: true }).count(), 2);
    await page.evaluate(() => { window.accept = false; });
    await page.getByRole('button', { name: 'Sau', exact: true }).click();
    assert.equal(await b.inputValue(), '80');
    await page.evaluate(() => { window.accept = true; });
    await page.getByRole('tab', { name: 'Tổng quan', exact: true }).click();
    assert.match(await page.evaluate(() => window.lastPrompt), /được giữ/);
    assert.equal(await b.inputValue(), '80');
    await page.getByRole('tab', { name: 'Báo cáo', exact: true }).click();
    await a.fill('65');
    await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
    await b.waitFor({ state: 'detached' });
    assert.equal(await a.inputValue(), '');
    assert.match(await page.evaluate(() => window.lastPrompt), /Bỏ/);
    await page.evaluate(() => { window.rows = [{ ...window.rows[0],is_finalized:true }]; });
    await page.getByRole('button', { name: 'Làm mới', exact: true }).click();
    await page.getByText('Tháng đã chốt · chỉ đọc.', { exact: true }).waitFor();
    assert.equal(await a.count(), 0);
    await page.evaluate(() => { window.rows = [{ ...window.rows[0],month:'2025-01',is_finalized:false,assessment_submission_count:null,last_submission_at:null }]; });
    await page.getByLabel('Từ tháng').fill('2025-01');
    await page.getByText(/Chỉ nhập bài mới trong tháng hiện tại|Tháng lịch sử.*chỉ đọc/).waitFor();
    await page.getByText('— lần cập nhật', { exact: true }).waitFor();
    assert.equal(await page.locator('input[type="date"]').count(), 0);
    assert.equal(await page.getByRole('form', { name: /Bài mới/ }).count(), 0);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});

test('month rollover keeps the same assessment child and pending navigation state mounted', async () => {
  const cell = source.match(/function InlineAssessmentCell\([\s\S]*?\n\}/)[0];
  const key = source.match(/function rowKey\(row\) \{[\s\S]*?\n\}/)[0];
  const bundle = await build({ stdin: { contents: `
    import React,{useCallback,useEffect,useState} from 'react';import {createRoot} from 'react-dom/client';
    let month='2026-10';function currentBusinessMonth(){return month}
    ${key}
    function ReportInlineAssessment(){
      const [pending,setPending]=useState(false);
      useEffect(()=>{window.mounts++;return()=>{window.unmounts++}},[]);
      return <button id='retry' onClick={()=>setPending(true)}>{pending?'Retry pending':'Start'}</button>;
    }
    const Child=ReportInlineAssessment;
    ReportInlineAssessment=function Assessment(props){
      useEffect(()=>{props.onStateChange({dirty:true,saving:true});return()=>props.onStateChange({dirty:false,saving:false})},[props.onStateChange]);
      return <Child/>;
    };
    ${cell}
    const row={student_id:'s',class_id:'c',month:'2026-10'};
    window.mounts=0;window.unmounts=0;window.states=[];
    const onRowStateChange=(key,state)=>window.states.push(state);
    const root=createRoot(document.getElementById('root'));
    const render=()=>root.render(<table><tbody><tr key={rowKey(row)}><InlineAssessmentCell row={row} onRowStateChange={onRowStateChange} onCanonicalSaved={()=>{}}/></tr></tbody></table>);
    window.rollover=()=>{month='2026-11';render()};render();
  `, resolveDir: fileURLToPath(new URL('../', import.meta.url)), loader: 'jsx' }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic' });
  const server = createServer((request, response) => {
    response.setHeader('Content-Type', request.url === '/app.js' ? 'text/javascript' : 'text/html');
    response.end(request.url === '/app.js' ? bundle.outputFiles[0].text : '<div id="root"></div><script src="/app.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.locator('#retry').click();
    await page.evaluate(() => {window.childNode=document.getElementById('retry');window.rollover()});
    await page.waitForFunction(() => document.getElementById('retry')?.textContent === 'Retry pending');
    assert.equal(await page.evaluate(() => document.getElementById('retry') === window.childNode), true);
    assert.equal(await page.evaluate(() => window.mounts), 1);
    assert.equal(await page.evaluate(() => window.unmounts), 0);
    assert.deepEqual(await page.evaluate(() => window.states.at(-1)), {dirty:true,saving:true});
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});

test('all scope changes and manual reload use aggregate row draft guards', () => {
  assert.match(source, /useDraftNavigationGuard\(/);
  assert.match(source, /pending: \(\) => navigationState\.current\.saving/);
  assert.match(source, /function updateFilter\(key, value\) \{\s+if \(!allowScopeChange\(\{ discard: true \}\)\) return;/);
  assert.match(source, /function refreshReport\(\) \{\s+if \(!allowScopeChange\(\{ discard: true \}\)\) return;/);
  assert.match(source, /rowStates\.current\.clear\(\)/);
  assert.match(source, /key=\{`\$\{rowKey\(row\)\}:\$\{draftEpoch\}`\}/);
  assert.match(source, /if \(key === activeTab\) return true;/);
  assert.match(source, /onRowStateChange=\{handleRowStateChange\}/);
  assert.match(source, /onCanonicalSaved=\{handleCanonicalSaved\}/);
  assert.match(source, /onClick=\{refreshReport\}/);
  assert.match(source, /onRetry=\{refreshReport\}/);
});

test('live refresh preserves protected row identities even when refreshed filters omit them', () => {
  const functionSource = source.match(/function preserveDraftRows\(incoming, existing, states\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(functionSource);
  const keySource = source.match(/function rowKey\(row\) \{[\s\S]*?\n\}/)[0];
  const preserve = runInNewContext(`${keySource}\n${functionSource}\npreserveDraftRows`);
  const a = { student_id: 'a', class_id: 'c', month: '2026-10' };
  const b = { student_id: 'b', class_id: 'c', month: '2026-10' };
  const clean = { student_id: 'clean', class_id: 'c', month: '2026-10' };
  const states = new Map([['a\u0000c\u00002026-10', { dirty: true }], ['b\u0000c\u00002026-10', { saving: true }]]);
  const canonicalA = { ...a, assessment_submission_count: 2 };
  const rows = preserve([canonicalA], [a, b, clean], states);
  assert.equal(rows.length, 2);
  assert.equal(rows[0], canonicalA);
  assert.equal(rows[1], b);
});

test('submission counts remain separate from evidence counts without fabricated historical totals', () => {
  assert.match(source, /row\.assessment_submission_count == null/);
  assert.match(source, /formatNumber\(row\.assessment_submission_count\)/);
  assert.match(source, /lần cập nhật/);
  assert.match(source, /row\.daily_assessment_count \|\| 0/);
  assert.match(source, /evidence kỹ năng/);
  assert.match(source, /row\.last_submission_at/);
  assert.match(source, /row\.last_entry_date/);
  assert.match(source, /progressEvidenceLabel\(row\)/);
  assert.match(source, /setPrintRow\(row\)/);
  assert.match(source, /open-student-progress-detail/);
});
