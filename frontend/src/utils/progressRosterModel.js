export const ROSTER_SKILLS = ['listening', 'speaking', 'reading', 'writing'];
export const ROSTER_OPTIONAL_SKILLS = ['homework', 'daily_practice', 'mock_test'];
export const ROSTER_ALL_SKILLS = [...ROSTER_SKILLS, ...ROSTER_OPTIONAL_SKILLS];
export const ROSTER_EXAM_LEVELS = ['starters', 'movers', 'flyers', 'ket', 'pet'];
export const ROSTER_DIFFICULTIES = {easy:'Dễ',medium:'Trung bình',hard:'Khó'};

export function rosterAssessmentContext(row, calibration) {
  const selected = calibration.exam_set_level;
  if (selected !== 'track' && selected !== '' && selected !== null && !ROSTER_EXAM_LEVELS.includes(selected)) throw new Error('invalid calibration level');
  if (!Object.hasOwn(ROSTER_DIFFICULTIES,calibration.difficulty_level)) throw new Error('invalid calibration difficulty');
  const level = selected === 'track' ? row.track_key : selected;
  return {exam_set_level:ROSTER_EXAM_LEVELS.includes(level) ? level : null,difficulty_level:calibration.difficulty_level};
}

export function rosterDraft(row) {
  return Object.fromEntries([...ROSTER_ALL_SKILLS.map(key => [key, row.skills?.[key]?.score == null ? '' : String(row.skills[key].score)]), ['note', row.note ?? '']]);
}

export function rosterChanges(row, draft) {
  const baseline = rosterDraft(row);
  const changes = {};
  for (const key of ROSTER_ALL_SKILLS) {
    if (draft[key] === undefined && row.skills?.[key] === undefined) continue;
    if (draft[key] === baseline[key]) continue;
    if (row.skills?.[key]?.editable === false) throw new Error('field is read-only');
    if (row.skills?.[key]?.count > 1) throw new Error('multiple evidence is read-only');
    const text = String(draft[key]).trim();
    const score = text === '' ? null : Number(text);
    if (score !== null && (!Number.isFinite(score) || score < 0 || score > 100)) throw new Error('invalid score: 0–100');
    if (score !== row.skills?.[key]?.score && !(score === null && row.skills?.[key]?.score == null)) changes[key] = score;
  }
  if (draft.note !== baseline.note && row.note_count > 1) throw new Error('multiple notes are read-only');
  if (draft.note !== baseline.note && row.note_editable === false) throw new Error('note is read-only');
  return {changes, ...(draft.note !== baseline.note ? {note: draft.note} : {})};
}

export function rosterPayload(row, draft, scope, operationId, assessmentContext) {
  if (row.is_finalized) throw new Error('finalized');
  if (row.class_id !== scope.class_id || (row.month && row.month !== scope.month) || scope.entry_date.slice(0, 7) !== scope.month) throw new Error('scope changed');
  if (row.evidence_version == null) throw new Error('missing evidence version');
  return {student_id:row.student_id,class_id:row.class_id,entry_date:scope.entry_date,expected_evidence_version:row.evidence_version,operation_id:operationId,...rosterChanges(row,draft),...(assessmentContext ? {assessment_context:rosterAssessmentContext(row,assessmentContext)} : {})};
}

export function acceptRosterCanonical(state, id, row) {
  const previous = state.rows.find(item => item.student_id === id);
  if (!previous || row?.student_id !== id || row.class_id !== previous.class_id || row.month !== previous.month || row.evidence_version == null) throw new Error('invalid canonical roster response');
  return {...state,rows:state.rows.map(item => item.student_id === id ? row : item),drafts:{...state.drafts,[id]:rosterDraft(row)},statuses:{...state.statuses,[id]:{message:'Đã lưu'}}};
}

export function rejectRosterSave(state, id, error) {
  const code = error.code || '';
  const blocked = /CONFLICT|GRADER_NOT_ASSIGNED|FORBIDDEN|EVIDENCE_NOT_OWNED|FINALIZED|MULTIPLE_/.test(code);
  const explanation = /NOTE_REQUIRED/.test(code)
    ? 'Ngày không có điểm danh cần ghi chú. Thêm ghi chú rồi lưu lại.'
    : /EVIDENCE_NOT_OWNED/.test(code)
      ? 'Chỉ người tạo evidence được sửa hoặc xóa. Tải lại để cập nhật quyền.'
      : error.message || 'Không lưu được. Kiểm tra kết nối rồi thử lại.';
  return {...state,statuses:{...state.statuses,[id]:{error:true,blocked,message:`Chưa lưu: ${explanation} Bản nhập vẫn được giữ.${blocked ? ' Tải lại trước khi lưu tiếp.' : ''}`}}};
}

export function createRosterGeneration() {
  let generation = 0;
  return {next: () => ++generation, capture: () => generation, invalidate: () => ++generation, current: value => value === generation};
}

export function createRosterNavigationGuard({getState, confirmDeparture, onBlocked}) {
  return event => {
    const anchor = event.target?.closest?.('a[href]');
    if (!anchor || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || anchor.hasAttribute('download')) return;
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    const {dirty, saving} = getState();
    if (saving || (dirty && !confirmDeparture())) {
      event.preventDefault();
      event.stopPropagation();
      if (saving) onBlocked?.();
    }
  };
}
