import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import ActionProgressButton from "../ui/ActionProgressButton";

export default function AttendanceEnrollmentCorrectionModal({
  open,
  effectiveDate,
  students = [],
  busy = false,
  onClose,
  onConfirm,
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open, effectiveDate]);

  const canSubmit = reason.trim().length >= 10 && !busy;

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
          <p className="text-sm font-black text-primary-950">
            Ngày hiệu lực mới: {effectiveDate}
          </p>
          <p className="mt-1 text-xs font-medium text-primary-800">
            Ngày này là buổi học chính khóa đầu tiên trong tuần đã chọn, không phải ngày đầu hàng lịch.
          </p>
        </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Thao tác này thay đổi lịch sử ghi danh và được lưu vào nhật ký kiểm toán. Kỳ đã chốt hoặc đã phát sinh học phí bảo vệ sẽ bị hệ thống từ chối.
          </div>
          <div className="max-h-36 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 p-3">
            {students.map((student) => (
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
            onClick={() => onConfirm(reason.trim())}
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
