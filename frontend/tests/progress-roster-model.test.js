import test from 'node:test';
import assert from 'node:assert/strict';
import { createRosterNavigationGuard, rejectRosterSave, rosterAssessmentContext, acceptRosterCanonical, rosterDraft, rosterChanges, rosterPayload, createRosterGeneration } from '../src/utils/progressRosterModel.js';

const row = { student_id: 's', class_id: 'c', evidence_version: 'v1', skills: { listening: {score: 0, count: 1}, speaking: {score: null, count: 0}, reading: {score: 50, count: 2}, writing: {score: null, count: 0}}, note: '', note_count: 0 };
test('optional skills retain zero, blank and hidden draft mutations', () => {
  const draft = {...rosterDraft(row),homework:'0',daily_practice:'75',mock_test:''};
  assert.deepEqual(rosterChanges(row,draft),{changes:{homework:0,daily_practice:75}});
  assert.equal(rosterDraft({...row,skills:{...row.skills,mock_test:{score:0,count:1}}}).mock_test,'0');
});
test('internal anchor departure requires dirty confirmation and prohibits pending commit', () => {
  let state = {dirty:true,saving:false}, confirmations = 0, blocked = 0;
  let accept = false;
  const guard = createRosterNavigationGuard({getState:() => state,confirmDeparture:() => {confirmations++; return accept;},onBlocked:() => blocked++});
  function event() {return {button:0,target:{closest:() => ({getAttribute:name => name === 'href' ? '/other' : null,hasAttribute:() => false})},preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;}};}
  const cancelled = event(); guard(cancelled);
  assert.equal(cancelled.prevented,true);
  accept = true;
  const allowed = event(); guard(allowed);
  assert.equal(allowed.prevented,undefined);
  state = {dirty:true,saving:true};
  const committing = event(); guard(committing);
  assert.equal(committing.prevented,true);
  assert.equal(confirmations,2);
  assert.equal(blocked,1);
  state = {dirty:false,saving:false};
  const clean = event(); guard(clean);
  assert.equal(clean.prevented,undefined);
});
test('foreign creator fields reject changes and deletion without an admin override', () => {
  const protectedRow = {...row,note_editable:false,skills:{...row.skills,listening:{score:0,count:1,editable:false}}};
  for (const listening of ['90','']) assert.throws(() => rosterChanges(protectedRow,{...rosterDraft(protectedRow),listening}),/read-only/);
  assert.throws(() => rosterChanges(protectedRow,{...rosterDraft(protectedRow),note:'replace'}),/read-only/);
  assert.deepEqual(rosterChanges(protectedRow,{...rosterDraft(protectedRow),speaking:'80'}),{changes:{speaking:80}});
});
test('400 and 403 failures preserve every row draft and give actionable row feedback', () => {
  const drafts = {s:{...rosterDraft(row),speaking:'80'},other:{writing:'70'}};
  const state = {rows:[row],drafts,statuses:{s:{saving:true},other:{message:'unchanged'}}};
  for (const error of [{message:'A note is required for non-attendance date',code:'NOTE_REQUIRED'}, {message:'Foreign creator entry',code:'FORBIDDEN'}]) {
    const failed = rejectRosterSave(state,'s',error);
    assert.equal(failed.drafts,drafts);
    assert.equal(failed.rows,state.rows);
    assert.equal(failed.statuses.other,state.statuses.other);
    assert.equal(failed.statuses.s.saving,undefined);
    assert.match(failed.statuses.s.message,/Chưa lưu/);
    assert.equal(failed.statuses.s.blocked,error.code === 'FORBIDDEN');
  }
});
test('calibration resolves per-row track, explicit level and uncalibrated null', () => {
  assert.deepEqual(rosterAssessmentContext({...row,track_key:'flyers'}, {exam_set_level:'track',difficulty_level:'medium'}),{exam_set_level:'flyers',difficulty_level:'medium'});
  assert.deepEqual(rosterAssessmentContext({...row,track_key:'unknown'}, {exam_set_level:'track',difficulty_level:'easy'}),{exam_set_level:null,difficulty_level:'easy'});
  assert.deepEqual(rosterAssessmentContext(row, {exam_set_level:'pet',difficulty_level:'hard'}),{exam_set_level:'pet',difficulty_level:'hard'});
  assert.deepEqual(rosterAssessmentContext(row, {exam_set_level:'',difficulty_level:'medium'}),{exam_set_level:null,difficulty_level:'medium'});
  assert.throws(() => rosterAssessmentContext(row,{exam_set_level:'unknown',difficulty_level:'medium'}),/calibration/);
  assert.throws(() => rosterAssessmentContext(row,{exam_set_level:'pet',difficulty_level:'invalid'}),/calibration/);
});
test('real PATCH payload carries selected calibration without entry metadata replacements', () => {
  const context = {exam_set_level:'movers',difficulty_level:'hard'};
  const payload = rosterPayload(row,{...rosterDraft(row),speaking:'80'},{class_id:'c',month:'2026-10',entry_date:'2026-10-05'},'operation',context);
  assert.deepEqual(payload.assessment_context,context);
  assert.deepEqual(payload.changes,{speaking:80});
  assert.equal(payload.entries,undefined);
});
test('zero and blank remain distinct and unchanged inputs are not mutations', () => {
  const draft = rosterDraft(row);
  assert.equal(draft.listening, '0');
  assert.equal(draft.speaking, '');
  assert.deepEqual(rosterChanges(row, draft), {changes: {}});
  assert.deepEqual(rosterChanges(row, {...draft, listening: '', speaking: '0'}), {changes: {listening: null, speaking: 0}});
});
test('aggregate means and multiple notes cannot be overwritten', () => {
  assert.throws(() => rosterChanges(row, {...rosterDraft(row), reading: '60'}), /multiple/);
  const multipleNotes = {...row, note_count: 2};
  assert.throws(() => rosterChanges(multipleNotes, {...rosterDraft(multipleNotes), note: 'replacement'}), /multiple/);
});
test('invalid and out-of-range scores fail closed', () => {
  for (const value of ['NaN', 'Infinity', '-1', '101', '12oops']) {
    assert.throws(() => rosterChanges(row, {...rosterDraft(row), speaking: value}), /score/);
  }
});
test('payload carries original evidence version and exact scoped changes', () => {
  const payload = rosterPayload(row, {...rosterDraft(row), speaking: '80'}, {class_id:'c', month:'2026-10', entry_date:'2026-10-05'}, 'operation');
  assert.deepEqual(payload, {student_id:'s',class_id:'c',entry_date:'2026-10-05',expected_evidence_version:'v1',operation_id:'operation',changes:{speaking:80}});
  assert.throws(() => rosterPayload({...row,is_finalized:true}, rosterDraft(row), {class_id:'c',month:'2026-10',entry_date:'2026-10-05'}, 'id'), /finalized/);
  assert.throws(() => rosterPayload(row, rosterDraft(row), {class_id:'other',month:'2026-10',entry_date:'2026-10-05'}, 'id'), /scope/);
});
test('generation rejects superseded loads, scope switches and unmounted responses', () => {
  const guard = createRosterGeneration();
  const first = guard.next();
  const second = guard.next();
  assert.equal(guard.current(first), false);
  assert.equal(guard.current(second), true);
  guard.invalidate();
  assert.equal(guard.current(second), false);
});
test('only canonical matching row replaces draft and other dirty rows survive', () => {
  const other = {...row,student_id:'other'};
  const state = {rows:[row,other],drafts:{s:{...rosterDraft(row),speaking:'80'},other:{...rosterDraft(other),writing:'70'}},statuses:{s:{saving:true}}};
  const canonical = {...row,evidence_version:'v2',skills:{...row.skills,speaking:{score:79.5,count:1}},progress_score:63};
  const accepted = acceptRosterCanonical(state,'s',canonical);
  assert.equal(accepted.rows[0],canonical);
  assert.equal(accepted.drafts.s.speaking,'79.5');
  assert.equal(accepted.drafts.other.writing,'70');
  assert.equal(accepted.statuses.s.saving,undefined);
  assert.throws(() => acceptRosterCanonical(state,'s',{...canonical,class_id:'other'}), /canonical/);
});
test('parallel saves share a generation but context cancellation rejects both', () => {
  const guard = createRosterGeneration();
  guard.next();
  const first = guard.capture(), second = guard.capture();
  assert.equal(guard.current(first),true);
  assert.equal(guard.current(second),true);
  guard.invalidate();
  assert.equal(guard.current(first),false);
  assert.equal(guard.current(second),false);
});
