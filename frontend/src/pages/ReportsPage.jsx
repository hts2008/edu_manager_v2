import { createElement, useDeferredValue, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BarChart3,
  Download,
  Eye,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { reportsService } from "../services/api";
import { useAsyncData } from "../hooks/useAsyncData";
import { ChartFrame, SAFE_RECHARTS_CONTAINER_PROPS, SkeletonBlock } from "../components/ui/LoadingStates";

const PAGE_SIZE_OPTIONS = [50, 100, 200];

function currentBusinessMonth() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

function initialFilters() {
  const month = currentBusinessMonth();
  return {
    from: `${month.slice(0, 4)}-01`,
    to: month,
    class_id: "",
    query: "",
    risk_only: false,
    page: 1,
    page_size: 50,
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0));
}

function compactMoney(value) {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 1_000_000_000) return `${Math.round(amount / 100_000_000) / 10}B`;
  if (Math.abs(amount) >= 1_000_000) return `${Math.round(amount / 100_000) / 10}M`;
  if (Math.abs(amount) >= 1_000) return `${Math.round(amount / 100) / 10}K`;
  return String(Math.round(amount));
}

function monthLabel(month) {
  const [year, value] = String(month || "").split("-");
  return value && year ? `${value}/${year}` : month;
}

function makeQuery(filters, activeTab = "overview", refreshNonce = 0) {
  return {
    from: filters.from,
    to: filters.to,
    mode: activeTab,
    page: filters.page,
    page_size: filters.page_size,
    risk_only: filters.risk_only ? "1" : "0",
    ...(refreshNonce ? { _refresh: refreshNonce } : {}),
    ...(filters.query.trim() ? { q: filters.query.trim() } : {}),
    ...(filters.class_id ? { class_id: filters.class_id } : {}),
  };
}

function exportBiCsv(data, rows, filters) {
  const table = [
    [
      "student_id",
      "student_name",
      "class_id",
      "class_name",
      "month",
      "expected_sessions",
      "recorded_sessions",
      "chargeable_sessions",
      "actual_present_rate",
      "chargeable_rate",
      "record_completion_rate",
      "fee_amount",
      "fee_status",
      "fee_source",
      "risk_flags",
    ],
    ...rows.map((row) => [
      row.student_id,
      row.student_name,
      row.class_id,
      row.class_name,
      row.month,
      row.expected_sessions,
      row.recorded_sessions,
      row.chargeable_sessions,
      row.actual_present_rate,
      row.chargeable_rate,
      row.record_completion_rate,
      row.fee_amount || 0,
      row.fee_status || "",
      row.fee_source || "",
      (row.risk_flags || []).join("|"),
    ]),
    [],
    ["summary"],
    ["student_count", data?.summary?.student_count || 0],
    ["class_count", data?.summary?.class_count || 0],
    ["student_class_month_count", data?.summary?.student_class_month_count || 0],
    ["fee_amount", data?.summary?.fee_amount || 0],
  ];

  const csv = table
    .map((line) =>
      line.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")
    )
    .join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `report-intelligence-${filters.from}-${filters.to}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function statusLabel(status) {
  return (
    {
      paid: "Đã thu",
      confirmed: "Đã xác nhận",
      ready: "Sẵn sàng",
      pending: "Chờ xử lý",
    }[status] || "Chưa có phí"
  );
}

function riskLabel(flag) {
  return (
    {
      expected_sessions_unavailable: "Thiếu lịch học",
      attendance_incomplete: "Chưa đủ điểm danh",
      attendance_over_recorded: "Vượt số buổi",
      low_present_rate: "Chuyên cần thấp",
      fee_review: "Cần rà soát phí",
    }[flag] || flag
  );
}

const TAB_CONFIG = {
  overview: {
    label: "Tổng quan",
    title: "Tổng quan vận hành",
    description: "Toàn bộ dòng student-class-month trong bộ lọc hiện tại.",
  },
  attendance: {
    label: "Chuyên cần",
    title: "Phân tích chuyên cần",
    description: "Ưu tiên các dòng thiếu điểm danh, vượt số buổi hoặc chuyên cần thấp.",
  },
  tuition: {
    label: "Học phí",
    title: "Theo dõi học phí",
    description: "Tập trung dòng có học phí, trạng thái thu và các khoản cần rà soát phí.",
  },
  risk: {
    label: "Rủi ro",
    title: "Bản đồ rủi ro",
    description: "Chỉ hiển thị các dòng có cảnh báo vận hành hoặc tài chính.",
  },
};

function rowsForTab(rows, activeTab) {
  if (activeTab === "risk") return rows.filter((row) => row.risk_flags?.length);
  if (activeTab === "attendance") {
    return rows.filter((row) =>
      (row.risk_flags || []).some((flag) =>
        ["expected_sessions_unavailable", "attendance_incomplete", "attendance_over_recorded", "low_present_rate"].includes(flag)
      )
    );
  }
  if (activeTab === "tuition") {
    return rows.filter(
      (row) =>
        row.fee_needs_review ||
        row.fee_source === "missing" ||
        !row.fee_status ||
        !["paid", "confirmed"].includes(row.fee_status)
    );
  }
  return rows;
}

function tabStats(rows) {
  const studentIds = new Set(rows.map((row) => row.student_id));
  const classIds = new Set(rows.map((row) => row.class_id));
  return {
    rows: rows.length,
    students: studentIds.size,
    classes: classIds.size,
    fee: rows.reduce((sum, row) => sum + Number(row.fee_amount || 0), 0),
    risk: rows.filter((row) => row.risk_flags?.length).length,
  };
}

function riskScore(row) {
  return (
    (row.risk_flags?.length || 0) * 10 +
    Math.max(0, Number(row.expected_sessions || 0) - Number(row.recorded_sessions || 0)) * 2 +
    (row.fee_needs_review ? 8 : 0) +
    (row.fee_status === "paid" ? 0 : 4)
  );
}

function feeStatusLabel(status) {
  if (!status) return "Chưa có phí";
  return statusLabel(status);
}

function buildFeeStatusRows(rows) {
  const buckets = new Map();
  for (const row of rows) {
    const key = row.fee_status || "missing";
    const item = buckets.get(key) || {
      key,
      label: feeStatusLabel(row.fee_status),
      count: 0,
      amount: 0,
    };
    item.count += 1;
    item.amount += Number(row.fee_amount || 0);
    buckets.set(key, item);
  }
  return Array.from(buckets.values()).sort((a, b) => b.count - a.count || b.amount - a.amount);
}

function buildAttendanceBuckets(rows) {
  const buckets = [
    { key: "excellent", label: "≥ 90%", count: 0, color: "#10b981" },
    { key: "watch", label: "70-89%", count: 0, color: "#f59e0b" },
    { key: "risk", label: "< 70%", count: 0, color: "#ef4444" },
    { key: "empty", label: "Chưa ghi", count: 0, color: "#94a3b8" },
  ];
  for (const row of rows) {
    const recorded = Number(row.recorded_sessions || 0);
    const rate = Number(row.actual_present_rate || 0);
    if (!recorded) buckets[3].count += 1;
    else if (rate >= 90) buckets[0].count += 1;
    else if (rate >= 70) buckets[1].count += 1;
    else buckets[2].count += 1;
  }
  return buckets.filter((item) => item.count > 0);
}

function buildRiskBreakdown(rows) {
  const buckets = new Map();
  for (const row of rows) {
    for (const flag of row.risk_flags || []) {
      const item = buckets.get(flag) || { flag, label: riskLabel(flag), count: 0 };
      item.count += 1;
      buckets.set(flag, item);
    }
  }
  return Array.from(buckets.values()).sort((a, b) => b.count - a.count);
}

function buildActionRows(rows) {
  return [...rows]
    .filter((row) => row.risk_flags?.length || row.fee_needs_review || Number(row.recorded_sessions || 0) < Number(row.expected_sessions || 0))
    .sort((a, b) => riskScore(b) - riskScore(a))
    .slice(0, 6);
}

function buildRiskHeatmap(rows) {
  const buckets = new Map();
  for (const row of rows) {
    const key = `${row.class_id}\u0000${row.month}`;
    const item = buckets.get(key) || {
      key,
      class_name: row.class_name,
      month: row.month,
      rows: 0,
      risk: 0,
      fee_review: 0,
      attendance_gap: 0,
    };
    item.rows += 1;
    if (row.risk_flags?.length) item.risk += 1;
    if (row.fee_needs_review) item.fee_review += 1;
    item.attendance_gap += Math.max(0, Number(row.expected_sessions || 0) - Number(row.recorded_sessions || 0));
    buckets.set(key, item);
  }
  return Array.from(buckets.values())
    .sort((a, b) => b.risk - a.risk || b.attendance_gap - a.attendance_gap || a.class_name.localeCompare(b.class_name))
    .slice(0, 12);
}

export default function ReportsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedRow, setSelectedRow] = useState(null);
  const deferredQuery = useDeferredValue(filters.query);
  const requestFilters = useMemo(
    () => ({
      ...filters,
      query: deferredQuery,
    }),
    [filters, deferredQuery]
  );
  const requestKey = JSON.stringify({ ...requestFilters, activeTab, refreshNonce });

  const biState = useAsyncData(async () => {
    const response = await reportsService.getBi(
      makeQuery(requestFilters, activeTab, refreshNonce)
    );
    if (!response.success) {
      throw new Error(response.error?.message || "Không tải được Report Intelligence");
    }
    return { ...response.data, __requestKey: requestKey };
  }, requestKey);

  const data = biState.data;
  const hasStaleDataForCurrentRequest = Boolean(
    biState.error && data?.__requestKey && data.__requestKey !== requestKey
  );
  const rows = data?.students || [];
  const summary = data?.summary || {};
  const pagination = data?.pagination || {
    page: filters.page,
    page_size: filters.page_size,
    total_items: 0,
    total_pages: 1,
  };
  const chartRows = data?.charts?.monthly || [];
  const classRows = data?.charts?.classes || [];
  const classOptions = useMemo(() => {
    const byId = new Map();
    for (const item of data?.meta?.classes || []) {
      if (item.id) byId.set(item.id, item);
    }
    for (const item of classRows) {
      if (item.class_id) byId.set(item.class_id, { id: item.class_id, name: item.class_name });
    }
    for (const row of rows) {
      if (row.class_id) byId.set(row.class_id, { id: row.class_id, name: row.class_name });
    }
    return Array.from(byId.values()).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [data?.meta?.classes, classRows, rows]);

  const visibleRows = useMemo(() => rowsForTab(rows, activeTab), [activeTab, rows]);
  const activeTabConfig = TAB_CONFIG[activeTab] || TAB_CONFIG.overview;
  const activeTabStats = useMemo(() => tabStats(visibleRows), [visibleRows]);
  const feeStatusRows = useMemo(() => buildFeeStatusRows(visibleRows), [visibleRows]);
  const attendanceBuckets = useMemo(() => buildAttendanceBuckets(visibleRows), [visibleRows]);
  const riskBreakdown = useMemo(() => buildRiskBreakdown(visibleRows), [visibleRows]);
  const actionRows = useMemo(() => buildActionRows(visibleRows), [visibleRows]);
  const heatmapRows = useMemo(() => buildRiskHeatmap(visibleRows), [visibleRows]);

  const isInitialLoading = biState.loading && !data;
  const isRefreshing = biState.loading && Boolean(data);
  const hasBlockingError = Boolean(
    biState.error && (!data || hasStaleDataForCurrentRequest) && !isInitialLoading
  );

  function updateFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: key === "page" ? value : 1,
    }));
  }

  function refresh() {
    setRefreshNonce((value) => value + 1);
  }

  function switchTab(key) {
    setActiveTab(key);
    setFilters((current) => ({
      ...current,
      page: 1,
    }));
  }

  return (
    <div className="space-y-6" data-testid="report-bi-page">
      <section className="eduflow-page-intro relative overflow-hidden p-6 md:p-8">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(238,242,255,0.92),rgba(255,255,255,0.62),rgba(236,254,255,0.58))]" />
        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="eduflow-eyebrow">
              <BarChart3 size={15} />
              Report Intelligence
            </div>
            <h1 className="eduflow-title mt-4 text-3xl font-black tracking-tight md:text-5xl">
              Báo cáo vận hành trung tâm
            </h1>
            <p className="eduflow-muted mt-3 max-w-2xl text-sm leading-6 md:text-base">
              Phân tích chuyên cần, học phí và rủi ro theo từng học viên, từng lớp, từng tháng.
              Dữ liệu được tách theo grain student-class-month để tránh gộp học phí sai khi một học viên học nhiều lớp.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px]">
            <HeroMetric label="Học viên" value={formatNumber(summary.student_count)} />
            <HeroMetric label="Lớp" value={formatNumber(summary.class_count)} />
            <HeroMetric label="Dòng phân tích" value={formatNumber(summary.student_class_month_count)} />
          </div>
        </div>
      </section>

      <section className="eduflow-panel p-4" aria-label="Bộ lọc báo cáo">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.1fr_1.2fr_auto] lg:items-end">
          <Field label="Từ tháng">
            <input
              aria-label="Từ tháng"
              type="month"
              value={filters.from}
              onChange={(event) => updateFilter("from", event.target.value)}
              className="input"
            />
          </Field>
          <Field label="Đến tháng">
            <input
              aria-label="Đến tháng"
              type="month"
              value={filters.to}
              onChange={(event) => updateFilter("to", event.target.value)}
              className="input"
            />
          </Field>
          <Field label="Lớp học">
            <select
              aria-label="Lớp học"
              value={filters.class_id}
              onChange={(event) => updateFilter("class_id", event.target.value)}
              className="input"
            >
              <option value="">Tất cả lớp</option>
              {classOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Học viên">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                aria-label="Học viên"
                type="search"
                value={filters.query}
                onChange={(event) => updateFilter("query", event.target.value)}
                placeholder="Tìm theo tên, lớp, trạng thái..."
                className="input pl-10"
              />
            </div>
          </Field>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-bold text-amber-800">
              <input
                aria-label="Chỉ hiển thị rủi ro"
                type="checkbox"
                checked={filters.risk_only}
                onChange={(event) => updateFilter("risk_only", event.target.checked)}
                className="h-4 w-4 accent-amber-500"
              />
              Chỉ rủi ro
            </label>
            <button type="button" onClick={refresh} className="btn-secondary min-h-12" aria-label="Làm mới dữ liệu">
              <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </section>

      {isRefreshing && (
        <div className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm font-semibold text-primary-700" data-testid="report-bi-loading">
          Hệ thống đang cập nhật dữ liệu mới, số liệu cũ vẫn được giữ trên màn hình để tránh giật layout.
        </div>
      )}

      {biState.error && data && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700" data-testid="report-bi-error">
          {biState.error.message}
        </div>
      )}

      {isInitialLoading ? (
        <ReportSkeleton />
      ) : hasBlockingError ? (
        <ReportErrorState message={biState.error.message} onRetry={refresh} />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" data-testid="report-bi-summary">
            <MetricCard icon={Users} label="Học viên" value={formatNumber(summary.student_count)} helper="Có dữ liệu trong khoảng lọc" tone="indigo" />
            <MetricCard icon={BarChart3} label="Tổng buổi kỳ vọng" value={formatNumber(summary.expected_sessions)} helper={`${formatNumber(summary.recorded_sessions)} buổi đã ghi nhận`} tone="sky" />
            <MetricCard icon={ShieldCheck} label="Chuyên cần thực tế" value={`${summary.actual_present_rate || 0}%`} helper="Có mặt / buổi học thực tế" tone="emerald" />
            <MetricCard icon={TrendingUp} label="Tỷ lệ tính phí" value={`${summary.chargeable_rate || 0}%`} helper="Có mặt + nghỉ tính phí" tone="violet" />
            <MetricCard icon={AlertTriangle} label="Cảnh báo" value={formatNumber(summary.risk_count)} helper={`${formatNumber(summary.fee_review_count)} dòng cần rà soát phí`} tone="amber" />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Panel
              title="Xu hướng chuyên cần và học phí"
              subtitle={`${monthLabel(data?.meta?.from)} - ${monthLabel(data?.meta?.to)} · ${data?.meta?.cube_grain || "student_class_month"}`}
              testId="report-bi-monthly-chart"
            >
              {chartRows.length ? (
                <ChartFrame height={320}>
                  <ResponsiveContainer {...SAFE_RECHARTS_CONTAINER_PROPS} width="100%" height="100%">
                    <AreaChart data={chartRows} margin={{ top: 12, right: 18, bottom: 4, left: 0 }}>
                      <defs>
                        <linearGradient id="feeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.22} />
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tickFormatter={monthLabel} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="money" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={compactMoney} />
                      <YAxis yAxisId="rate" orientation="right" domain={[0, 100]} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                      <Tooltip formatter={(value, name) => (String(name).includes("phí") ? formatCurrency(value) : `${value}%`)} labelFormatter={monthLabel} />
                      <Legend />
                      <Area yAxisId="money" type="monotone" dataKey="fee_amount" name="Học phí" stroke="#4f46e5" fill="url(#feeGradient)" strokeWidth={3} />
                      <Area yAxisId="rate" type="monotone" dataKey="actual_present_rate" name="Chuyên cần" stroke="#059669" fill="rgba(16,185,129,0.08)" strokeWidth={2} />
                      <Area yAxisId="rate" type="monotone" dataKey="record_completion_rate" name="Đủ điểm danh" stroke="#f59e0b" fill="rgba(245,158,11,0.08)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartFrame>
              ) : (
                <EmptyState text="Chưa có dữ liệu theo tháng cho bộ lọc này." />
              )}
            </Panel>

            <Panel title="Top lớp cần chú ý" subtitle="Sắp xếp theo số dòng rủi ro và số tiền" testId="report-bi-class-chart">
              {classRows.length ? (
                <ChartFrame height={320}>
                  <ResponsiveContainer {...SAFE_RECHARTS_CONTAINER_PROPS} width="100%" height="100%">
                    <BarChart data={classRows.slice(0, 8)} layout="vertical" margin={{ top: 22, right: 20, bottom: 8, left: 20 }}>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
                      <XAxis xAxisId="money" type="number" tickFormatter={compactMoney} stroke="#64748b" fontSize={12} axisLine={false} tickLine={false} />
                      <XAxis xAxisId="risk" type="number" orientation="top" allowDecimals={false} stroke="#f59e0b" fontSize={12} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="class_name" width={110} stroke="#64748b" fontSize={12} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(value, name) => (name === "fee_amount" ? formatCurrency(value) : value)} />
                      <Bar xAxisId="money" dataKey="fee_amount" name="Học phí" fill="#6366f1" radius={[0, 10, 10, 0]} />
                      <Bar xAxisId="risk" dataKey="risk_count" name="Rủi ro" fill="#f59e0b" radius={[0, 10, 10, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartFrame>
              ) : (
                <EmptyState text="Chưa có lớp trong khoảng lọc này." />
              )}
            </Panel>
          </section>

          <section className="grid gap-4 xl:grid-cols-4" data-testid="report-bi-analysis-grid">
            <Panel title="Phễu học phí" subtitle="Số dòng và số tiền theo trạng thái" testId="report-bi-fee-funnel">
              <FeeStatusFunnel rows={feeStatusRows} />
            </Panel>
            <Panel title="Phân phối chuyên cần" subtitle="Nhìn nhanh nhóm chuyên cần theo dòng" testId="report-bi-attendance-distribution">
              <AttendanceDistribution rows={attendanceBuckets} />
            </Panel>
            <Panel title="Mix rủi ro" subtitle="Các nguyên nhân cảnh báo xuất hiện nhiều nhất" testId="report-bi-risk-mix">
              <RiskBreakdownChart rows={riskBreakdown} />
            </Panel>
            <Panel title="Hành động ưu tiên" subtitle="Top học viên/lớp/tháng cần xử lý" testId="report-bi-action-list">
              <ActionList rows={actionRows} />
            </Panel>
          </section>

          <Panel title="Ma trận rủi ro lớp/tháng" subtitle="Mỗi ô là một lớp trong một tháng, ưu tiên ô có nhiều cảnh báo và thiếu điểm danh" testId="report-bi-risk-heatmap">
            <RiskHeatmap rows={heatmapRows} />
          </Panel>

          <section className="eduflow-panel" data-testid="report-bi-table">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 space-y-3">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Theo dõi học phí theo học viên</h2>
                  <p className="text-sm font-semibold text-slate-500">Theo dõi theo từng dòng học viên - lớp - tháng, không gộp học phí nhiều lớp.</p>
                </div>
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Chế độ xem báo cáo">
                {Object.entries(TAB_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === key}
                    onClick={() => switchTab(key)}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                      activeTab === key ? "bg-primary-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {config.label}
                  </button>
                ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span>{formatNumber(pagination.total_items)} kết quả</span>
                <span>·</span>
                <span>{formatNumber(visibleRows.length)} dòng đang xem</span>
                <select
                  aria-label="Số dòng mỗi trang"
                  value={filters.page_size}
                  onChange={(event) => updateFilter("page_size", Number(event.target.value))}
                  className="input w-28 py-2"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => exportBiCsv(data, visibleRows, filters)} className="btn-secondary">
                  <Download size={16} /> Export CSV
                </button>
              </div>
            </div>

            <ModeInsight config={activeTabConfig} stats={activeTabStats} activeTab={activeTab} />

            <div className="overflow-x-auto">
              <table className="min-w-[1120px] divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50/90">
                  <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Học viên</th>
                    <th className="px-4 py-3">Lớp</th>
                    <th className="px-4 py-3">Tháng</th>
                    <th className="px-4 py-3">Buổi</th>
                    <th className="px-4 py-3">Chuyên cần</th>
                    <th className="px-4 py-3">Học phí</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Rủi ro</th>
                    <th className="px-4 py-3 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleRows.map((row) => (
                    <tr
                      key={`${row.student_id}-${row.class_id}-${row.month}`}
                      data-testid={`report-bi-row-${row.student_id}-${row.class_id}-${row.month}`}
                      className="align-top transition-colors hover:bg-primary-50/40"
                    >
                      <td className="px-4 py-4">
                        <p className="font-black text-slate-900">{row.student_name}</p>
                        <p className="mt-1 max-w-[220px] truncate text-xs text-slate-500">{row.student_id}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-700">
                          {row.class_name}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-700">{monthLabel(row.month)}</td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-900">
                          {row.recorded_sessions}/{row.expected_sessions}
                        </p>
                        <p className="text-xs text-slate-500">{row.chargeable_sessions} buổi tính phí</p>
                      </td>
                      <td className="px-4 py-4">
                        <Gauge value={row.actual_present_rate} />
                        <p className="mt-1 text-xs text-slate-500">Đủ điểm danh {row.record_completion_rate}%</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-black text-emerald-700">{formatCurrency(row.fee_amount || 0)}</p>
                        <p className="text-xs text-slate-500">{row.fee_confidence}</p>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={row.fee_status} />
                      </td>
                      <td className="px-4 py-4">
                        <RiskBadges flags={row.risk_flags} compact />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button type="button" onClick={() => setSelectedRow(row)} className="btn-secondary px-3 py-2">
                          <Eye size={16} /> Xem
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!visibleRows.length && <EmptyState text="Không có dòng phân tích phù hợp bộ lọc hiện tại." testId="report-bi-empty" />}

            <div className="flex flex-col gap-3 border-t border-slate-100 p-4 md:flex-row md:items-center md:justify-between" data-testid="report-bi-pagination">
              <p className="text-sm font-semibold text-slate-500">
                Trang {pagination.page} / {pagination.total_pages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={filters.page <= 1}
                  onClick={() => updateFilter("page", filters.page - 1)}
                  className="btn-secondary disabled:opacity-50"
                >
                  Trước
                </button>
                <button
                  type="button"
                  disabled={filters.page >= pagination.total_pages}
                  onClick={() => updateFilter("page", filters.page + 1)}
                  className="btn-secondary disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {selectedRow && (
        <DetailDrawer
          row={selectedRow}
          activeTab={activeTab}
          filters={data?.meta?.filters || requestFilters}
          onClose={() => setSelectedRow(null)}
        />
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function HeroMetric({ label, value }) {
  return (
    <div className="eduflow-card p-4">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value || 0}</p>
    </div>
  );
}

function MetricCard({ icon, label, value, helper, tone }) {
  const styles = {
    indigo: "border-primary-100 bg-primary-50 text-primary-700",
    sky: "border-sky-100 bg-sky-50 text-sky-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
  };
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${styles[tone]}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide opacity-75">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</p>
          <p className="mt-2 text-xs font-semibold opacity-80">{helper}</p>
        </div>
        <div className="rounded-2xl bg-white/80 p-3 shadow-sm">
          {createElement(icon, { size: 20 })}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children, testId }) {
  return (
    <section className="eduflow-panel min-w-0 p-5" data-testid={testId}>
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-lg font-black text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text, testId }) {
  return (
    <div className="m-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm font-semibold text-slate-500" data-testid={testId}>
      {text}
    </div>
  );
}

function ReportErrorState({ message, onRetry }) {
  return (
    <section className="rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm" data-testid="report-bi-error-state">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
        <AlertTriangle size={26} />
      </div>
      <h2 className="mt-4 text-xl font-black text-slate-900">Không tải được dữ liệu báo cáo</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-slate-500">
        {message || "Hệ thống chưa nhận được dữ liệu BI. Hãy thử tải lại hoặc kiểm tra API báo cáo."}
      </p>
      <button type="button" onClick={onRetry} className="btn-primary mx-auto mt-5">
        <RefreshCw size={18} /> Tải lại
      </button>
    </section>
  );
}

function ModeInsight({ config, stats, activeTab }) {
  const tone =
    activeTab === "risk"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : activeTab === "tuition"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : activeTab === "attendance"
          ? "border-sky-200 bg-sky-50 text-sky-900"
          : "border-primary-100 bg-primary-50 text-primary-900";
  return (
    <div className={`m-4 rounded-2xl border p-4 ${tone}`} data-testid="report-bi-tab-content">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-base font-black">{config.title}</p>
          <p className="mt-1 text-sm font-semibold opacity-80">{config.description}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
          <MiniStat label="Dòng" value={formatNumber(stats.rows)} />
          <MiniStat label="Học viên" value={formatNumber(stats.students)} />
          <MiniStat label="Lớp" value={formatNumber(stats.classes)} />
          <MiniStat label="Học phí" value={formatCurrency(stats.fee)} />
          <MiniStat label="Rủi ro" value={formatNumber(stats.risk)} />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl bg-white/75 px-3 py-2 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-wide opacity-60">{label}</p>
      <p className="mt-1 whitespace-nowrap text-sm font-black">{value}</p>
    </div>
  );
}

function FeeStatusFunnel({ rows }) {
  if (!rows.length) return <EmptyState text="Không có dữ liệu học phí trong phạm vi này." />;
  return (
    <ChartFrame height={256}>
      <ResponsiveContainer {...SAFE_RECHARTS_CONTAINER_PROPS} width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 20, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
          <XAxis xAxisId="count" type="number" allowDecimals={false} stroke="#4f46e5" fontSize={12} axisLine={false} tickLine={false} />
          <XAxis xAxisId="amount" type="number" orientation="top" tickFormatter={compactMoney} stroke="#10b981" fontSize={12} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={82} stroke="#64748b" fontSize={12} axisLine={false} tickLine={false} />
          <Tooltip formatter={(value, name) => (name === "amount" ? formatCurrency(value) : formatNumber(value))} />
          <Bar xAxisId="count" dataKey="count" name="Dòng" fill="#4f46e5" radius={[0, 8, 8, 0]} />
          <Bar xAxisId="amount" dataKey="amount" name="Số tiền" fill="#10b981" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function AttendanceDistribution({ rows }) {
  if (!rows.length) return <EmptyState text="Không có dữ liệu chuyên cần trong phạm vi này." />;
  return (
    <div className="grid gap-3">
      <ChartFrame height={192}>
        <ResponsiveContainer {...SAFE_RECHARTS_CONTAINER_PROPS} width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="count" nameKey="label" innerRadius={48} outerRadius={78} paddingAngle={3}>
              {rows.map((item) => (
                <Cell key={item.key} fill={item.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatNumber(value)} />
          </PieChart>
        </ResponsiveContainer>
      </ChartFrame>
      <div className="grid grid-cols-2 gap-2">
        {rows.map((item) => (
          <div key={item.key} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs font-black text-slate-600">{item.label}</span>
            </div>
            <p className="mt-1 text-lg font-black text-slate-950">{formatNumber(item.count)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskBreakdownChart({ rows }) {
  if (!rows.length) return <EmptyState text="Không có cờ rủi ro trong phạm vi này." />;
  return (
    <ChartFrame height={256}>
      <ResponsiveContainer {...SAFE_RECHARTS_CONTAINER_PROPS} width="100%" height="100%">
        <BarChart data={rows.slice(0, 6)} margin={{ top: 4, right: 8, bottom: 28, left: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" interval={0} angle={-18} textAnchor="end" height={54} stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} stroke="#64748b" fontSize={12} axisLine={false} tickLine={false} />
          <Tooltip formatter={(value) => formatNumber(value)} />
          <Bar dataKey="count" name="Cảnh báo" fill="#f59e0b" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function ActionList({ rows }) {
  if (!rows.length) return <EmptyState text="Không có hành động ưu tiên trong phạm vi này." />;
  return (
    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
      {rows.map((row) => (
        <div key={`${row.student_id}-${row.class_id}-${row.month}`} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-black text-slate-900">{row.student_name}</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">
                {row.class_name} · {monthLabel(row.month)}
              </p>
            </div>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-black text-amber-800">
              {formatNumber(riskScore(row))}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {(row.risk_flags || []).slice(0, 2).map((flag) => (
              <span key={flag} className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-600">
                {riskLabel(flag)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RiskHeatmap({ rows }) {
  if (!rows.length) return <EmptyState text="Không có ma trận lớp/tháng trong phạm vi này." />;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {rows.map((item) => {
        const intensity = Math.min(1, (item.risk + item.fee_review + item.attendance_gap / 4) / 10);
        const background = `rgba(245, 158, 11, ${0.1 + intensity * 0.38})`;
        return (
          <div key={item.key} className="rounded-2xl border border-slate-200 bg-white p-4" style={{ background }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-950">{item.class_name}</p>
                <p className="mt-1 text-xs font-bold text-slate-600">{monthLabel(item.month)}</p>
              </div>
              <span className="rounded-full bg-white/80 px-2 py-1 text-xs font-black text-amber-800">
                {formatNumber(item.risk)} cảnh báo
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <MiniStat label="Dòng" value={formatNumber(item.rows)} />
              <MiniStat label="Phí" value={formatNumber(item.fee_review)} />
              <MiniStat label="Thiếu" value={formatNumber(item.attendance_gap)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Gauge({ value }) {
  const safeValue = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div className="w-32">
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${safeValue >= 80 ? "bg-emerald-500" : safeValue >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
          style={{ width: `${safeValue}%` }}
        />
      </div>
      <p className="mt-1 text-xs font-black text-slate-700">{safeValue}%</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
    confirmed: "border-sky-200 bg-sky-50 text-sky-700",
    ready: "border-amber-200 bg-amber-50 text-amber-700",
    pending: "border-slate-200 bg-slate-50 text-slate-600",
  };
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${styles[status] || "border-slate-200 bg-slate-50 text-slate-500"}`}>
      {statusLabel(status)}
    </span>
  );
}

function RiskBadges({ flags = [], compact = false }) {
  if (!flags.length) {
    return (
      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
        Ổn định
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {flags.slice(0, compact ? 2 : flags.length).map((flag) => (
        <span key={flag} className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-800">
          {riskLabel(flag)}
        </span>
      ))}
      {compact && flags.length > 2 && (
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-500">
          +{flags.length - 2}
        </span>
      )}
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-4" data-testid="report-bi-loading">
      <div className="grid gap-4 md:grid-cols-5">
        {[0, 1, 2, 3, 4].map((item) => (
          <SkeletonBlock key={item} className="h-32" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <SkeletonBlock className="h-96" />
        <SkeletonBlock className="h-96" />
      </div>
      <SkeletonBlock className="h-96" />
    </div>
  );
}

function DetailDrawer({ row, activeTab, filters, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45 backdrop-blur-sm">
      <button type="button" aria-label="Đóng chi tiết" className="absolute inset-0" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary-600">Chi tiết dòng BI</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">{row.student_name}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {row.class_name} · {monthLabel(row.month)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600">
            Đóng
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-primary-100 bg-primary-50 p-4">
          <h3 className="font-black text-primary-900">Ngu canh truy vet</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <InfoLine label="Mode" value={activeTab || "overview"} />
            <InfoLine label="Khoang thang" value={`${filters?.from || "-"} - ${filters?.to || "-"}`} />
            <InfoLine label="Bo loc lop" value={filters?.class_id || "Tat ca"} />
            <InfoLine label="Tu khoa" value={filters?.query || "Khong co"} />
            <InfoLine label="Student ID" value={row.student_id || "Khong co"} />
            <InfoLine label="Class ID" value={row.class_id || "Khong co"} />
          </dl>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <DetailStat label="Kỳ vọng" value={`${row.expected_sessions} buổi`} />
          <DetailStat label="Đã điểm danh" value={`${row.recorded_sessions} buổi`} />
          <DetailStat label="Có mặt" value={`${row.status_counts?.present || 0} buổi`} />
          <DetailStat label="Học bù" value={`${row.status_counts?.make_up || 0} buổi`} />
          <DetailStat label="Tính phí" value={`${row.chargeable_sessions} buổi`} />
          <DetailStat label="Số tiền" value={formatCurrency(row.fee_amount || 0)} />
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="font-black text-slate-900">Chính sách phí</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <InfoLine label="Nguồn phí" value={row.fee_source} />
            <InfoLine label="Độ tin cậy" value={row.fee_confidence} />
            <InfoLine label="Mã monthly fee" value={row.monthly_fee_id || "Chưa có"} />
            <InfoLine label="Mã fee line" value={row.monthly_fee_line_id || "Chưa có"} />
          </dl>
        </div>

        <div className="mt-6">
          <h3 className="mb-3 font-black text-slate-900">Cờ rủi ro</h3>
          <RiskBadges flags={row.risk_flags} />
        </div>
      </aside>
    </div>
  );
}

function DetailStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}

function InfoLine({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="max-w-[260px] break-words text-right font-bold text-slate-800">{value}</dd>
    </div>
  );
}
