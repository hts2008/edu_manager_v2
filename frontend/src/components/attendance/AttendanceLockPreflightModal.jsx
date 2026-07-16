import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CalendarX2,
  CheckCircle2,
  ClipboardX,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  UsersRound,
} from "lucide-react";
import Modal from "../ui/Modal";
import ActionProgressButton from "../ui/ActionProgressButton";
import AttendanceMonthPlanReadiness from "./AttendanceMonthPlanReadiness";
import {
  ATTENDANCE_READINESS_ISSUES,
  formatAttendanceIssueDate,
} from "./attendanceReadiness";

const ISSUE_ICONS = {
  "calendar-clock": CalendarClock,
  "clipboard-x": ClipboardX,
  users: UsersRound,
  "calendar-x": CalendarX2,
};

function SummaryMetric({ label, value }) {
  return (
    <div className="border-r border-slate-200 px-3 last:border-r-0">
      <p className="text-lg font-bold text-slate-900">{value ?? 0}</p>
      <p className="text-xs leading-4 text-slate-500">{label}</p>
    </div>
  );
}

export default function AttendanceLockPreflightModal({
  dialog,
  onClose,
  onRetry,
  onConfirmLock,
  onReopenForCorrection,
  onEditMonthPlan,
}) {
  const [showCorrection, setShowCorrection] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const { target, preflight, loading, mutationBusy, error, actionError } = dialog;
  const issues = useMemo(() => preflight?.issues || [], [preflight]);

  useEffect(() => {
    setShowCorrection(false);
    setReason("");
    setReasonError("");
  }, [target?.id]);

  const handleReopen = async () => {
    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      setReasonError("Vui lòng nhập lý do cần mở lại kỳ điểm danh.");
      return;
    }
    setReasonError("");
    await onReopenForCorrection(normalizedReason);
  };

  return (
    <Modal
      isOpen={Boolean(target)}
      onClose={onClose}
      title="Kiểm tra trước khi chốt điểm danh"
      size="lg"
      busy={mutationBusy}
      busyLabel="Đang cập nhật kỳ điểm danh..."
      confirmOnClose={showCorrection}
      confirmCloseMessage="Lý do mở lại chưa được gửi. Đóng hộp thoại sẽ bỏ nội dung này."
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <LockKeyhole className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">
              Kỳ điểm danh tháng {target?.period_month}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Hệ thống kiểm tra lịch học, trạng thái buổi học, ghi danh và dữ liệu điểm danh trước khi khóa.
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex min-h-44 flex-col items-center justify-center gap-3 text-center" role="status" aria-live="polite">
            <RefreshCw className="h-7 w-7 animate-spin text-blue-600 motion-reduce:animate-none" aria-hidden="true" />
            <div>
              <p className="font-semibold text-slate-900">Đang kiểm tra điều kiện chốt</p>
              <p className="mt-1 text-sm text-slate-500">Dữ liệu được tải mới, không dùng bản lưu tạm.</p>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4" role="alert">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-rose-900">Không thể hoàn tất kiểm tra</p>
                <p className="mt-1 text-sm text-rose-800">{error}</p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-3 inline-flex items-center gap-2 rounded-md border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Thử kiểm tra lại
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && preflight && (
          <>
            <div className="grid grid-cols-2 divide-x divide-slate-200 rounded-lg border border-slate-200 bg-slate-50 py-3 sm:grid-cols-4">
              <SummaryMetric label="Buổi chính khóa" value={preflight.summary?.regular_sessions} />
              <SummaryMetric label="Buổi đã xử lý" value={preflight.summary?.resolved_sessions} />
              <SummaryMetric label="Học viên dự kiến" value={preflight.summary?.expected_students} />
              <SummaryMetric label="Lượt còn thiếu" value={preflight.summary?.missing_attendance_records} />
            </div>

            {preflight.ready_to_lock ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex gap-3">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-emerald-900">Kỳ điểm danh sẵn sàng để chốt</p>
                    <p className="mt-1 text-sm text-emerald-800">
                      Sau khi chốt, dữ liệu sẽ được dùng làm căn cứ tính và thu học phí.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-6 w-6 shrink-0 text-amber-600" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-amber-950">Chưa thể chốt kỳ điểm danh</p>
                      <p className="mt-1 text-sm text-amber-900">
                        Cần xử lý {issues.length} vấn đề bên dưới rồi kiểm tra lại.
                      </p>
                    </div>
                  </div>
                </div>

                <ul className="space-y-2" aria-label="Các vấn đề cần xử lý">
                  {issues.map((issue, index) => {
                    const detail = ATTENDANCE_READINESS_ISSUES[issue.code] || {
                      label: "Vấn đề dữ liệu điểm danh",
                      description: issue.message,
                      icon: "alert",
                    };
                    const IssueIcon = ISSUE_ICONS[detail.icon] || AlertTriangle;
                    return (
                      <li key={`${issue.code}:${issue.session_id || issue.session_date || index}`} className="flex gap-3 rounded-lg border border-slate-200 p-3">
                        <IssueIcon className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" aria-hidden="true" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="font-semibold text-slate-900">{detail.label}</p>
                            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{issue.code}</code>
                          </div>
                          <p className="mt-1 text-sm text-slate-600">{detail.description}</p>
                          {(issue.session_date || issue.student_ids?.length) && (
                            <p className="mt-1 text-xs font-medium text-slate-500">
                              {issue.session_date ? `Ngày ${formatAttendanceIssueDate(issue.session_date)}` : ""}
                              {issue.session_date && issue.student_ids?.length ? " · " : ""}
                              {issue.student_ids?.length ? `${issue.student_ids.length} học viên liên quan` : ""}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <AttendanceMonthPlanReadiness
                  readiness={preflight}
                  month={target?.period_month}
                  onEditPlan={onEditMonthPlan}
                />

                {!showCorrection ? (
                  <button
                    type="button"
                    onClick={() => setShowCorrection(true)}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Mở lại để chỉnh sửa
                  </button>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <label htmlFor="attendance-correction-reason" className="block text-sm font-semibold text-slate-800">
                      Lý do mở lại <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      id="attendance-correction-reason"
                      value={reason}
                      onChange={(event) => {
                        setReason(event.target.value);
                        if (reasonError) setReasonError("");
                      }}
                      rows={3}
                      disabled={mutationBusy}
                      aria-invalid={Boolean(reasonError)}
                      aria-describedby={reasonError ? "attendance-correction-reason-error" : undefined}
                      placeholder="Nêu rõ nội dung cần sửa trước khi chốt lại..."
                      className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    {reasonError && <p id="attendance-correction-reason-error" className="mt-2 text-sm font-medium text-rose-700" role="alert">{reasonError}</p>}
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCorrection(false);
                          setReason("");
                          setReasonError("");
                        }}
                        disabled={mutationBusy}
                        className="rounded-md px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-60"
                      >
                        Hủy
                      </button>
                      <ActionProgressButton
                        onClick={handleReopen}
                        loading={mutationBusy}
                        loadingLabel="Đang mở lại..."
                        className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
                      >
                        Xác nhận mở lại
                      </ActionProgressButton>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {actionError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800" role="alert">
            {actionError}
          </div>
        )}

        {!loading && preflight?.ready_to_lock && (
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={mutationBusy}
              className="rounded-md px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
            >
              Để sau
            </button>
            <ActionProgressButton
              onClick={onConfirmLock}
              loading={mutationBusy}
              loadingLabel="Đang chốt..."
              className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
              Xác nhận chốt điểm danh
            </ActionProgressButton>
          </div>
        )}
      </div>
    </Modal>
  );
}
