import { useState } from "react";
import { reportsService } from "../services/api";
import { useAsyncData } from "../hooks/useAsyncData";
import { exportAdvancedReport } from "../utils/excelExport";

function dateOnly(date) {
  return date.toISOString().split("T")[0];
}

function defaultRange() {
  const today = new Date();
  return {
    from: dateOnly(new Date(today.getFullYear(), today.getMonth() - 11, 1)),
    to: dateOnly(today),
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function summaryCard(label, value, tone = "text-gray-900") {
  return (
    <div className="card">
      <div className="card-body">
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
      </div>
    </div>
  );
}

export default function AdvancedReportsPage() {
  const [filters, setFilters] = useState({ ...defaultRange(), group_by: "month" });
  const requestKey = JSON.stringify(filters);

  const { data, loading, error, reload } = useAsyncData(async () => {
    const response = await reportsService.getAdvanced(filters);
    if (!response.success) {
      throw new Error(response.error?.message || "Không tải được báo cáo nâng cao");
    }
    return response.data;
  }, requestKey);

  const revenueTrend = data?.revenue_trend || [];
  const teacherUtilization = data?.teacher_utilization || [];
  const retentionCohort = data?.retention_cohort || [];
  const summary = data?.summary || {};
  const maxRevenue = Math.max(
    1,
    ...revenueTrend.map((item) =>
      Math.max(item.total_receipts || 0, item.total_payments || 0, Math.abs(item.net_revenue || 0))
    )
  );

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function exportReport() {
    if (data) exportAdvancedReport(data, filters);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Báo cáo nâng cao</h1>
          <p className="text-gray-500">
            Theo dõi xu hướng doanh thu, hiệu suất giáo viên và cohort học viên.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={reload} className="btn-secondary">
            Làm mới
          </button>
          <button onClick={exportReport} disabled={!data} className="btn-primary disabled:opacity-50">
            Export CSV
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="grid gap-3 md:grid-cols-4">
            <input
              type="date"
              value={filters.from}
              onChange={(event) => updateFilter("from", event.target.value)}
              className="input"
              aria-label="Từ ngày"
            />
            <input
              type="date"
              value={filters.to}
              onChange={(event) => updateFilter("to", event.target.value)}
              className="input"
              aria-label="Đến ngày"
            />
            <select
              value={filters.group_by}
              onChange={(event) => updateFilter("group_by", event.target.value)}
              className="input"
              aria-label="Nhóm thời gian"
            >
              <option value="day">Ngày</option>
              <option value="week">Tuần</option>
              <option value="month">Tháng</option>
              <option value="year">Năm</option>
            </select>
            <div className="flex items-center text-sm text-gray-500">
              {data?.from || filters.from} đến {data?.to || filters.to}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {summaryCard("Tổng thu", formatCurrency(summary.total_receipts), "text-emerald-700")}
        {summaryCard("Tổng chi", formatCurrency(summary.total_payments), "text-red-700")}
        {summaryCard("Doanh thu ròng", formatCurrency(summary.net_revenue), "text-blue-700")}
        {summaryCard("Lớp đang hoạt động", summary.active_class_count || 0)}
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Xu hướng doanh thu</h2>
            <p className="text-sm text-gray-500">Thu, chi và chênh lệch theo kỳ.</p>
          </div>
          {loading && <div className="spinner h-5 w-5"></div>}
        </div>
        <div className="card-body">
          {revenueTrend.length ? (
            <div className="space-y-3">
              {revenueTrend.map((item) => (
                <div key={item.period} className="grid gap-2 md:grid-cols-[96px_1fr_120px] md:items-center">
                  <div className="text-sm font-medium text-gray-700">{item.period}</div>
                  <div className="space-y-1">
                    <div className="h-2 rounded bg-gray-100">
                      <div
                        className="h-2 rounded bg-emerald-500"
                        style={{ width: `${Math.max(2, ((item.total_receipts || 0) / maxRevenue) * 100)}%` }}
                      />
                    </div>
                    <div className="h-2 rounded bg-gray-100">
                      <div
                        className="h-2 rounded bg-red-400"
                        style={{ width: `${Math.max(2, ((item.total_payments || 0) / maxRevenue) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">{formatCurrency(item.net_revenue)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400">Chưa có dữ liệu doanh thu</div>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Hiệu suất giáo viên</h2>
          </div>
          <div className="card-body overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2 pr-4 font-medium">Giáo viên</th>
                  <th className="py-2 pr-4 font-medium">Lớp</th>
                  <th className="py-2 pr-4 font-medium">Học viên</th>
                  <th className="py-2 pr-4 font-medium">Buổi</th>
                  <th className="py-2 pr-4 font-medium">Tỷ lệ</th>
                </tr>
              </thead>
              <tbody>
                {teacherUtilization.map((item) => (
                  <tr key={item.teacher_id || "unassigned"} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium text-gray-900">{item.teacher_name}</td>
                    <td className="py-2 pr-4">{item.active_classes}</td>
                    <td className="py-2 pr-4">{item.active_students}</td>
                    <td className="py-2 pr-4">{item.total_sessions}</td>
                    <td className="py-2 pr-4 text-emerald-700">{item.utilization_rate}%</td>
                  </tr>
                ))}
                {!teacherUtilization.length && (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-400">
                      Chưa có dữ liệu giáo viên
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Cohort học viên</h2>
          </div>
          <div className="card-body overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2 pr-4 font-medium">Cohort</th>
                  <th className="py-2 pr-4 font-medium">Tổng</th>
                  <th className="py-2 pr-4 font-medium">Đang học</th>
                  <th className="py-2 pr-4 font-medium">Tốt nghiệp</th>
                  <th className="py-2 pr-4 font-medium">Duy trì</th>
                </tr>
              </thead>
              <tbody>
                {retentionCohort.map((item) => (
                  <tr key={item.cohort} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium text-gray-900">{item.cohort}</td>
                    <td className="py-2 pr-4">{item.total_students}</td>
                    <td className="py-2 pr-4">{item.active_students}</td>
                    <td className="py-2 pr-4">{item.graduated_students}</td>
                    <td className="py-2 pr-4 text-blue-700">{item.retention_rate}%</td>
                  </tr>
                ))}
                {!retentionCohort.length && (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-400">
                      Chưa có dữ liệu cohort
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
