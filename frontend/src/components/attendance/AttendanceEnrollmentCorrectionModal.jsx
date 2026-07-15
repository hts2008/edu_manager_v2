import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import ActionProgressButton from "../ui/ActionProgressButton";
import { resolveEnrollmentCorrectionStudents } from "../../utils/attendanceEnrollmentCorrection";

export default function AttendanceEnrollmentCorrectionModal({
  open,
  effectiveDate,
  suggestedEffectiveDate,
  effectiveDateSource,
  minDate,
  maxDate,
  students = [],
  busy = false,
  onClose,
  onConfirm,
}) {
  const [reason, setReason] = useState("");
  const [correctionDate, setCorrectionDate] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
      setCorrectionDate(effectiveDate || suggestedEffectiveDate || "");
    }
  }, [open, effectiveDate, suggestedEffectiveDate]);

  const dateInRange = Boolean(
    correctionDate &&
      (!minDate || correctionDate >= minDate) &&
      (!maxDate || correctionDate <= maxDate),
  );
  const affectedStudents = resolveEnrollmentCorrectionStudents(
    students,
    correctionDate,
  );
  const canSubmit =
    reason.trim().length >= 10 &&
    dateInRange &&
    affectedStudents.length > 0 &&
    !busy;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Hiệu chỉnh ngày ghi danh"
      size="md"
      busy={busy}
      busyLabel="Đang hiệu chỉnh ngày ghi danh..."
      confirmOnClose
      confirmCloseMessage="Lý do hiệu chỉnh chưa được gửi. Đóng hộp thoại sẽ bỏ nội dung này."
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3">
          <label className="block text-sm font-black text-primary-950" htmlFor="attendance-enrollment-correction-date">
            Ngày hiệu lực mới <span className="text-rose-600">*</span>
          </label>
          <input
            id="attendance-enrollment-correction-date"
            type="date"
            value={correctionDate}
            min={minDate}
            max={maxDate}
            onChange={(event) => setCorrectionDate(event.target.value)}
            disabled={busy}
            className="mt-2 w-full rounded-xl border border-primary-200 bg-white px-3 py-2 text-sm font-bold text-primary-950 outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-100 disabled:bg-slate-100"
          />
          <p className="mt-1 text-xs font-medium text-primary-800">
            {effectiveDateSource === "ledger"
              ? "Mặc định là buổi học chính khóa đầu tiên trong ledger của tuần đã chọn."
              : "Tuần này chưa có buổi học chính khóa trong ledger. Admin phải xác nhận ngày nhập học thực tế trong tuần đã chọn."}
          </p>
        </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Thao tác này thay đổi lịch sử ghi danh và được lưu vào nhật ký kiểm toán. Kỳ đã chốt hoặc đã phát sinh học phí bảo vệ sẽ bị hệ thống từ chối.
          </div>
          <div className="max-h-36 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 p-3">
            <p className="pb-1 text-xs font-black uppercase tracking-wide text-slate-500">
              {affectedStudents.length} học viên sẽ được hiệu chỉnh
            </p>
            {affectedStudents.map((student) => (
              <div key={student.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-bold text-slate-800">{student.full_name}</span>
                <span className="text-slate-500">Hiện tại: {student.enrollment_date || "chưa xác định"}</span>
              </div>
            ))}
          </div>
          <label className="block text-sm font-bold text-slate-700" htmlFor="attendance-enrollment-correction-reason">
            Lý do hiệu chỉnh <span className="text-rose-600">*</span>
          </label>
          <textarea
            id="attendance-enrollment-correction-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={busy}
            rows={3}
            placeholder="Ví dụ: Điều chỉnh theo danh sách nhập học đã xác nhận ngày..."
            className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-100 disabled:bg-slate-100"
          />
          <p className="text-xs text-slate-500">Nhập tối thiểu 10 ký tự để tạo bằng chứng kiểm toán.</p>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={busy} className="btn-secondary">
            Hủy
          </button>
          <ActionProgressButton
            onClick={() => onConfirm({
              effectiveDate: correctionDate,
              reason: reason.trim(),
              studentIds: affectedStudents.map((student) => student.id),
            })}
            loading={busy}
            loadingLabel="Đang hiệu chỉnh..."
            disabled={!canSubmit}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Xác nhận hiệu chỉnh
          </ActionProgressButton>
        </div>
      </div>
    </Modal>
  );
}
