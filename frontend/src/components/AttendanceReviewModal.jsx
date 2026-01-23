import { useState, useEffect, useCallback } from "react";
import Modal from "./ui/Modal";
import { attendancePeriodsService } from "../services/api";
import { useToast } from "./ui/Toast";

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
    const res = await attendancePeriodsService.approve(periodId);
    if (res.success) {
      toast.success("✅ Đã duyệt điểm danh");
      onActionComplete?.();
      onClose();
    } else {
      toast.error(res.error?.message || "Lỗi duyệt điểm danh");
    }
    setActionLoading(false);
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
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Period Info Header */}
          <div className="bg-gray-50 rounded-lg p-4">
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
                className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_LABELS[period?.status]?.color}`}
              >
                {STATUS_LABELS[period?.status]?.text}
              </span>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-5 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-blue-600">
                {summary?.totalStudents || 0}
              </p>
              <p className="text-xs text-blue-700">Học viên</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-green-600">
                {summary?.totalPresent || 0}
              </p>
              <p className="text-xs text-green-700">✅ Có mặt</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-yellow-600">
                {summary?.totalAbsentWithFee || 0}
              </p>
              <p className="text-xs text-yellow-700">⚠️ Nghỉ CP</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-red-600">
                {summary?.totalAbsentNoFee || 0}
              </p>
              <p className="text-xs text-red-700">❌ Nghỉ KP</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-purple-600">
                {summary?.totalHoliday || 0}
              </p>
              <p className="text-xs text-purple-700">🎉 Ngày lễ</p>
            </div>
          </div>

          {/* Students Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Học viên
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Tổng
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-green-600 uppercase">
                    ✅
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-yellow-600 uppercase">
                    ⚠️
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-red-600 uppercase">
                    ❌
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-purple-600 uppercase">
                    🎉
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students?.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {student.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-600">
                      {student.total}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-green-600 font-medium">
                      {student.present}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-yellow-600 font-medium">
                      {student.absentWithFee}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-red-600 font-medium">
                      {student.absentNoFee}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-purple-600 font-medium">
                      {student.holiday}
                    </td>
                  </tr>
                ))}
                {(!students || students.length === 0) && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      Chưa có dữ liệu điểm danh
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Reject Reason Form */}
          {showRejectForm && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-red-700 mb-2">
                Lý do trả lại (tùy chọn)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                rows={2}
                placeholder="Nhập lý do trả lại cho giáo viên..."
              />
            </div>
          )}

          {/* Action Buttons */}
          {period?.status === "submitted" && (
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              {!showRejectForm ? (
                <>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                    disabled={actionLoading}
                  >
                    ↩️ Trả lại GV
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    {actionLoading ? "Đang xử lý..." : "✓ Duyệt điểm danh"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowRejectForm(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={actionLoading}
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
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
