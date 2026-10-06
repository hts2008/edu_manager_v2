import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transformWithEsbuild } from 'vite';
import { ROSTER_ALL_SKILLS, rosterDraft } from '../src/utils/progressRosterModel.js';

const file = new URL('../src/components/student-progress/ProgressRosterRow.jsx',import.meta.url);
const transformed = await transformWithEsbuild(readFileSync(file,'utf8'),file.pathname,{loader:'jsx',jsx:'automatic'});
const code = transformed.code.replace(/from\s+["']([^"']+)["']/g,(_,specifier) => `from ${JSON.stringify(specifier.startsWith('.') ? new URL(specifier,file).href : import.meta.resolve(specifier))}`);
const {default: Row} = await import(`data:text/javascript,${encodeURIComponent(code)}`);
const row = {student_id:'s',student_name:'Learner',skills:{listening:{score:0,count:1},speaking:{score:null,count:0},reading:{score:50,count:2},writing:{score:null,count:0}},note:'',note_count:0,progress_score:null};
function render(overrides={}) {
  return renderToStaticMarkup(createElement(Row,{row,draft:{...rosterDraft(row),speaking:'80'},editable:true,onChange(){},onSave(){},onDetail(){},...overrides}));
}
test('optional cells render without exposing grader identifiers', () => {
  const html = render({skills:ROSTER_ALL_SKILLS,row:{...row,skills:{...row.skills,listening:{score:0,count:1,graded_by_teacher_id:'private-id',graded_by_teacher_name:'Teacher Name'}}}});
  for (const skill of ['homework','daily_practice','mock_test']) assert.match(html,new RegExp(`aria-label="Learner ${skill}"`));
  assert.match(html,/Teacher Name/);
  assert.doesNotMatch(html,/private-id/);
});
test('renders all four inline cells, real zero and blank without a fabricated monthly score', () => {
  const html = render();
  for (const skill of ['listening','speaking','reading','writing']) assert.match(html,new RegExp(`aria-label="Learner ${skill}"`));
  assert.match(html,/value="0"/);
  assert.match(html,/value=""/);
  assert.match(html,/Điểm tháng: —/);
  assert.match(html,/type="submit"/);
  assert.match(html,/grid-cols-4/);
});
test('foreign creator fields are readonly and existing unknown metadata is never inherited from toolbar', () => {
  const protectedRow = {...row,note_editable:false,skills:{...row.skills,listening:{score:0,count:1,editable:false,exam_set_level:null,difficulty_level:null,graded_by_teacher_id:null}}};
  const html = render({row:protectedRow,assessmentContext:{exam_set_level:'pet',difficulty_level:'hard'}});
  assert.match(html,/aria-label="Learner listening"[^>]*readOnly=""/);
  assert.match(html,/aria-label="Ghi chú Learner"[^>]*readOnly=""/);
  assert.match(html,/Level chưa xác định/);
  assert.match(html,/Độ khó chưa xác định/);
  assert.match(html,/GV chưa xác định/);
  assert.match(html,/Không có quyền sửa/);
  assert.match(render({status:{error:true,message:'Chưa lưu: cần ghi chú'}}),/role="alert"/);
});
test('aggregate score is readonly and permission/finalized/inflight guards lock every cell', () => {
  assert.match(render(),/aria-label="Learner reading"[^>]*readOnly=""/);
  for (const overrides of [{editable:false},{row:{...row,is_finalized:true}},{status:{saving:true}},{status:{blocked:true}}]) {
    const html = render(overrides);
    assert.equal((html.match(/type="number"[^>]*readOnly=""/g)||[]).length,4);
    assert.match(html,/type="submit"[^>]*disabled=""/);
  }
});
test('shows the actual new-entry calibration beside the row without implying existing entries change', () => {
  const html = render({assessmentContext:{exam_set_level:'flyers',difficulty_level:'hard'}});
  assert.match(html,/Bài mới: FLYERS/);
  assert.match(html,/Khó/);
  assert.match(render({assessmentContext:{exam_set_level:null,difficulty_level:'medium'}}),/Level chưa xác định/);
  const workspace = readFileSync(new URL('../src/components/student-progress/ProgressRosterWorkspace.jsx',import.meta.url),'utf8');
  assert.match(workspace,/Theo track từng dòng/);
  assert.match(workspace,/Bài đã có giữ nguyên level đề/);
  assert.match(workspace,/JSON.stringify\(\{draft,assessmentContext\}\)/);
  assert.match(workspace,/rosterPayload\(row,draft,scope,operation,assessmentContext\)/);
});
test('report owns inline assessment and keeps the report mounted across overview tab changes', () => {
  const page = readFileSync(new URL('../src/pages/StudentProgressReportPage.jsx',import.meta.url),'utf8');
  assert.match(page,/useState\("report"\)/);
  assert.match(page,/hidden=\{activeTab !== "report"\}/);
  assert.match(page,/ReportInlineAssessment/);
  assert.doesNotMatch(page,/ProgressRosterWorkspace|progress-panel-update/);
  assert.match(page,/Tổng quan/);
  assert.match(page,/Báo cáo/);
  assert.doesNotMatch(page,/xl:sticky xl:top-4 xl:self-start/);
  const workspace = readFileSync(new URL('../src/components/student-progress/ProgressRosterWorkspace.jsx',import.meta.url),'utf8');
  assert.match(workspace,/hasPermission\('progress.grade'\)/);
  assert.match(workspace,/saveRosterRow\(payload\)/);
  assert.doesNotMatch(workspace,/saveDaily|updateDaily/);
});
