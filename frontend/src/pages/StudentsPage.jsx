import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { studentsService } from '../services/api';
import DataTable from '../components/ui/DataTable';
import Modal, { ConfirmModal } from '../components/ui/Modal';

// VI: Trang danh sách học viên
export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    const response = await studentsService.getAll();
    if (response.success) {
      setStudents(response.data.students);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (selectedStudent) {
      await studentsService.delete(selectedStudent.id);
      loadStudents();
      setSelectedStudent(null);
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingStudent(null);
    setShowForm(true);
  };

  const columns = [
    {
      key: 'full_name',
      title: 'Họ và tên',
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-primary-700">
              {value?.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{row.student_code}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'date_of_birth',
      title: 'Ngày sinh',
      render: (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '-',
    },
    {
      key: 'gender',
      title: 'Giới tính',
      render: (value) => value === 'male' ? 'Nam' : value === 'female' ? 'Nữ' : '-',
    },
    {
      key: 'parent_phone',
      title: 'SĐT Phụ huynh',
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (value) => (
        <span className={value === 'active' ? 'badge-success' : 'badge-error'}>
          {value === 'active' ? 'Đang học' : 'Nghỉ học'}
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
            onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
            title="Sửa"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={(e) => { 
              e.stopPropagation(); 
              setSelectedStudent(row); 
              setShowDeleteConfirm(true); 
            }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
            title="Xóa"
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Học viên</h1>
          <p className="text-gray-500">Quản lý danh sách học viên của trung tâm</p>
        </div>
        <button onClick={handleAdd} className="btn-primary">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm học viên
        </button>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={students}
        loading={loading}
        onRowClick={(row) => handleEdit(row)}
        emptyMessage="Chưa có học viên nào"
      />

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Xác nhận xóa"
        message={`Bạn có chắc muốn xóa học viên "${selectedStudent?.full_name}"?`}
        confirmText="Xóa"
      />

      {/* Student Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingStudent ? 'Sửa học viên' : 'Thêm học viên mới'}
        size="lg"
      >
        <StudentForm
          student={editingStudent}
          onSuccess={() => {
            setShowForm(false);
            loadStudents();
          }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}

// Student Form Component with Class Enrollment
function StudentForm({ student, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    full_name: student?.full_name || '',
    student_code: student?.student_code || '',
    date_of_birth: student?.date_of_birth || '',
    gender: student?.gender || 'male',
    parent_id: student?.parent_id || '',
    parent_phone: student?.parent_phone || '',
    notes: student?.notes || '',
    status: student?.status || 'active',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [classes, setClasses] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [enrolledClasses, setEnrolledClasses] = useState([]);

  useEffect(() => {
    loadClasses();
    if (student?.id) {
      loadEnrolledClasses();
    }
  }, [student]);

  const loadClasses = async () => {
    const { classesService } = await import('../services/api');
    const res = await classesService.getAll();
    if (res.success) {
      setClasses(res.data.classes || []);
    }
  };

  const loadEnrolledClasses = async () => {
    const { studentsService } = await import('../services/api');
    const res = await studentsService.getById(student.id);
    if (res.success && res.data.classes) {
      setEnrolledClasses(res.data.classes);
      setSelectedClasses(res.data.classes.map(c => c.class_id || c.id));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClassToggle = (classId) => {
    setSelectedClasses(prev => 
      prev.includes(classId) 
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.full_name.trim()) {
      setError('Vui lòng nhập họ tên học viên');
      return;
    }

    setLoading(true);
    try {
      const response = student
        ? await studentsService.update(student.id, { ...formData, class_ids: selectedClasses })
        : await studentsService.create({ ...formData, class_ids: selectedClasses });

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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Họ và tên *
          </label>
          <input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            className="input"
            placeholder="Nguyễn Văn A"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mã học viên
          </label>
          <input
            type="text"
            name="student_code"
            value={formData.student_code}
            onChange={handleChange}
            className="input"
            placeholder="Tự động tạo nếu bỏ trống"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ngày sinh
          </label>
          <input
            type="date"
            name="date_of_birth"
            value={formData.date_of_birth}
            onChange={handleChange}
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Giới tính
          </label>
          <select
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="input"
          >
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          SĐT Phụ huynh
        </label>
        <input
          type="tel"
          name="parent_phone"
          value={formData.parent_phone}
          onChange={handleChange}
          className="input"
          placeholder="0912345678"
        />
      </div>

      {/* Class Enrollment Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          📚 Lớp học đăng ký
        </label>
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 bg-gray-50 rounded-lg">
          {classes.length === 0 ? (
            <p className="text-sm text-gray-500 col-span-2">Chưa có lớp học nào</p>
          ) : classes.map(c => (
            <label key={c.id} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-white rounded-lg">
              <input
                type="checkbox"
                checked={selectedClasses.includes(c.id)}
                onChange={() => handleClassToggle(c.id)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{c.class_name}</p>
                <p className="text-xs text-gray-500">
                  {new Intl.NumberFormat('vi-VN').format(c.fee_per_day)}đ/buổi
                </p>
              </div>
            </label>
          ))}
        </div>
        {selectedClasses.length > 0 && (
          <p className="text-xs text-green-600 mt-1">
            ✓ Đã chọn {selectedClasses.length} lớp
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ghi chú
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          className="input"
          rows={2}
          placeholder="Ghi chú thêm về học viên..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Trạng thái
        </label>
        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
          className="input"
        >
          <option value="active">Đang học</option>
          <option value="inactive">Nghỉ học</option>
        </select>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Hủy
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Đang lưu...' : student ? 'Cập nhật' : 'Thêm mới'}
        </button>
      </div>
    </form>
  );
}

