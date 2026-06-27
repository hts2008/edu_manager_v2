import { Plus, Save, Trash2 } from "lucide-react";

const CLASS_TYPE_OPTIONS = [
  { value: "communicative", label: "Giao tiếp / nền tảng" },
  { value: "exam_prep", label: "Luyện đề chứng chỉ" },
  { value: "mixed", label: "Kết hợp" },
];

const ENTRY_TYPES = [
  { value: "daily_practice", label: "Luyện hằng ngày" },
  { value: "homework", label: "Bài tập về nhà" },
  { value: "mock_test", label: "Luyện đề / mock test" },
  { value: "shield", label: "Khiên / shield" },
  { value: "note", label: "Ghi chú" },
];

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function ProgressInputPanel({
  row,
  form,
  loading,
  saving,
  message,
  onChange,
  onSave,
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

  function updateEntry(index, key, value) {
    const nextEntries = [...(form.daily_entries || [])];
    nextEntries[index] = { ...nextEntries[index], [key]: value };
    onChange({ ...form, daily_entries: nextEntries });
  }

  function addEntry() {
    onChange({
      ...form,
      daily_entries: [
        ...(form.daily_entries || []),
        {
          entry_date: todayKey(),
          entry_type: "daily_practice",
          skill_key: "listening",
          score: "",
          shield_count: 0,
          note: "",
        },
      ],
    });
  }

  const attendanceDates = Array.isArray(row.attendance_dates) ? row.attendance_dates : [];
  const enteredDates = new Set(((form?.daily_entries) || []).map((entry) => entry.entry_date));
  const missingAttendanceDates = attendanceDates.filter((date) => !enteredDates.has(date));

  function addEntryForDate(entryDate) {
    onChange({
      ...form,
      daily_entries: [
        ...(form.daily_entries || []),
        {
          entry_date: entryDate,
          entry_type: "daily_practice",
          skill_key: "listening",
          score: "",
          shield_count: 0,
          note: "Cap nhat sau buoi diem danh",
        },
      ],
    });
  }

  function removeEntry(index) {
    onChange({
      ...form,
      daily_entries: (form.daily_entries || []).filter((_, itemIndex) => itemIndex !== index),
    });
  }

  if (loading || !form) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
        Đang tải bản ghi tiến độ để nhập liệu...
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-3xl border border-indigo-100 bg-white p-4" data-testid="progress-input-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-black text-slate-950">Cập nhật tiến bộ tháng</h4>
          <p className="mt-1 text-xs text-slate-500">
            Nhập dữ liệu thật của giáo viên. Hệ thống sẽ tính điểm tổng và khuyến nghị.
          </p>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
          {row.month}
        </span>
      </div>

      {message && (
        <div
          className={`rounded-2xl px-3 py-2 text-sm font-bold ${
            message.type === "error"
              ? "bg-rose-50 text-rose-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
          Track
          <select
            className="input mt-2"
            value={form.track_key}
            onChange={(event) => setField("track_key", event.target.value)}
          >
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
          <select
            className="input mt-2"
            value={form.class_type}
            onChange={(event) => setField("class_type", event.target.value)}
          >
            {CLASS_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h5 className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
            Kỹ năng trọng tâm
          </h5>
          <span className="text-xs font-semibold text-slate-400">0-100 điểm</span>
        </div>
        <div className="grid gap-3">
          {(form.skills || []).map((skill, index) => (
            <div key={skill.skill_key} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="grid gap-2 sm:grid-cols-[minmax(100px,0.8fr)_90px_1fr]">
                <div>
                  <div className="font-black text-slate-900">{skill.skill_label}</div>
                  <div className="text-xs text-slate-500">{skill.skill_key}</div>
                </div>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max={skill.max_score || 100}
                  value={skill.score}
                  onChange={(event) => updateSkill(index, "score", event.target.value)}
                  placeholder="-"
                />
                <input
                  className="input"
                  value={skill.note}
                  onChange={(event) => updateSkill(index, "note", event.target.value)}
                  placeholder="Nhận xét kỹ năng..."
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h5 className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
            Luyện tập / bài về nhà / đề thi
          </h5>
          <button type="button" className="btn-secondary inline-flex items-center gap-2 px-3 py-2 text-xs" onClick={addEntry}>
            <Plus size={14} />
            Thêm dòng
          </button>
        </div>
        {attendanceDates.length > 0 && (
          <div className="mb-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.08em] text-indigo-700">
                  Theo ngay diem danh
                </div>
                <p className="mt-1 text-xs font-semibold text-indigo-700/75">
                  Tao dong tien do tu tung ngay da diem danh de cong don den cuoi thang.
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700">
                {attendanceDates.length} ngay
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {missingAttendanceDates.slice(0, 12).map((date) => (
                <button
                  key={date}
                  type="button"
                  className="rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-black text-indigo-700 shadow-sm hover:border-indigo-400 hover:bg-indigo-100"
                  onClick={() => addEntryForDate(date)}
                >
                  + {date.slice(8, 10)}/{date.slice(5, 7)}
                </button>
              ))}
              {!missingAttendanceDates.length && (
                <span className="rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                  Da co dong tien do cho tat ca ngay diem danh
                </span>
              )}
            </div>
          </div>
        )}
        <div className="space-y-2">
          {(form.daily_entries || []).map((entry, index) => (
            <div key={`${entry.entry_date}-${index}`} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
              <div className="grid gap-2 md:grid-cols-[110px_1fr_1fr_90px_80px_36px]">
                <input
                  className="input"
                  type="date"
                  value={entry.entry_date}
                  onChange={(event) => updateEntry(index, "entry_date", event.target.value)}
                />
                <select
                  className="input"
                  value={entry.entry_type}
                  onChange={(event) => updateEntry(index, "entry_type", event.target.value)}
                >
                  {ENTRY_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  className="input"
                  value={entry.skill_key || ""}
                  onChange={(event) => updateEntry(index, "skill_key", event.target.value || null)}
                >
                  <option value="">Không gắn kỹ năng</option>
                  {(form.skills || []).map((skill) => (
                    <option key={skill.skill_key} value={skill.skill_key}>
                      {skill.skill_label}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  type="number"
                  value={entry.score}
                  onChange={(event) => updateEntry(index, "score", event.target.value)}
                  placeholder="Điểm"
                />
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={entry.shield_count}
                  onChange={(event) => updateEntry(index, "shield_count", event.target.value)}
                  placeholder="Khiên"
                />
                <button
                  type="button"
                  className="rounded-xl border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100"
                  onClick={() => removeEntry(index)}
                  aria-label="Xóa dòng luyện tập"
                >
                  <Trash2 size={15} className="mx-auto" />
                </button>
              </div>
              <input
                className="input mt-2"
                value={entry.note}
                onChange={(event) => updateEntry(index, "note", event.target.value)}
                placeholder="Ghi chú bài tập, lỗi cần luyện, đề đã làm..."
              />
            </div>
          ))}
          {!(form.daily_entries || []).length && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              Chưa có dòng luyện tập. Bấm "Thêm dòng" để nhập bài tập, đề thi, hoặc khiên mỗi ngày.
            </div>
          )}
        </div>
      </div>

      <label className="block text-xs font-black uppercase tracking-[0.08em] text-slate-500">
        Ghi chú giáo viên
        <textarea
          className="input mt-2 min-h-24"
          value={form.teacher_note}
          onChange={(event) => setField("teacher_note", event.target.value)}
          placeholder="Ví dụ: cần luyện Speaking vì phát âm âm cuối chưa ổn..."
        />
      </label>

      <label className="block text-xs font-black uppercase tracking-[0.08em] text-slate-500">
        Tóm tắt cho phụ huynh (tùy chọn)
        <textarea
          className="input mt-2 min-h-24"
          value={form.parent_summary}
          onChange={(event) => setField("parent_summary", event.target.value)}
          placeholder="Để trống thì hệ thống sẽ tự viết từ dữ liệu thật."
        />
      </label>

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
          <input
            type="checkbox"
            checked={Boolean(form.finalized)}
            onChange={(event) => setField("finalized", event.target.checked)}
          />
          Chốt bản ghi tháng này
        </label>
        <button
          type="button"
          className="btn-primary inline-flex items-center justify-center gap-2"
          onClick={onSave}
          disabled={saving}
          data-testid="save-progress"
        >
          <Save size={16} />
          {saving ? "Đang lưu..." : "Lưu tiến độ"}
        </button>
      </div>
    </div>
  );
}
