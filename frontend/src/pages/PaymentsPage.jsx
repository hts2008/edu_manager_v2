import { useState, useEffect } from 'react';
import { paymentsService, teachersService } from '../services/api';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';

// VI: Trang quản lý phiếu chi
export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    const response = await paymentsService.getAll();
    if (response.success) {
      setPayments(response.data.payments || []);
    }
    setLoading(false);
  };

  const categoryLabels = {
    salary: 'Lương giáo viên',
    utility: 'Điện/Nước',
    office: 'Văn phòng phẩm',
    other: 'Khác',
  };

  const columns = [
    {
      key: 'id',
      title: 'Mã phiếu',
      render: (value) => (
        <span className="font-mono text-sm text-orange-600">{value}</span>
      ),
    },
    {
      key: 'category',
      title: 'Loại chi',
      render: (value) => (
        <span className="badge-warning">{categoryLabels[value] || value}</span>
      ),
    },
    {
      key: 'recipient_name',
      title: 'Người nhận',
      render: (value, row) => (
        <div>
          <p className="font-medium text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{row.recipient_phone}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      title: 'Số tiền',
      render: (value) => (
        <span className="font-semibold text-red-600">
          -{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0)}
        </span>
      ),
    },
    {
      key: 'notes',
      title: 'Ghi chú',
      render: (value) => (
        <span className="text-gray-500 text-sm">{value || '-'}</span>
      ),
    },
    {
      key: 'created_at',
      title: 'Ngày tạo',
      render: (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '-',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chi tiền</h1>
          <p className="text-gray-500">Quản lý các khoản chi tiêu</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-warning">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tạo phiếu chi
        </button>
      </div>

      <DataTable
        columns={columns}
        data={payments}
        loading={loading}
        emptyMessage="Chưa có phiếu chi nào"
      />

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Tạo phiếu chi mới"
        size="lg"
      >
        <PaymentForm
          onSuccess={() => { setShowForm(false); loadPayments(); }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}

function PaymentForm({ onSuccess, onCancel }) {
  const [teachers, setTeachers] = useState([]);
  const [formData, setFormData] = useState({
    category: 'other',
    amount: 0,
    recipient_name: '',
    recipient_phone: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    const response = await teachersService.getAll();
    if (response.success) {
      setTeachers(response.data.teachers || []);
    }
  };

  const handleCategoryChange = (category) => {
    setFormData(prev => ({ ...prev, category }));
  };

  const handleTeacherSelect = (teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (teacher) {
      setFormData(prev => ({
        ...prev,
        recipient_name: teacher.full_name,
        recipient_phone: teacher.phone,
        amount: teacher.salary_amount || 0,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.recipient_name) {
      setError('Vui lòng nhập tên người nhận');
      return;
    }
    if (!formData.amount || formData.amount <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    setLoading(true);
    setError('');

    const response = await paymentsService.create({
      ...formData,
      template_id: 'TPL_DEFAULT_PAYMENT',
    });

    if (response.success) {
      onSuccess();
    } else {
      setError(response.error?.message || 'Không thể tạo phiếu chi');
    }
    setLoading(false);
  };

  const categories = [
    { value: 'salary', label: 'Lương GV', icon: '👨‍🏫' },
    { value: 'utility', label: 'Điện/Nước', icon: '💡' },
    { value: 'office', label: 'VP phẩm', icon: '📦' },
    { value: 'other', label: 'Khác', icon: '📝' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {/* Category Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Loại chi</label>
        <div className="grid grid-cols-4 gap-2">
          {categories.map(cat => (
            <button
              key={cat.value}
              type="button"
              onClick={() => handleCategoryChange(cat.value)}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                formData.category === cat.value
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-xl">{cat.icon}</span>
              <p className="mt-1 text-sm font-medium">{cat.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Teacher Select for Salary */}
      {formData.category === 'salary' && teachers.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chọn nhanh giáo viên</label>
          <select
            onChange={(e) => handleTeacherSelect(e.target.value)}
            className="input"
          >
            <option value="">-- Chọn giáo viên --</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>{t.full_name} - {t.salary_amount?.toLocaleString()}đ</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Người nhận *</label>
          <input
            type="text"
            value={formData.recipient_name}
            onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
            className="input"
            placeholder="Tên người nhận tiền"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SĐT</label>
          <input
            type="tel"
            value={formData.recipient_phone}
            onChange={(e) => setFormData({ ...formData, recipient_phone: e.target.value })}
            className="input"
            placeholder="Số điện thoại"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền (VND) *</label>
        <input
          type="number"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })}
          className="input text-lg font-semibold"
          min="0"
        />
        <p className="mt-1 text-sm text-gray-500">
          = {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(formData.amount || 0)}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="input"
          rows={2}
          placeholder="Lý do chi tiền..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button type="button" onClick={onCancel} className="btn-secondary">Hủy</button>
        <button type="submit" disabled={loading} className="btn-warning">
          {loading ? 'Đang tạo...' : 'Tạo phiếu chi'}
        </button>
      </div>
    </form>
  );
}
