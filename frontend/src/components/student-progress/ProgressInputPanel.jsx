import { Save } from "lucide-react";
import DailyProgressEditor from "./DailyProgressEditor";

const CLASS_TYPE_OPTIONS = [
  { value: "communicative", label: "Giao tiếp / nền tảng" },
  { value: "exam_prep", label: "Luyện đề chứng chỉ" },
  { value: "mixed", label: "Kết hợp" },
];

export default function ProgressInputPanel({
  row,
  form,
  loading,
  saving,
  message,
  daily,
  onChange,
  onSave,
  onDailyDateChange,
  onDailyChange,
  onSaveDay,
  onDeleteDay,
}) {
  if (!row) return null;

  function setField(key, value) {
    onChange({ ...form, [key]: value });
  }

  function updateSkill(index, key, value) {
    const nextSkills = [...(form.skills || [])];
    nextSkills[index] = { ...nextSkills[index], [key]: value };
    onChange({ ...form, skills: nextSkills });
  }

  if (loading || !form) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500" role="status">
        Đang tải bản ghi tiến độ tháng...
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-indigo-100 bg-white p-4" data-testid="progress-input-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-black text-slate-950">Cập nhật tiến độ tháng</h4>
          <p className="mt-1 text-xs text-slate-500">Điểm tháng, nhận xét và trạng thái chốt được lưu riêng. Theo ngày điểm danh, mỗi bản ghi được lưu độc lập.</p>
        </div>
        <span className="rounded-md bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">{row.month}</span>
      </div>

      {message && (
        <div className={`rounded-xl px-3 py-2 text-sm font-bold ${message.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`} role={message.type === "error" ? "alert" : "status"}>
          {message.text}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
          Track
          <select className="input mt-2" value={form.track_key} onChange={(event) => setField("track_key", event.target.value)}>
            <option value="starters">Pre A1 Starters</option>
            <option value="movers">A1 Movers</option>
            <option value="flyers">A2 Flyers</option>
            <option value="ket">A2 Key / KET</option>
            <option value="pet">B1 Preliminary / PET</option>
            <option value="unknown">Chưa xác định</option>
          </select>
        </label>
        <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
          Loại lớp
          <select className="input mt-2" value={form.class_type} onChange={(event) => setField("class_type", event.target.value)}>
            {CLASS_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      <section aria-labelledby="monthly-scores-heading">
        <div className="mb-2 flex items-center justify-between">
          <h5 id="monthly-scores-heading" className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Điểm kỹ năng tháng hiện có</h5>
          <span className="text-xs font-semibold text-slate-400">0-100 điểm</span>
        </div>
        <div className="grid gap-3">
          {(form.skills || []).map((skill, index) => (
            <div key={skill.skill_key} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="grid gap-2 sm:grid-cols-[minmax(100px,0.8fr)_90px_1fr]">
                <div>
                  <div className="font-black text-slate-900">{skill.skill_label}</div>
                  <div className="text-xs text-slate-500">{skill.score === "" ? "missing_input" : skill.source || "available"}</div>
                </div>
                <input className="input" type="number" min="0" max={skill.max_score || 100} value={skill.score} onChange={(event) => updateSkill(index, "score", event.target.value)} placeholder="-" aria-label={`Điểm tháng ${skill.skill_label}`} />
                <input className="input" value={skill.note} onChange={(event) => updateSkill(index, "note", event.target.value)} placeholder="Nhận xét kỹ năng tháng..." aria-label={`Nhận xét tháng ${skill.skill_label}`} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <DailyProgressEditor
        row={row}
        daily={daily}
        onDateChange={onDailyDateChange}
        onChange={onDailyChange}
        onSave={onSaveDay}
        onDelete={onDeleteDay}
      />

      <section className="space-y-3 border-t border-slate-100 pt-4" aria-labelledby="monthly-narrative-heading">
        <h5 id="monthly-narrative-heading" className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Nhận xét và chốt tháng</h5>
        <label className="block text-xs font-black uppercase tracking-[0.08em] text-slate-500">
          Ghi chú giáo viên
          <textarea className="input mt-2 min-h-24" value={form.teacher_note} onChange={(event) => setField("teacher_note", event.target.value)} placeholder="Nhận xét tổng hợp của tháng..." />
        </label>
        <label className="block text-xs font-black uppercase tracking-[0.08em] text-slate-500">
          Tóm tắt cho phụ huynh
          <textarea className="input mt-2 min-h-24" value={form.parent_summary} onChange={(event) => setField("parent_summary", event.target.value)} placeholder="Để trống nếu muốn hệ thống tự tổng hợp." />
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
            <input type="checkbox" checked={Boolean(form.finalized)} onChange={(event) => setField("finalized", event.target.checked)} />
            Chốt bản ghi tháng này
          </label>
          <button type="button" className="btn-primary inline-flex items-center justify-center gap-2" onClick={onSave} disabled={saving} data-testid="save-progress">
            <Save size={16} />{saving ? "Đang lưu tháng..." : "Lưu nhận xét tháng"}
          </button>
        </div>
      </section>
    </div>
  );
}
