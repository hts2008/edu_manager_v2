import { useState, useEffect } from "react";
import { classesService, teachersService } from "../services/api";
import DataTable from "../components/ui/DataTable";
import Modal, { ConfirmModal } from "../components/ui/Modal";

// VI: Trang quản lý lớp học
export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [classesRes, teachersRes] = await Promise.all([
      classesService.getAll(),
      teachersService.getAll(),
    ]);
    if (classesRes.success) setClasses(classesRes.data.classes || []);
    if (teachersRes.success) setTeachers(teachersRes.data.teachers || []);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (selectedClass) {
      await classesService.delete(selectedClass.id);
      loadData();
      setSelectedClass(null);
    }
  };

  const columns = [
    {
      key: "class_name",
      title: "Tên lớp",
      render: (value, row) => (
        <div>
          <p className="font-medium text-gray-900">{value}</p>
          {row.notes && <p className="text-xs text-gray-500">{row.notes}</p>}
        </div>
      ),
    },
    { key: "teacher_name", title: "Giáo viên" },
    {
      key: "schedule_days",
      title: "Lịch học",
      render: (value) => {
        try {
          const days =
            typeof value === "string" ? JSON.parse(value || "[]") : value || [];
          const dayNames = {
            2: "T2",
            3: "T3",
            4: "T4",
            5: "T5",
            6: "T6",
            7: "T7",
            1: "CN",
          };
          return days.map((d) => dayNames[d]).join(", ") || "-";
        } catch {
          return "-";
        }
      },
    },
    {
      key: "schedule_time",
      title: "Giờ học",
      render: (_, row) => `${row.start_time || ""} - ${row.end_time || ""}`,
    },
    {
      key: "fee_per_day",
      title: "Học phí/buổi",
      render: (value) =>
        new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(value || 0),
    },
    {
      key: "student_count",
      title: "Học viên",
      render: (value) => <span className="badge-info">{value || 0}</span>,
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (value) => (
        <span className={value === "active" ? "badge-success" : "badge-error"}>
          {value === "active" ? "Đang mở" : "Đã đóng"}
        </span>
      ),
    },
    {
      key: "actions",
      title: "",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingClass(row);
              setShowForm(true);
            }}
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedClass(row);
              setShowDeleteConfirm(true);
            }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
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
          <h1 className="text-2xl font-bold text-gray-900">Lớp học</h1>
          <p className="text-gray-500">Quản lý các lớp học của trung tâm</p>
        </div>
        <button
          onClick={() => {
            setEditingClass(null);
            setShowForm(true);
          }}
          className="btn-primary"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Thêm lớp học
        </button>
      </div>

      <DataTable
        columns={columns}
        data={classes}
        loading={loading}
        onRowClick={(row) => {
          setEditingClass(row);
          setShowForm(true);
        }}
        emptyMessage="Chưa có lớp học nào"
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Xác nhận xóa"
        message={`Bạn có chắc muốn xóa lớp "${selectedClass?.class_name}"?`}
      />

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingClass ? "Sửa lớp học" : "Thêm lớp học mới"}
        size="lg"
      >
        <ClassForm
          classData={editingClass}
          teachers={teachers}
          onSuccess={() => {
            setShowForm(false);
            loadData();
          }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}

function ClassForm({ classData, teachers, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    class_name: classData?.class_name || "",
    teacher_id: classData?.teacher_id || "",
    schedule_days: (() => {
      try {
        if (!classData?.schedule_days) return [];
        return typeof classData.schedule_days === "string"
          ? JSON.parse(classData.schedule_days)
          : classData.schedule_days;
      } catch {
        return [];
      }
    })(),
    start_time: classData?.start_time || "18:00",
    end_time: classData?.end_time || "19:30",
    fee_per_day: classData?.fee_per_day || 50000,
    max_students: classData?.max_students || 20,
    status: classData?.status || "active",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const dayOptions = [
    { value: 2, label: "Thứ 2" },
    { value: 3, label: "Thứ 3" },
    { value: 4, label: "Thứ 4" },
    { value: 5, label: "Thứ 5" },
    { value: 6, label: "Thứ 6" },
    { value: 7, label: "Thứ 7" },
    { value: 1, label: "Chủ nhật" },
  ];

  const toggleDay = (day) => {
    setFormData((prev) => ({
      ...prev,
      schedule_days: prev.schedule_days.includes(day)
        ? prev.schedule_days.filter((d) => d !== day)
        : [...prev.schedule_days, day].sort(),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.class_name.trim()) {
      setError("Vui lòng nhập tên lớp");
      return;
    }
    if (formData.schedule_days.length === 0) {
      setError("Vui lòng chọn ít nhất 1 ngày học");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        schedule_days: formData.schedule_days,
      };
      const response = classData
        ? await classesService.update(classData.id, payload)
        : await classesService.create(payload);

      if (response.success) {
        onSuccess();
      } else {
        setError(response.error?.message || "Có lỗi xảy ra");
      }
    } catch (err) {
      setError("Không thể lưu dữ liệu");
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
            Tên lớp *
          </label>
          <input
            type="text"
            value={formData.class_name}
            onChange={(e) =>
              setFormData({ ...formData, class_name: e.target.value })
            }
            className="input"
            placeholder="VD: Lớp Starters A"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Giáo viên
          </label>
          <select
            value={formData.teacher_id}
            onChange={(e) =>
              setFormData({ ...formData, teacher_id: e.target.value })
            }
            className="input"
          >
            <option value="">-- Chọn giáo viên --</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Lịch học *
        </label>
        <div className="flex flex-wrap gap-2">
          {dayOptions.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                formData.schedule_days.includes(day.value)
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Giờ bắt đầu
          </label>
          <input
            type="time"
            value={formData.start_time}
            onChange={(e) =>
              setFormData({ ...formData, start_time: e.target.value })
            }
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Giờ kết thúc
          </label>
          <input
            type="time"
            value={formData.end_time}
            onChange={(e) =>
              setFormData({ ...formData, end_time: e.target.value })
            }
            className="input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Học phí/buổi (VND)
          </label>
          <input
            type="number"
            value={formData.fee_per_day}
            onChange={(e) =>
              setFormData({
                ...formData,
                fee_per_day: parseInt(e.target.value) || 0,
              })
            }
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Số học viên tối đa
          </label>
          <input
            type="number"
            value={formData.max_students}
            onChange={(e) =>
              setFormData({
                ...formData,
                max_students: parseInt(e.target.value) || 20,
              })
            }
            className="input"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Hủy
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Đang lưu..." : classData ? "Cập nhật" : "Thêm mới"}
        </button>
      </div>
    </form>
  );
}
