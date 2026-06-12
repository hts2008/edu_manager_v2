import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CircleDollarSign,
  Receipt,
  Users,
} from "lucide-react";
import PageState from "../components/ui/PageState";
import { ChartFrame, SAFE_RECHARTS_CONTAINER_PROPS } from "../components/ui/LoadingStates";
import { reportsService } from "../services/api";

const moneyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatMoney(value) {
  return moneyFormatter.format(value || 0);
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function MetricCard({ title, value, note, icon, tone = "indigo", loading }) {
  const Icon = icon;
  const tones = {
    indigo: "from-indigo-50 to-white text-indigo-700 ring-indigo-100",
    emerald: "from-emerald-50 to-white text-emerald-700 ring-emerald-100",
    amber: "from-amber-50 to-white text-amber-700 ring-amber-100",
    cyan: "from-cyan-50 to-white text-cyan-700 ring-cyan-100",
  };

  return (
    <div className={`eduflow-metric bg-gradient-to-br ${tones[tone]} p-5 ring-1`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          {loading ? (
            <div className="mt-3 h-8 w-24 animate-pulse rounded-lg bg-slate-200/80" />
          ) : (
            <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</p>
          )}
          <p className="mt-1 text-sm text-slate-500">{loading ? "Đang tải dữ liệu" : note}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm">
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-44 animate-pulse rounded-3xl bg-white/85 ring-1 ring-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-32 animate-pulse rounded-2xl bg-white/85 ring-1 ring-slate-200" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [detailError, setDetailError] = useState(null);

  const loadDashboard = async () => {
    const initialLoad = !data;
    setLoading(initialLoad);
    setRefreshing(!initialLoad);
    setError(null);
    setDetailError(null);

    const summaryResponse = await reportsService.getDashboard({ mode: "summary" });
    if (!summaryResponse.success) {
      setError(summaryResponse.error?.message || "Không thể tải tổng quan vận hành");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setData((current) => ({ ...(current || {}), ...summaryResponse.data }));
    setLoading(false);

    const detailResponse = await reportsService.getDashboard({ mode: "full" });
    if (detailResponse.success) {
      setData(detailResponse.data);
    } else {
      setDetailError(detailResponse.error?.message || "Khong the tai du lieu chi tiet");
    }
    setRefreshing(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const stats = data?.stats || {};
  const recentTransactions = data?.recent_transactions || [];
  const unpaidStudents = data?.unpaid_students || [];
  const todayAttendance = data?.today_attendance || {};
  const quickMetrics = data?.quick_metrics || {};
  const attentionItems = data?.attention_items || [];
  const todayLabel = useMemo(() => dateFormatter.format(new Date()), []);
  const chartData = useMemo(
    () => [
      {
        name: quickMetrics.current_month || "Tháng này",
        revenue: stats.month_revenue || 0,
        expenses: stats.month_expenses || 0,
      },
    ],
    [quickMetrics.current_month, stats.month_expenses, stats.month_revenue]
  );
  const hasFinancialData = chartData.some((item) => item.revenue > 0 || item.expenses > 0);

  if (loading && !data) return <DashboardSkeleton />;

  if (error && !data) {
    return (
      <PageState
        title="Tổng quan chưa sẵn sàng"
        message={error}
        tone="red"
        action={loadDashboard}
        actionLabel="Tải lại"
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="eduflow-page-intro overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="eduflow-eyebrow">
                  {todayLabel}
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100">
                  {refreshing ? "Đang cập nhật" : "Production online"}
                </span>
              </div>
              <h1 className="eduflow-title text-3xl font-black tracking-tight sm:text-4xl">
                Tổng quan vận hành
              </h1>
              <p className="eduflow-muted mt-3 max-w-2xl text-base leading-7">
                Theo dõi điểm danh, học phí, dòng tiền và các việc cần xử lý trong ngày từ dữ liệu thật của hệ thống.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/attendance" className="btn-secondary">
                <CalendarCheck size={18} /> Điểm danh
              </Link>
              <Link to="/fee-collection" className="btn-primary">
                <CircleDollarSign size={18} /> Thu học phí
              </Link>
            </div>
          </div>
        </div>
      </section>

      {detailError && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={18} aria-hidden="true" />
            <p className="font-semibold">
              Du lieu tong quan da tai, nhung du lieu chi tiet dang thieu: {detailError}
            </p>
          </div>
          <button type="button" onClick={loadDashboard} className="btn-secondary w-fit px-3 py-2 text-xs">
            Tai lai chi tiet
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Học viên đang học"
          value={stats.active_students || 0}
          note={`${stats.total_students || 0} học viên tổng`}
          icon={Users}
        />
        <MetricCard
          title="Điểm danh hôm nay"
          value={`${todayAttendance.present_rate || 0}%`}
          note={`${todayAttendance.present || 0}/${todayAttendance.total || 0} lượt có mặt`}
          icon={CalendarCheck}
          tone="emerald"
        />
        <MetricCard
          title="Tỷ lệ đã thu"
          value={`${quickMetrics.payment_coverage ?? 100}%`}
          note={`Còn ${formatMoney(quickMetrics.unpaid_amount)}`}
          icon={Receipt}
          tone="amber"
        />
        <MetricCard
          title="Dòng tiền ròng"
          value={formatMoney(quickMetrics.net_revenue)}
          note={`Thu ${formatMoney(stats.month_revenue)} tháng này`}
          icon={CircleDollarSign}
          tone="cyan"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="eduflow-panel min-w-0 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">Dòng tiền tháng hiện tại</h2>
              <p className="mt-1 text-sm text-slate-500">Không hiển thị dữ liệu giả khi chưa có giao dịch.</p>
            </div>
            <Link to="/reports" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
              Báo cáo
            </Link>
          </div>
          <ChartFrame className="mt-5" height={288}>
            {hasFinancialData ? (
              <ResponsiveContainer {...SAFE_RECHARTS_CONTAINER_PROPS} width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${Math.round(value / 1000000)}M`}
                  />
                  <Tooltip formatter={(value) => formatMoney(value)} />
                  <Bar dataKey="revenue" name="Doanh thu" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="expenses" name="Chi phí" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl bg-slate-50 text-center ring-1 ring-slate-100">
                <CircleDollarSign className="text-slate-300" size={40} />
                <p className="mt-3 font-semibold text-slate-700">Chưa có dữ liệu thu chi trong tháng</p>
                <p className="mt-1 text-sm text-slate-500">Khi có phiếu thu hoặc phiếu chi, biểu đồ sẽ tự cập nhật.</p>
              </div>
            )}
          </ChartFrame>
        </section>

        <section className="eduflow-panel">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-lg font-black text-slate-950">Việc cần xử lý</h2>
              <p className="text-sm text-slate-500">Từ dashboard API hiện tại</p>
            </div>
            <AlertTriangle className="text-amber-500" size={20} />
          </div>
          <div className="divide-y divide-slate-100">
            {attentionItems.map((item) => (
              <Link
                key={item.id}
                to={item.to}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-indigo-50/50 sm:px-6"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.amount ? formatMoney(item.amount) : `${item.count || 0} mục`}
                  </p>
                </div>
                <ArrowRight className="shrink-0 text-slate-400" size={18} />
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="eduflow-panel">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-lg font-black text-slate-950">Giao dịch gần đây</h2>
              <p className="text-sm text-slate-500">Phiếu thu/chi mới nhất</p>
            </div>
            <Link to="/history" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
              Lịch sử
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx) => (
                <div key={`${tx.type}-${tx.id}`} className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{tx.description || tx.id}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDate(tx.date || tx.created_at)}</p>
                  </div>
                  <p className={`shrink-0 text-sm font-black ${tx.type === "receipt" ? "text-emerald-600" : "text-amber-600"}`}>
                    {tx.type === "receipt" ? "+" : "-"}{formatMoney(tx.amount)}
                  </p>
                </div>
              ))
            ) : (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                {refreshing ? "Đang tải giao dịch..." : "Chưa có giao dịch."}
              </div>
            )}
          </div>
        </section>

        <section className="eduflow-panel">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-lg font-black text-slate-950">Học phí cần thu</h2>
              <p className="text-sm text-slate-500">Tháng {quickMetrics.current_month || "-"}</p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-700 ring-1 ring-amber-100">
              {quickMetrics.unpaid_count ?? unpaidStudents.length} học viên
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {unpaidStudents.length > 0 ? (
              unpaidStudents.map((student) => (
                <div key={student.monthly_fee_id || student.id} className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{student.full_name}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {student.class_name || "Chưa gắn lớp"} · {student.days_count || 0} buổi
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black text-slate-950">{formatMoney(student.total_amount)}</p>
                    <Link to={`/fee-collection?student_id=${student.id}`} className="mt-1 inline-block text-xs font-bold text-indigo-600">
                      Thu phí
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                {refreshing ? "Đang tải danh sách cần thu..." : "Không có học phí quá hạn trong tháng hiện tại."}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
