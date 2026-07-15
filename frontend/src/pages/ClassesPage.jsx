import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  GraduationCap,
  Plus,
  RefreshCw,
  School,
  Users,
} from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { classesService, studentsService, teachersService } from "../services/api";
import DataTable from "../components/ui/DataTable";
import Modal, { ConfirmModal } from "../components/ui/Modal";
import { useAsyncData } from "../hooks/useAsyncData";
import { classFormSchema } from "../utils/formValidation";
import { toDateKey } from "../utils/dateKeys";
import {
  ListPanel,
  MetricGrid,
  OperationalPage,
  PageIntro,
} from "../components/ui/OperationalPage";

// VI: Trang quản lý lớp học
export default function ClassesPage() {
  const [selectedClass, setSelectedClass] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [studentOptions, setStudentOptions] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [studentsError, setStudentsError] = useState("");
  const {
    data: pageData,
    loading,
    reload: reloadData,
  } = useAsyncData(async () => {
    const [classesRes, teachersRes] = await Promise.all([
      classesService.getAll(),
      teachersService.getAll(),
    ]);

    return {
      classes: classesRes.success ? classesRes.data.classes || [] : [],
      teachers: teachersRes.success ? teachersRes.data.teachers || [] : [],
    };
  }, "classes-index");

  const classes = pageData?.classes || [];
  const teachers = pageData?.teachers || [];

  useEffect(() => {
    if (!showForm || studentsLoaded) return undefined;

    let ignore = false;
    async function loadStudentOptions() {
      setStudentsLoading(true);
      setStudentsError("");
      try {
        const response = await studentsService.getAll({
          status: "active",
          fields: "options",
          limit: 500,
        });

        if (ignore) return;

        if (response.success) {
          setStudentOptions(response.data.students || []);
          setStudentsLoaded(true);
        } else {
          setStudentsError(
            response.error?.message || "Khong the tai danh sach hoc vien"
          );
        }
      } finally {
        if (!ignore) setStudentsLoading(false);
      }
    }

    loadStudentOptions();
    return () => {
      ignore = true;
    };
  }, [showForm, studentsLoaded]);

  const handleDelete = async () => {
    if (selectedClass) {
      await classesService.delete(selectedClass.id);
      await reloadData();
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
      title: "Học phí",
      render: (value, row) => (
        <span>
          {new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
          }).format(value || 0)}
          <span className="ml-1 text-xs text-gray-500">
            {row.billing_policy === "per_session" ? "/buổi" : "/tháng"}
          </span>
        </span>
      ),
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
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  const activeClasses = classes.filter((item) => item.status === "active").length;
  const totalStudents = classes.reduce(
    (sum, item) => sum + Number(item.student_count || 0),
    0
  );
  const totalWeeklySessions = classes.reduce((sum, item) => {
    const count = Number(item.sessions_per_week || 0);
    if (count > 0) return sum + count;
    try {
      const days =
        typeof item.schedule_days === "string"
          ? JSON.parse(item.schedule_days || "[]")
          : item.schedule_days || [];
      return sum + days.length;
    } catch {
      return sum;
    }
  }, 0);
  const averageFee = classes.length
    ? Math.round(
        classes.reduce((sum, item) => sum + Number(item.fee_per_day || 0), 0) /
          classes.length
      )
    : 0;

  const statCards = [
    {
      label: "Lớp đang mở",
      value: activeClasses,
      helper: `${classes.length} lớp trong hệ thống`,
      icon: "🏫",
      tone: "from-sky-500 to-blue-600",
      bg: "from-sky-50 to-blue-50",
    },
    {
      label: "Học viên đang học",
      value: totalStudents,
      helper: "Tổng lượt ghi danh active",
      icon: "👥",
      tone: "from-emerald-500 to-teal-600",
      bg: "from-emerald-50 to-teal-50",
    },
    {
      label: "Buổi/tuần",
      value: totalWeeklySessions,
      helper: "Từ lịch cố định hoặc số buổi",
      icon: "📅",
      tone: "from-violet-500 to-indigo-600",
      bg: "from-violet-50 to-indigo-50",
    },
    {
      label: "Học phí TB/tháng",
      value: new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      }).format(averageFee),
      helper: "Theo biểu phí hiện hành",
      icon: "💎",
      tone: "from-amber-500 to-orange-600",
      bg: "from-amber-50 to-orange-50",
    },
  ];

  const summaryMetrics = [
    {
      label: "Lớp đang mở",
      value: activeClasses,
      helper: `${classes.length} lớp`,
      icon: School,
      tone: "sky",
    },
    {
      label: "Học viên",
      value: totalStudents,
      helper: "Lượt ghi danh",
      icon: Users,
      tone: "emerald",
    },
    {
      label: "Buổi/tuần",
      value: totalWeeklySessions,
      helper: "Theo lịch hiện tại",
      icon: CalendarDays,
      tone: "indigo",
    },
  ];

  const metrics = [
    ...summaryMetrics,
    {
      label: "Học phí TB/tháng",
      value: new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      }).format(averageFee),
      helper: "Theo biểu phí lớp",
      icon: GraduationCap,
      tone: "amber",
    },
  ];

  return (
    <OperationalPage>
      <PageIntro
        eyebrow="Academic operations"
        title="Lớp học"
        description="Điều phối lớp, giáo viên, lịch học và biểu phí trong một không gian vận hành thống nhất cho trung tâm."
        status={`${classes.length} lớp`}
        metrics={summaryMetrics}
        actions={
          <button
            onClick={() => {
              setEditingClass(null);
              setShowForm(true);
            }}
            className="btn-primary"
          >
            <Plus size={18} aria-hidden="true" />
            Thêm lớp học
          </button>
        }
      />

      <MetricGrid metrics={metrics} />

      <section className="hidden">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/30 blur-3xl" />
        <div className="absolute -bottom-24 left-16 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100 backdrop-blur">
              Academic operations
            </span>
            <div>
              <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                Lớp học
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 md:text-base">
                Điều phối lớp, giáo viên, lịch học và biểu phí trong một bảng vận hành thống nhất cho trung tâm.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingClass(null);
              setShowForm(true);
            }}
            className="group inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950 shadow-xl shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:bg-cyan-50"
          >
            <svg className="mr-2 h-5 w-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Thêm lớp học
          </button>
        </div>
      </section>

      <section className="hidden">
        {statCards.map((card) => (
          <div
            key={card.label}
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
          </div>
        ))}
      </section>

      <ListPanel
        title="Danh sách lớp học"
        description="Nhấn vào một dòng để chỉnh sửa nhanh thông tin lớp."
        countLabel={`${classes.length} records`}
      >
        <div className="hidden">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Danh sách lớp học</h2>
            <p className="text-sm text-slate-500">Nhấn vào một dòng để chỉnh sửa nhanh thông tin lớp.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {classes.length} records
          </span>
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
      </ListPanel>

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
        confirmOnClose
        confirmCloseMessage="Ban co thay doi chua luu trong lop hoc. Dong hop thoai se bo cac thay doi nay."
      >
        <ClassForm
          classData={editingClass}
          teachers={teachers}
          students={studentOptions}
          studentsLoading={studentsLoading}
          studentsError={studentsError}
          onSuccess={async () => {
            setShowForm(false);
            await reloadData();
          }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </OperationalPage>
  );
}

function ClassForm({
  classData,
  teachers,
  students,
  studentsLoading,
  studentsError,
  onSuccess,
  onCancel,
}) {
  const defaultEnrollmentDate = toDateKey(new Date());
  const [formData, setFormData] = useState({
    class_name: classData?.class_name || "",
    teacher_id: classData?.teacher_id || "",
    // Flexible schedule options
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
    schedule_required: classData?.schedule_required ?? false,
    sessions_per_week: classData?.sessions_per_week || "",
    session_required: classData?.session_required ?? false,
    // Time and fee
    start_time: classData?.start_time || "18:00",
    end_time: classData?.end_time || "19:30",
    fee_per_day: classData?.fee_per_day || 50000,
    billing_policy: classData?.billing_policy || "monthly_prorated",
    max_students: classData?.max_students || 20,
    status: classData?.status || "active",
    enrollment_effective_date:
      classData?.enrollment_effective_date || defaultEnrollmentDate,
    adjust_existing_enrollment_start: false,
    enrollment_backdate_reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [currentRosterIds, setCurrentRosterIds] = useState([]);
  const [studentEnrollmentDates, setStudentEnrollmentDates] = useState({});
  const [currentRosterLoading, setCurrentRosterLoading] = useState(false);
  const [currentRosterLoaded, setCurrentRosterLoaded] = useState(
    !classData?.id,
  );
  const [currentRosterError, setCurrentRosterError] = useState("");
  const [rosterLoadAttempt, setRosterLoadAttempt] = useState(0);
  const {
    handleSubmit: handleValidatedSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      class_name: formData.class_name,
      teacher_id: formData.teacher_id,
      enrollment_effective_date: formData.enrollment_effective_date,
      adjust_existing_enrollment_start: false,
      enrollment_backdate_reason: "",
      start_time: formData.start_time,
      end_time: formData.end_time,
      fee_per_day: formData.fee_per_day,
      max_students: formData.max_students,
      status: formData.status,
    },
  });

  // Toggle states for enabling schedule options
  const [useWeekdays, setUseWeekdays] = useState(
    formData.schedule_days.length > 0
  );
  const [useSessionCount, setUseSessionCount] = useState(
    !!classData?.sessions_per_week
  );
  const requiresBackdateReason =
    formData.adjust_existing_enrollment_start ||
    formData.enrollment_effective_date < defaultEnrollmentDate;

  useEffect(() => {
    let ignore = false;
    async function loadCurrentStudents() {
      if (!classData?.id) {
        setSelectedStudentIds([]);
        setCurrentRosterIds([]);
        setStudentEnrollmentDates({});
        setCurrentRosterLoading(false);
        setCurrentRosterLoaded(true);
        setCurrentRosterError("");
        return;
      }

      setSelectedStudentIds([]);
      setCurrentRosterIds([]);
      setStudentEnrollmentDates({});
      setCurrentRosterLoading(true);
      setCurrentRosterLoaded(false);
      setCurrentRosterError("");

      try {
        const response = await classesService.getById(classData.id);
        if (ignore) return;

        if (!response.success) {
          setCurrentRosterError(
            response.error?.message || "Không thể tải học viên hiện có của lớp",
          );
          return;
        }

        const detailedClass = response.data?.class || response.data;
        const currentStudents = (detailedClass?.students || []).filter(
          (student) => student.enrollment_status === "active",
        );
        const currentIds = currentStudents.map((student) => student.id);
        const effectiveDate = defaultEnrollmentDate;

        setSelectedStudentIds(currentIds);
        setCurrentRosterIds(currentIds);
        setStudentEnrollmentDates(
          Object.fromEntries(
            currentStudents.map((student) => [
              student.id,
              student.enrollment_date || null,
            ]),
          ),
        );
        setFormData((current) => ({
          ...current,
          enrollment_effective_date: effectiveDate,
          adjust_existing_enrollment_start: false,
          enrollment_backdate_reason: "",
        }));
        setValue("enrollment_effective_date", effectiveDate, {
          shouldValidate: true,
        });
        setValue("adjust_existing_enrollment_start", false);
        setValue("enrollment_backdate_reason", "");
        setCurrentRosterLoaded(true);
      } catch (loadError) {
        if (!ignore) {
          setCurrentRosterError(
            loadError?.message || "Không thể tải học viên hiện có của lớp",
          );
        }
      } finally {
        if (!ignore) setCurrentRosterLoading(false);
      }
    }
    loadCurrentStudents();
    return () => {
      ignore = true;
    };
  }, [classData?.id, defaultEnrollmentDate, rosterLoadAttempt, setValue]);

  const filteredStudents = useMemo(() => {
    const keyword = studentSearch.trim().toLowerCase();
    if (!keyword) return students;
    return students.filter((student) =>
      [
        student.full_name,
        student.fullName,
        student.label,
        student.phone,
        student.parent_name,
        student.parent_phone,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }, [studentSearch, students]);

  const toggleStudent = (studentId) => {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  };

  const dayOptions = [
    { value: 2, label: "T2" },
    { value: 3, label: "T3" },
    { value: 4, label: "T4" },
    { value: 5, label: "T5" },
    { value: 6, label: "T6" },
    { value: 7, label: "T7" },
    { value: 1, label: "CN" },
  ];

  const updateField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setValue(name, value, { shouldDirty: true, shouldValidate: true });
  };

  const toggleDay = (day) => {
    setFormData((prev) => ({
      ...prev,
      schedule_days: prev.schedule_days.includes(day)
        ? prev.schedule_days.filter((d) => d !== day)
        : [...prev.schedule_days, day].sort(),
    }));
  };

  const handleSubmit = async () => {
    setError("");

    if (classData?.id && !currentRosterLoaded) {
      setError("Vui lòng tải xong học viên hiện có trước khi cập nhật lớp");
      return;
    }

    if (!formData.class_name.trim()) {
      setError("Vui lòng nhập tên lớp");
      return;
    }

    // Validate: at least one scheduling option should be enabled
    if (!useWeekdays && !useSessionCount) {
      setError(
        "Vui lòng chọn ít nhất một phương thức lịch học (theo ngày thứ hoặc theo số buổi/tuần)"
      );
      return;
    }

    if (useWeekdays && formData.schedule_days.length === 0) {
      setError("Vui lòng chọn ít nhất 1 ngày học");
      return;
    }

    if (
      useSessionCount &&
      (!formData.sessions_per_week || formData.sessions_per_week <= 0)
    ) {
      setError("Vui lòng nhập số buổi/tuần hợp lệ");
      return;
    }

    setLoading(true);
    try {
      const addedStudentIds = selectedStudentIds.filter(
        (studentId) => !currentRosterIds.includes(studentId),
      );
      const submittedStudentIds = classData
        ? formData.adjust_existing_enrollment_start
          ? [...new Set([...selectedStudentIds, ...currentRosterIds])]
          : addedStudentIds
        : selectedStudentIds;
      const fullPayload = {
        class_name: formData.class_name,
        teacher_id: formData.teacher_id,
        schedule_days: useWeekdays ? formData.schedule_days : null,
        schedule_required: useWeekdays ? formData.schedule_required : false,
        sessions_per_week: useSessionCount
          ? parseInt(formData.sessions_per_week)
          : null,
        session_required: useSessionCount ? formData.session_required : false,
        start_time: formData.start_time,
        end_time: formData.end_time,
        fee_per_day: formData.fee_per_day,
        billing_policy: formData.billing_policy,
        max_students: formData.max_students,
        status: formData.status,
        student_ids: submittedStudentIds,
        enrollment_effective_date: formData.enrollment_effective_date,
        adjust_existing_enrollment_start:
          Boolean(classData) && formData.adjust_existing_enrollment_start,
        enrollment_backdate_reason: requiresBackdateReason
          ? formData.enrollment_backdate_reason.trim()
          : null,
      };

      let payload = fullPayload;
      if (classData) {
        const numericFields = new Set([
          "sessions_per_week",
          "fee_per_day",
          "max_students",
        ]);
        const comparable = (field, value) => {
          if (field === "schedule_days") {
            return JSON.stringify([...(value || [])].sort());
          }
          if (numericFields.has(field)) {
            return value === null || value === "" || value === undefined
              ? null
              : Number(value);
          }
          return value ?? null;
        };
        const classFields = [
          "class_name",
          "teacher_id",
          "schedule_days",
          "schedule_required",
          "sessions_per_week",
          "session_required",
          "start_time",
          "end_time",
          "fee_per_day",
          "billing_policy",
          "max_students",
          "status",
        ];
        payload = Object.fromEntries(
          classFields
            .filter(
              (field) =>
                comparable(field, fullPayload[field]) !==
                comparable(field, classData[field]),
            )
            .map((field) => [field, fullPayload[field]]),
        );

        const hasRosterAdditions = addedStudentIds.length > 0;
        if (hasRosterAdditions || formData.adjust_existing_enrollment_start) {
          payload.student_ids = submittedStudentIds;
          payload.enrollment_effective_date =
            fullPayload.enrollment_effective_date;
          payload.adjust_existing_enrollment_start =
            fullPayload.adjust_existing_enrollment_start;
          payload.enrollment_backdate_reason =
            fullPayload.enrollment_backdate_reason;
        }
      }

      const response = classData
        ? await classesService.update(classData.id, payload)
        : await classesService.create(payload);

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

      {/* Basic Info */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tên lớp *
          </label>
          <input
            type="text"
            value={formData.class_name}
            onChange={(e) => updateField("class_name", e.target.value)}
            className="input"
            placeholder="VD: Anh Văn 10 - Tối T3,T5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Giáo viên
          </label>
          <select
            value={formData.teacher_id}
            onChange={(e) => updateField("teacher_id", e.target.value)}
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ngày ghi danh hiệu lực *
          </label>
          <input
            type="date"
            value={formData.enrollment_effective_date}
            max={defaultEnrollmentDate}
            onChange={(event) =>
              updateField("enrollment_effective_date", event.target.value)
            }
            className="input"
          />
          <p className="mt-1 text-xs text-slate-500">
            Áp dụng cho học viên mới được thêm vào lớp.
          </p>
        </div>
      </div>

      {(classData || requiresBackdateReason) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          {classData && (
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.adjust_existing_enrollment_start}
                disabled={!currentRosterLoaded || currentRosterIds.length === 0}
                onChange={(event) =>
                  updateField(
                    "adjust_existing_enrollment_start",
                    event.target.checked,
                  )
                }
                className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <span>
                <span className="block text-sm font-semibold text-amber-950">
                  Điều chỉnh ngày bắt đầu của học viên hiện có
                </span>
                <span className="mt-1 block text-xs leading-5 text-amber-800">
                  Khi bật, hệ thống sẽ lùi ngày bắt đầu của roster hiện tại về
                  ngày ghi danh hiệu lực ở trên. Không bật nếu chỉ thêm học viên mới.
                </span>
              </span>
            </label>
          )}
          {requiresBackdateReason && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-amber-950 mb-1">
                Lý do ghi danh hồi tố *
              </label>
              <textarea
                rows={2}
                value={formData.enrollment_backdate_reason}
                onChange={(event) =>
                  updateField("enrollment_backdate_reason", event.target.value)
                }
                className="input"
                placeholder="VD: Bổ sung ngày ghi danh thực tế theo hồ sơ nhập học"
              />
            </div>
          )}
        </div>
      )}

      {/* Schedule Options Section */}
      <div className="border border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50">
        <h3 className="font-medium text-gray-900 flex items-center gap-2">
          📅 Lịch học
          <span className="text-xs text-gray-500 font-normal">
            (chọn ít nhất 1 phương thức)
          </span>
        </h3>

        {/* Option 1: By Weekday */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useWeekdays}
              onChange={(e) => setUseWeekdays(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Theo ngày thứ trong tuần
            </span>
          </label>

          {useWeekdays && (
            <div className="ml-6 space-y-2">
              <div className="flex flex-wrap gap-2">
                {dayOptions.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      formData.schedule_days.includes(day.value)
                        ? "bg-primary-600 text-white"
                        : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={formData.schedule_required}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      schedule_required: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                />
                Bắt buộc đúng các ngày đã chọn
              </label>
            </div>
          )}
        </div>

        {/* Option 2: By Session Count */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useSessionCount}
              onChange={(e) => setUseSessionCount(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Theo số buổi trong tuần
            </span>
          </label>

          {useSessionCount && (
            <div className="ml-6 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={formData.sessions_per_week}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sessions_per_week: e.target.value,
                    })
                  }
                  className="input w-20"
                  placeholder="2"
                />
                <span className="text-sm text-gray-600">buổi/tuần</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={formData.session_required}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      session_required: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                />
                Bắt buộc đúng số buổi (vượt quá cần ghi lý do học bù)
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Time Settings */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Giờ bắt đầu
          </label>
          <input
            type="time"
            value={formData.start_time}
            onChange={(e) => updateField("start_time", e.target.value)}
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
            onChange={(e) => updateField("end_time", e.target.value)}
            className="input"
          />
        </div>
      </div>

      {/* Fee and Capacity */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {formData.billing_policy === "monthly_prorated" ? "Học phí tháng" : "Học phí mỗi buổi"} (VND)
          </label>
          <input
            type="number"
            value={formData.fee_per_day}
            onChange={(e) => updateField("fee_per_day", parseInt(e.target.value) || 0)}
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chính sách học phí
          </label>
          <select
            value={formData.billing_policy}
            onChange={(e) => updateField("billing_policy", e.target.value)}
            className="input"
          >
            <option value="monthly_prorated">Gói tháng, khấu trừ theo session</option>
            <option value="per_session">Tính theo từng buổi</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Số học viên tối đa
          </label>
          <input
            type="number"
            value={formData.max_students}
            onChange={(e) => updateField("max_students", parseInt(e.target.value) || 20)}
            className="input"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Thêm học viên vào lớp</h3>
            <p className="text-sm text-slate-500">
              Chọn nhiều học viên để ghi danh cùng lúc. Hệ thống chỉ thêm, không tự gỡ học viên cũ.
            </p>
          </div>
          <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
            {selectedStudentIds.length} đã chọn
          </span>
        </div>
        {classData && currentRosterLoading && (
          <div className="mb-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Đang tải roster hiện tại và ngày ghi danh...
          </div>
        )}
        {classData && currentRosterError && !currentRosterLoading && (
          <div
            className="mb-3 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
            role="alert"
          >
            <span>{currentRosterError}</span>
            <button
              type="button"
              onClick={() => setRosterLoadAttempt((attempt) => attempt + 1)}
              className="btn-secondary inline-flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} aria-hidden="true" />
              Thử lại
            </button>
          </div>
        )}
        {classData && currentRosterLoaded && !currentRosterError && (
          <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Đã tải {currentRosterIds.length} học viên hiện có. Ngày ghi danh được
            giữ nguyên nếu không bật điều chỉnh ở trên.
          </div>
        )}
        <input
          type="search"
          value={studentSearch}
          onChange={(event) => setStudentSearch(event.target.value)}
          className="input mb-3"
          placeholder="Tìm theo tên, SĐT học viên hoặc phụ huynh..."
        />
        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
          {studentsLoading && (
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
              Dang tai danh sach hoc vien...
            </div>
          )}
          {studentsError && !studentsLoading && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-center text-sm text-red-600">
              {studentsError}
            </div>
          )}
          {filteredStudents.map((student) => {
            const checked = selectedStudentIds.includes(student.id);
            const enrollmentDate =
              studentEnrollmentDates[student.id] || student.enrollment_date;
            const studentName =
              student.full_name || student.fullName || student.label || "";
            return (
              <label
                key={student.id}
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${
                  checked
                    ? "border-primary-300 bg-primary-50"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <span>
                  <span className="block text-sm font-semibold text-slate-900">
                    {studentName}
                  </span>
                  <span className="text-xs text-slate-500">
                    {student.parent_name || "Chưa có phụ huynh"} ·{" "}
                    {student.parent_phone || student.phone || "Chưa có SĐT"}
                  </span>
                  {enrollmentDate && (
                    <span className="mt-1 block text-xs font-medium text-primary-700">
                      Ghi danh từ {enrollmentDate}
                    </span>
                  )}
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleStudent(student.id)}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
              </label>
            );
          })}
          {!studentsLoading && !studentsError && !filteredStudents.length && (
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
              Không tìm thấy học viên phù hợp.
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="sticky bottom-0 z-10 -mx-6 -mb-5 flex justify-end gap-3 border-t border-slate-200 bg-white/95 px-6 py-4 shadow-[0_-10px_24px_-18px_rgba(15,23,42,0.35)] backdrop-blur md:-mx-8 md:-mb-6 md:px-8">
        <button type="button" onClick={onCancel} data-modal-close className="btn-secondary">
          Hủy
        </button>
        <button
          type="submit"
          disabled={loading || (Boolean(classData?.id) && !currentRosterLoaded)}
          className="btn-primary"
        >
          {loading ? "Đang lưu..." : classData ? "Cập nhật" : "Thêm mới"}
        </button>
      </div>
    </form>
  );
}
