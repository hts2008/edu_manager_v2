import { useState, useEffect } from 'react';
import { teachersService } from '../services/api';
import DataTable from '../components/ui/DataTable';
import Modal, { ConfirmModal } from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';

// VI: Trang quản lý giáo viên (Admin only)
export default function TeachersPage() {
  const { isAdmin } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    setLoading(true);
    const response = await teachersService.getAll();
    if (response.success) {
      setTeachers(response.data.teachers);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (selectedTeacher) {
      await teachersService.delete(selectedTeacher.id);
      loadTeachers();
      setSelectedTeacher(null);
    }
  };

  const columns = [
    {
      key: 'full_name',
      title: 'Họ và tên',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-purple-700">{value?.charAt(0)}</span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{row.phone}</p>
          </div>
        </div>
      ),
    },
    { key: 'email', title: 'Email' },
    {
      key: 'salary_type',
      title: 'Hình thức lương',
      render: (value) => (
        <span className="badge-info">
          {value === 'hourly' ? 'Theo giờ' : value === 'fixed' ? 'Cố định' : value}
        </span>
      ),
    },
    {
      key: 'salary_amount',
      title: 'Mức lương',
      render: (value, row) => {
        const formatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
        return row.salary_type === 'hourly' ? `${formatted}/giờ` : `${formatted}/tháng`;
      },
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (value) => (
        <span className={value === 'active' ? 'badge-success' : 'badge-error'}>
          {value === 'active' ? 'Đang dạy' : 'Nghỉ'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setEditingTeacher(row); setShowForm(true); }}
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedTeacher(row); setShowDeleteConfirm(true); }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Giáo viên</h1>
          <p className="text-gray-500">Quản lý thông tin giáo viên</p>
        </div>
        <button onClick={() => { setEditingTeacher(null); setShowForm(true); }} className="btn-primary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm giáo viên
        </button>
      </div>

      <DataTable
        columns={columns}
        data={teachers}
        loading={loading}
        onRowClick={(row) => { setEditingTeacher(row); setShowForm(true); }}
        emptyMessage="Chưa có giáo viên nào"
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Xác nhận xóa"
        message={`Bạn có chắc muốn xóa giáo viên "${selectedTeacher?.full_name}"?`}
      />

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingTeacher ? 'Sửa giáo viên' : 'Thêm giáo viên mới'}
      >
        <TeacherForm
          teacher={editingTeacher}
          onSuccess={() => { setShowForm(false); loadTeachers(); }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}

function TeacherForm({ teacher, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    full_name: teacher?.full_name || '',
    phone: teacher?.phone || '',
    email: teacher?.email || '',
    salary_type: teacher?.salary_type || 'hourly',
    salary_amount: teacher?.salary_amount || 100000,
    status: teacher?.status || 'active',
    notes: teacher?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setError('Vui lòng nhập họ tên');
      return;
    }

    setLoading(true);
    try {
      const response = teacher
        ? await teachersService.update(teacher.id, formData)
        : await teachersService.create(formData);

      if (response.success) {
        onSuccess();
      } else {
        setError(response.error?.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      setError('Không thể lưu dữ liệu');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên *</label>
        <input
          type="text"
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          className="input"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hình thức lương</label>
          <select
            value={formData.salary_type}
            onChange={(e) => setFormData({ ...formData, salary_type: e.target.value })}
            className="input"
          >
            <option value="hourly">Theo giờ</option>
            <option value="fixed">Cố định/tháng</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mức lương ({formData.salary_type === 'hourly' ? '/giờ' : '/tháng'})
          </label>
          <input
            type="number"
            value={formData.salary_amount}
            onChange={(e) => setFormData({ ...formData, salary_amount: parseInt(e.target.value) || 0 })}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="input"
        >
          <option value="active">Đang dạy</option>
          <option value="inactive">Nghỉ</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="input"
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button type="button" onClick={onCancel} className="btn-secondary">Hủy</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Đang lưu...' : teacher ? 'Cập nhật' : 'Thêm mới'}
        </button>
      </div>
    </form>
  );
}
