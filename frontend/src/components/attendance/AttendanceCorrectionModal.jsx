import { useEffect, useState } from "react";
import { UnlockKeyhole } from "lucide-react";
import Modal from "../ui/Modal";
import ActionProgressButton from "../ui/ActionProgressButton";

export default function AttendanceCorrectionModal({ period, busy, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setReason("");
    setError("");
  }, [period?.id]);

  const handleConfirm = async () => {
    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      setError("Vui lòng nhập lý do mở lại kỳ điểm danh.");
      return;
    }
    setError("");
    const response = await onConfirm(normalizedReason);
    if (!response?.success) {
      setError(
        response?.error?.message ||
          "Không thể mở lại kỳ điểm danh. Vui lòng kiểm tra thông báo lỗi và thử lại.",
      );
    }
  };

  return (
    <Modal
      isOpen={Boolean(period)}
      onClose={onClose}
      title="Mở lại kỳ điểm danh"
      size="sm"
      busy={busy}
      busyLabel="Đang mở lại kỳ điểm danh..."
      confirmOnClose
      confirmCloseMessage="Lý do mở lại chưa được gửi. Đóng hộp thoại sẽ bỏ nội dung này."
    >
      <div className="space-y-5">
        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <UnlockKeyhole className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="text-sm">
            Kỳ tháng <strong>{period?.period_month}</strong> sẽ trở về trạng thái đang mở để chỉnh sửa. Lý do được lưu vào nhật ký thao tác.
          </p>
        </div>
        <div>
          <label htmlFor="attendance-unlock-reason" className="block text-sm font-semibold text-slate-800">
            Lý do mở lại <span className="text-rose-600">*</span>
          </label>
          <textarea
            id="attendance-unlock-reason"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              if (error) setError("");
            }}
            rows={4}
            disabled={busy}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "attendance-unlock-reason-error" : undefined}
            placeholder="Ví dụ: Cần bổ sung điểm danh buổi 12/07..."
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
          />
          {error && <p id="attendance-unlock-reason-error" className="mt-2 text-sm font-medium text-rose-700" role="alert">{error}</p>}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60"
          >
            Hủy
          </button>
          <ActionProgressButton
            onClick={handleConfirm}
            loading={busy}
            loadingLabel="Đang mở lại..."
            className="rounded-md bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900"
          >
            <UnlockKeyhole className="h-4 w-4" aria-hidden="true" />
            Xác nhận mở lại
          </ActionProgressButton>
        </div>
      </div>
    </Modal>
  );
}
