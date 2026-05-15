import { useState, useEffect } from 'react';
import { studentsService, receiptsService, attendanceService } from '../services/api';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';

// VI: Trang thu tiền học phí
export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    setLoading(true);
    const response = await receiptsService.getAll();
    if (response.success) {
      setReceipts(response.data.receipts || []);
    }
    setLoading(false);
  };

  const handlePrintPdf = (receiptId) => {
    const token = localStorage.getItem('token');
    fetch(`/api/receipts/${receiptId}/pdf`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      })
      .catch(() => {
        toast.error('Không thể tạo PDF. Vui lòng thử lại.');
      });
  };

  const handleSuccess = (receiptId) => {
    setShowForm(false);
    loadReceipts();
    toast.success(`Đã tạo phiếu thu ${receiptId} thành công!`);
  };

  const columns = [
    {
      key: 'id',
      title: 'Mã phiếu',
      render: (value) => (
        <span className="font-mono text-sm text-primary-600">{value}</span>
      ),
    },
    {
      key: 'student_name',
      title: 'Học viên',
      render: (value) => (
        <span className="font-medium text-gray-900">{value}</span>
      ),
    },
    { 
      key: 'month', 
      title: 'Tháng',
      render: (value) => value || '-'
    },
    {
      key: 'days_count',
      title: 'Số buổi',
      render: (value) => `${value || 0} buổi`,
    },
    {
      key: 'amount',
      title: 'Số tiền',
      render: (value) => (
        <span className="font-semibold text-green-600">
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0)}
        </span>
      ),
    },
    {
      key: 'payment_method',
      title: 'Hình thức',
      render: (value) => (
        <span className={value === 'cash' ? 'badge-success' : 'badge-info'}>
          {value === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}
        </span>
      ),
    },
    {
      key: 'created_at',
      title: 'Ngày tạo',
      render: (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '-',
    },
    {
      key: 'actions',
      title: '',
      render: (_, row) => (
        <button
          onClick={() => handlePrintPdf(row.id)}
          className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
          title="In PDF"
        >
          🖨️
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thu tiền</h1>
          <p className="text-gray-500">Quản lý phiếu thu học phí</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tạo phiếu thu
        </button>
      </div>

      <DataTable
        columns={columns}
        data={receipts}
        loading={loading}
        emptyMessage="Chưa có phiếu thu nào"
      />

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Tạo phiếu thu mới"
        size="lg"
      >
        <ReceiptForm
          onSuccess={handleSuccess}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}

function ReceiptForm({ onSuccess, onCancel }) {
  const [students, setStudents] = useState([]);
  const [formData, setFormData] = useState({
    student_id: '',
    month: new Date().toISOString().slice(0, 7),
    days_count: 0,
    fee_per_day: 0,
    amount: 0,
    payment_method: 'cash',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const studentsRes = await studentsService.getAll();
    if (studentsRes.success) setStudents(studentsRes.data.students || []);
  };

  const handleStudentChange = async (studentId) => {
    setFormData(prev => ({ ...prev, student_id: studentId }));
    
    if (studentId && formData.month) {
      setCalculating(true);
      const response = await attendanceService.calculateFee(studentId, formData.month);
      if (response.success && response.data) {
        const { days_count, fee_per_day, total_fee } = response.data;
        setFormData(prev => ({
          ...prev,
          days_count: days_count || 0,
          fee_per_day: fee_per_day || 0,
          amount: total_fee || 0,
        }));
      }
      setCalculating(false);
    }
  };

  const handleMonthChange = async (month) => {
    setFormData(prev => ({ ...prev, month }));
    
    if (formData.student_id && month) {
      setCalculating(true);
      const response = await attendanceService.calculateFee(formData.student_id, month);
      if (response.success && response.data) {
        const { days_count, fee_per_day, total_fee } = response.data;
        setFormData(prev => ({
          ...prev,
          days_count: days_count || 0,
          fee_per_day: fee_per_day || 0,
          amount: total_fee || 0,
        }));
      }
      setCalculating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.student_id) {
      setError('Vui lòng chọn học viên');
      return;
    }

    setLoading(true);
    setError('');

    const response = await receiptsService.create({
      ...formData,
      template_id: 'TPL_DEFAULT_RECEIPT',
    });

    if (response.success) {
      onSuccess(response.data?.id || '');
    } else {
      setError(response.error?.message || 'Không thể tạo phiếu thu');
    }
    setLoading(false);
  };

  const formatCurrency = (value) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Học viên *</label>
          <select
            value={formData.student_id}
            onChange={(e) => handleStudentChange(e.target.value)}
            className="input"
          >
            <option value="">-- Chọn học viên --</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tháng</label>
          <input
            type="month"
            value={formData.month}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="input"
          />
        </div>
      </div>

      {calculating ? (
        <div className="p-4 bg-gray-50 rounded-xl text-center text-gray-500">
          <div className="spinner w-5 h-5 mx-auto mb-2"></div>
          Đang tính toán học phí...
        </div>
      ) : formData.student_id && (
        <div className="p-4 bg-primary-50 rounded-xl space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Số buổi học:</span>
            <span className="font-medium">{formData.days_count} buổi</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Học phí/buổi:</span>
            <span className="font-medium">{formatCurrency(formData.fee_per_day)}</span>
          </div>
          <div className="flex justify-between text-lg border-t border-primary-200 pt-2 mt-2">
            <span className="font-semibold text-gray-900">Tổng cộng:</span>
            <span className="font-bold text-primary-600">{formatCurrency(formData.amount)}</span>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Hình thức thanh toán</label>
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
                checked={formData.payment_method === opt.value}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="sr-only"
              />
              <div className={`p-4 rounded-xl border-2 text-center transition-all ${
                formData.payment_method === opt.value
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="input"
          rows={2}
          placeholder="Ghi chú thêm..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button type="button" onClick={onCancel} className="btn-secondary">Hủy</button>
        <button type="submit" disabled={loading || calculating} className="btn-primary">
          {loading ? 'Đang tạo...' : 'Tạo phiếu thu'}
        </button>
      </div>
    </form>
  );
}
