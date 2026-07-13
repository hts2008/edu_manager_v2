import { useCallback, useEffect, useState } from "react";
import { attendancePeriodsService } from "../../services/api";
import Modal from "../ui/Modal";
import { useToast } from "../ui/Toast";

// VI: Modal review điểm danh - Xem chi tiết trước khi duyệt

const STATUS_LABELS = {
  open: { text: "Đang mở", color: "bg-green-100 text-green-700" },
  submitted: { text: "Chờ duyệt", color: "bg-yellow-100 text-yellow-700" },
  approved: { text: "Đã duyệt", color: "bg-blue-100 text-blue-700" },
  locked: { text: "Đã chốt", color: "bg-gray-100 text-gray-700" },
};

export default function AttendanceReviewModal({
  isOpen,
  onClose,
  periodId,
  onApprove,
  onActionComplete,
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const toast = useToast();

  const loadPeriodDetails = useCallback(async () => {
    setLoading(true);
    const res = await attendancePeriodsService.getById(periodId);
    if (res.success) {
      setData(res.data);
    } else {
      toast.error("Không thể tải dữ liệu");
      onClose();
    }
    setLoading(false);
  }, [periodId, toast, onClose]);

  useEffect(() => {
    if (isOpen && periodId) {
      loadPeriodDetails();
    }
  }, [isOpen, periodId, loadPeriodDetails]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const response = await onApprove?.();
      if (response?.success) onClose();
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    const res = await attendancePeriodsService.reject(periodId, rejectReason);
    if (res.success) {
      toast.success("↩️ Đã trả lại cho giáo viên");
      onActionComplete?.();
      onClose();
    } else {
      toast.error(res.error?.message || "Lỗi trả lại điểm danh");
    }
    setActionLoading(false);
    setShowRejectForm(false);
    setRejectReason("");
  };

  if (!isOpen) return null;

  const { period, summary, students } = data || {};

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="👁️ Review Điểm Danh"
      size="xl"
      busy={actionLoading}
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {period?.class?.className || "Lớp học"}
                </h3>
                <p className="text-gray-500">
                  Tháng {period?.periodMonth?.split("-").reverse().join("/")}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_LABELS[period?.status]?.color}`}
              >
                {STATUS_LABELS[period?.status]?.text}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3">
            <div className="rounded-lg bg-blue-50 p-3 text-center">
              <p className="text-xl font-bold text-blue-600">
                {summary?.totalStudents || 0}
              </p>
              <p className="text-xs text-blue-700">Học viên</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3 text-center">
              <p className="text-xl font-bold text-green-600">
                {summary?.totalPresent || 0}
              </p>
              <p className="text-xs text-green-700">✅ Có mặt</p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-3 text-center">
              <p className="text-xl font-bold text-yellow-600">
                {summary?.totalAbsentWithFee || 0}
              </p>
              <p className="text-xs text-yellow-700">⚠️ Nghỉ CP</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3 text-center">
              <p className="text-xl font-bold text-red-600">
                {summary?.totalAbsentNoFee || 0}
              </p>
              <p className="text-xs text-red-700">❌ Nghỉ KP</p>
            </div>
            <div className="rounded-lg bg-purple-50 p-3 text-center">
              <p className="text-xl font-bold text-purple-600">
                {summary?.totalHoliday || 0}
              </p>
              <p className="text-xs text-purple-700">🎉 Ngày lễ</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Học viên
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">
                    Tổng
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-green-600">
                    ✅
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-yellow-600">
                    ⚠️
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-red-600">
                    ❌
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-purple-600">
                    🎉
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {students?.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {student.name}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {student.total}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium text-green-600">
                      {student.present}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium text-yellow-600">
                      {student.absentWithFee}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium text-red-600">
                      {student.absentNoFee}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium text-purple-600">
                      {student.holiday}
                    </td>
                  </tr>
                ))}
                {(!students || students.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Chưa có dữ liệu điểm danh
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {showRejectForm && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <label className="mb-2 block text-sm font-medium text-red-700">
                Lý do trả lại (tùy chọn)
              </label>
              <textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                className="w-full rounded-lg border border-red-300 px-3 py-2 focus:border-red-500 focus:ring-red-500"
                rows={2}
                placeholder="Nhập lý do trả lại cho giáo viên..."
              />
            </div>
          )}

          {period?.status === "submitted" && (
            <div className="flex items-center justify-end gap-3 border-t pt-4">
              {!showRejectForm ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(true)}
                    className="rounded-lg border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50"
                    disabled={actionLoading}
                  >
                    ↩️ Trả lại GV
                  </button>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
                  >
                    {actionLoading ? "Đang xử lý..." : "✓ Duyệt điểm danh"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-gray-600 hover:bg-gray-50"
                    disabled={actionLoading}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600 disabled:opacity-50"
                  >
                    {actionLoading ? "Đang xử lý..." : "Xác nhận trả lại"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
