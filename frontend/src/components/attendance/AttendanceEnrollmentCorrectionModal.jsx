import { useEffect, useState } from "react";

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

  if (!open) return null;

  const canSubmit = reason.trim().length >= 10 && !busy;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-enrollment-correction-title"
        className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 id="attendance-enrollment-correction-title" className="text-lg font-black text-slate-950">
              Hiệu chỉnh ngày ghi danh
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Mở quyền điểm danh từ {effectiveDate} cho {students.length} học viên.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Đóng"
            className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-xl text-slate-500 transition hover:bg-slate-200 disabled:opacity-50"
          >
            ×
          </button>
        </header>

        <div className="space-y-4 px-6 py-5">
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
        </div>

        <footer className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button type="button" onClick={onClose} disabled={busy} className="btn-secondary">
            Hủy
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            disabled={!canSubmit}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Đang hiệu chỉnh..." : "Xác nhận hiệu chỉnh"}
          </button>
        </footer>
      </section>
    </div>
  );
}
