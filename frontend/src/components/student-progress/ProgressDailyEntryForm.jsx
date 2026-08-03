import { ClipboardCopy, Save, Trash2 } from "lucide-react";
import {
  analyzeDailyEntriesForGrid,
  PROGRESS_SKILLS,
} from "../../utils/studentProgressDashboard";

const ENTRY_TYPES = [
  { value: "skill_assessment", label: "Đánh giá kỹ năng" },
  { value: "mock_test", label: "Bài kiểm tra / đề thi thử" },
  { value: "homework", label: "Bài tập về nhà" },
  { value: "daily_practice", label: "Luyện tập hằng ngày" },
];

const DIFFICULTIES = [
  { value: "starters", label: "Pre A1 Starters" },
  { value: "movers", label: "A1 Movers" },
  { value: "flyers", label: "A2 Flyers" },
  { value: "ket", label: "A2 Key / KET" },
  { value: "pet", label: "B1 Preliminary / PET" },
];

export function createEmptyProgressDayForm(defaultDifficulty = "") {
  return {
    entry_type: "skill_assessment",
    difficulty_level: DIFFICULTIES.some((item) => item.value === defaultDifficulty) ? defaultDifficulty : "",
    entry_label: "",
    graded_by_teacher_id: "",
    shield_count: "0",
    note: "",
    edit_safety: { safe: true, reasons: [] },
    skills: PROGRESS_SKILLS.map((skill) => ({
      skill_key: skill.key,
      skill_label: skill.label,
      score: "",
    })),
  };
}

export function buildProgressDayForm(payload, defaultDifficulty = "") {
  const entries = payload?.daily_entries || [];
  const editSafety = analyzeDailyEntriesForGrid(entries);
  const scoreEntries = entries.filter((entry) => entry.skill_key && entry.score !== null);
  const evidenceEntry = entries.find((entry) => ["mock_test", "homework", "daily_practice"].includes(entry.entry_type));
  const first = evidenceEntry || scoreEntries[0] || entries[0];
  const scores = new Map(scoreEntries.map((entry) => [entry.skill_key, entry.score]));
  return {
    ...createEmptyProgressDayForm(defaultDifficulty),
    entry_type: first?.entry_type && first.entry_type !== "shield" && first.entry_type !== "note" ? first.entry_type : "skill_assessment",
    difficulty_level: first?.difficulty_level || defaultDifficulty || "",
    entry_label: first?.entry_label || "",
    graded_by_teacher_id: first?.graded_by_teacher_id || "",
    shield_count: String(entries.reduce((sum, entry) => sum + Number(entry.shield_count || 0), 0)),
    note: payload?.note || entries.find((entry) => entry.entry_type === "note")?.note || "",
    edit_safety: editSafety,
    skills: PROGRESS_SKILLS.map((skill) => ({
      skill_key: skill.key,
      skill_label: skill.label,
      score: editSafety.safe && scores.has(skill.key) ? String(scores.get(skill.key)) : "",
    })),
  };
}

export default function ProgressDailyEntryForm({
  entryDate,
  form,
  teachers,
  loading,
  saving,
  deleting,
  locked,
  unavailable,
  hasEntries,
  message,
  onDateChange,
  onChange,
  onCopyPrevious,
  onSave,
  onDelete,
}) {
  const editBlocked = form.edit_safety?.safe === false;

  function setField(key, value) {
    onChange({ ...form, [key]: value });
  }

  function setSkill(skillKey, value) {
    onChange({
      ...form,
      skills: form.skills.map((skill) =>
        skill.skill_key === skillKey ? { ...skill, score: value } : skill,
      ),
    });
  }

  const inputCount = form.skills.filter((skill) => skill.score !== "").length;

  return (
    <section className="rounded-2xl border border-indigo-200 bg-white shadow-sm" data-testid="progress-daily-entry-form">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-950">Nhập evidence theo ngày</h3>
          <p className="mt-1 text-xs text-slate-500">Lưu ngày mới không ghi đè ngày khác. Để trống điểm chưa có, không nhập 0 thay thế.</p>
        </div>
        <button type="button" className="btn-secondary inline-flex items-center justify-center gap-2" onClick={onCopyPrevious} disabled={loading || locked || unavailable || editBlocked}>
          <ClipboardCopy size={16} /> Sao chép ngày trước
        </button>
      </div>

      <fieldset disabled={loading || locked || unavailable} className="space-y-4 p-4 disabled:opacity-70">
        {message && (
          <div className={`rounded-xl px-3 py-2 text-sm font-bold ${message.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`} role={message.type === "error" ? "alert" : "status"} aria-live="polite">
            {message.text}
          </div>
        )}
        {locked && (
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800" role="status">
            Tháng của ngày này đã chốt. Admin cần mở lại bản ghi tháng trước khi chỉnh sửa.
          </div>
        )}
        {unavailable && !loading && (
          <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700" role="alert">
            Chưa tải được dữ liệu ngày này. Hãy thử lại trước khi chỉnh sửa hoặc lưu.
          </div>
        )}
        {editBlocked && (
          <div id="progress-day-edit-safety" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900" role="alert">
            Không thể sửa ngày này bằng lưới đơn vì có nhiều lần chấm cùng kỹ năng hoặc metadata khác nhau. Dữ liệu hiện tại được giữ nguyên; hãy xóa ngày có chủ đích hoặc dùng trình chỉnh sửa evidence chi tiết.
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
            Ngày đánh giá
            <input className="input mt-2 w-full" type="date" value={entryDate} onChange={(event) => onDateChange(event.target.value)} data-testid="progress-entry-date" />
          </label>
          <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
            Loại evidence
            <select className="input mt-2 w-full" value={form.entry_type} onChange={(event) => setField("entry_type", event.target.value)} disabled={editBlocked} aria-describedby={editBlocked ? "progress-day-edit-safety" : undefined} data-testid="progress-entry-type">
              {ENTRY_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
            Độ khó đề / bài
            <select className="input mt-2 w-full" value={form.difficulty_level} onChange={(event) => setField("difficulty_level", event.target.value)} disabled={editBlocked} aria-describedby={editBlocked ? "progress-day-edit-safety" : undefined} data-testid="progress-entry-difficulty">
              <option value="">Không quy đổi</option>
              {DIFFICULTIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
            Giáo viên chấm
            <select className="input mt-2 w-full" value={form.graded_by_teacher_id} onChange={(event) => setField("graded_by_teacher_id", event.target.value)} disabled={editBlocked} aria-describedby={editBlocked ? "progress-day-edit-safety" : undefined} data-testid="progress-entry-grader">
              <option value="">Chưa chỉ định</option>
              {(teachers || []).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.full_name || teacher.fullName}</option>)}
            </select>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem]">
          <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
            Tên bài tập / đề thi
            <input className="input mt-2 w-full" maxLength={200} value={form.entry_label} onChange={(event) => setField("entry_label", event.target.value)} disabled={editBlocked} placeholder="Ví dụ: Flyers Reading & Writing Test 2" data-testid="progress-entry-label" />
          </label>
          <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
            Khiên đạt được
            <input className="input mt-2 w-full" type="number" min="0" value={form.shield_count} onChange={(event) => setField("shield_count", event.target.value)} disabled={editBlocked} />
          </label>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Điểm kỹ năng 0-100</h4>
            <span className="text-xs font-bold text-indigo-600">Đã nhập {inputCount}/7</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {form.skills.map((skill) => (
              <label key={skill.skill_key} className="grid grid-cols-[minmax(0,1fr)_5.5rem] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-black text-slate-800">
                <span>{skill.skill_label}</span>
                <input className="input bg-white" type="number" min="0" max="100" value={skill.score} onChange={(event) => setSkill(skill.skill_key, event.target.value)} disabled={editBlocked} placeholder="—" aria-label={`Điểm ${skill.skill_label}`} data-testid={`progress-entry-skill-${skill.skill_key}`} />
              </label>
            ))}
          </div>
        </div>

        <label className="block text-xs font-black uppercase tracking-[0.08em] text-slate-500">
          Nhận xét trong ngày / kỹ năng cần tập trung
          <textarea className="input mt-2 min-h-24 w-full" value={form.note} onChange={(event) => setField("note", event.target.value)} disabled={editBlocked} placeholder="Nêu điểm tiến bộ, lỗi cụ thể và bài luyện tiếp theo..." data-testid="progress-entry-note" />
        </label>
      </fieldset>

      <div className="flex flex-col gap-2 border-t border-slate-100 p-4 sm:flex-row sm:justify-end">
        <button type="button" className="btn-secondary inline-flex items-center justify-center gap-2 text-rose-700" onClick={onDelete} disabled={!hasEntries || deleting || saving || locked || unavailable}>
          <Trash2 size={16} /> {deleting ? "Đang xóa..." : "Xóa ngày này"}
        </button>
        <button type="button" className="btn-primary inline-flex items-center justify-center gap-2" onClick={onSave} disabled={saving || deleting || locked || unavailable || editBlocked || !entryDate} data-testid="save-progress-day">
          <Save size={16} /> {saving ? "Đang lưu..." : "Lưu evidence ngày"}
        </button>
      </div>
    </section>
  );
}
