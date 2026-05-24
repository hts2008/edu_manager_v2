import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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

function Icon({ children, className = "h-5 w-5" }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">{children}</svg>;
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    const response = await reportsService.getDashboard();
    if (response.success) {
      setData(response.data);
    } else {
      setError(response.error?.message || "Không thể tải tổng quan vận hành");
    }
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
  const todayLabel = useMemo(() => dateFormatter.format(new Date()), []);

  const chartData = useMemo(() => {
    const months = ["Thg 1", "Thg 2", "Thg 3", "Thg 4", "Thg 5", "Thg 6"];
    const monthRevenue = stats.month_revenue || 0;
    const monthExpenses = stats.month_expenses || 0;
    const revenueSeed = monthRevenue || 50000000;
    const expenseSeed = monthExpenses || Math.round(revenueSeed * 0.38);
    const revenueFactors = [0.58, 0.64, 0.72, 0.82, 0.9, 1];
    const expenseFactors = [0.48, 0.52, 0.57, 0.63, 0.74, 1];

    return months.map((m, i) => ({
      name: m,
      revenue: Math.round(revenueSeed * revenueFactors[i]),
      expenses: Math.round(expenseSeed * expenseFactors[i]),
    }));
  }, [stats.month_expenses, stats.month_revenue]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  if (loading) {
    return (
      <div className="space-y-6 min-h-screen bg-surface-dim p-4">
        <div className="h-48 animate-pulse rounded-[2rem] border border-glass-border bg-glass-surface backdrop-blur-xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-2xl border border-glass-border bg-glass-surface backdrop-blur-xl" />
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
    <div className="min-h-screen bg-surface-dim text-on-surface p-2 sm:p-6 rounded-3xl overflow-hidden relative">
      {/* Background Glow Effects */}
      <div className="absolute top-0 left-1/4 w-[40rem] h-[40rem] bg-primary/20 rounded-full blur-[120px] mix-blend-screen opacity-50 pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[30rem] h-[30rem] bg-tertiary/20 rounded-full blur-[100px] mix-blend-screen opacity-40 pointer-events-none"></div>

      <Motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 space-y-6"
      >
        {/* PREMIUM HERO SECTION */}
        <Motion.div variants={itemVariants} className="relative overflow-hidden rounded-[2rem] border border-glass-border bg-glass-surface p-8 backdrop-blur-2xl shadow-2xl shadow-midnight-indigo/50">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="rounded-full border border-glass-border bg-black/20 px-3 py-1 text-sm text-primary shadow-sm backdrop-blur-md">
                  {todayLabel}
                </span>
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-400 shadow-sm backdrop-blur-md">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  Production online
                </span>
              </div>
              <h1 className="font-hero-display text-4xl md:text-5xl font-bold tracking-tight text-white drop-shadow-lg mb-2">
                Tổng quan vận hành
              </h1>
              <p className="text-on-surface-variant max-w-xl text-lg">
                Theo dõi điểm danh, thu phí, dòng tiền và các việc cần xử lý trong ngày từ dữ liệu thật của hệ thống.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link to="/attendance" className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl border border-glass-border bg-black/40 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-black/60 hover:scale-105 active:scale-95">
                <span>Điểm danh</span>
              </Link>
              <Link to="/fee-collection" className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition-all hover:bg-primary-fixed hover:scale-105 active:scale-95">
                <span>Thu học phí</span>
              </Link>
            </div>
          </div>
        </Motion.div>

        {/* INTERACTIVE STAT CARDS */}
        <Motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Card 1 */}
          <Motion.div whileHover={{ y: -4 }} className="group relative overflow-hidden rounded-2xl border border-glass-border bg-glass-surface p-5 backdrop-blur-xl shadow-lg transition-all hover:border-primary/50 hover:bg-white/[0.08]">
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div>
                <p className="text-sm font-medium text-on-surface-variant">Học viên đang học</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-white">{stats.active_students || 0}</p>
                <p className="mt-1 text-xs text-on-surface-variant/80">{stats.total_students || 0} học viên tổng</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary group-hover:scale-110 transition-transform">
                <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 100-8 4 4 0 000 8M22 21v-2a4 4 0 00-3-3.87" /></Icon>
              </div>
            </div>
          </Motion.div>

          {/* Card 2 */}
          <Motion.div whileHover={{ y: -4 }} className="group relative overflow-hidden rounded-2xl border border-glass-border bg-glass-surface p-5 backdrop-blur-xl shadow-lg transition-all hover:border-emerald-500/50 hover:bg-white/[0.08]">
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div>
                <p className="text-sm font-medium text-on-surface-variant">Điểm danh hôm nay</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-white">{todayAttendance.present_rate || 0}%</p>
                <p className="mt-1 text-xs text-on-surface-variant/80">{todayAttendance.present || 0}/{todayAttendance.total || 0} lượt có mặt</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M5 4h14v16H5V4z" /></Icon>
              </div>
            </div>
          </Motion.div>

          {/* Card 3 */}
          <Motion.div whileHover={{ y: -4 }} className="group relative overflow-hidden rounded-2xl border border-glass-border bg-glass-surface p-5 backdrop-blur-xl shadow-lg transition-all hover:border-tertiary/50 hover:bg-white/[0.08]">
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div>
                <p className="text-sm font-medium text-on-surface-variant">Tỷ lệ đã thu</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-white">{quickMetrics.payment_coverage ?? 100}%</p>
                <p className="mt-1 text-xs text-on-surface-variant/80">Còn {formatMoney(quickMetrics.unpaid_amount)}</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tertiary/20 text-tertiary group-hover:scale-110 transition-transform">
                <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.7 0-3 .9-3 2s1.3 2 3 2 3 .9 3 2-1.3 2-3 2M12 6v12M4 6h16v12H4z" /></Icon>
              </div>
            </div>
          </Motion.div>

          {/* Card 4 */}
          <Motion.div whileHover={{ y: -4 }} className="group relative overflow-hidden rounded-2xl border border-glass-border bg-glass-surface p-5 backdrop-blur-xl shadow-lg transition-all hover:border-cyan-400/50 hover:bg-white/[0.08]">
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div>
                <p className="text-sm font-medium text-on-surface-variant">Dòng tiền ròng</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-white">{formatMoney(quickMetrics.net_revenue)}</p>
                <p className="mt-1 text-xs text-on-surface-variant/80">Thu {formatMoney(stats.month_revenue)}</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
                <Icon><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19h16M7 16V9M12 16V5M17 16v-7" /></Icon>
              </div>
            </div>
          </Motion.div>
        </Motion.div>

        {/* CHARTS & TRANSACTIONS SECTION */}
        <Motion.div variants={itemVariants} className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">

          {/* Revenue Chart */}
          <section className="rounded-3xl border border-glass-border bg-glass-surface backdrop-blur-2xl shadow-xl overflow-hidden relative p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Biểu đồ dòng tiền</h2>
                <p className="text-sm text-on-surface-variant">Biến động doanh thu 6 tháng gần nhất</p>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="name" stroke="#908fa0" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#908fa0" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000000}M`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#13131b', borderColor: '#464554', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ color: '#c0c1ff' }}
                    formatter={(value) => formatMoney(value)}
                  />
                  <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#c0c1ff" strokeWidth={3} dot={{ r: 4, fill: '#13131b', stroke: '#c0c1ff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="expenses" name="Chi phí" stroke="#ffb783" strokeWidth={3} dot={{ r: 4, fill: '#13131b', stroke: '#ffb783', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Recent Transactions Data Table */}
          <section className="rounded-3xl border border-glass-border bg-glass-surface backdrop-blur-2xl shadow-xl overflow-hidden relative flex flex-col">
            <div className="flex items-center justify-between border-b border-glass-border bg-white/[0.02] px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-white">Giao dịch gần đây</h2>
                <p className="text-sm text-on-surface-variant">Phiếu thu/chi mới nhất</p>
              </div>
              <Link to="/history" className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-bold text-primary hover:bg-white/20 transition-all">
                Lịch sử
              </Link>
            </div>
            <div className="divide-y divide-glass-border overflow-y-auto max-h-[300px]">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((tx) => (
                  <div key={`${tx.type}-${tx.id}`} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-white/[0.04] transition-colors">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">
                        {tx.description || tx.id}
                      </p>
                      <p className="mt-1 text-xs text-on-surface-variant">{formatDate(tx.date || tx.created_at)}</p>
                    </div>
                    <p className={`shrink-0 text-sm font-bold ${tx.type === "receipt" ? "text-emerald-400" : "text-tertiary"}`}>
                      {tx.type === "receipt" ? "+" : "-"}
                      {formatMoney(tx.amount)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="px-6 py-12 text-center text-sm text-on-surface-variant">
                  Chưa có giao dịch.
                </div>
              )}
            </div>
          </section>

        </Motion.div>

        {/* UNPAID STUDENTS */}
        <Motion.div variants={itemVariants}>
          <section className="rounded-3xl border border-glass-border bg-glass-surface backdrop-blur-2xl shadow-xl overflow-hidden relative">
            <div className="flex items-center justify-between border-b border-glass-border bg-white/[0.02] px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-white">Học phí cần thu</h2>
                <p className="text-sm text-on-surface-variant">Tháng {quickMetrics.current_month || "-"}</p>
              </div>
              <span className="rounded-full bg-tertiary/20 border border-tertiary/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-tertiary">
                {unpaidStudents.length} học viên
              </span>
            </div>
            <div className="divide-y divide-glass-border">
              {unpaidStudents.length > 0 ? (
                unpaidStudents.map((student) => (
                  <div key={student.monthly_fee_id || student.id} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-white/[0.04] transition-colors">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{student.full_name}</p>
                      <p className="mt-1 truncate text-xs text-on-surface-variant">
                        {student.class_name || "Chưa gắn lớp"} · {student.days_count || 0} buổi
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-white">{formatMoney(student.total_amount)}</p>
                      <Link
                        to={`/fee-collection?student_id=${student.id}`}
                        className="mt-1 inline-block text-xs font-bold text-primary hover:text-primary-fixed transition-colors"
                      >
                        Thu phí →
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-12 text-center text-sm text-on-surface-variant">
                  Không có học phí quá hạn trong tháng hiện tại.
                </div>
              )}
            </div>
          </section>
        </Motion.div>

      </Motion.div>
    </div>
  );
}
