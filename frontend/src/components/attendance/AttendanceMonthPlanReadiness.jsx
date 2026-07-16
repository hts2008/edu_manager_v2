import { CalendarRange, PencilLine } from "lucide-react";
import { normalizeAttendancePlanReadiness } from "./attendanceReadiness";

function Metric({ label, value, tone = "text-slate-900" }) {
  return (
    <div className="min-w-0 border-l border-amber-200 pl-3 first:border-l-0 first:pl-0">
      <p className={`break-words text-base font-bold ${tone}`}>{value}</p>
      <p className="text-[11px] font-medium text-amber-800">{label}</p>
    </div>
  );
}

export default function AttendanceMonthPlanReadiness({ readiness, month, onEditPlan }) {
  const plan = normalizeAttendancePlanReadiness(readiness);
  if (!plan?.hasPublishedPlanIssue) return null;

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-white/70 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          <CalendarRange className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-950">
              Mức sẵn sàng kế hoạch {month || plan.month ? `tháng ${month || plan.month}` : "tháng"}
            </p>
            <p className="mt-0.5 text-xs text-amber-800">
              Bổ sung đủ ngày học chính khóa trước khi nộp hoặc chốt điểm danh.
            </p>
          </div>
        </div>
        {onEditPlan && (
          <button
            type="button"
            onClick={onEditPlan}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2"
          >
            <PencilLine className="h-4 w-4" aria-hidden="true" />
            Chỉnh kế hoạch tháng
          </button>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4">
        <Metric label="Dự kiến" value={plan.expectedKnown ? plan.expected : "Chưa xác định"} />
        <Metric label="Đã có" value={plan.actual} />
        <Metric label="Còn thiếu" value={plan.expectedKnown ? plan.missing : "Chưa xác định"} tone="text-rose-700" />
        <Metric label="Nguồn" value={plan.source} />
      </div>
    </div>
  );
}
