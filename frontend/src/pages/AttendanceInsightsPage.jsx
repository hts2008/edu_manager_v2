import { useMemo, useState } from "react";
import { attendanceService, classesService, studentsService } from "../services/api";
import { useAsyncData } from "../hooks/useAsyncData";

const DAY_MS = 24 * 60 * 60 * 1000;

function dateOnly(date) {
  return date.toISOString().split("T")[0];
}

function defaultRange() {
  const today = new Date();
  return {
    from: dateOnly(new Date(today.getTime() - 364 * DAY_MS)),
    to: dateOnly(today),
  };
}

function heatColor(day) {
  if (!day.total) return "bg-gray-100 border-gray-200";
  if (day.attendance_rate >= 90) return "bg-emerald-600 border-emerald-700";
  if (day.attendance_rate >= 70) return "bg-emerald-300 border-emerald-400";
  if (day.attendance_rate >= 40) return "bg-amber-300 border-amber-400";
  return "bg-red-300 border-red-400";
}

function statCard(label, value, tone = "text-gray-900") {
  return (
    <div className="card">
      <div className="card-body">
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`mt-1 text-3xl font-bold ${tone}`}>{value}</p>
      </div>
    </div>
  );
}

export default function AttendanceInsightsPage() {
  const [filters, setFilters] = useState({
    ...defaultRange(),
    student_id: "",
    class_id: "",
  });

  const { data: options } = useAsyncData(async () => {
    const [studentsResponse, classesResponse] = await Promise.all([
      studentsService.getAll({ status: "active", limit: 500 }),
      classesService.getAll(),
    ]);
    return {
      students: studentsResponse.data?.students || studentsResponse.data || [],
      classes: classesResponse.data?.classes || classesResponse.data || [],
    };
  }, "attendance-insight-options", { initialData: { students: [], classes: [] } });

  const requestKey = JSON.stringify(filters);
  const { data, loading, error, reload } = useAsyncData(async () => {
    const response = await attendanceService.getInsights(filters);
    if (!response.success) {
      throw new Error(response.error?.message || "Không tải được insight điểm danh");
    }
    return response.data;
  }, requestKey);

  const days = data?.days || [];
  const summary = data?.summary || {};
  const activeDays = useMemo(() => days.filter((day) => day.total > 0).length, [days]);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Insight điểm danh</h1>
          <p className="text-gray-500">Heatmap 365 ngày cho học viên, lớp học hoặc toàn trung tâm.</p>
        </div>
        <button onClick={reload} className="btn-secondary self-start lg:self-auto">
          Làm mới
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {statCard("Tỷ lệ có mặt", `${summary.attendance_rate || 0}%`, "text-emerald-700")}
        {statCard("Buổi có dữ liệu", activeDays)}
        {statCard("Có mặt", summary.present || 0, "text-emerald-700")}
        {statCard("Vắng tính phí", summary.absent_with_fee || 0, "text-amber-700")}
      </div>

      <div className="card">
        <div className="card-body">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input
              type="date"
              value={filters.from}
              onChange={(event) => updateFilter("from", event.target.value)}
              className="input"
              aria-label="Từ ngày"
            />
            <input
              type="date"
              value={filters.to}
              onChange={(event) => updateFilter("to", event.target.value)}
              className="input"
              aria-label="Đến ngày"
            />
            <select
              value={filters.class_id}
              onChange={(event) => updateFilter("class_id", event.target.value)}
              className="input"
              aria-label="Lớp học"
            >
              <option value="">Tất cả lớp</option>
              {options?.classes?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.class_name || item.className}
                </option>
              ))}
            </select>
            <select
              value={filters.student_id}
              onChange={(event) => updateFilter("student_id", event.target.value)}
              className="input"
              aria-label="Học viên"
            >
              <option value="">Tất cả học viên</option>
              {options?.students?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.full_name || item.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </div>
      )}

      <div className="card">
        <div className="card-header flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Heatmap 365 ngày</h2>
            <p className="text-sm text-gray-500">
              {data?.from || filters.from} đến {data?.to || filters.to}
            </p>
          </div>
          {loading && <div className="spinner h-5 w-5"></div>}
        </div>
        <div className="card-body">
          <div className="overflow-x-auto pb-2">
            <div
              className="grid w-max grid-flow-col gap-1"
              style={{
                gridTemplateRows: "repeat(7, 14px)",
                gridAutoColumns: "14px",
              }}
            >
              {days.map((day) => (
                <div
                  key={day.date}
                  className={`h-3.5 w-3.5 rounded-sm border ${heatColor(day)}`}
                  title={`${day.date}: ${day.total} bản ghi, ${day.attendance_rate}% có mặt`}
                />
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span>Không dữ liệu</span>
            <span className="h-3 w-3 rounded-sm border border-gray-200 bg-gray-100" />
            <span>Thấp</span>
            <span className="h-3 w-3 rounded-sm border border-red-400 bg-red-300" />
            <span>Trung bình</span>
            <span className="h-3 w-3 rounded-sm border border-amber-400 bg-amber-300" />
            <span>Tốt</span>
            <span className="h-3 w-3 rounded-sm border border-emerald-700 bg-emerald-600" />
          </div>
        </div>
      </div>
    </div>
  );
}
