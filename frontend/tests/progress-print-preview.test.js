import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transformWithEsbuild } from 'vite';
import { paperDimensions, buildPrintDocument, printProgressDocument, PRINT_CSS } from '../src/components/student-progress/progressPrint.js';

const file = new URL('../src/components/student-progress/ProgressPrintPreview.jsx', import.meta.url);
const source = readFileSync(file, 'utf8');
let code = (await transformWithEsbuild(source, file.pathname, { loader:'jsx', jsx:'automatic' })).code;
// Document tests do not mount the shared portal modal.
code = code.replace(/import Modal from [^;]+;/, 'const Modal = () => null;');
const chartsFile = new URL('../src/components/student-progress/ReportRowCharts.jsx', import.meta.url);
const charts = (await transformWithEsbuild(readFileSync(chartsFile,'utf8'),chartsFile.pathname,{loader:'jsx',jsx:'automatic'})).code
  .replace(/from\s+["']([^"']+)["']/g,(_,name)=>`from ${JSON.stringify(name.startsWith('.') ? new URL(name,chartsFile).href : import.meta.resolve(name))}`);
const chartsUrl = `data:text/javascript,${encodeURIComponent(charts)}`;
code = code.replace(/from\s+["']([^"']+)["']/g,(_,name)=>`from ${JSON.stringify(name.endsWith('ReportRowCharts.jsx') ? chartsUrl : name.startsWith('.') ? new URL(name,file).href : import.meta.resolve(name))}`);
const { ProgressPrintDocument } = await import(`data:text/javascript,${encodeURIComponent(code)}`);

test('printed skills omit homework, practice and mock test without deleting historical evidence',()=>{
  const row={chart_timeline:{comparison:{skills:{homework:{current_raw_score:80},listening:{current_raw_score:0}}},days:[{date:'2026-10-06',cumulative_points:80}]}};
  const html=renderToStaticMarkup(createElement(ProgressPrintDocument,{row}));
  assert.doesNotMatch(html,/BTVN|Luyện hằng ngày|Bài kiểm tra|bảy kỹ năng/);
  assert.match(html,/bốn kỹ năng/);
  assert.match(html,/80 điểm/);
});

test('clay report exposes bounded progress bars, chronological evidence and planned steps',()=>{
  const row={progress_score:120,actual_present_rate:null,next_actions:['Luyện nghe','Luyện nói'],chart_timeline:{days:[{date:'2026-10-06',cumulative_points:20},{date:'2026-10-01',cumulative_points:0}]}};
  const html=renderToStaticMarkup(createElement(ProgressPrintDocument,{row}));
  assert.match(html,/pp-clay/);
  assert.match(html,/pp-timeline/);
  assert.ok(html.toLowerCase().indexOf('datetime="2026-10-01"')<html.toLowerCase().indexOf('datetime="2026-10-06"'));
  assert.match(html,/pp-steps/);
  assert.match(html,/width:100%/);
  assert.doesNotMatch(html,/NaN|width:120%|aria-valuenow="null"/);
  assert.match(PRINT_CSS,/inset/);
  assert.match(PRINT_CSS,/backdrop-filter/);
});

test('paper dimensions and page rules are allowlisted for every orientation',()=>{
  for (const [paper,width,height] of [['A4',210,297],['A5',148,210],['Letter',215.9,279.4]]) {
    assert.deepEqual(paperDimensions(paper,'portrait'),{width,height});
    assert.deepEqual(paperDimensions(paper,'landscape'),{width:height,height:width});
    assert.match(buildPrintDocument({innerHTML:'<svg></svg>'},paper,'landscape'),new RegExp(`size: ${height}mm ${width}mm`));
  }
  assert.deepEqual(paperDimensions('</style><script>','bogus'),{width:210,height:297});
  assert.doesNotMatch(buildPrintDocument({innerHTML:'safe'},'</style><script>','bogus'),/<script>/);
});

test('React escapes learner and narrative text before document-only SVG serialization',()=>{
  const row={student_name:'<img src=x onerror=alert(1)>',parent_summary:'</p><script>alert(1)</script>',next_actions:['<svg onload=evil>'],chart_timeline:{comparison:{skills:{listening:{current_raw_score:0}}},days:[{date:'2026-10-06',cumulative_points:0}]}};
  const html=renderToStaticMarkup(createElement(ProgressPrintDocument,{row,paper:'A5',orientation:'portrait'}));
  assert.match(html,/&lt;img/);
  assert.match(html,/&lt;script&gt;/);
  assert.doesNotMatch(html,/<script|<img|<canvas/);
  assert.match(html,/recharts-wrapper/);
  assert.match(html,/>0<\/td>/);
  assert.match(html,/Chưa có/);
  const output=buildPrintDocument({innerHTML:`${html}<svg aria-label="Mounted chart"></svg>`},'A5','portrait');
  assert.match(output,/<svg/);
  assert.doesNotMatch(output,/In báo cáo|aria-label="Đóng/);
  assert.match(PRINT_CSS,/break-inside:avoid/);
  assert.match(PRINT_CSS,/overflow-wrap:anywhere/);
});

test('popup is opened synchronously, blocked popup rejects visibly, and resources precede print',async()=>{
  await assert.rejects(printProgressDocument({innerHTML:'x',querySelectorAll:()=>[{querySelector:()=>null}]},'A4','portrait',()=>{throw new Error('must not open');}),/Biểu đồ chưa sẵn sàng/);
  await assert.rejects(printProgressDocument({innerHTML:'x'},'A4','portrait',()=>null),/cửa sổ/);
  const order=[];
  let resolveFonts;
  const popup={opener:{},document:{open(){order.push('document');},write(){},close(){},fonts:{ready:new Promise(resolve=>{resolveFonts=resolve;})},images:[]},focus(){order.push('focus');},print(){order.push('print');}};
  const pending=printProgressDocument({innerHTML:'<svg/>'},'A4','portrait',()=>{order.push('open');return popup;});
  assert.equal(order[0],'open');
  assert.equal(popup.opener,null);
  assert.ok(!order.includes('print'));
  resolveFonts();
  await pending;
  assert.equal(order.at(-1),'print');
  assert.doesNotMatch(source,/dangerouslySetInnerHTML|window\.print\(/);
});

test('cancelled or failed preparation closes the popup and never prints later',async()=>{
  const controller=new AbortController();
  let printed=0,closed=0,resolveFonts;
  const popup={document:{open(){},write(){},close(){},fonts:{ready:new Promise(resolve=>{resolveFonts=resolve;})},images:[]},focus(){},print(){printed++;},close(){closed++;}};
  const pending=printProgressDocument({innerHTML:'<svg/>'},'A4','portrait',()=>popup,controller.signal);
  controller.abort();
  await assert.rejects(pending,/hủy/);
  resolveFonts();
  assert.equal(printed,0);
  assert.equal(closed,1);
  const failed={...popup,document:{...popup.document,fonts:{ready:Promise.reject(new Error('font failure'))}}};
  await assert.rejects(printProgressDocument({innerHTML:'x'},'A4','portrait',()=>failed),/font failure/);
  assert.equal(closed,2);
  assert.match(source,/preparation\.current\?\.abort\(\)/);
});
