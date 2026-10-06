import { Save, RotateCcw, Eye } from 'lucide-react';
import { ROSTER_DIFFICULTIES, ROSTER_SKILLS, rosterDraft } from '../../utils/progressRosterModel.js';
import { progressEvidenceLabel } from '../../utils/studentProgressDashboard.js';

export default function ProgressRosterRow({row, assessmentContext, draft, status, editable, skills = ROSTER_SKILLS, studentHeading = row.student_name, saveLabel = 'Lưu', cancelLabel = 'Hủy', onChange, onSave, onDetail}) {
  const baseline = rosterDraft(row);
  const dirty = Object.keys(baseline).some(key => baseline[key] !== draft[key]);
  const locked = !editable || row.is_finalized || status?.saving || status?.blocked;
  return <form className="border-b border-slate-200 py-4" onSubmit={event => {event.preventDefault(); onSave();}} aria-label={row.student_name}>
    <div className="grid items-start gap-3 lg:grid-cols-[minmax(150px,1fr)_minmax(280px,2fr)_minmax(120px,1fr)_auto]">
      <div className="min-w-0"><strong className="break-words">{studentHeading}</strong><p className="text-xs text-slate-500">{row.track_key || 'Chưa có track'} · {row.is_finalized ? 'Đã chốt' : dirty ? 'Chưa lưu' : 'Đã đồng bộ'}</p><button type="button" className="inline-flex items-center gap-1 text-xs" onClick={onDetail}><Eye size={14}/>Chi tiết / điểm tháng</button></div>
      <div className="grid grid-cols-4 gap-2">
        {skills.map(key => {
          const skill = row.skills?.[key];
          return <label key={key} className="min-w-0 text-xs font-semibold"><span className="block truncate" title={key}>{key[0].toUpperCase() + key.slice(1)}</span><input className="input mt-1 w-full min-w-0 px-2" aria-label={`${row.student_name} ${key}`} type="number" inputMode="decimal" min="0" max="100" step="any" value={draft[key]} placeholder="—" readOnly={Boolean(locked || skill?.count > 1 || skill?.editable === false)} onChange={event => onChange({...draft,[key]:event.target.value})}/>{skill?.count > 1 && <span className="block text-amber-700">{skill.count} bài · chỉ đọc</span>}{skill?.editable === false && <span className="block text-amber-700">Không có quyền sửa</span>}</label>;
        })}
      </div>
      <label className="min-w-0 text-xs font-semibold">Ghi chú<input className="input mt-1 w-full" aria-label={`Ghi chú ${row.student_name}`} value={draft.note} readOnly={Boolean(locked || row.note_count > 1 || row.note_editable === false)} onChange={event => onChange({...draft,note:event.target.value})}/>{row.note_count > 1 && <span className="text-amber-700">Nhiều ghi chú · chỉ đọc</span>}{row.note_editable === false && <span className="block text-amber-700">Không có quyền sửa</span>}</label>
      <div className="flex gap-2 pt-4"><button type="submit" className="btn-primary inline-flex items-center gap-1" disabled={locked || !dirty}><Save size={16}/>{status?.saving ? 'Đang lưu' : saveLabel}</button><button type="button" className="btn-secondary" title={cancelLabel} aria-label={`${cancelLabel} ${row.student_name}`} disabled={!dirty || status?.saving} onClick={() => onChange(baseline)}><RotateCcw size={16}/></button></div>
    </div>
    <p className="mt-2 text-xs text-slate-500">Điểm tháng: {Number.isFinite(row.progress_score) ? row.progress_score : '—'} · {progressEvidenceLabel(row)}</p>
    <details className="mt-1 text-xs text-slate-500"><summary className="cursor-pointer">Bằng chứng đánh giá</summary>
      {skills.filter(key => row.skills?.[key]?.count > 0).map(key => { const skill = row.skills[key]; return <p key={key}>{key}: {skill.exam_set_level?.toUpperCase() || 'Level chưa xác định'} · {ROSTER_DIFFICULTIES[skill.difficulty_level] || 'Độ khó chưa xác định'} · {skill.graded_by_teacher_name || (skill.graded_by_teacher_id ? 'GV đã ghi nhận' : 'GV chưa xác định')}</p>; })}
      {assessmentContext && <p>Bài mới: {assessmentContext.exam_set_level?.toUpperCase() || 'Level chưa xác định'} · {ROSTER_DIFFICULTIES[assessmentContext.difficulty_level]} · GV: {row.graded_by_teacher_name || (row.graded_by_teacher_id ? 'GV đã ghi nhận' : 'Chưa phân công')}</p>}
    </details>
    {status?.message && <p role={status.error ? 'alert' : 'status'} className={`mt-2 break-words text-sm ${status.error ? 'text-red-700' : 'text-emerald-700'}`}>{status.message}</p>}
  </form>;
}
