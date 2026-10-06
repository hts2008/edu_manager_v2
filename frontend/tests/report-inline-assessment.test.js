import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformWithEsbuild } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const file = new URL('../src/components/student-progress/ReportInlineAssessment.jsx', import.meta.url);
const source = readFileSync(file, 'utf8');
const stub = `export const useAuth=()=>({user:{id:'actor'},hasPermission:()=>globalThis.inlineAssessmentPermission !== false}); export const studentProgressService={};`;
const transformed = await transformWithEsbuild(source, file.pathname, {loader:'jsx',jsx:'automatic'});
const code = transformed.code.replace(/from\s+["']([^"']+)["']/g, (_, name) => `from ${JSON.stringify(name.startsWith('.') ? `data:text/javascript,${encodeURIComponent(stub)}` : import.meta.resolve(name))}`);
const {default: Component, submissionScores, createSubmissionSession, businessMonth, defaultAssessmentContext, assessmentEligibility} = await import(`data:text/javascript,${encodeURIComponent(code)}`);
const scope = {student_id:'s',class_id:'c',month:businessMonth()};
function fixture(responses) {
  const calls=[];
  let version=0;
  const session=createSubmissionSession({scope,uuid:()=>`uuid-${calls.length}`,service:{
    getSubmission:async()=>({success:true,data:{row:{...scope,evidence_version:`v${++version}`},entry_date:`${scope.month}-06`}}),
    submitAssessment:async payload=>{calls.push(payload);const response=responses.shift();if(response instanceof Error) throw response;return response;},
  }});
  return {session,calls,get loads(){return version;}};
}
test('strict partial scores preserve zero and reject empty, null, booleans and invalid numbers',()=>{
  assert.deepEqual(submissionScores({listening:'0',speaking:'',reading:'100'}),{listening:0,reading:100});
  assert.deepEqual(submissionScores({writing:'.5'}),{writing:0.5});
  for(const draft of [{},{listening:null},{listening:true},{listening:'Infinity'},{listening:'-1'},{listening:'101'},{listening:'0x10'}]) assert.throws(()=>submissionScores(draft));
});
test('network retry freezes exact payload and operation; success permits a fresh submission',async()=>{
  const {session,calls}=fixture([new Error('offline'),{success:true,data:{row:{...scope,evidence_version:'v2'}}},{success:true,data:{row:{...scope,evidence_version:'v3'}}}]);
  await assert.rejects(session.save({listening:'0',note:'A'}));
  await session.save({listening:'99',note:'B'});
  assert.strictEqual(calls[0],calls[1]);
  assert.deepEqual(calls[1].scores,{listening:0});
  assert.equal(calls[1].note,'A');
  await session.save({writing:'40'});
  assert.notEqual(calls[2].operation_id,calls[1].operation_id);
});
test('409 blocks saves until explicit version refresh and keeps the submitted draft',async()=>{
  const {session,calls}=fixture([{success:false,status:409,error:{code:'ROSTER_EVIDENCE_CONFLICT'}},{success:true,data:{row:{...scope,evidence_version:'v3'}}}]);
  await assert.rejects(session.save({speaking:'70'}));
  await assert.rejects(session.save({speaking:'70'}));
  assert.equal(calls.length,1);
  await session.refresh();
  await session.save({speaking:'70'});
  assert.equal(calls[1].expected_evidence_version,'v2');
  assert.notEqual(calls[0].operation_id,calls[1].operation_id);
});
test('concurrent clicks cannot duplicate POST and initial version does not load per render',async()=>{
  const f=fixture([{success:true,data:{row:{...scope,evidence_version:'v2'}}},{success:true,data:{row:{...scope,evidence_version:'v3'}}}]);
  assert.equal(f.loads,0);
  await assert.rejects(f.session.save({writing:'101'}));
  assert.equal(f.loads,0);
  await Promise.all([f.session.save({writing:'0'}),f.session.save({writing:'0'})]);
  assert.equal(f.calls.length,1);
  assert.equal(f.loads,1);
  await f.session.save({writing:'50'});
  assert.equal(f.loads,1);
});
test('business-month boundary uses Vietnam time and historical save cannot reach service',async()=>{
  assert.equal(businessMonth(new Date('2026-09-30T17:00:00Z')),'2026-10');
  assert.equal(businessMonth(new Date('2026-09-30T16:59:59Z')),'2026-09');
  const session=createSubmissionSession({scope:{...scope,month:'2020-01'},service:{getSubmission(){assert.fail('Historical GET');},submitAssessment(){assert.fail('Historical POST');}}});
  await assert.rejects(session.save({writing:'0'}),/tháng hiện tại/);
});
test('new inline submission renders four empty scores despite populated canonical scores',()=>{
  const html=renderToStaticMarkup(createElement(Component,{row:{...scope,student_name:'An',skills:{listening:{score:90}}}}));
  assert.equal((html.match(/type="number"/g)||[]).length,4);
  assert.doesNotMatch(html,/aria-label="An · (Bài tập|Luyện tập|Thi thử)"/);
  assert.equal((html.match(/<input[^>]*value=""/g)||[]).length,5);
  assert.match(html,/<details/);
  assert.match(html,/Cập nhật/);
  assert.doesNotMatch(html,/type="date"|value="90"/);
});
test('historical rows expose readonly explanation and detail link',()=>{
  const html=renderToStaticMarkup(createElement(Component,{row:{...scope,month:'2020-01'}}));
  assert.doesNotMatch(html,/type="number"/);
  assert.match(html,/Chỉ nhập bài mới trong tháng hiện tại/);
  assert.match(html,/href=.*student-progress/);
});
test('permission and finalized month never expose score entry',()=>{
  globalThis.inlineAssessmentPermission=false;
  try {
    const html=renderToStaticMarkup(createElement(Component,{row:scope}));
    assert.doesNotMatch(html,/type="number"/);
    assert.match(html,/Không có quyền chấm điểm/);
  } finally {delete globalThis.inlineAssessmentPermission;}
  assert.match(renderToStaticMarkup(createElement(Component,{row:{...scope,is_finalized:true}})),/Tháng đã chốt/);
});
test('wrong GET scope cannot POST and ambiguous canonical response retains the operation',async()=>{
  let posts=0;
  const badGet=createSubmissionSession({scope,service:{getSubmission:async()=>({success:true,data:{row:{...scope,class_id:'foreign',evidence_version:'v'},entry_date:`${scope.month}-06`}}),submitAssessment:async()=>{posts++;}}});
  await assert.rejects(badGet.save({homework:'0'}));
  assert.equal(posts,0);
  const {session,calls}=fixture([{success:true,data:{row:{...scope,student_id:'foreign',evidence_version:'v2'}}},{success:true,data:{row:{...scope,evidence_version:'v2'}}}]);
  await assert.rejects(session.save({homework:'0',daily_practice:'25',mock_test:'100'}));
  assert.equal(session.pending,true);
  await assert.rejects(session.refresh());
  await session.save({homework:'90'});
  assert.strictEqual(calls[0],calls[1]);
});
test('definite validation rejection allows correction and a new operation',async()=>{
  const {session,calls}=fixture([{success:false,error:{code:'NOTE_REQUIRED'}},{success:true,data:{row:{...scope,evidence_version:'v2'}}}]);
  await assert.rejects(session.save({listening:'0'}));
  assert.equal(session.pending,false);
  await session.save({listening:'0',note:'Bài mới'});
  assert.notEqual(calls[0].operation_id,calls[1].operation_id);
  assert.equal(calls[1].note,'Bài mới');
});
test('submission services use uncached submission GET and separate POST without changing PATCH',()=>{
  const api=readFileSync(new URL('../src/services/api.js',import.meta.url),'utf8');
  assert.match(api,/getSubmission:[\s\S]*?mode: "submission"[\s\S]*?skipCache: true/);
  assert.match(api,/submitAssessment:[\s\S]*?method: "POST"/);
  assert.match(api,/saveRosterRow:[\s\S]*?method: "PATCH"/);
});
test('new assessments normalize track and allow explicit unknown without inferring a level',async()=>{
  for(const track of ['starters','movers','flyers','ket','pet']) assert.deepEqual(defaultAssessmentContext({english_track:track}),{exam_set_level:track,difficulty_level:'medium'});
  assert.equal(defaultAssessmentContext({track_key:null,english_track:'pet'}).exam_set_level,null);
  assert.equal(defaultAssessmentContext({english_track:'unknown'}).exam_set_level,null);
  const {session,calls}=fixture([{success:true,data:{row:{...scope,evidence_version:'v2'}}}]);
  await session.save({listening:'0'},{exam_set_level:null,difficulty_level:'hard'});
  assert.deepEqual(calls[0].assessment_context,{exam_set_level:null,difficulty_level:'hard'});
});
test('known definite code-only rejections release pending identity for correction',async()=>{
  for(const code of ['VALIDATION_ERROR','PERMISSION_DENIED','GRADER_NOT_ASSIGNED','MONTH_FINALIZED','INVALID_MONTH','ENROLLMENT_NOT_FOUND']) {
    const {session}=fixture([{success:false,error:{code}}]);
    await assert.rejects(session.save({homework:'0'}));
    assert.equal(session.pending,false,code);
    assert.equal(session.conflict,false,code);
  }
});

test('accepted submission with lost response replays unchanged after business-month rollover',async()=>{
  let clock=new Date('2026-09-30T16:59:59Z');
  const selected={...scope,month:'2026-09'};
  const calls=[];
  let gets=0;
  const original={...selected,evidence_version:'accepted-v2',is_finalized:true};
  const session=createSubmissionSession({scope:selected,now:()=>clock,uuid:()=> 'accepted-operation',service:{
    getSubmission:async()=>{gets++;return {success:true,data:{row:{...selected,evidence_version:'v1'},entry_date:'2026-09-30'}};},
    submitAssessment:async payload=>{
      calls.push(payload);
      if(calls.length===1) throw new Error('Response lost after commit');
      return {success:true,data:{row:original}};
    },
  }});
  await assert.rejects(session.save({listening:'0',note:'September'},{exam_set_level:'pet',difficulty_level:'medium'}));
  clock=new Date('2026-09-30T17:00:00Z');
  assert.equal(session.pending,true);
  assert.strictEqual(await session.save({reading:'100'},{exam_set_level:null,difficulty_level:'hard'}),original);
  assert.strictEqual(calls[0],calls[1]);
  assert.equal(calls[1].operation_id,'accepted-operation');
  assert.equal(calls[1].month,'2026-09');
  assert.deepEqual(calls[1].scores,{listening:0});
  assert.equal(gets,1);
  assert.equal(session.pending,false);
  await assert.rejects(session.save({reading:'100'}),/tháng hiện tại/);
  assert.equal(calls.length,2);
});

test('rollover during lazy GET cannot create a new submission',async()=>{
  let clock=new Date('2026-09-30T16:59:59Z');
  let gets=0;
  const selected={...scope,month:'2026-09'};
  const session=createSubmissionSession({scope:selected,now:()=>clock,service:{
    getSubmission:async()=>{gets++;clock=new Date('2026-09-30T17:00:00Z');return {success:true,data:{row:{...selected,evidence_version:'v1'},entry_date:'2026-09-30'}};},
    submitAssessment:async()=>assert.fail('New POST after rollover'),
  }});
  await assert.rejects(session.save({listening:'0'}),/tháng hiện tại/);
  assert.equal(gets,1);
  assert.equal(session.pending,false);
});

test('historical or finalized pending replay remains available only with grade permission',()=>{
  const now=new Date('2026-09-30T17:00:00Z');
  const historical={...scope,month:'2026-09'};
  for(const row of [historical,{...scope,month:'2026-10',is_finalized:true}]) {
    assert.deepEqual(assessmentEligibility(row,true,true,now),{editable:false,replay:true,canSubmit:true});
    assert.deepEqual(assessmentEligibility(row,false,true,now),{editable:false,replay:false,canSubmit:false});
    assert.deepEqual(assessmentEligibility(row,true,false,now),{editable:false,replay:false,canSubmit:false});
  }
});
