import { useState, useEffect } from 'react';
import { monthlyFeesService, studentsService } from '../services/api';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';

// VI: Trang Thu học phí với workflow trạng thái

const STATUS_CONFIG = {
  pending: { label: 'Chờ chốt', color: 'bg-gray-100 text-gray-700', icon: '⚪' },
  ready: { label: 'Sẵn sàng', color: 'bg-yellow-100 text-yellow-700', icon: '🟡' },
  confirmed: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-700', icon: '🔵' },
  paid: { label: 'Đã thu', color: 'bg-green-100 text-green-700', icon: '🟢' },
};

export default function FeeCollectionPage() {
  const [fees, setFees] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [statusFilter, setStatusFilter] = useState('');
  const [payModal, setPayModal] = useState({ open: false, item: null });
  const toast = useToast();

  useEffect(() => {
    loadFees();
  }, [month, statusFilter]);

  const loadFees = async () => {
    setLoading(true);
    const params = { month };
    if (statusFilter) params.status = statusFilter;
    
    const res = await monthlyFeesService.getAll(params);
    if (res.success) {
      setFees(res.data.fees || []);
      setSummary(res.data.summary || {});
    }
    setLoading(false);
  };

  const handleConfirm = async (id) => {
    const res = await monthlyFeesService.confirm(id);
    if (res.success) {
      toast.success('Đã xác nhận học phí');
      loadFees();
    } else {
      toast.error(res.error?.message || 'Lỗi xác nhận');
    }
  };

  const handlePay = async () => {
    const { item, paymentMethod } = payModal;
    if (!item || !paymentMethod) return;
    
    const res = await monthlyFeesService.pay(item.id, { payment_method: paymentMethod });
    if (res.success) {
      toast.success(`Đã thu tiền! Phiếu thu: ${res.data.receiptId}`);
      setPayModal({ open: false, item: null });
      loadFees();
    } else {
      toast.error(res.error?.message || 'Lỗi thu tiền');
    }
  };

  const handlePrintReceipt = (receiptId) => {
    const token = localStorage.getItem('token');
    fetch(`/api/receipts/${receiptId}/pdf`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      });
  };

  const formatCurrency = (value) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

  const columns = [
    {
      key: 'student_name',
      title: 'Học viên',
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'class_names',
      title: 'Lớp',
      render: (value) => <span className="text-gray-600">{value || '-'}</span>,
    },
    {
      key: 'total_days',
      title: 'Điểm danh',
      render: (value) => <span>{value || 0} buổi</span>,
    },
    {
      key: 'total_amount',
      title: 'Số tiền',
      render: (value) => (
        <span className="font-semibold text-green-600">{formatCurrency(value)}</span>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (value) => {
        const cfg = STATUS_CONFIG[value] || STATUS_CONFIG.pending;
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
            {cfg.icon} {cfg.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      title: 'Hành động',
      render: (_, row) => (
        <div className="flex gap-2">
          {row.status === 'ready' && (
            <button
              onClick={() => handleConfirm(row.id)}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
            >
              Xác nhận
            </button>
          )}
          {row.status === 'confirmed' && (
            <button
              onClick={() => setPayModal({ open: true, item: row, paymentMethod: 'cash' })}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
            >
              Thu tiền
            </button>
          )}
          {row.status === 'paid' && row.receipt_id && (
            <button
              onClick={() => handlePrintReceipt(row.receipt_id)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              🖨️ In lại
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💰 Thu học phí</h1>
          <p className="text-gray-500">Quản lý và thu học phí theo tháng</p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="input w-auto"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border">
          <div className="text-2xl font-bold text-gray-900">{summary.total || 0}</div>
          <div className="text-sm text-gray-500">Tổng HV</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-xl border">
          <div className="text-2xl font-bold text-gray-600">{summary.pending || 0}</div>
          <div className="text-sm text-gray-500">⚪ Chờ chốt</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-xl border">
          <div className="text-2xl font-bold text-yellow-600">{summary.ready || 0}</div>
          <div className="text-sm text-gray-500">🟡 Sẵn sàng</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border">
          <div className="text-2xl font-bold text-blue-600">{summary.confirmed || 0}</div>
          <div className="text-sm text-gray-500">🔵 Đã xác nhận</div>
        </div>
        <div className="bg-green-50 p-4 rounded-xl border">
          <div className="text-2xl font-bold text-green-600">{summary.paid || 0}</div>
          <div className="text-sm text-gray-500">🟢 Đã thu</div>
        </div>
      </div>

      {/* Finance Summary */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-6 rounded-xl text-white">
        <div className="grid grid-cols-3 gap-8">
          <div>
            <div className="text-3xl font-bold">{formatCurrency(summary.totalAmount)}</div>
            <div className="text-primary-100">Tổng cần thu</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{formatCurrency(summary.paidAmount)}</div>
            <div className="text-primary-100">Đã thu</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{formatCurrency((summary.totalAmount || 0) - (summary.paidAmount || 0))}</div>
            <div className="text-primary-100">Còn lại</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { value: '', label: 'Tất cả' },
          { value: 'pending', label: '⚪ Chờ chốt' },
          { value: 'ready', label: '🟡 Sẵn sàng' },
          { value: 'confirmed', label: '🔵 Đã xác nhận' },
          { value: 'paid', label: '🟢 Đã thu' },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === opt.value
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={fees}
        loading={loading}
        emptyMessage="Chưa có dữ liệu học phí cho tháng này"
      />

      {/* Pay Modal */}
      <Modal
        isOpen={payModal.open}
        onClose={() => setPayModal({ open: false, item: null })}
        title="Thu tiền học phí"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-lg font-semibold">{payModal.item?.student_name}</div>
            <div className="text-gray-600">Tháng: {payModal.item?.month}</div>
            <div className="text-2xl font-bold text-green-600 mt-2">
              {formatCurrency(payModal.item?.total_amount)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hình thức thanh toán
            </label>
            <div className="flex gap-4">
              {[
                { value: 'cash', label: 'Tiền mặt', icon: '💵' },
                { value: 'transfer', label: 'Chuyển khoản', icon: '🏦' },
              ].map(opt => (
                <label key={opt.value} className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="payment_method"
                    value={opt.value}
                    checked={payModal.paymentMethod === opt.value}
                    onChange={(e) => setPayModal({ ...payModal, paymentMethod: e.target.value })}
                    className="sr-only"
                  />
                  <div className={`p-4 rounded-xl border-2 text-center transition-all ${
                    payModal.paymentMethod === opt.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <span className="text-2xl">{opt.icon}</span>
                    <p className="mt-1 font-medium">{opt.label}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => setPayModal({ open: false, item: null })} className="btn-secondary">
              Hủy
            </button>
            <button onClick={handlePay} className="btn-success">
              Xác nhận thu tiền
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
