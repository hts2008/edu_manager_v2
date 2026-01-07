import { useState, useEffect } from 'react';
import { parentsService } from '../services/api';
import DataTable from '../components/ui/DataTable';
import Modal, { ConfirmModal } from '../components/ui/Modal';

// VI: Trang danh sách phụ huynh
export default function ParentsPage() {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedParent, setSelectedParent] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingParent, setEditingParent] = useState(null);

  useEffect(() => {
    loadParents();
  }, []);

  const loadParents = async () => {
    setLoading(true);
    const response = await parentsService.getAll();
    if (response.success) {
      setParents(response.data.parents);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (selectedParent) {
      await parentsService.delete(selectedParent.id);
      loadParents();
      setSelectedParent(null);
    }
  };

  const handleEdit = (parent) => {
    setEditingParent(parent);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingParent(null);
    setShowForm(true);
  };

  const columns = [
    {
      key: 'full_name',
      title: 'Họ và tên',
      render: (value) => (
        <span className="font-medium text-gray-900">{value}</span>
      ),
    },
    { key: 'phone', title: 'Số điện thoại' },
    { key: 'email', title: 'Email' },
    { key: 'address', title: 'Địa chỉ' },
    {
      key: 'actions',
      title: '',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={(e) => { 
              e.stopPropagation(); 
              setSelectedParent(row); 
              setShowDeleteConfirm(true); 
            }}
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
          <h1 className="text-2xl font-bold text-gray-900">Phụ huynh</h1>
          <p className="text-gray-500">Quản lý thông tin phụ huynh học viên</p>
        </div>
        <button onClick={handleAdd} className="btn-primary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm phụ huynh
        </button>
      </div>

      <DataTable
        columns={columns}
        data={parents}
        loading={loading}
        onRowClick={handleEdit}
        emptyMessage="Chưa có phụ huynh nào"
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Xác nhận xóa"
        message={`Bạn có chắc muốn xóa phụ huynh "${selectedParent?.full_name}"?`}
      />

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingParent ? 'Sửa phụ huynh' : 'Thêm phụ huynh mới'}
      >
        <ParentForm
          parent={editingParent}
          onSuccess={() => { setShowForm(false); loadParents(); }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}

function ParentForm({ parent, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    full_name: parent?.full_name || '',
    phone: parent?.phone || '',
    email: parent?.email || '',
    address: parent?.address || '',
    notes: parent?.notes || '',
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
      const response = parent
        ? await parentsService.update(parent.id, formData)
        : await parentsService.create(formData);

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
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          className="input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="input"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button type="button" onClick={onCancel} className="btn-secondary">Hủy</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Đang lưu...' : parent ? 'Cập nhật' : 'Thêm mới'}
        </button>
      </div>
    </form>
  );
}
