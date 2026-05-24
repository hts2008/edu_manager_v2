import { useState, useEffect } from "react";
import { motion as Motion } from "framer-motion";
import { teachersService } from "../services/api";
import DataTable from "../components/ui/DataTable";
import Modal, { ConfirmModal } from "../components/ui/Modal";

// VI: Trang quản lý giáo viên (Admin only) - Premium Design
export default function TeachersPage() {
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

  const formatMoney = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  };

  const columns = [
    {
      key: "full_name",
      title: "Họ và tên",
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <span className="text-sm font-bold text-white">
              {value?.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <span>📞</span> {row.phone || "Chưa có SĐT"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      title: "Email",
      render: (value) =>
        value ? (
          <a
            href={`mailto:${value}`}
            className="text-gray-600 hover:text-primary-600 text-sm"
          >
            {value}
          </a>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: "subject",
      title: "Môn dạy",
      render: (value) =>
        value ? (
          <span className="badge-info">{value}</span>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: "salary_type",
      title: "Hình thức lương",
      render: (value) => (
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              value === "hourly" ? "bg-blue-500" : "bg-green-500"
            }`}
          ></span>
          <span className="text-sm">
            {value === "hourly"
              ? "Theo giờ"
              : value === "fixed"
              ? "Cố định"
              : value}
          </span>
        </div>
      ),
    },
    {
      key: "salary_amount",
      title: "Mức lương",
      render: (value, row) => (
        <span className="font-semibold text-gray-900">
          {formatMoney(value)}
          {row.salary_type === "hourly" ? "/giờ" : "/tháng"}
        </span>
      ),
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (value) => (
        <span className={value === "active" ? "badge-success" : "badge-error"}>
          {value === "active" ? "✓ Đang dạy" : "✗ Nghỉ"}
        </span>
      ),
    },
    {
      key: "actions",
      title: "",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingTeacher(row);
              setShowForm(true);
            }}
            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200"
            title="Sửa"
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
              setSelectedTeacher(row);
              setShowDeleteConfirm(true);
            }}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
            title="Xóa"
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

  // Calculate stats
  const activeTeachers = teachers.filter((t) => t.status === "active").length;
  const hourlyTeachers = teachers.filter(
    (t) => t.salary_type === "hourly"
  ).length;
  const totalSalary = teachers.reduce(
    (sum, t) => sum + (t.salary_type === "fixed" ? t.salary_amount || 0 : 0),
    0
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <Motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
      {/* Header */}
      <Motion.section variants={itemVariants} className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-slate-950 via-indigo-950 to-sky-900 p-6 text-white shadow-2xl shadow-sky-900/20 md:p-8">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/30 blur-3xl" />
        <div className="absolute -bottom-24 left-16 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100 backdrop-blur">
              Human Resources
            </span>
            <div>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                Giáo viên
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 md:text-base">
                Quản lý thông tin đội ngũ giáo viên, phân bổ chuyên môn và giám sát các hình thức tính lương.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingTeacher(null);
              setShowForm(true);
            }}
            className="group inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950 shadow-xl shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:bg-cyan-50"
          >
            <svg className="mr-2 h-5 w-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Thêm giáo viên
          </button>
        </div>
      </Motion.section>

      {/* Stats Cards */}
      <Motion.section variants={containerVariants} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Tổng số GV",
            value: teachers.length,
            helper: "Toàn bộ nhân sự",
            icon: "👨‍🏫",
            tone: "from-sky-500 to-blue-600",
            bg: "from-sky-50 to-blue-50",
          },
          {
            label: "Đang dạy",
            value: activeTeachers,
            helper: "Trạng thái active",
            icon: "✅",
            tone: "from-emerald-500 to-teal-600",
            bg: "from-emerald-50 to-teal-50",
          },
          {
            label: "Theo giờ",
            value: hourlyTeachers,
            helper: "Tính lương theo tiết",
            icon: "⏱️",
            tone: "from-violet-500 to-indigo-600",
            bg: "from-violet-50 to-indigo-50",
          },
          {
            label: "Chi phí cố định/tháng",
            value: formatMoney(totalSalary),
            helper: "Chưa gồm lương theo giờ",
            icon: "💰",
            tone: "from-amber-500 to-orange-600",
            bg: "from-amber-50 to-orange-50",
          }
        ].map((card, idx) => (
          <Motion.div
            variants={itemVariants}
            key={idx}
            className={`group relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br ${card.bg} p-5 shadow-lg shadow-slate-200/70 transition-all hover:-translate-y-1 hover:shadow-2xl`}
          >
            <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${card.tone} opacity-20 blur-2xl transition-opacity group-hover:opacity-40`} />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">{card.label}</p>
                <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  {card.value}
                </p>
                <p className="mt-2 text-xs font-medium text-slate-500">{card.helper}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${card.tone} text-xl shadow-lg shadow-slate-300/60`}>
                {card.icon}
              </div>
            </div>
          </Motion.div>
        ))}
      </Motion.section>

      {/* Data Table */}
      <Motion.section variants={itemVariants} className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-4 shadow-xl shadow-slate-200/60 backdrop-blur md:p-5">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Danh sách nhân sự</h2>
            <p className="text-sm text-slate-500">Nhấn vào dòng để xem hoặc sửa thông tin.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {teachers.length} hồ sơ
          </span>
        </div>
        <DataTable
        columns={columns}
        data={teachers}
        loading={loading}
        onRowClick={(row) => {
          setEditingTeacher(row);
          setShowForm(true);
        }}
        emptyMessage="Chưa có giáo viên nào"
        />
      </Motion.section>

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
        title={editingTeacher ? "Sửa giáo viên" : "Thêm giáo viên mới"}
        size="lg"
      >
        <TeacherForm
          teacher={editingTeacher}
          onSuccess={() => {
            setShowForm(false);
            loadTeachers();
          }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </Motion.div>
  );
}

function TeacherForm({ teacher, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    full_name: teacher?.full_name || "",
    phone: teacher?.phone || "",
    email: teacher?.email || "",
    subject: teacher?.subject || "",
    salary_type: teacher?.salary_type || "hourly",
    salary_amount: teacher?.salary_amount || 100000,
    status: teacher?.status || "active",
    notes: teacher?.notes || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setError("Vui lòng nhập họ tên");
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
        setError(response.error?.message || "Có lỗi xảy ra");
      }
    } catch {
      setError("Không thể lưu dữ liệu");
    }
    setLoading(false);
  };

  const subjectOptions = [
    "Toán",
    "Lý",
    "Hóa",
    "Văn",
    "Anh Văn",
    "Tin học",
    "Sinh học",
    "Sử",
    "Địa",
    "Khác",
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Họ và tên *
        </label>
        <input
          type="text"
          value={formData.full_name}
          onChange={(e) =>
            setFormData({ ...formData, full_name: e.target.value })
          }
          className="input"
          placeholder="Nguyễn Văn A"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Số điện thoại
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            className="input"
            placeholder="0901234567"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="input"
            placeholder="email@example.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Môn dạy
        </label>
        <select
          value={formData.subject}
          onChange={(e) =>
            setFormData({ ...formData, subject: e.target.value })
          }
          className="input"
        >
          <option value="">-- Chọn môn --</option>
          {subjectOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="p-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl space-y-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          💰 Thông tin lương
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Hình thức
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, salary_type: "hourly" })
                }
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                  formData.salary_type === "hourly"
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-200"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300"
                }`}
              >
                ⏱️ Theo giờ
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, salary_type: "fixed" })
                }
                className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                  formData.salary_type === "fixed"
                    ? "bg-green-500 text-white shadow-lg shadow-green-200"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-green-300"
                }`}
              >
                📅 Cố định/tháng
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Mức lương (
              {formData.salary_type === "hourly" ? "VNĐ/giờ" : "VNĐ/tháng"})
            </label>
            <input
              type="number"
              value={formData.salary_amount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  salary_amount: parseInt(e.target.value) || 0,
                })
              }
              className="input"
              step="10000"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Trạng thái
        </label>
        <div className="flex gap-3">
          <label
            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl cursor-pointer transition-all ${
              formData.status === "active"
                ? "bg-emerald-50 border-2 border-emerald-500 text-emerald-700"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              value="active"
              checked={formData.status === "active"}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className="sr-only"
            />
            <span className="text-lg">✓</span>
            <span className="font-medium">Đang dạy</span>
          </label>
          <label
            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl cursor-pointer transition-all ${
              formData.status === "inactive"
                ? "bg-red-50 border-2 border-red-500 text-red-700"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              value="inactive"
              checked={formData.status === "inactive"}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className="sr-only"
            />
            <span className="text-lg">✗</span>
            <span className="font-medium">Nghỉ</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Ghi chú
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="input"
          rows={2}
          placeholder="Ghi chú thêm về giáo viên..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Hủy
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="spinner w-4 h-4"></span> Đang lưu...
            </span>
          ) : teacher ? (
            "Cập nhật"
          ) : (
            "Thêm mới"
          )}
        </button>
      </div>
    </form>
  );
}
