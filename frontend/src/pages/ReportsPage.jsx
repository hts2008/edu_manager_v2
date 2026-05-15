import { useState } from 'react';
import { reportsService } from '../services/api';
import { useAsyncData } from '../hooks/useAsyncData';

// VI: Trang báo cáo tài chính
export default function ReportsPage() {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [reportType, setReportType] = useState('monthly');
  const { data, loading } = useAsyncData(async () => {
    const response = await reportsService.getFinancial({
      from: dateRange.from,
      to: dateRange.to,
      type: reportType,
    });

    return response.success ? response.data : null;
  }, `${dateRange.from}:${dateRange.to}:${reportType}`);

  const formatCurrency = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

  // Calculate totals from data
  const totalReceipts = data?.receipts?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
  const totalPayments = data?.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  const balance = totalReceipts - totalPayments;

  // Group payments by category
  const paymentsByCategory = data?.payments?.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + (p.amount || 0);
    return acc;
  }, {}) || {};

  const categoryLabels = {
    salary: 'Lương giáo viên',
    utility: 'Điện/Nước',
    office: 'Văn phòng phẩm',
    other: 'Khác',
  };

  const categoryColors = {
    salary: 'bg-purple-500',
    utility: 'bg-blue-500',
    office: 'bg-green-500',
    other: 'bg-gray-500',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Báo cáo tài chính</h1>
          <p className="text-gray-500">Theo dõi thu chi theo thời gian</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Excel
          </button>
          <button className="btn-primary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            In báo cáo
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Report Type */}
            <div className="flex gap-2">
              {[
                { value: 'daily', label: 'Ngày' },
                { value: 'weekly', label: 'Tuần' },
                { value: 'monthly', label: 'Tháng' },
                { value: 'yearly', label: 'Năm' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setReportType(opt.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    reportType === opt.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Date Range */}
            <div className="flex gap-2 items-center ml-auto">
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="input w-auto"
              />
              <span className="text-gray-500">→</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="input w-auto"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 mb-1">Tổng thu</p>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(totalReceipts)}</p>
              </div>
              <div className="w-12 h-12 bg-green-200 rounded-xl flex items-center justify-center text-2xl">
                💰
              </div>
            </div>
            <p className="mt-2 text-sm text-green-600">
              {data?.receipts?.length || 0} phiếu thu
            </p>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 mb-1">Tổng chi</p>
                <p className="text-3xl font-bold text-red-600">{formatCurrency(totalPayments)}</p>
              </div>
              <div className="w-12 h-12 bg-red-200 rounded-xl flex items-center justify-center text-2xl">
                📤
              </div>
            </div>
            <p className="mt-2 text-sm text-red-600">
              {data?.payments?.length || 0} phiếu chi
            </p>
          </div>
        </div>

        <div className={`card ${balance >= 0 ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200' : 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200'}`}>
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm mb-1 ${balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Cân đối</p>
                <p className={`text-3xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {formatCurrency(balance)}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${balance >= 0 ? 'bg-blue-200' : 'bg-orange-200'}`}>
                {balance >= 0 ? '📈' : '📉'}
              </div>
            </div>
            <p className={`mt-2 text-sm ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {balance >= 0 ? 'Lãi' : 'Lỗ'}
            </p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Payment by Category */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Chi tiêu theo danh mục</h3>
          {Object.keys(paymentsByCategory).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(paymentsByCategory).map(([category, amount]) => {
                const percent = totalPayments > 0 ? Math.round((amount / totalPayments) * 100) : 0;
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700">{categoryLabels[category] || category}</span>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(amount)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${categoryColors[category] || 'bg-gray-500'}`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{percent}%</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              Chưa có dữ liệu chi tiêu
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Thống kê tổng quan</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-600">Số phiếu thu</span>
              <span className="font-semibold text-gray-900">{data?.receipts?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-600">Số phiếu chi</span>
              <span className="font-semibold text-gray-900">{data?.payments?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-600">Thu trung bình/phiếu</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(data?.receipts?.length ? totalReceipts / data.receipts.length : 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-600">Chi trung bình/phiếu</span>
              <span className="font-semibold text-red-600">
                {formatCurrency(data?.payments?.length ? totalPayments / data.payments.length : 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/50 flex items-center justify-center z-50">
          <div className="spinner w-8 h-8"></div>
        </div>
      )}
    </div>
  );
}
