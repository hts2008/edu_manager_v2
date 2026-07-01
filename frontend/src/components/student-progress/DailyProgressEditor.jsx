import { CalendarDays, Save, Shield, Trash2, TrendingUp } from "lucide-react";

function formatDate(value) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function displayMetric(value) {
  return value === null || value === undefined ? "missing_input" : String(value);
}

function lastDateOfMonth(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const day = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return `${month}-${String(day).padStart(2, "0")}`;
}

function groupTimeline(entries) {
  const groups = new Map();
  for (const entry of entries || []) {
    const group = groups.get(entry.entry_date) || {
      entryDate: entry.entry_date,
      scores: [],
      shieldCount: 0,
      note: "",
    };
    if (entry.entry_type === "skill_assessment") group.scores.push(entry);
    group.shieldCount += Number(entry.shield_count || 0);
    if (entry.entry_type === "note" && entry.note) group.note = entry.note;
    groups.set(entry.entry_date, group);
  }
  return [...groups.values()].sort((left, right) =>
    left.entryDate.localeCompare(right.entryDate),
  );
}

function DailyStatus({ daily }) {
  if (daily.loading) {
    return (
      <div className="rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm font-semibold text-sky-700" role="status" aria-live="polite">
        Đang tải dữ liệu ngày...
      </div>
    );
  }
  if (daily.error) {
    return <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700" role="alert">{daily.error}</div>;
  }
  if (daily.empty) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2 text-sm text-slate-500" role="status">
        Chưa có dữ liệu cho ngày này. Nhập bản ghi bên dưới để bắt đầu.
      </div>
    );
  }
  return null;
}

function DailySkills({ form, onChange }) {
  function updateSkill(skillKey, value) {
    onChange({
      ...form,
      skills: form.skills.map((skill) =>
        skill.skill_key === skillKey ? { ...skill, score: value } : skill,
      ),
    });
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h6 className="text-xs font-black uppercase tracking-[0.08em] text-slate-600">
          Đầy đủ 7 kỹ năng
        </h6>
        <span className="text-xs font-semibold text-slate-500">Để trống = chưa có dữ liệu</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {form.skills.map((skill) => (
          <label key={skill.skill_key} className="grid grid-cols-[minmax(0,1fr)_90px] items-center gap-2 rounded-xl border border-slate-100 bg-white p-3 text-sm font-bold text-slate-800">
            <span>
              {skill.skill_label}
              <span className="mt-0.5 block text-xs font-semibold text-slate-400">
                {skill.score === "" ? "missing_input" : "available"}
              </span>
            </span>
            <input
              className="input"
              type="number"
              min="0"
              max="100"
              value={skill.score}
              onChange={(event) => updateSkill(skill.skill_key, event.target.value)}
              aria-label={`Điểm ${skill.skill_label}`}
              data-testid={`daily-skill-${skill.skill_key}`}
              placeholder="-"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function DailyRollup({ rollup }) {
  const metrics = [
    ["Trung bình", displayMetric(rollup?.average_score)],
    ["Gần nhất", displayMetric(rollup?.latest_score)],
    ["Thay đổi", displayMetric(rollup?.score_delta)],
    ["Số điểm", rollup?.assessment_count || 0],
    ["Trọng tâm", rollup?.focus_skill_label || "Chưa có dữ liệu"],
  ];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <TrendingUp size={16} className="text-emerald-600" />
        <h6 className="text-xs font-black uppercase tracking-[0.08em] text-slate-600">Tổng hợp tháng từ dữ liệu ngày</h6>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
        {metrics.map(([label, value]) => (
          <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="font-black">{value}</dd></div>
        ))}
      </dl>
    </div>
  );
}

function DailyTimeline({ entries, loading }) {
  const timeline = groupTimeline(entries);
  return (
    <div data-testid="daily-timeline">
      <h6 className="text-xs font-black uppercase tracking-[0.08em] text-slate-600">
        Lịch sử theo thời gian
      </h6>
      {loading ? (
        <div className="mt-2 text-sm font-semibold text-slate-500" role="status">Đang tải lịch sử...</div>
      ) : timeline.length ? (
        <ol className="mt-2 space-y-2">
          {timeline.map((item) => (
            <li key={item.entryDate} className="rounded-xl border border-slate-100 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <time className="font-black text-slate-900" dateTime={item.entryDate}>{formatDate(item.entryDate)}</time>
                <span className="text-xs font-bold text-slate-500">
                  {item.scores.filter((entry) => entry.score !== null).length}/7 kỹ năng
                  {item.shieldCount ? ` · ${item.shieldCount} khiên` : ""}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{item.note || "Không có ghi chú theo ngày."}</p>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-2 rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-500">
          Chưa có bản ghi nào trong tháng.
        </div>
      )}
    </div>
  );
}

export default function DailyProgressEditor({
  row,
  daily,
  onDateChange,
  onChange,
  onSave,
  onDelete,
}) {
  const attendanceDates = Array.isArray(row.attendance_dates) ? row.attendance_dates : [];
  const isAttendanceDate = attendanceDates.includes(daily.selectedDate);

  return (
    <section className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50/40 p-4" data-testid="daily-progress-editor" aria-labelledby="daily-progress-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h5 id="daily-progress-heading" className="text-sm font-black text-slate-950">Cập nhật tiến độ theo ngày</h5>
          <p className="mt-1 text-xs text-slate-600">Mỗi lần lưu chỉ thay thế ngày đang chọn. Dữ liệu các ngày khác được giữ nguyên.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-black text-sky-700"><CalendarDays size={14} />{row.month}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(180px,1fr)_minmax(0,2fr)]">
        <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-600">
          Ngày ghi nhận
          <input
            className="input mt-2"
            type="date"
            min={`${row.month}-01`}
            max={lastDateOfMonth(row.month)}
            value={daily.selectedDate}
            onChange={(event) => onDateChange(event.target.value)}
            aria-label="Ngày ghi nhận"
            data-testid="daily-entry-date"
          />
        </label>
        <div>
          <div className="text-xs font-black uppercase tracking-[0.08em] text-slate-600">Chọn nhanh từ điểm danh</div>
          <div className="mt-2 flex min-h-11 flex-wrap gap-2">
            {attendanceDates.map((date) => (
              <button
                key={date}
                type="button"
                className={`rounded-md border px-3 py-2 text-xs font-black ${daily.selectedDate === date ? "border-sky-600 bg-sky-600 text-white" : "border-sky-200 bg-white text-sky-700 hover:border-sky-400"}`}
                onClick={() => onDateChange(date)}
                aria-pressed={daily.selectedDate === date}
              >
                {formatDate(date).slice(0, 5)}
              </button>
            ))}
            {!attendanceDates.length && <span className="self-center text-xs font-semibold text-slate-500">Tháng này chưa có ngày điểm danh.</span>}
          </div>
        </div>
      </div>

      <DailyStatus daily={daily} />
      {daily.message && (
        <div className={`rounded-xl px-3 py-2 text-sm font-bold ${daily.message.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`} role={daily.message.type === "error" ? "alert" : "status"} aria-live="polite">
          {daily.message.text}
        </div>
      )}

      <DailySkills form={daily.form} onChange={onChange} />

      <div className="grid gap-3 sm:grid-cols-[130px_minmax(0,1fr)]">
        <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-600">
          Shield
          <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold normal-case text-slate-400"><Shield size={12} />Kết quả trong ngày</span>
          <input className="input mt-2" type="number" min="0" value={daily.form.shield_count} onChange={(event) => onChange({ ...daily.form, shield_count: event.target.value })} aria-label="Số khiên trong ngày" />
        </label>
        <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-600">
          Ghi chú giáo viên theo ngày {!isAttendanceDate && <span className="text-rose-600">*</span>}
          <textarea
            className="input mt-2 min-h-24"
            value={daily.form.note}
            onChange={(event) => onChange({ ...daily.form, note: event.target.value })}
            aria-label="Ghi chú theo ngày"
            aria-required={!isAttendanceDate}
            placeholder={isAttendanceDate ? "Nhận xét buổi học, lỗi cần luyện, mục tiêu tiếp theo..." : "Bắt buộc nếu ngày này không có trong điểm danh."}
          />
        </label>
      </div>

      <div className="flex flex-col gap-2 border-t border-sky-100 pt-3 sm:flex-row sm:justify-end">
        <button type="button" className="btn-secondary inline-flex items-center justify-center gap-2 text-rose-700" onClick={onDelete} disabled={daily.loading || daily.saving || daily.deleting || daily.empty} data-testid="delete-daily-progress">
          <Trash2 size={16} />{daily.deleting ? "Đang xóa..." : "Xóa ngày này"}
        </button>
        <button type="button" className="btn-primary inline-flex items-center justify-center gap-2" onClick={onSave} disabled={daily.loading || daily.saving || daily.deleting || !daily.selectedDate} data-testid="save-daily-progress">
          <Save size={16} />{daily.saving ? "Đang lưu ngày..." : "Lưu ngày đã chọn"}
        </button>
      </div>

      <DailyRollup rollup={daily.rollup} />
      <DailyTimeline entries={daily.timeline} loading={daily.timelineLoading} />
    </section>
  );
}
