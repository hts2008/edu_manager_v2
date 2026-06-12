import { useState } from "react";
import { feeRemindersService } from "../services/api";
import { toMonthKey } from "../utils/dateKeys";
import ActionProgressButton from "../components/ui/ActionProgressButton";
import LongOperationStatus from "../components/ui/LongOperationStatus";
import { ConfirmModal } from "../components/ui/Modal";

function currentMonth() {
  return toMonthKey(new Date());
}

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function FeeRemindersPage() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [operation, setOperation] = useState("");
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function runPreview() {
    setLoading(true);
    setOperation("preview");
    setError("");
    setMessage("");
    try {
      const response = await feeRemindersService.preview(month);
      if (!response.success) {
        setError(response.error?.message || "Preview failed");
        return;
      }
      setData(response.data);
      setMessage("Reminder preview ready");
    } finally {
      setLoading(false);
      setOperation("");
    }
  }

  async function runSend(dryRun) {
    setLoading(true);
    setOperation(dryRun ? "dry-run" : "send");
    setError("");
    setMessage("");
    try {
      const response = await feeRemindersService.send(month, dryRun);
      if (!response.success) {
        setError(response.error?.message || "Reminder run failed");
        return;
      }
      setData(response.data);
      setMessage(dryRun ? "Dry-run complete" : "Send run complete");
      if (!dryRun) setConfirmSendOpen(false);
    } finally {
      setLoading(false);
      setOperation("");
    }
  }

  const items = data?.results || data?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee Reminders</h1>
          <p className="text-gray-500">Preview and send overdue monthly fee reminders.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="input w-40"
            aria-label="Reminder month"
          />
          <ActionProgressButton onClick={runPreview} loading={operation === "preview"} disabled={loading} className="btn-secondary" loadingLabel="Previewing...">
            Preview
          </ActionProgressButton>
          <ActionProgressButton onClick={() => runSend(true)} loading={operation === "dry-run"} disabled={loading} className="btn-secondary" loadingLabel="Checking...">
            Dry run
          </ActionProgressButton>
          <ActionProgressButton onClick={() => setConfirmSendOpen(true)} loading={operation === "send"} disabled={loading} className="btn-primary" loadingLabel="Sending...">
            Send
          </ActionProgressButton>
        </div>
      </div>

      {loading && (
        <LongOperationStatus
          title={operation === "send" ? "Đang chạy gửi nhắc phí" : operation === "dry-run" ? "Đang chạy dry-run" : "Đang tạo preview"}
          message={operation === "send" ? "Hệ thống chỉ gửi thật khi provider và policy opt-in đã được bật trong backend." : "Hệ thống đang rà soát học phí quá hạn, phụ huynh và số tiền cần nhắc."}
          steps={["Lọc học phí quá hạn", "Kiểm tra phụ huynh/opt-in", "Tổng hợp kết quả"]}
          activeStep={1}
        />
      )}

      {message && (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card"><div className="card-body"><p className="text-sm text-gray-500">Reminders</p><p className="text-2xl font-bold">{data?.summary?.total || 0}</p></div></div>
        <div className="card"><div className="card-body"><p className="text-sm text-gray-500">Amount</p><p className="text-2xl font-bold">{formatCurrency(data?.summary?.total_amount)}</p></div></div>
        <div className="card"><div className="card-body"><p className="text-sm text-gray-500">Sent</p><p className="text-2xl font-bold">{data?.summary?.sent || 0}</p></div></div>
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Reminder list</h2>
          {loading && <div className="spinner h-5 w-5" />}
        </div>
        <div className="card-body overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-4 font-medium">Student</th>
                <th className="py-2 pr-4 font-medium">Parent</th>
                <th className="py-2 pr-4 font-medium">Phone</th>
                <th className="py-2 pr-4 font-medium">Amount</th>
                <th className="py-2 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.fee_id} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium text-gray-900">{item.student_name}</td>
                  <td className="py-2 pr-4">{item.parent_name}</td>
                  <td className="py-2 pr-4">{item.parent_phone}</td>
                  <td className="py-2 pr-4">{formatCurrency(item.total_amount)}</td>
                  <td className="py-2 pr-4">{item.send_status || item.status}</td>
                </tr>
              ))}
              {!items.length && (
                <tr><td colSpan="5" className="py-8 text-center text-gray-400">No reminders</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmSendOpen}
        onClose={() => setConfirmSendOpen(false)}
        onConfirm={() => runSend(false)}
        title="Xác nhận gửi nhắc phí"
        message="Bạn đang yêu cầu chạy nhắc phí thật. Hệ thống chỉ gửi khi provider và opt-in policy đã được cấu hình; nếu chưa bật, backend sẽ trả về dry-run/blocked result."
        confirmText="Chạy gửi"
        cancelText="Hủy"
        variant="primary"
      />
    </div>
  );
}
