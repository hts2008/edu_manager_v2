import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportsService } from '../services/api';

// VI: Dashboard page với thống kê và quick actions
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
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  const { stats, recentTransactions, unpaidStudents } = data || {};

  // Format currency
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tổng quan</h1>
        <p className="text-gray-500">Xin chào! Đây là tổng quan hoạt động của trung tâm.</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Học viên"
          value={stats?.students?.active || 0}
          subtitle={`/ ${stats?.students?.total || 0} tổng`}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
          color="blue"
        />
        <StatCard
          title="Lớp học"
          value={stats?.classes?.total || 0}
          subtitle="đang hoạt động"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
          color="purple"
        />
        <StatCard
          title="Thu tháng này"
          value={formatMoney(stats?.finance?.receipts_this_month)}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="green"
        />
        <StatCard
          title="Chi tháng này"
          value={formatMoney(stats?.finance?.payments_this_month)}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          color="orange"
        />
      </div>

      {/* Quick actions */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-900">Thao tác nhanh</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <QuickAction to="/attendance" icon="📋" label="Điểm danh" />
            <QuickAction to="/receipts" icon="💰" label="Thu tiền" />
            <QuickAction to="/students" icon="👨‍🎓" label="Thêm học viên" />
            <QuickAction to="/reports" icon="📊" label="Xem báo cáo" />
          </div>
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent transactions */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Giao dịch gần đây</h2>
            <Link to="/history" className="text-sm text-primary-600 hover:text-primary-700">
              Xem tất cả →
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentTransactions?.length > 0 ? (
              recentTransactions.map((tx, i) => (
                <div key={i} className="px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      tx.type === 'receipt' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                    }`}>
                      {tx.type === 'receipt' ? '↓' : '↑'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{tx.id}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(tx.created_at).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <span className={`font-medium ${
                    tx.type === 'receipt' ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {tx.type === 'receipt' ? '+' : '-'}{formatMoney(tx.amount)}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                Chưa có giao dịch nào
              </div>
            )}
          </div>
        </div>

        {/* Unpaid students */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Chưa đóng học phí</h2>
            <span className="badge-warning">{unpaidStudents?.length || 0} học viên</span>
          </div>
          <div className="divide-y divide-gray-100">
            {unpaidStudents?.length > 0 ? (
              unpaidStudents.slice(0, 5).map((student, i) => (
                <div key={i} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{student.full_name}</p>
                    <p className="text-xs text-gray-500">{student.class_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {student.days_count} ngày
                    </p>
                    <Link 
                      to={`/receipts?student_id=${student.id}`} 
                      className="text-xs text-primary-600 hover:underline"
                    >
                      Thu tiền →
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                Tất cả học viên đã đóng học phí
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat card component
function StatCard({ title, value, subtitle, icon, color }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="card">
      <div className="card-body flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">
            {title} {subtitle && <span className="text-gray-400">{subtitle}</span>}
          </p>
        </div>
      </div>
    </div>
  );
}

// Quick action button
function QuickAction({ to, icon, label }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 
                 hover:border-primary-300 hover:bg-primary-50 transition-colors"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </Link>
  );
}
