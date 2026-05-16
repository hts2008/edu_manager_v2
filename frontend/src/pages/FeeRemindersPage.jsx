import { useState } from "react";
import { feeRemindersService } from "../services/api";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
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
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function runPreview() {
    setLoading(true);
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
    }
  }

  async function runSend(dryRun) {
    setLoading(true);
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
    } finally {
      setLoading(false);
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
          <button onClick={runPreview} disabled={loading} className="btn-secondary disabled:opacity-50">
            Preview
          </button>
          <button onClick={() => runSend(true)} disabled={loading} className="btn-secondary disabled:opacity-50">
            Dry run
          </button>
          <button onClick={() => runSend(false)} disabled={loading} className="btn-primary disabled:opacity-50">
            Send
          </button>
        </div>
      </div>

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
    </div>
  );
}
