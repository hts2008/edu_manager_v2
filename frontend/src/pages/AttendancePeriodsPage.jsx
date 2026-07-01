import { useState, useEffect, useRef } from "react";
import { classesService, attendancePeriodsService } from "../services/api";
import DataTable from "../components/ui/DataTable";
import SelectField from "../components/ui/SelectField";
import { useToast } from "../components/ui/Toast";
import { useAuth } from "../context/AuthContext";
import AttendanceReviewModal from "../components/AttendanceReviewModal";

// VI: Quản lý chốt điểm danh - Xem và duyệt các kỳ điểm danh

const PERIOD_STATUS = {
  open: { label: "Đang mở", color: "bg-green-100 text-green-700", icon: "🟢" },
  submitted: {
    label: "Chờ duyệt",
    color: "bg-yellow-100 text-yellow-700",
    icon: "🟡",
  },
  approved: {
    label: "Đã duyệt",
    color: "bg-blue-100 text-blue-700",
    icon: "🔵",
  },
  locked: { label: "Đã chốt", color: "bg-gray-100 text-gray-800", icon: "🔒" },
};

export default function AttendancePeriodsPage() {
  const [periods, setPeriods] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classListError, setClassListError] = useState(null);
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const toast = useToast();
  const { isAdmin } = useAuth();
  const [reviewPeriodId, setReviewPeriodId] = useState(null);
  const loadRequestRef = useRef(0);

  useEffect(() => {
    loadData();
    return () => {
      loadRequestRef.current += 1;
    };
  }, [filterClass, filterStatus, filterMonth]);

  const loadData = async () => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    setLoading(true);
    setClassListError(null);

    const params = {};
    if (filterClass) params.class_id = filterClass;
    if (filterStatus) params.status = filterStatus;
    if (filterMonth) params.month = filterMonth;

    const [classRes, periodRes] = await Promise.all([
      classesService.getAll(),
      attendancePeriodsService.getAll(params),
    ]);
    if (loadRequestRef.current !== requestId) return;

    if (classRes.success) {
      setClasses(classRes.data.classes || []);
    } else {
      setClassListError(classRes.error?.message || "Không thể tải danh sách lớp");
    }
    if (periodRes.success) {
      setPeriods(periodRes.data.periods || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (period) => {
    const res = await attendancePeriodsService.submit(period.id);
    if (res.success) {
      toast.success(`Đã nộp điểm danh ${period.period_month}`);
      loadData();
    } else {
      toast.error(res.error?.message || "Lỗi nộp điểm danh");
    }
  };

  const handleApprove = async (period) => {
    const res = await attendancePeriodsService.approve(period.id);
    if (res.success) {
      toast.success(`Đã duyệt điểm danh ${period.period_month}`);
      loadData();
    } else {
      toast.error(res.error?.message || "Lỗi duyệt điểm danh");
    }
  };

  const handleLock = async (period) => {
    const res = await attendancePeriodsService.lock(period.id);
    if (res.success) {
      toast.success(
        `🔒 Đã chốt điểm danh ${period.period_month} - Sẵn sàng thu học phí!`,
      );
      loadData();
    } else {
      toast.error(res.error?.message || "Lỗi chốt điểm danh");
    }
  };

  const handleUnlock = async (period) => {
    const res = await attendancePeriodsService.unlock(period.id);
    if (res.success) {
      toast.success(`Đã mở lại điểm danh ${period.period_month}`);
      loadData();
    } else {
      toast.error(res.error?.message || "Lỗi mở lại điểm danh");
    }
  };

  // Summary stats
  const stats = {
    total: periods.length,
    open: periods.filter((p) => p.status === "open").length,
    submitted: periods.filter((p) => p.status === "submitted").length,
    approved: periods.filter((p) => p.status === "approved").length,
    locked: periods.filter((p) => p.status === "locked").length,
  };
  const classSelectorState = classListError
    ? "error"
    : loading
      ? classes.length
        ? "refreshing"
        : "initial-loading"
      : classes.length
        ? "ready"
        : "empty";

  const columns = [
    {
      key: "class_name",
      title: "Lớp học",
      render: (value) => (
        <span className="font-medium text-gray-900">{value}</span>
      ),
    },
    {
      key: "period_month",
      title: "Tháng",
      render: (value) => {
        const [year, month] = value.split("-");
        return <span className="font-mono">{`${month}/${year}`}</span>;
      },
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (value) => (
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${PERIOD_STATUS[value]?.color}`}
        >
          {PERIOD_STATUS[value]?.icon} {PERIOD_STATUS[value]?.label}
        </span>
      ),
    },
    {
      key: "total_sessions",
      title: "Số buổi",
      render: (value) => <span className="font-medium">{value || 0}</span>,
    },
    {
      key: "total_present",
      title: "Có mặt",
      render: (value, row) => (
        <span className="text-green-600 font-medium">
          {value || 0}/{row.student_count || 0} HV
        </span>
      ),
    },
    {
      key: "actions",
      title: "Hành động",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {row.status === "open" && (
            <button
              onClick={() => handleSubmit(row)}
              className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              📤 Nộp
            </button>
          )}
          {row.status === "submitted" && isAdmin() && (
            <>
              <button
                onClick={() => setReviewPeriodId(row.id)}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                👁️ Xem
              </button>
              <button
                onClick={() => handleApprove(row)}
                className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                ✓ Duyệt
              </button>
            </>
          )}
          {row.status === "approved" && isAdmin() && (
            <button
              onClick={() => handleLock(row)}
              className="px-3 py-1.5 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              🔒 Chốt
            </button>
          )}
          {row.status === "locked" && (
            <>
              <span className="text-xs text-gray-500">✅ Hoàn tất</span>
              {isAdmin() && (
                <button
                  onClick={() => handleUnlock(row)}
                  className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                >
                  🔓 Mở lại
                </button>
              )}
            </>
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
          <h1 className="text-2xl font-bold text-gray-900">
            📋 Quản lý chốt điểm danh
          </h1>
          <p className="text-gray-500">
            Xem và xử lý các kỳ điểm danh theo tháng
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="card bg-gray-50">
          <div className="card-body text-center py-4">
            <p className="text-2xl font-bold text-gray-600">{stats.total}</p>
            <p className="text-xs text-gray-500">Tổng cộng</p>
          </div>
        </div>
        <div className="card bg-green-50 border-green-200">
          <div className="card-body text-center py-4">
            <p className="text-2xl font-bold text-green-600">{stats.open}</p>
            <p className="text-xs text-green-700">🟢 Đang mở</p>
          </div>
        </div>
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="card-body text-center py-4">
            <p className="text-2xl font-bold text-yellow-600">
              {stats.submitted}
            </p>
            <p className="text-xs text-yellow-700">🟡 Chờ duyệt</p>
          </div>
        </div>
        <div className="card bg-blue-50 border-blue-200">
          <div className="card-body text-center py-4">
            <p className="text-2xl font-bold text-blue-600">{stats.approved}</p>
            <p className="text-xs text-blue-700">🔵 Đã duyệt</p>
          </div>
        </div>
        <div className="card bg-gray-100 border-gray-300">
          <div className="card-body text-center py-4">
            <p className="text-2xl font-bold text-gray-700">{stats.locked}</p>
            <p className="text-xs text-gray-600">🔒 Đã chốt</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[200px]">
              <SelectField
                label="Lớp học"
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                state={classSelectorState}
                error={classListError}
                onRetry={loadData}
                placeholder={{ value: "", label: "Tất cả lớp" }}
                options={classes.map((classItem) => ({
                  value: classItem.id,
                  label: classItem.class_name,
                }))}
                statusLabels={{
                  "initial-loading": "Đang tải danh sách lớp...",
                  refreshing: "Đang cập nhật danh sách lớp...",
                  empty: "Chưa có lớp học nào.",
                  error: "Không thể tải danh sách lớp.",
                }}
              />
            </div>
            <div className="min-w-[150px]">
              <SelectField
                label="Trạng thái"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                state="ready"
                placeholder={{ value: "", label: "Tất cả" }}
                options={[
                  { value: "open", label: "🟢 Đang mở" },
                  { value: "submitted", label: "🟡 Chờ duyệt" },
                  { value: "approved", label: "🔵 Đã duyệt" },
                  { value: "locked", label: "🔒 Đã chốt" },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tháng
              </label>
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="input min-w-[150px]"
              />
            </div>
            <div className="flex-1"></div>
            <button
              onClick={() => {
                setFilterClass("");
                setFilterStatus("");
                setFilterMonth("");
              }}
              className="btn-secondary mt-6"
            >
              Xóa lọc
            </button>
          </div>
        </div>
      </div>

      {/* Workflow Guide */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="card-body py-3">
          <p className="text-sm text-blue-800">
            <strong>Quy trình:</strong>
            Đang mở →{" "}
            <span className="font-mono bg-green-200 px-1 rounded">
              📤 Nộp
            </span>{" "}
            → Chờ duyệt →{" "}
            <span className="font-mono bg-blue-200 px-1 rounded">✓ Duyệt</span>{" "}
            → Đã duyệt →{" "}
            <span className="font-mono bg-purple-200 px-1 rounded">
              🔒 Chốt
            </span>{" "}
            →<strong> ✅ Sẵn sàng thu học phí</strong>
          </p>
        </div>
      </div>

      {/* Periods Table */}
      <DataTable
        columns={columns}
        data={periods}
        loading={loading}
        emptyMessage="Chưa có kỳ điểm danh nào. Hãy điểm danh ở menu 'Điểm danh' trước."
      />

      {/* Review Modal */}
      <AttendanceReviewModal
        isOpen={!!reviewPeriodId}
        onClose={() => setReviewPeriodId(null)}
        periodId={reviewPeriodId}
        onActionComplete={loadData}
      />
    </div>
  );
}
