import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { reportsService } from "../services/api";

// VI: Dashboard page với thống kê và quick actions - Premium Design
export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const response = await reportsService.getDashboard();
    if (response.success) {
      setData(response.data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner w-10 h-10"></div>
          <p className="text-gray-500 animate-pulse">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  const { stats, recent_transactions, unpaid_students } = data || {};

  // Format currency
  const formatMoney = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Tổng quan
          </h1>
          <p className="text-gray-500 mt-1">
            Xin chào! Đây là tổng quan hoạt động của trung tâm.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
          <span>📅</span>
          <span>
            {new Date().toLocaleDateString("vi-VN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Stats cards - Premium Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Học viên"
          value={stats?.active_students || 0}
          subtitle={`/ ${stats?.total_students || 0} tổng`}
          icon={
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          }
          gradient="from-blue-500 to-indigo-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          title="Lớp học"
          value={stats?.total_classes || 0}
          subtitle="đang hoạt động"
          icon={
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          }
          gradient="from-purple-500 to-pink-600"
          bgColor="bg-purple-50"
        />
        <StatCard
          title="Thu tháng này"
          value={formatMoney(stats?.month_revenue)}
          icon={
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          gradient="from-emerald-500 to-green-600"
          bgColor="bg-emerald-50"
        />
        <StatCard
          title="Chi tháng này"
          value={formatMoney(stats?.month_expenses)}
          icon={
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
          gradient="from-orange-500 to-amber-600"
          bgColor="bg-orange-50"
        />
      </div>

      {/* Quick actions - Premium Design */}
      <div className="card overflow-hidden">
        <div className="card-header bg-gradient-to-r from-gray-50 to-white">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <span className="text-lg">⚡</span>
            Thao tác nhanh
          </h2>
        </div>
        <div className="card-body bg-gradient-to-br from-white to-gray-50/50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <QuickAction
              to="/attendance"
              icon="📋"
              label="Điểm danh"
              description="Quản lý điểm danh"
              color="from-blue-500 to-indigo-500"
            />
            <QuickAction
              to="/receipts"
              icon="💰"
              label="Thu tiền"
              description="Tạo phiếu thu"
              color="from-emerald-500 to-green-500"
            />
            <QuickAction
              to="/students"
              icon="👨‍🎓"
              label="Thêm học viên"
              description="Đăng ký mới"
              color="from-purple-500 to-pink-500"
            />
            <QuickAction
              to="/reports"
              icon="📊"
              label="Xem báo cáo"
              description="Thống kê chi tiết"
              color="from-orange-500 to-red-500"
            />
          </div>
        </div>
      </div>

      {/* Two columns - Recent transactions and Unpaid students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent transactions */}
        <div className="card overflow-hidden">
          <div className="card-header flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <span className="text-lg">💳</span>
              Giao dịch gần đây
            </h2>
            <Link
              to="/history"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 group"
            >
              Xem tất cả
              <span className="group-hover:translate-x-1 transition-transform">
                →
              </span>
            </Link>
          </div>
          <div className="divide-y divide-gray-100/80">
            {recent_transactions?.length > 0 ? (
              recent_transactions.slice(0, 5).map((tx, i) => (
                <div
                  key={i}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-lg ${
                        tx.type === "receipt"
                          ? "bg-gradient-to-br from-emerald-400 to-green-500 text-white"
                          : "bg-gradient-to-br from-orange-400 to-amber-500 text-white"
                      }`}
                    >
                      {tx.type === "receipt" ? "↓" : "↑"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {tx.description || tx.id}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(tx.date || tx.created_at).toLocaleDateString(
                          "vi-VN"
                        )}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-bold text-lg ${
                      tx.type === "receipt"
                        ? "text-emerald-600"
                        : "text-orange-600"
                    }`}
                  >
                    {tx.type === "receipt" ? "+" : "-"}
                    {formatMoney(tx.amount)}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-gray-500">Chưa có giao dịch nào</p>
              </div>
            )}
          </div>
        </div>

        {/* Unpaid students */}
        <div className="card overflow-hidden">
          <div className="card-header flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <span className="text-lg">📝</span>
              Chưa đóng học phí
            </h2>
            <span className="badge-warning shadow-sm">
              {unpaid_students?.length || 0} học viên
            </span>
          </div>
          <div className="divide-y divide-gray-100/80">
            {unpaid_students?.length > 0 ? (
              unpaid_students.slice(0, 5).map((student, i) => (
                <div
                  key={i}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="avatar">
                      {student.full_name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {student.full_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {student.class_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      {student.days_count} ngày
                    </p>
                    <Link
                      to={`/receipts?student_id=${student.id}`}
                      className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 group"
                    >
                      Thu tiền{" "}
                      <span className="group-hover:translate-x-0.5 transition-transform">
                        →
                      </span>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-gray-500">Tất cả học viên đã đóng học phí</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Premium Stat Card Component
function StatCard({ title, value, subtitle, icon, gradient, bgColor }) {
  return (
    <div className="stat-card group hover:-translate-y-1 cursor-default">
      <div className="flex items-center gap-4">
        <div
          className={`stat-card-icon bg-gradient-to-br ${gradient} text-white shadow-lg`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>
          <p className="text-sm text-gray-500">
            {title}{" "}
            {subtitle && <span className="text-gray-400">{subtitle}</span>}
          </p>
        </div>
      </div>
    </div>
  );
}

// Premium Quick Action Button
function QuickAction({ to, icon, label, description, color }) {
  return (
    <Link to={to} className="quick-action group text-center">
      <div
        className={`quick-action-icon bg-gradient-to-br ${color} text-white shadow-lg group-hover:shadow-xl`}
      >
        <span className="text-2xl">{icon}</span>
      </div>
      <span className="text-sm font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
        {label}
      </span>
      <span className="text-xs text-gray-400">{description}</span>
    </Link>
  );
}
