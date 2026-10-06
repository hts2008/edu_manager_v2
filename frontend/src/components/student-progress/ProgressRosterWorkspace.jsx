import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { studentProgressService } from '../../services/api';
import { rejectRosterSave, ROSTER_DIFFICULTIES, ROSTER_EXAM_LEVELS, rosterAssessmentContext, acceptRosterCanonical, createRosterGeneration, rosterDraft, rosterPayload } from '../../utils/progressRosterModel.js';
import ProgressRosterRow from './ProgressRosterRow';
import { useExperience } from '../../context/ExperienceContext';
import { ROSTER_ALL_SKILLS, ROSTER_SKILLS } from '../../utils/progressRosterModel.js';
import useDraftNavigationGuard from '../../hooks/useDraftNavigationGuard';

function businessDate() {
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}

export default function ProgressRosterWorkspace({classOptions, navigationState, onCanonicalSaved}) {
  const navigate = useNavigate();
  const {text} = useExperience();
  const {hasPermission, user} = useAuth();
  const editable = hasPermission('progress.grade');
  const accountKey = `${user?.tenant_id || ''}:${user?.id || ''}:${editable}`;
  const [scope,setScope] = useState(() => ({class_id:'',month:businessDate().slice(0,7),entry_date:businessDate(),offset:0,limit:50}));
  const [state,setState] = useState({rows:[],drafts:{},statuses:{},total:0,next_offset:null,loading:false,error:''});
  const [refresh,setRefresh] = useState(0);
  const [calibration,setCalibration] = useState({exam_set_level:'track',difficulty_level:'medium'});
  const [extraSkills,setExtraSkills] = useState(false);
  const guard = useRef(createRosterGeneration());
  const locks = useRef(new Set());
  const operations = useRef(new Map());
  const dirty = state.rows.some(row => JSON.stringify(rosterDraft(row)) !== JSON.stringify(state.drafts[row.student_id]));
  const saving = Object.values(state.statuses).some(status => status.saving);
  const departure = useRef({dirty:false,saving:false});
  departure.current = {dirty,saving};
  if (navigationState) navigationState.current = departure.current;
  useDraftNavigationGuard({ dirty, saving, pending: () => locks.current.size > 0 });
  useEffect(() => {
    const generation = guard.current.next();
    locks.current.clear();
    operations.current.clear();
    if (!scope.class_id) return () => guard.current.invalidate();
    setState({rows:[],drafts:{},statuses:{},total:0,next_offset:null,loading:true,error:''});
    (async () => {
      try {
        const response = await studentProgressService.getRoster(scope);
        if (!response.success) throw new Error(response.error?.message || 'Không tải được bảng điểm.');
        if (!guard.current.current(generation)) return;
        const rows = response.data.rows;
        setState({rows,drafts:Object.fromEntries(rows.map(row => [row.student_id,rosterDraft(row)])),statuses:{},total:response.data.total,next_offset:response.data.next_offset,loading:false,error:''});
      } catch (error) {
        if (guard.current.current(generation)) setState(current => ({...current,loading:false,error:error.message}));
      }
    })();
    return () => guard.current.invalidate();
  },[scope,refresh,accountKey]);
  function switchScope(change) {
    if (locks.current.size || saving || (dirty && !window.confirm('Bỏ các thay đổi chưa lưu?'))) return;
    guard.current.invalidate();
    setState({rows:[],drafts:{},statuses:{},total:0,next_offset:null,loading:false,error:''});
    setScope(current => ({...current,...change}));
  }
  async function save(row) {
    const id = row.student_id;
    if (!editable || state.loading || state.statuses[id]?.blocked || locks.current.has(id)) return;
    const generation = guard.current.capture();
    locks.current.add(id);
    setState(current => ({...current,statuses:{...current.statuses,[id]:{saving:true}}}));
    try {
      const draft = state.drafts[id];
      const assessmentContext = rosterAssessmentContext(row,calibration);
      const fingerprint = JSON.stringify({draft,assessmentContext});
      const previous = operations.current.get(id);
      const operation = previous?.fingerprint === fingerprint ? previous.id : crypto.randomUUID();
      const payload = previous?.fingerprint === fingerprint ? previous.payload : rosterPayload(row,draft,scope,operation,assessmentContext);
      operations.current.set(id,{fingerprint,id:operation,payload});
      if (!Object.keys(payload.changes).length && payload.note === undefined) throw new Error('Không có điểm thay đổi.');
      const response = await studentProgressService.saveRosterRow(payload);
      if (!response.success) throw Object.assign(new Error(response.error?.message || 'Không lưu được. Giữ nguyên bản nhập; tải lại nếu dữ liệu đã thay đổi.'),{code:response.error?.code});
      if (!guard.current.current(generation)) return;
      const canonical = response.data.row;
      acceptRosterCanonical(state,id,canonical);
      setState(current => acceptRosterCanonical(current,id,canonical));
      onCanonicalSaved?.(canonical);
    } catch (error) {
      if (guard.current.current(generation)) setState(current => rejectRosterSave(current,id,error));
    } finally {locks.current.delete(id);}
  }
  return <section data-testid="progress-roster" data-loading={state.loading} className="space-y-4">
    {scope.class_id && <p className="text-sm font-semibold">{text('progress.period', { className: classOptions.find(item => item.value === scope.class_id)?.label || scope.class_id, month: scope.month })}</p>}
    <div className="grid gap-3 sm:grid-cols-4">
      <label className="text-sm font-semibold">Lớp<select aria-label="Lớp" className="input mt-1" value={scope.class_id} disabled={saving} onChange={event => switchScope({class_id:event.target.value,offset:0})}><option value="">Chọn lớp</option>{classOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label className="text-sm font-semibold">Tháng<input aria-label="Tháng" type="month" className="input mt-1" value={scope.month} disabled={saving} onChange={event => event.target.value && switchScope({month:event.target.value,entry_date:`${event.target.value}-01`,offset:0})}/></label>
      <label className="text-sm font-semibold">Ngày chấm<input aria-label="Ngày chấm" type="date" className="input mt-1" value={scope.entry_date} disabled={saving} onChange={event => event.target.value && switchScope({entry_date:event.target.value,month:event.target.value.slice(0,7),offset:0})}/></label>
      <button aria-label="Tải lại bảng điểm" className="btn-secondary self-end inline-flex items-center justify-center gap-2" disabled={saving || state.loading || !scope.class_id} onClick={() => {if (!locks.current.size && (!dirty || window.confirm('Bỏ các thay đổi chưa lưu và tải lại?'))) {guard.current.invalidate(); setRefresh(value => value+1);}}}><RefreshCw size={16}/>{text('common.retry')}</button>
    </div>
    <details className="roster-entry-options">
    <summary className="text-sm font-semibold cursor-pointer">Bài mới · {calibration.exam_set_level === 'track' ? 'Theo track' : calibration.exam_set_level.toUpperCase() || 'Không xác định'} · {ROSTER_DIFFICULTIES[calibration.difficulty_level]}</summary>
    <div className="grid gap-3 sm:grid-cols-2 mt-3">
      <label className="text-sm font-semibold">Level đề · bài mới<select className="input mt-1" value={calibration.exam_set_level} disabled={!editable || saving} onChange={event => {if (!locks.current.size) setCalibration(current => ({...current,exam_set_level:event.target.value}));}}><option value="track">Theo track từng dòng</option><option value="">Không xác định</option>{ROSTER_EXAM_LEVELS.map(level => <option key={level} value={level}>{level.toUpperCase()}</option>)}</select></label>
      <label className="text-sm font-semibold">Độ khó · bài mới<select className="input mt-1" value={calibration.difficulty_level} disabled={!editable || saving} onChange={event => {if (!locks.current.size) setCalibration(current => ({...current,difficulty_level:event.target.value}));}}>{Object.entries(ROSTER_DIFFICULTIES).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    <label className="flex items-center gap-2 text-sm mt-3"><input type="checkbox" checked={extraSkills} onChange={event => setExtraSkills(event.target.checked)}/>Homework · Daily practice · Mock test</label>
    <p className="text-xs text-slate-500">Bài đã có giữ nguyên level đề, độ khó và giáo viên chấm. Bài mới dùng giáo viên được phân công.</p>
    </details>
    {!editable && <p role="status" className="text-amber-700">Chỉ đọc · Không có quyền chấm điểm.</p>}
    {state.loading && <p role="status">{text('common.loading')}</p>}
    {state.error && <p role="alert" className="text-red-700">{state.error}</p>}
    {!scope.class_id && <p className="text-sm text-slate-500">Chưa chọn lớp.</p>}
    {scope.class_id && !state.loading && !state.error && !state.rows.length && <p>{text('common.empty')}</p>}
    {!!state.rows.length && <div className="hidden grid-cols-[minmax(150px,1fr)_minmax(280px,2fr)_minmax(120px,1fr)_auto] gap-3 border-b border-slate-200 px-3 pb-2 text-xs font-semibold lg:grid"><span>{text('progress.column.student')}</span><span>{text('progress.column.score')}</span><span>Ghi chú</span><span className="w-24"/></div>}
    <div>{state.rows.map(row => <ProgressRosterRow key={row.student_id} row={row} skills={extraSkills ? ROSTER_ALL_SKILLS : ROSTER_SKILLS} studentHeading={text('progress.student_heading',{studentName:row.student_name})} saveLabel={text('common.save')} cancelLabel={text('common.cancel')} assessmentContext={rosterAssessmentContext(row,calibration)} draft={state.drafts[row.student_id]} status={state.statuses[row.student_id]} editable={editable} onChange={draft => setState(current => ({...current,drafts:{...current.drafts,[row.student_id]:draft}}))} onSave={() => save(row)} onDetail={() => navigate(`/student-progress/${encodeURIComponent(row.student_id)}?class_id=${encodeURIComponent(row.class_id)}&month=${encodeURIComponent(scope.month)}`)}/>)}</div>
    <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm">{state.total} học viên · tối đa 50 dòng/trang</span><div className="flex gap-2"><button className="btn-secondary" disabled={saving || state.loading || scope.offset === 0} onClick={() => switchScope({offset:Math.max(0,scope.offset-50)})}>Trước</button><button className="btn-secondary" disabled={saving || state.loading || state.next_offset == null} onClick={() => switchScope({offset:state.next_offset})}>Sau</button></div></div>
  </section>;
}
