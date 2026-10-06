import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { CheckCircle2, UserPlus, UserRound } from "lucide-react";
import { bulkActionsService, studentsService } from "../services/api";
import DataTable from "../components/ui/DataTable";
import BulkActionBar from "../components/ui/BulkActionBar";
import Modal, { ConfirmModal } from "../components/ui/Modal";
import { useToast } from "../components/ui/Toast";
import { studentFormSchema } from "../utils/formValidation";
import {
  ListPanel,
  MetricGrid,
  OperationalPage,
  PageIntro,
} from "../components/ui/OperationalPage";

// VI: Trang danh sách học viên
export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const toast = useToast();

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    const response = await studentsService.getAll({ fields: "table", limit: 500 });
    if (response.success) {
      setStudents(response.data.students);
      const currentIds = new Set((response.data.students || []).map((student) => student.id));
      setSelectedStudentIds((ids) => ids.filter((id) => currentIds.has(id)));
    }
    setLoading(false);
  };

  const handleBulkAction = async (action) => {
    if (!selectedStudentIds.length) return;
    if (!window.confirm(`${action} ${selectedStudentIds.length} students?`)) return;

    const response = await bulkActionsService.execute({
      resource: "students",
      action,
      ids: selectedStudentIds,
    });
    if (!response.success) {
      toast.error(response.error?.message || "Bulk action failed");
      return;
    }

    const { requested, succeeded, failed } = response.data;
    if (failed) {
      toast.warning(`${succeeded}/${requested} processed; ${failed} failed`);
    } else {
      toast.success(`${succeeded}/${requested} processed`);
    }
    setSelectedStudentIds([]);
    loadStudents();
  };

  const handleDelete = async () => {
    if (selectedStudent) {
      const response = await studentsService.delete(selectedStudent.id);
      if (!response.success) {
        throw new Error(response.error?.message || "Không thể xóa học viên");
      }
      await loadStudents();
      toast.success("Đã chuyển học viên vào thùng rác");
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
      key: "full_name",
      title: "Họ và tên",
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-primary-700">
              {value?.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{value}</p>
            {row.student_code && <p className="text-xs text-gray-500">{row.student_code}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "class_names",
      title: "Lớp học",
      render: (value) =>
        value ? (
          <div className="flex flex-wrap gap-1">
            {value.split(", ").map((c, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
              >
                {c}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: "parent_name",
      title: "Phụ huynh",
      render: (value, row) =>
        value ? (
          <div>
            <p className="font-medium text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{row.parent_phone}</p>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: "date_of_birth",
      title: "Ngày sinh",
      render: (value) =>
        value ? new Date(value).toLocaleDateString("vi-VN") : "-",
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (value) => (
        <span className={value === "active" ? "badge-success" : "badge-error"}>
          {value === "active" ? "Đang học" : "Nghỉ học"}
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
              handleEdit(row);
            }}
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
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
              setSelectedStudent(row);
              setShowDeleteConfirm(true);
            }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
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

  const activeStudents = students.filter((s) => s.status === "active").length;
  const maleStudents = students.filter((s) => s.gender === "male").length;
  const femaleStudents = students.filter((s) => s.gender === "female").length;
  const initialLoading = loading && students.length === 0;
  const metricValue = (value) => (initialLoading ? "..." : value);

  const metrics = [
    {
      label: "Đang học",
      value: metricValue(activeStudents),
      helper: "Đang active",
      icon: CheckCircle2,
      tone: "emerald",
    },
    {
      label: "Nam",
      value: metricValue(maleStudents),
      helper: "Theo hồ sơ",
      icon: UserRound,
      tone: "sky",
    },
    {
      label: "Nữ",
      value: metricValue(femaleStudents),
      helper: "Theo hồ sơ",
      icon: UserRound,
      tone: "rose",
    },
  ];

  return (
    <OperationalPage>
      <PageIntro
        eyebrow="Vận hành học viên"
        title="Quản lý học viên"
        description="Theo dõi trạng thái học tập, phụ huynh liên hệ và phân bổ lớp bằng một giao diện ổn định cho thao tác hằng ngày."
        actions={
          <>
            <button onClick={handleAdd} className="btn-primary">
              <UserPlus size={18} aria-hidden="true" />
              Thêm học viên
            </button>
            <Link to="/classes" className="btn-secondary">
              Xem lớp học
            </Link>
          </>
        }
      />

      <MetricGrid metrics={metrics} />

      {/* Data Table */}
      <ListPanel
        title="Danh sách học viên"
        description="Nhấn vào một dòng để chỉnh sửa nhanh hồ sơ và lớp đăng ký."
      >
      <BulkActionBar
        count={selectedStudentIds.length}
        onClear={() => setSelectedStudentIds([])}
        actions={[
          {
            label: "Archive",
            className: "btn-secondary",
            onClick: () => handleBulkAction("archive"),
          },
          {
            label: "Delete",
            className: "btn-danger",
            onClick: () => handleBulkAction("delete"),
          },
        ]}
      />
      <DataTable
        columns={columns}
        data={students}
        loading={initialLoading}
        onRowClick={(row) => handleEdit(row)}
        selectable
        selectedIds={selectedStudentIds}
        onSelectionChange={setSelectedStudentIds}
        searchKeys={["full_name", "student_code", "parent_name", "parent_phone", "class_names", "status"]}
        emptyMessage="Chưa có học viên nào"
      />
      </ListPanel>

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
        title={editingStudent ? "Sửa học viên" : "Thêm học viên mới"}
        size="lg"
        confirmOnClose
        confirmCloseMessage="Ban co thay doi chua luu trong ho so hoc vien. Dong hop thoai se bo cac thay doi nay."
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
    </OperationalPage>
  );
}

// Student Form Component with Class Enrollment
function StudentForm({ student, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    full_name: student?.full_name || "",
    student_code: student?.student_code || "",
    date_of_birth: student?.date_of_birth || "",
    gender: student?.gender || "male",
    parent_id: student?.parent_id || "",
    parent_phone: student?.parent_phone || "",
    notes: student?.notes || "",
    status: student?.status || "active",
    enrollment_date:
      student?.enrollment_date || new Date().toISOString().split("T")[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [classes, setClasses] = useState([]);
  const [parents, setParents] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const {
    register,
    handleSubmit: handleValidatedSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      full_name: student?.full_name || "",
      date_of_birth: student?.date_of_birth || "",
      gender: student?.gender || "male",
      parent_id: student?.parent_id || "",
      notes: student?.notes || "",
      status: student?.status || "active",
    },
  });

  useEffect(() => {
    loadClasses();
    loadParents();
    if (student?.id) {
      loadEnrolledClasses();
    }
  }, [student]);

  const loadClasses = async () => {
    const { classesService } = await import("../services/api");
    const res = await classesService.getAll();
    if (res.success) {
      setClasses(res.data.classes || []);
    }
  };

  const loadParents = async () => {
    const { parentsService } = await import("../services/api");
    const res = await parentsService.getAll();
    if (res.success) {
      setParents(res.data.parents || []);
    }
  };

  const loadEnrolledClasses = async () => {
    const { studentsService } = await import("../services/api");
    const res = await studentsService.getById(student.id);
    if (res.success && res.data.classes) {
      setSelectedClasses(res.data.classes.map((c) => c.class_id || c.id));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setValue(name, value, { shouldDirty: true, shouldValidate: true });
  };

  const handleClassToggle = (classId) => {
    setSelectedClasses((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    );
  };

  const handleSubmit = async () => {
    setError("");

    if (!formData.full_name.trim()) {
      setError("Vui lòng nhập họ tên học viên");
      return;
    }

    setLoading(true);
    try {
      const response = student
        ? await studentsService.update(student.id, {
            ...formData,
            class_ids: selectedClasses,
          })
        : await studentsService.create({
            ...formData,
            class_ids: selectedClasses,
          });

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

  return (
    <form onSubmit={handleValidatedSubmit(handleSubmit)} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {Object.keys(errors).length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {Object.values(errors)[0]?.message}
        </div>
      )}

      <input type="hidden" {...register("full_name")} />
      <input type="hidden" {...register("date_of_birth")} />
      <input type="hidden" {...register("gender")} />
      <input type="hidden" {...register("parent_id")} />
      <input type="hidden" {...register("notes")} />
      <input type="hidden" {...register("status")} />

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

      {/* Parent Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          👨‍👩‍👧 Phụ huynh
        </label>
        <select
          name="parent_id"
          value={formData.parent_id}
          onChange={(e) => {
            const selectedParent = parents.find((p) => p.id === e.target.value);
            setValue("parent_id", e.target.value, {
              shouldDirty: true,
              shouldValidate: true,
            });
            setFormData((prev) => ({
              ...prev,
              parent_id: e.target.value,
              parent_phone: selectedParent?.phone || "",
            }));
          }}
          className="input"
        >
          <option value="">-- Chọn phụ huynh --</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name} - {p.phone}
            </option>
          ))}
        </select>
        {formData.parent_phone && (
          <p className="text-xs text-gray-500 mt-1">
            📞 {formData.parent_phone}
          </p>
        )}
      </div>

      {/* Class Enrollment Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          📚 Lớp học đăng ký
        </label>
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 bg-gray-50 rounded-lg">
          {classes.length === 0 ? (
            <p className="text-sm text-gray-500 col-span-2">
              Chưa có lớp học nào
            </p>
          ) : (
            classes.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 cursor-pointer p-2 hover:bg-white rounded-lg"
              >
                <input
                  type="checkbox"
                  checked={selectedClasses.includes(c.id)}
                  onChange={() => handleClassToggle(c.id)}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {c.class_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Intl.NumberFormat("vi-VN").format(c.fee_per_day)}đ/buổi
                  </p>
                </div>
              </label>
            ))
          )}
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

      <div className="sticky bottom-0 z-10 -mx-6 -mb-5 flex justify-end gap-3 border-t border-slate-200 bg-white/95 px-6 py-4 shadow-[0_-10px_24px_-18px_rgba(15,23,42,0.35)] backdrop-blur md:-mx-8 md:-mb-6 md:px-8">
        <button type="button" onClick={onCancel} data-modal-close className="btn-secondary">
          Hủy
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Đang lưu..." : student ? "Cập nhật" : "Thêm mới"}
        </button>
      </div>
    </form>
  );
}
