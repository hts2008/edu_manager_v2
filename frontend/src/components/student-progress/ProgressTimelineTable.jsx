import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, LockKeyhole } from "lucide-react";
import { PROGRESS_SKILLS, formatProgressValue } from "../../utils/studentProgressDashboard";

function formatDate(value) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function scoreTone(value) {
  if (value === null || value === undefined) return "text-slate-400";
  if (value >= 80) return "text-emerald-700";
  if (value >= 60) return "text-amber-700";
  return "text-rose-700";
}

export default function ProgressTimelineTable({ days, selectedDate, onSelectDate }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const totalPages = Math.max(1, Math.ceil((days?.length || 0) / pageSize));
  const visibleDays = (days || []).slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage((current) => Math.min(current, totalPages)), [totalPages]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" data-testid="progress-timeline-table">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="text-sm font-black text-slate-950">Dòng thời gian đánh giá</h3>
        <p className="mt-1 text-xs text-slate-500">Chọn một ngày để xem hoặc cập nhật evidence. Tháng đã chốt chỉ được xem.</p></div>
        <label className="text-xs font-bold text-slate-500">Hiển thị <select className="input ml-2 py-2" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value="50">50</option><option value="100">100</option><option value="500">500</option></select></label>
      </div>
      {days?.length ? (
        <>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Ngày</th>
                <th className="px-4 py-3">Bài / độ khó</th>
                <th className="px-4 py-3">Kỹ năng</th>
                <th className="px-4 py-3">Điểm thô</th>
                <th className="px-4 py-3">Quy đổi</th>
                <th className="px-4 py-3">Thay đổi</th>
                <th className="px-4 py-3 text-right">Mở</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleDays.map((day) => {
                const labels = [...new Set(day.entries.map((entry) => entry.entry_label).filter(Boolean))];
                const levels = [...new Set(day.entries.map((entry) => entry.difficulty_level).filter(Boolean))];
                const availableSkills = PROGRESS_SKILLS.filter((skill) => day.skills?.[skill.key]?.raw_score !== null);
                return (
                  <tr key={day.date} className={selectedDate === day.date ? "bg-indigo-50/70" : "hover:bg-slate-50"}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 font-black text-slate-950">
                        {formatDate(day.date)}
                        {day.month_finalized && <LockKeyhole size={14} className="text-amber-600" aria-label="Tháng đã chốt" />}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{day.entries.length} evidence</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-800">{labels.join(", ") || "Chưa đặt tên bài"}</div>
                      <div className="mt-1 text-xs uppercase text-slate-500">{levels.join(" · ") || "Không gắn độ khó"}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex max-w-xs flex-wrap gap-1.5">
                        {availableSkills.map((skill) => (
                          <span key={skill.key} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{skill.label}</span>
                        ))}
                      </div>
                    </td>
                    <td className={`px-4 py-4 font-black ${scoreTone(day.raw_score)}`}>{formatProgressValue(day.raw_score, "/100")}</td>
                    <td className={`px-4 py-4 font-black ${scoreTone(day.weighted_score)}`}>{formatProgressValue(day.weighted_score, "/100")}</td>
                    <td className={`px-4 py-4 font-black ${Number(day.delta) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {day.delta === null ? "—" : `${day.delta > 0 ? "+" : ""}${day.delta}`}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        className="btn-secondary inline-flex items-center gap-1 px-3 py-2 text-xs"
                        onClick={() => onSelectDate(day.date)}
                        aria-label={`Mở đánh giá ngày ${formatDate(day.date)}`}
                      >
                        Xem <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-3 text-xs font-bold text-slate-600"><span>Trang {page}/{totalPages}</span><button type="button" className="btn-secondary p-2" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} aria-label="Trang timeline trước"><ChevronLeft size={15} /></button><button type="button" className="btn-secondary p-2" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages} aria-label="Trang timeline sau"><ChevronRight size={15} /></button></div>}
        </>
      ) : (
        <div className="p-8 text-center text-sm font-semibold text-slate-500">
          Chưa có đánh giá trong kỳ này. Chọn ngày ở form bên dưới để tạo evidence đầu tiên.
        </div>
      )}
    </section>
  );
}
