import { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { studentProgressService } from '../../services/api';

const skills = {listening:'Nghe',speaking:'Nói',reading:'Đọc',writing:'Viết',homework:'Bài tập',daily_practice:'Luyện tập',mock_test:'Thi thử'};
const core = ['listening','speaking','reading','writing'];
const levels = ['starters','movers','flyers','ket','pet'];
const difficulties = {easy:'Dễ',medium:'Trung bình',hard:'Khó'};
const emptyDraft = () => ({...Object.fromEntries(Object.keys(skills).map(key => [key,''])),note:''});

export function defaultAssessmentContext(row) {
  const track = Object.hasOwn(row,'track_key') ? row.track_key : row.english_track;
  return {exam_set_level:levels.includes(track) ? track : null,difficulty_level:'medium'};
}

function validateContext(context) {
  if (!context || (context.exam_set_level !== null && !levels.includes(context.exam_set_level)) || !Object.hasOwn(difficulties,context.difficulty_level)) throw new Error('Level đề hoặc độ khó không hợp lệ.');
  return {...context};
}

export function businessMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit'}).formatToParts(now);
  return `${parts.find(part => part.type === 'year').value}-${parts.find(part => part.type === 'month').value}`;
}

export function assessmentEligibility(row,permitted,pending,now = new Date()) {
  const editable = permitted && row.month === businessMonth(now) && !row.is_finalized;
  const replay = permitted && pending;
  return {editable,replay,canSubmit:editable || replay};
}

export function submissionScores(draft) {
  const scores = {};
  for (const key of Object.keys(skills)) {
    const raw = draft[key];
    if (raw === undefined || (typeof raw === 'string' && raw.trim() === '')) continue;
    if ((typeof raw !== 'string' && typeof raw !== 'number') || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(String(raw).trim())) throw new Error('Điểm phải là số từ 0 đến 100.');
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error('Điểm phải là số từ 0 đến 100.');
    scores[key] = value;
  }
  if (!Object.keys(scores).length) throw new Error('Nhập ít nhất một điểm từ 0 đến 100.');
  return scores;
}

function responseError(response) {
  const code = response.error?.code || '';
  const status = response.status ?? response.error?.status ?? (/^HTTP_\d{3}$/.test(code) ? Number(code.slice(5)) : undefined);
  return Object.assign(new Error(response.error?.message || 'Không lưu được bài mới.'),{status,code});
}

// Keep ambiguous requests immutable until their operation is resolved by replay.
export function createSubmissionSession({scope,service,uuid = () => crypto.randomUUID(),now = () => new Date()}) {
  let version = null;
  let operation = null;
  let busy = false;
  let conflict = false;
  function canonical(row) {
    if (!row || row.student_id !== scope.student_id || row.class_id !== scope.class_id || row.month !== scope.month || row.evidence_version == null) throw new Error('Phản hồi không đúng học viên, lớp hoặc tháng.');
    return row;
  }
  async function refresh() {
    if (operation && !conflict) throw new Error('Cần thử lại bài đang chờ xác định kết quả trước.');
    const response = await service.getSubmission(scope);
    if (!response.success) throw responseError(response);
    const row = canonical(response.data?.row);
    if (!response.data.entry_date?.startsWith(`${scope.month}-`)) throw new Error('Ngày nhập không thuộc tháng đã chọn.');
    version = row.evidence_version;
    conflict = false;
    operation = null;
    return row;
  }
  async function save(draft,assessmentContext) {
    if (busy) return null;
    if (conflict) throw new Error('Tải phiên bản mới trước khi cập nhật lại.');
    busy = true;
    try {
      if (!operation) {
        if (scope.month !== businessMonth(now())) throw new Error('Chỉ nhập bài mới trong tháng hiện tại.');
        const scores = submissionScores(draft);
        const context = assessmentContext ? validateContext(assessmentContext) : undefined;
        if (version == null) await refresh();
        if (scope.month !== businessMonth(now())) throw new Error('Chỉ nhập bài mới trong tháng hiện tại.');
        operation = { ...scope,expected_evidence_version:version,operation_id:uuid(),scores,
          ...(draft.note?.trim() ? {note:draft.note.trim()} : {}),
          ...(context ? {assessment_context:context} : {}) };
      }
      const response = await service.submitAssessment(operation);
      if (!response.success) {
        const error = responseError(response);
        const rejected = /VALIDATION|NOTE_REQUIRED|FORBIDDEN|PERMISSION|UNAUTHORIZED|FINALIZED|GRADER_NOT_ASSIGNED|NOT_FOUND|MONTH|ENROLLMENT|EVIDENCE_NOT_OWNED|METHOD_NOT_ALLOWED/.test(error.code);
        conflict = /CONFLICT|ROSTER_OPERATION_REUSED/.test(error.code) || (error.status === 409 && !rejected);
        // A definite rejection can be corrected; ambiguous network/5xx must replay.
        if (!conflict && ((error.status >= 400 && error.status < 500) || rejected)) operation = null;
        throw error;
      }
      const row = canonical(response.data?.row);
      version = row.evidence_version;
      operation = null;
      return row;
    } finally { busy = false; }
  }
  return {save,refresh,get conflict(){return conflict;},get pending(){return !!operation && !conflict;}};
}

export default function ReportInlineAssessment({row,onCanonicalSaved,onStateChange,assessmentContext}) {
  const {user,hasPermission} = useAuth();
  const permitted = hasPermission('progress.grade');
  const month = row.month;
  const scopeKey = JSON.stringify([user?.tenant_id,user?.id,permitted,row.student_id,row.class_id,month]);
  const session = useMemo(() => {
    const [, , , student_id, class_id, selectedMonth] = JSON.parse(scopeKey);
    return createSubmissionSession({scope:{student_id,class_id,month:selectedMonth},service:studentProgressService});
  },[scopeKey]);
  const {editable,replay,canSubmit} = assessmentEligibility(row,permitted,session.pending);
  const initialContext = assessmentContext || defaultAssessmentContext(row);
  const [state,setState] = useState({session,draft:emptyDraft(),context:initialContext,saving:false,error:'',message:''});
  const current = state.session === session ? state : {session,draft:emptyDraft(),context:initialContext,saving:false,error:'',message:''};
  const alive = useRef(session);
  const lock = useRef(false);
  const callbacks = useRef({onCanonicalSaved,onStateChange});
  callbacks.current = {onCanonicalSaved,onStateChange};
  const dirty = Object.values(current.draft).some(value => String(value).trim() !== '') || session.pending;
  useEffect(() => {
    alive.current = session;
    return () => { if (alive.current === session) alive.current = null; callbacks.current.onStateChange?.({dirty:false,saving:false}); };
  },[session]);
  useEffect(() => { callbacks.current.onStateChange?.({dirty,saving:current.saving || session.pending}); },[dirty,current.saving,session]);
  const valid = (() => {try {submissionScores(current.draft);return true;} catch {return false;}})();
  const frozen = current.saving || session.pending;
  function change(key,value) {
    if (!editable || frozen) return;
    setState({...current,draft:{...current.draft,[key]:value},error:'',message:''});
  }
  async function run(refresh = false) {
    if (!canSubmit || lock.current || (refresh && (!editable || session.pending))) return;
    lock.current = true;
    callbacks.current.onStateChange?.({dirty,saving:true});
    setState({...current,saving:true,error:'',message:''});
    let savedRow = null;
    try {
      const canonical = refresh ? await session.refresh() : await session.save(current.draft,current.context);
      if (alive.current !== session) return;
      setState({...current,draft:refresh ? current.draft : emptyDraft(),saving:false,error:'',message:refresh ? 'Đã tải phiên bản mới. Bản nhập được giữ; bấm Cập nhật để gửi.' : 'Đã cập nhật bài mới.'});
      if (!refresh && canonical) savedRow = canonical;
    } catch (error) {
      if (alive.current === session) setState({...current,saving:false,error:session.conflict ? 'Dữ liệu đã thay đổi. Giữ bản nhập; tải phiên bản mới trước khi cập nhật.' : `${error.message} ${session.pending ? 'Kết quả chưa rõ; thử lại đúng bài đã gửi.' : 'Bản nhập được giữ.'}`,message:''});
    } finally {lock.current = false;}
    if (savedRow && alive.current === session) {
      callbacks.current.onStateChange?.({dirty:false,saving:false});
      callbacks.current.onCanonicalSaved?.(savedRow);
    }
  }
  if (!editable && !replay) return <div className="text-xs text-slate-600">
    <p>{!permitted ? 'Không có quyền chấm điểm.' : row.is_finalized ? 'Tháng đã chốt · chỉ đọc.' : 'Chỉ nhập bài mới trong tháng hiện tại.'}</p>
    <a className="text-primary-700 underline" href={`/student-progress/${encodeURIComponent(row.student_id)}?class_id=${encodeURIComponent(row.class_id)}&month=${encodeURIComponent(month)}`}>Xem chi tiết</a>
  </div>;
  const input = key => <label key={key} className="min-w-0 text-xs text-slate-600">{skills[key]}
    <input type="number" min="0" max="100" step="any" inputMode="decimal" className="input mt-1 w-full min-w-0" aria-label={`${row.student_name || row.full_name || 'Học viên'} · ${skills[key]}`} value={current.draft[key]} disabled={frozen} onChange={event => change(key,event.target.value)} />
  </label>;
  return <form className="w-[180px] min-w-0 space-y-2" aria-label={`Bài mới · ${row.student_name || row.full_name || 'Học viên'}`} onSubmit={event => {event.preventDefault();run();}}>
    <div className="grid grid-cols-2 gap-2">{core.map(input)}</div>
    <details><summary className="cursor-pointer text-xs text-slate-600">Thông tin bài · Ghi chú</summary>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="text-xs text-slate-600">Level đề<select className="input mt-1 w-full" aria-label={`Level đề · ${row.student_name || row.full_name || 'Học viên'}`} value={current.context.exam_set_level ?? ''} disabled={frozen} onChange={event => setState({...current,context:{...current.context,exam_set_level:event.target.value || null},error:'',message:''})}><option value="">Không xác định</option>{levels.map(level => <option key={level} value={level}>{level.toUpperCase()}</option>)}</select></label>
        <label className="text-xs text-slate-600">Độ khó<select className="input mt-1 w-full" aria-label={`Độ khó · ${row.student_name || row.full_name || 'Học viên'}`} value={current.context.difficulty_level} disabled={frozen} onChange={event => setState({...current,context:{...current.context,difficulty_level:event.target.value},error:'',message:''})}>{Object.entries(difficulties).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <label className="mt-2 block text-xs text-slate-600">Ghi chú<input className="input mt-1 w-full" aria-label={`Ghi chú · ${row.student_name || row.full_name || 'Học viên'}`} value={current.draft.note} disabled={frozen} onChange={event => change('note',event.target.value)} /></label>
    </details>
    <div className="flex flex-wrap items-center gap-2">
      <button type="submit" className="btn-primary" disabled={current.saving || session.conflict || (!session.pending && !valid)}><Save size={14} aria-hidden="true"/>{current.saving ? 'Đang cập nhật…' : session.pending ? 'Thử lại bài đã gửi' : 'Cập nhật'}</button>
      {session.conflict && <button type="button" className="btn-secondary" disabled={current.saving} onClick={() => run(true)}><RefreshCw size={14} aria-hidden="true"/>Tải phiên bản mới</button>}
    </div>
    {current.error && <p role="alert" className="text-xs text-red-700">{current.error}</p>}
    {current.message && <p role="status" className="text-xs text-emerald-700">{current.message}</p>}
  </form>;
}
