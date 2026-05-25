import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion as Motion } from "framer-motion";
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

function MetricCard({ title, value, note, icon, tone = "indigo" }) {
  const Icon = icon;
  const tones = {
    indigo: "from-indigo-50 to-white text-indigo-700 ring-indigo-100",
    emerald: "from-emerald-50 to-white text-emerald-700 ring-emerald-100",
    amber: "from-amber-50 to-white text-amber-700 ring-amber-100",
    cyan: "from-cyan-50 to-white text-cyan-700 ring-cyan-100",
  };

  return (
    <Motion.div
      whileHover={{ y: -3 }}
      className={`rounded-2xl bg-gradient-to-br ${tones[tone]} p-5 shadow-sm ring-1 transition-shadow hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{note}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm">
          <Icon size={21} />
        </div>
      </div>
    </Motion.div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    const response = await reportsService.getDashboard();
    if (response.success) setData(response.data);
    else setError(response.error?.message || "Không thể tải tổng quan vận hành");
    setLoading(false);
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

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-44 animate-pulse rounded-3xl bg-white/70 ring-1 ring-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-2xl bg-white/70 ring-1 ring-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
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
    <Motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <section className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white/85 shadow-sm backdrop-blur-xl">
        <div className="relative p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-indigo-200/45 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-cyan-200/35 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-100">
                  {todayLabel}
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100">
                  Production online
                </span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Tổng quan vận hành
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
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
        <section className="rounded-3xl border border-slate-200/70 bg-white/85 p-5 shadow-sm backdrop-blur-xl sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">Dòng tiền tháng hiện tại</h2>
              <p className="mt-1 text-sm text-slate-500">Không hiển thị dữ liệu giả khi chưa có giao dịch.</p>
            </div>
            <Link to="/reports" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
              Báo cáo
            </Link>
          </div>
          <div className="mt-5 h-72">
            {hasFinancialData ? (
              <ResponsiveContainer width="100%" height="100%">
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
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/70 bg-white/85 shadow-sm backdrop-blur-xl">
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
        <section className="rounded-3xl border border-slate-200/70 bg-white/85 shadow-sm backdrop-blur-xl">
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
              <div className="px-5 py-10 text-center text-sm text-slate-500">Chưa có giao dịch.</div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/70 bg-white/85 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-lg font-black text-slate-950">Học phí cần thu</h2>
              <p className="text-sm text-slate-500">Tháng {quickMetrics.current_month || "-"}</p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-700 ring-1 ring-amber-100">
              {unpaidStudents.length} học viên
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
                Không có học phí quá hạn trong tháng hiện tại.
              </div>
            )}
          </div>
        </section>
      </div>
    </Motion.div>
  );
}
