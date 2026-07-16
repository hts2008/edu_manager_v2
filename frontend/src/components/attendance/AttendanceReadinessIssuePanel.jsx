import { AlertTriangle, RotateCcw, X } from "lucide-react";
import {
  ATTENDANCE_READINESS_ISSUES,
  formatAttendanceIssueDate,
} from "./attendanceReadiness";
import AttendanceMonthPlanReadiness from "./AttendanceMonthPlanReadiness";

const ACTION_LABELS = {
  submit: "nộp",
  approve: "duyệt",
  lock: "chốt",
};

export default function AttendanceReadinessIssuePanel({
  state,
  canReopen = false,
  onReopen,
  onEditMonthPlan,
  onDismiss,
}) {
  if (!state?.readiness) return null;

  const { readiness, error, action, period, month } = state;
  const actionLabel = ACTION_LABELS[action] || "xử lý";
  const periodMonth = month || period?.period_month || readiness.month;

  return (
    <section
      className="border-y border-amber-200 bg-amber-50 px-4 py-4 text-amber-950"
      role="alert"
      aria-labelledby="attendance-readiness-issue-title"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="attendance-readiness-issue-title" className="font-semibold">
                Chưa thể {actionLabel} kỳ điểm danh{periodMonth ? ` tháng ${periodMonth}` : ""}
              </h2>
              <p className="mt-1 text-sm text-amber-900">
                {error?.message || "Dữ liệu kỳ điểm danh chưa đáp ứng điều kiện xử lý."}
              </p>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-amber-800 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600"
              aria-label="Ẩn danh sách vấn đề"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <ul className="mt-3 space-y-2" aria-label="Các vấn đề cần xử lý">
            {readiness.issues.map((issue, index) => {
              const detail = ATTENDANCE_READINESS_ISSUES[issue.code];
              return (
                <li
                  key={`${issue.code}:${issue.session_id || issue.session_date || index}`}
                  className="border-l-2 border-amber-400 pl-3 text-sm"
                >
                  <span className="font-semibold">{detail?.label || issue.code}</span>
                  <span className="text-amber-900">
                    {` - ${detail?.description || issue.message || "Cần kiểm tra dữ liệu kỳ điểm danh."}`}
                  </span>
                  {(issue.session_date || issue.student_ids?.length) && (
                    <span className="mt-1 block text-xs font-medium text-amber-800">
                      {issue.session_date
                        ? `Ngày ${formatAttendanceIssueDate(issue.session_date)}`
                        : ""}
                      {issue.session_date && issue.student_ids?.length ? " · " : ""}
                      {issue.student_ids?.length
                        ? `${issue.student_ids.length} học viên liên quan`
                        : ""}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          <AttendanceMonthPlanReadiness
            readiness={readiness}
            month={periodMonth}
            onEditPlan={onEditMonthPlan}
          />

          {canReopen && (
            <button
              type="button"
              onClick={onReopen}
              className="mt-4 inline-flex items-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Mở lại để chỉnh sửa
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
