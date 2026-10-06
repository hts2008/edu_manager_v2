import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transformWithEsbuild } from 'vite';

const file = new URL('../src/components/student-progress/ReportRowCharts.jsx',import.meta.url);
const source = readFileSync(file,'utf8');
const transformed = await transformWithEsbuild(source,file.pathname,{loader:'jsx',jsx:'automatic'});
const code = transformed.code.replace(/from\s+["']([^"']+)["']/g,(_,name)=>`from ${JSON.stringify(name.startsWith('.') ? new URL(name,file).href : import.meta.resolve(name))}`);
const {default: RowProgressCharts, rowChartData, RadarEvidenceShape, reportEvidenceLabel} = await import(`data:text/javascript,${encodeURIComponent(code)}`);
const row = {student_name:'An',chart_timeline:{comparison:{skills:{listening:{current_raw_score:0,previous_raw_score:70},reading:{current_raw_score:100,previous_raw_score:null}}},days:[{date:'2026-10-06',cumulative_points:0}]}};

test('report provenance hides non-core criteria without mutating historical evidence',()=>{
  const history = {score_source:'daily_raw',progress_assessment:{contributors:['listening','homework','daily_practice','mock_test']}};
  assert.equal(reportEvidenceLabel(history),'Điểm thô hằng ngày · Nghe');
  assert.equal(history.progress_assessment.contributors.length,4);
});
test('four report comparison skills preserve zero and missing values; legacy effort data is retained',()=>{
  const data=rowChartData(row);
  assert.equal(data.comparison.length,4);
  assert.deepEqual(data.comparison.map(item=>item.key),['listening','speaking','reading','writing']);
  assert.equal(data.comparison.find(item=>item.key==='listening').current,0);
  assert.equal(data.comparison.find(item=>item.key==='speaking').current,null);
  assert.equal(data.days[0].cumulative_points,0);
  assert.equal(rowChartData({chart_timeline:{days:[{date:'2026-10-06'}]}}).days[0].cumulative_points,null);
});
test('renders exactly two compact unframed table cells with accessible chart descriptions',()=>{
  const html=renderToStaticMarkup(createElement('table',null,createElement('tbody',null,createElement('tr',null,createElement(RowProgressCharts,{row})))));
  assert.equal((html.match(/<td\b/g)||[]).length,2);
  assert.match(html,/Radar 4 kỹ năng/);
  assert.match(html,/Nỗ lực cộng dồn/);
  assert.match(html,/Nghe: hiện tại 0, kỳ trước 70/);
  assert.match(html,/chưa có/);
  assert.match(html,/width:240px/);
  assert.match(html,/height:190px/);
  assert.doesNotMatch(html,/rounded|shadow|linearGradient/);
});
test('missing timeline shows two stable empty states without inventing averages or totals',()=>{
  const html=renderToStaticMarkup(createElement(RowProgressCharts,{row:{student_name:'An'}}));
  assert.equal((html.match(/>Chưa có dữ liệu<\/div>/g)||[]).length,2);
  assert.doesNotMatch(html,/recharts-area/);
});
test('radar missing point is omitted while a genuine zero remains a visible dot',()=>{
  const points=[{x:10,y:10,value:0},{x:99,y:99,value:null},{x:20,y:20,value:80}];
  const html=renderToStaticMarkup(createElement(RadarEvidenceShape,{points,stroke:'#000',fill:'#000'}));
  assert.equal((html.match(/<circle/g)||[]).length,2);
  assert.match(html,/cx="10"/);
  assert.doesNotMatch(html,/99|Z"/);
});
test('one-point cumulative chart uses visible dots and inputs use the narrow two-column grid',()=>{
  assert.match(source, /dot=\{\{r:4,fill:'#0891b2',fillOpacity:1,stroke:'#fff',strokeOpacity:1/);
  assert.match(source, /activeDot=\{\{r:4,fill:'#0891b2',fillOpacity:1,stroke:'#fff',strokeOpacity:1/);
  assert.match(source, /connectNulls=\{false\}/);
  const editor=readFileSync(new URL('../src/components/student-progress/ReportInlineAssessment.jsx',import.meta.url),'utf8');
  assert.match(editor,/grid grid-cols-2 gap-2/);
  assert.match(editor,/w-\[180px\]/);
  assert.doesNotMatch(editor,/grid grid-cols-4/);
});
