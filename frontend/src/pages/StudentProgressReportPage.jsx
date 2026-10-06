import { createElement, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useExperience } from "../context/ExperienceContext";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BookOpenCheck,
  Download,
  Eye,
  FileText,
  GraduationCap,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingUp,
  Users,
} from "lucide-react";
import { reportsService } from "../services/api";
import { useAsyncData } from "../hooks/useAsyncData";
import {
  ChartFrame,
  LoadingProgress,
  SAFE_RECHARTS_CONTAINER_PROPS,
  SkeletonBlock,
} from "../components/ui/LoadingStates";
import {
  ListPanel,
  MetricGrid,
  OperationalPage,
} from "../components/ui/OperationalPage";
import SelectField from "../components/ui/SelectField";
import ReportInlineAssessment from "../components/student-progress/ReportInlineAssessment";
import RowProgressCharts, { reportEvidenceLabel as progressEvidenceLabel } from "../components/student-progress/ReportRowCharts";
import ProgressPrintPreview from "../components/student-progress/ProgressPrintPreview";
import useDraftNavigationGuard from "../hooks/useDraftNavigationGuard";
import { formatProgressValue, formatProgressDelta } from "../utils/studentProgressDashboard";

const PAGE_SIZE_OPTIONS = [25, 50];
const READINESS_LABELS = {
  on_track: "Đúng tiến độ",
  watch: "Theo dõi",
  needs_support: "Cần hỗ trợ",
  insufficient_data: "Thiếu dữ liệu",
};
const READINESS_COLORS = {
  on_track: "#10b981",
  watch: "#f59e0b",
  needs_support: "#ef4444",
  insufficient_data: "#94a3b8",
};
const ACADEMIC_INPUT_LABELS = {
  complete: "Đủ điểm kỹ năng",
  partial: "Nhập một phần",
  missing_input: "Chưa nhập",
};
function currentBusinessMonth() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

function initialFilters() {
  const month = currentBusinessMonth();
  return {
    from: month,
    to: month,
    q: "",
    class_id: "all",
    track: "all",
    readiness: "all",
    academic_status: "all",
    page: 1,
    page_size: 50,
  };
}

function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0));
}


function rowKey(row) {
  return row ? `${row.student_id}\u0000${row.class_id}\u0000${row.month}` : "";
}

function preserveDraftRows(incoming, existing, states) {
  const keys = new Set(incoming.map(rowKey));
  const retained = existing.filter((row) => {
    const state = states.get(rowKey(row));
    return !keys.has(rowKey(row)) && (state?.dirty || state?.saving);
  });
  return [...incoming, ...retained];
}

function getAssessment(row) {
  return row?.progress_assessment || null;
}


function academicStatusLabel(row) {
  const status = getAssessment(row)?.academicInputStatus || row?.academic_input_status;
  if (status === "complete") return "Đã đủ điểm kỹ năng";
  if (status === "partial") return "Đã nhập một phần";
  return "Thiếu điểm kỹ năng";
}


function monthLabel(month) {
  const [year, value] = String(month || "").split("-");
  return value && year ? `${value}/${year}` : month;
}

function makeQuery(filters, deferredSearch, refreshNonce) {
  return {
    from: filters.from,
    to: filters.to,
    page: filters.page,
    page_size: filters.page_size,
    ...(deferredSearch.trim() ? { q: deferredSearch.trim() } : {}),
    ...(filters.class_id !== "all" ? { class_id: filters.class_id } : {}),
    ...(filters.track !== "all" ? { track: filters.track } : {}),
    ...(filters.readiness !== "all" ? { readiness: filters.readiness } : {}),
    ...(filters.academic_status !== "all"
      ? { academic_status: filters.academic_status }
      : {}),
    ...(refreshNonce ? { _refresh: refreshNonce } : {}),
  };
}

function exportCsv(data) {
  const rows = data?.students || [];
  const table = [
    [
      "student_name",
      "parent_name",
      "class_name",
      "month",
      "track",
      "cefr",
      "progress_score",
      "score_source",
      "score_contributors",
      "trend_delta",
      "attendance_score",
      "evidence_coverage",
      "readiness_band",
      "actual_present_rate",
      "record_completion_rate",
      "next_actions",
    ],
    ...rows.map((row) => [
      row.student_name,
      row.parent_name || "",
      row.class_name,
      row.month,
      row.track_label,
      row.cefr_level,
      formatProgressValue(row.progress_score),
      row.score_source ?? row.progress_assessment?.scoreSource ?? "legacy_unknown",
      progressEvidenceLabel(row),
      formatProgressDelta(row.trend_delta),
      row.attendance_score,
      row.learning_evidence_coverage,
      row.readiness_band,
      row.actual_present_rate,
      row.record_completion_rate,
      (row.next_actions || []).join(" | "),
    ]),
  ];
  const csv = table
    .map((line) =>
      line.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")
    )
    .join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `student-progress-${data?.meta?.from || "from"}-${data?.meta?.to || "to"}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}


export default function StudentProgressReportPage() {
  const {text} = useExperience();
  const rowStates = useRef(new Map());
  const reportRows = useRef([]);
  const navigationState = useRef({dirty:false,saving:false});
  const [draftEpoch, setDraftEpoch] = useState(0);
  const [navigationFlags, setNavigationFlags] = useState({dirty:false,saving:false});
  const handleRowStateChange = useCallback((key, state) => {
    if (state.dirty || state.saving) rowStates.current.set(key, state);
    else rowStates.current.delete(key);
    const states = [...rowStates.current.values()];
    const flags = {
      dirty: states.some((item) => item.dirty),
      saving: states.some((item) => item.saving),
    };
    navigationState.current = flags;
    setNavigationFlags((current) => current.dirty === flags.dirty && current.saving === flags.saving ? current : flags);
  }, []);
  useDraftNavigationGuard({ ...navigationFlags, pending: () => navigationState.current.saving });
  function allowScopeChange({ discard = false } = {}) {
    const {dirty,saving} = navigationState.current;
    if (saving) return false;
    if (dirty && !window.confirm(discard ? 'Bỏ các thay đổi chưa lưu?' : 'Chuyển tab? Bản nhập chưa lưu được giữ.')) return false;
    if (dirty && discard) {
      rowStates.current.clear();
      navigationState.current = {dirty:false,saving:false};
      setNavigationFlags({dirty:false,saving:false});
      setDraftEpoch((value) => value + 1);
    }
    return true;
  }
  const switchTab = key => {
    if (key === activeTab) return true;
    if (!allowScopeChange()) return false;
    setActiveTab(key);
    return true;
  };
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("report");
  const [filters, setFilters] = useState(initialFilters);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const handleCanonicalSaved = useCallback(() => setRefreshNonce((value) => value + 1), []);
  const [selectedRow, setSelectedRow] = useState(null);
  const [printRow, setPrintRow] = useState(null);
  const deferredSearch = useDeferredValue(filters.q);
  const query = useMemo(
    () => makeQuery(filters, deferredSearch, refreshNonce),
    [filters, deferredSearch, refreshNonce]
  );
  const requestKey = JSON.stringify(query);
  const progressState = useAsyncData(async () => {
    const response = await reportsService.getStudentProgress(query);
    if (!response.success) {
      throw new Error(response.error?.message || "Không tải được báo cáo tiến độ.");
    }
    return {
      ...response.data,
      students: preserveDraftRows(response.data.students || [], reportRows.current, rowStates.current),
      __requestKey: requestKey,
    };
  }, requestKey);
  const data = progressState.data;
  const rows = data?.students || [];
  const printUnavailable = navigationFlags.saving || progressState.loading || Boolean(progressState.error) || data?.__requestKey !== requestKey;
  function openPrintPreview(row) {
    if (navigationState.current.saving || printUnavailable) return;
    setPrintRow(row);
  }
  useEffect(() => { reportRows.current = rows; }, [rows]);
  const summary = data?.summary || {};
  const charts = data?.charts || {};
  const isInitialLoading = progressState.loading && !data;
  const isRefreshing = progressState.loading && Boolean(data);
  const classOptions = (data?.meta?.classes || []).map((classItem) => ({
    value: classItem.id,
    label: classItem.class_name,
  }));
  const classSelectorState = progressState.error
    ? "error"
    : isInitialLoading
      ? "initial-loading"
      : isRefreshing
        ? "refreshing"
        : classOptions.length
          ? "ready"
          : "empty";
  useEffect(() => {
    if (!rows.length) {
      setSelectedRow(null);
      return;
    }
    if (!selectedRow) {
      setSelectedRow(rows[0]);
      return;
    }
    const latest = rows.find((row) => rowKey(row) === rowKey(selectedRow));
    if (!latest) setSelectedRow(rows[0]);
    else if (latest !== selectedRow) setSelectedRow(latest);
  }, [rows, selectedRow]);

  const metrics = [
    {
      label: "Học viên",
      value: formatNumber(summary.student_count),
      helper: `${formatNumber(summary.row_count)} dòng tháng/lớp`,
      icon: Users,
      tone: "indigo",
    },
    {
      label: "Điểm tiến bộ TB",
      value: formatProgressValue(summary.average_progress_score, "/100"),
      helper: "Điểm tháng theo nguồn dữ liệu",
      icon: TrendingUp,
      tone: "emerald",
    },
    {
      label: "Chuyên cần TB",
      value: formatProgressValue(summary.average_attendance_score, "/100"),
      helper: "Từ điểm danh và lịch học",
      icon: Activity,
      tone: "sky",
    },
    {
      label: "Cần hỗ trợ",
      value: formatNumber(summary.needs_support_count),
      helper: `${formatNumber(summary.missing_academic_input_count)} dòng thiếu skill input`,
      icon: ShieldAlert,
      tone: "rose",
    },
  ];

  function updateFilter(key, value) {
    if (!allowScopeChange({ discard: true })) return;
    setFilters((current) => ({ ...current, [key]: value, page: key === "page" ? value : 1 }));
  }

  function refreshReport() {
    if (!allowScopeChange({ discard: true })) return;
    setRefreshNonce((value) => value + 1);
  }

  return (
    <OperationalPage data-testid="student-progress-page">
      <header className="eduflow-page-intro operational-heading">
        <h1 className="text-xl font-bold">{text('progress.workspace.title')}</h1>
        <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary inline-flex items-center gap-2"
              onClick={refreshReport}
              disabled={progressState.loading}
            >
              <RefreshCw size={16} className={progressState.loading ? "animate-spin" : ""} />
              Làm mới
            </button>
            <button
              type="button"
              className="btn-secondary inline-flex items-center gap-2"
              onClick={() => exportCsv(data)}
              disabled={!rows.length}
            >
              <Download size={16} />
              Export CSV
            </button>
        </div>
      </header>

      <div role="tablist" aria-label="Tiến bộ học viên" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[["report", "Báo cáo"], ["overview", "Tổng quan"]].map(([key, label]) => <button key={key} id={`progress-tab-${key}`} role="tab" tabIndex={activeTab === key ? 0 : -1} aria-selected={activeTab === key} aria-controls={`progress-panel-${key}`} className={activeTab === key ? "btn-primary" : "btn-secondary"} onClick={() => switchTab(key)} onKeyDown={event => {
          const keys = ["report", "overview"];
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const index = keys.indexOf(key);
          const target = keys[event.key === "Home" ? 0 : event.key === "End" ? 1 : (index + 1) % 2];
          if (switchTab(target)) document.getElementById(`progress-tab-${target}`)?.focus();
        }}>{label}</button>)}
      </div>
      <div className="space-y-4">
      <section className="eduflow-panel p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_minmax(260px,1.4fr)_auto]">
          <label className="text-sm font-bold text-slate-700">
            Từ tháng
            <input
              type="month"
              className="input mt-2"
              value={filters.from}
              onChange={(event) => updateFilter("from", event.target.value)}
            />
          </label>
          <label className="text-sm font-bold text-slate-700">
            Đến tháng
            <input
              type="month"
              className="input mt-2"
              value={filters.to}
              onChange={(event) => updateFilter("to", event.target.value)}
            />
          </label>
          <label className="text-sm font-bold text-slate-700">
            Tìm học viên/lớp/track
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="input pl-10"
                value={filters.q}
                onChange={(event) => updateFilter("q", event.target.value)}
                placeholder="VD: Phuc, Movers, PET..."
              />
            </div>
          </label>
          <label className="text-sm font-bold text-slate-700">
            Hiển thị
            <select
              className="input mt-2"
              value={filters.page_size}
              onChange={(event) => updateFilter("page_size", Number(event.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SelectField
            label="Lớp học"
            aria-label="Lop hoc"
            value={filters.class_id}
            onChange={(event) => updateFilter("class_id", event.target.value)}
            state={classSelectorState}
            error={progressState.error?.message}
            onRetry={refreshReport}
            data-testid="progress-class-field"
            placeholder={{ value: "all", label: "Tất cả lớp" }}
            options={classOptions}
            statusLabels={{
              "initial-loading": "Đang tải danh sách lớp...",
              refreshing: "Đang cập nhật danh sách lớp...",
              empty: "Chưa có lớp trong báo cáo.",
              error: "Không tải được danh sách lớp.",
            }}
          />
          <SelectField
            label="Track"
            value={filters.track}
            onChange={(event) => updateFilter("track", event.target.value)}
            state={isInitialLoading ? "initial-loading" : isRefreshing ? "refreshing" : "ready"}
            placeholder={{ value: "all", label: "Tất cả track" }}
            options={Object.entries(data?.framework?.tracks || {}).map(([key, track]) => ({
              value: key,
              label: track.label,
            }))}
            statusLabels={{
              "initial-loading": "Đang tải danh sách track...",
              refreshing: "Đang cập nhật danh sách track...",
            }}
          />
          <label className="text-sm font-bold text-slate-700">
            Mức tiến độ
            <select
              className="input mt-2"
              value={filters.readiness}
              onChange={(event) => updateFilter("readiness", event.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              {Object.entries(READINESS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">
            Input giáo viên
            <select
              className="input mt-2"
              value={filters.academic_status}
              onChange={(event) => updateFilter("academic_status", event.target.value)}
            >
              <option value="all">Tất cả mức nhập liệu</option>
              {Object.entries(ACADEMIC_INPUT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {isInitialLoading ? (
        <div className="space-y-4">
          <LoadingProgress label="Đang dựng báo cáo tiến bộ từ dữ liệu thật..." />
          <div className="grid gap-4 md:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <SkeletonBlock key={item} className="h-28" />
            ))}
          </div>
          <SkeletonBlock className="h-96" />
        </div>
      ) : progressState.error && !data ? (
        <section className="rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <ShieldAlert className="mx-auto text-rose-500" size={40} />
          <h2 className="mt-4 text-xl font-black text-slate-950">Không tải được báo cáo</h2>
          <p className="mt-2 text-sm text-slate-500">{progressState.error.message}</p>
          <button
            className="btn-primary mt-5"
            type="button"
            onClick={refreshReport}
          >
            Thử lại
          </button>
        </section>
      ) : (
        <>
          {isRefreshing && (
            <LoadingProgress label="Đang cập nhật báo cáo, dữ liệu cũ vẫn được giữ trên màn hình..." />
          )}

          <div id="progress-panel-overview" role="tabpanel" aria-labelledby="progress-tab-overview" hidden={activeTab !== "overview"} className="space-y-4">
          <MetricGrid metrics={metrics} />

          <section className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr_0.8fr]">
            <ListPanel title="Xu hướng tiến bộ" description="Điểm tiến bộ proxy theo tháng" className="min-h-[340px]">
              <ChartFrame height={260}>
                <ResponsiveContainer {...SAFE_RECHARTS_CONTAINER_PROPS} width="100%" height="100%">
                  <LineChart data={charts.monthly || []} margin={{ top: 20, right: 20, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tickFormatter={monthLabel} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${value}`, "Điểm"]} labelFormatter={monthLabel} />
                    <Line type="monotone" dataKey="progress_score" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="attendance_score" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartFrame>
            </ListPanel>

            <ListPanel title="Track Cambridge" description="Phân bổ theo lớp/track" className="min-h-[340px]">
              <ChartFrame height={260}>
                <ResponsiveContainer {...SAFE_RECHARTS_CONTAINER_PROPS} width="100%" height="100%">
                  <BarChart data={charts.tracks || []} layout="vertical" margin={{ top: 10, right: 18, bottom: 10, left: 28 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="label" width={92} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" radius={[0, 10, 10, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartFrame>
            </ListPanel>

            <ListPanel title="Tình trạng tiến độ" description="Số dòng theo trạng thái" className="min-h-[340px]">
              <ChartFrame height={260}>
                <ResponsiveContainer {...SAFE_RECHARTS_CONTAINER_PROPS} width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={(charts.readiness || []).map((item) => ({
                        ...item,
                        label: READINESS_LABELS[item.label] || item.label,
                      }))}
                      dataKey="count"
                      nameKey="label"
                      outerRadius={92}
                      innerRadius={52}
                    >
                      {(charts.readiness || []).map((item) => (
                        <Cell key={item.label} fill={READINESS_COLORS[item.label] || "#64748b"} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartFrame>
            </ListPanel>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
            <ListPanel
              title="Năng lực theo kỹ năng"
              description="Điểm trung bình chỉ tính trên các kỹ năng đã được giáo viên nhập."
              className="min-h-[340px]"
            >
              <ChartFrame height={260}>
                <ResponsiveContainer
                  {...SAFE_RECHARTS_CONTAINER_PROPS}
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={(charts.skill_averages || []).filter(skill => ['listening','speaking','reading','writing'].includes(skill.key))}
                    margin={{ top: 12, right: 18, bottom: 20, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" interval={0} angle={-12} textAnchor="end" height={58} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip
                      formatter={(value, name) => [
                        value === null ? "Chưa có dữ liệu" : value,
                        name === "average_score" ? "Điểm trung bình" : name,
                      ]}
                    />
                    <Bar dataKey="average_score" fill="#4f46e5" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartFrame>
            </ListPanel>

            <ListPanel
              title="Độ phủ input giáo viên"
              description="Phân biệt đủ điểm, nhập một phần và chưa nhập."
              className="min-h-[340px]"
            >
              <ChartFrame height={220}>
                <ResponsiveContainer
                  {...SAFE_RECHARTS_CONTAINER_PROPS}
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={(charts.academic_input || []).map((item) => ({
                      ...item,
                      display_label: ACADEMIC_INPUT_LABELS[item.label] || item.label,
                    }))}
                    layout="vertical"
                    margin={{ top: 10, right: 18, bottom: 10, left: 28 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="display_label" width={110} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#14b8a6" radius={[0, 10, 10, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartFrame>
              <div className="mt-3 flex flex-wrap gap-2">
                {(charts.focus_areas || []).slice(0, 5).map((item) => (
                  <span
                    key={item.label}
                    className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"
                  >
                    Cần tập trung {item.label}: {item.count}
                  </span>
                ))}
              </div>
            </ListPanel>
          </section>

          </div>
          <section id="progress-panel-report" role="tabpanel" aria-labelledby="progress-tab-report" hidden={activeTab !== "report"} className="space-y-4">
            <ListPanel
              title="Danh sách tiến độ học viên"
              description="Một dòng là một học viên - một lớp - một tháng."
              countLabel={`${formatNumber(data?.pagination?.total_items)} kết quả`}
            >
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Học viên</th>
                      <th className="px-4 py-3 text-left">Lớp / Track</th>
                      <th className="px-4 py-3 text-left">Kỹ năng</th>
                      <th className="px-4 py-3 text-left">Nỗ lực cộng dồn</th>
                      <th className="px-4 py-3 text-left">Lần cập nhật / Evidence</th>
                      <th className="px-4 py-3 text-left">Cập nhật cuối</th>
                      <th className="px-4 py-3 text-left">Chấm điểm</th>
                      <th className="px-4 py-3 text-left">Cần chú ý</th>
                      <th className="px-4 py-3 text-left">Trạng thái</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {rows.map((row) => (
                      <tr key={rowKey(row)} className="hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <div className="font-black text-slate-950">{row.student_name}</div>
                          <div className="text-xs text-slate-500">{row.parent_name || "Chưa có phụ huynh"}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-800">{row.class_name}</div>
                          <div className="mt-1 text-xs text-slate-500">Tháng {monthLabel(row.month)}</div>
                          <div className="mt-1 inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                            {row.track_label} · {row.cefr_level}
                          </div>
                        </td>
                        <RowProgressCharts row={row} />
                        <td className="px-4 py-4">
                          <div className="font-black text-slate-900">{row.assessment_submission_count == null ? "—" : formatNumber(row.assessment_submission_count)} lần cập nhật</div>
                          <div className="font-black text-slate-900">{row.daily_assessment_count || 0}</div>
                          <div className="mt-1 text-xs text-slate-500">evidence kỹ năng</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-800">{row.last_submission_at ? new Date(row.last_submission_at).toLocaleString("vi-VN") : "—"}</div>
                          <div className="mt-1 text-xs text-slate-500">Evidence cuối: {row.last_entry_date || "—"}</div>
                          <div className="mt-1 text-xs text-slate-500">{academicStatusLabel(row)}</div>
                        </td>
                        <InlineAssessmentCell key={`${rowKey(row)}:${draftEpoch}`} row={row} onCanonicalSaved={handleCanonicalSaved} onRowStateChange={handleRowStateChange} />
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-800">{row.focus_skill_label || "Chưa xác định"}</div>
                          {row.alert_score_drop && (
                            <span className="mt-1 inline-flex rounded-full bg-rose-50 px-2 py-1 text-xs font-black text-rose-700">Giảm &gt;15%</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className="inline-flex rounded-full px-3 py-1 text-xs font-black"
                            style={{
                              background: `${READINESS_COLORS[row.readiness_band] || "#64748b"}18`,
                              color: READINESS_COLORS[row.readiness_band] || "#64748b",
                            }}
                          >
                            {READINESS_LABELS[row.readiness_band] || row.readiness_band}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="btn-secondary inline-flex items-center gap-2 px-3 py-2 text-xs"
                              onClick={() => navigate(`/student-progress/${encodeURIComponent(row.student_id)}?class_id=${encodeURIComponent(row.class_id)}&month=${encodeURIComponent(row.month)}`)}
                              data-testid="open-student-progress-detail"
                            >
                              <Eye size={14} />
                              Xem
                            </button>
                            <button
                              type="button"
                              className="btn-primary inline-flex items-center gap-2 px-3 py-2 text-xs"
                              onClick={() => openPrintPreview(row)}
                              disabled={printUnavailable}
                            >
                              <Printer size={14} />
                              In
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!rows.length && (
                <div className="rounded-3xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
                  Không có dữ liệu phù hợp bộ lọc hiện tại.
                </div>
              )}
              <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-semibold text-slate-500">
                  Trang {data?.pagination?.page || 1} / {data?.pagination?.total_pages || 1}
                </span>
                <div className="flex gap-2">
                  <button
                    className="btn-secondary"
                    disabled={(data?.pagination?.page || 1) <= 1}
                    onClick={() => updateFilter("page", Math.max(1, (data?.pagination?.page || 1) - 1))}
                  >
                    Trước
                  </button>
                  <button
                    className="btn-secondary"
                    disabled={(data?.pagination?.page || 1) >= (data?.pagination?.total_pages || 1)}
                    onClick={() => updateFilter("page", (data?.pagination?.page || 1) + 1)}
                  >
                    Sau
                  </button>
                </div>
              </div>
            </ListPanel>

            <ListPanel
              title="Bản in phụ huynh"
              description="Chọn một học viên để xem nội dung trước khi in."
              className="w-full"
            >
              {selectedRow ? (
                <div className="space-y-4">
                  <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-4">
                    <div className="flex items-start gap-3">
                      <span className="rounded-2xl bg-white p-3 text-indigo-600 shadow-sm">
                        <FileText size={22} />
                      </span>
                      <div>
                        <h3 className="font-black text-slate-950">{selectedRow.student_name}</h3>
                        <p className="mt-1 text-sm text-slate-600">{selectedRow.parent_summary}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <MiniStat icon={GraduationCap} label="Track" value={`${selectedRow.track_label} · ${selectedRow.cefr_level}`} />
                    <MiniStat icon={BookOpenCheck} label="Tiến bộ" value={formatProgressValue(selectedRow.progress_score, "/100")} />
                    <MiniStat icon={Activity} label="Buổi học" value={`${selectedRow.recorded_sessions}/${selectedRow.expected_sessions}`} />
                    <MiniStat icon={ShieldAlert} label="Độ phủ dữ liệu" value={`${selectedRow.learning_evidence_coverage}%`} />
                  </div>
                  <p className="text-xs text-slate-500">{progressEvidenceLabel(selectedRow)} · Delta: {formatProgressDelta(selectedRow.trend_delta)}</p>
                  <div>
                    <h4 className="text-sm font-black text-slate-950">Khuyến nghị</h4>
                    <ul className="mt-2 space-y-2 text-sm text-slate-600">
                      {(selectedRow.next_actions || []).map((item) => (
                        <li key={item} className="rounded-2xl bg-slate-50 px-3 py-2">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary w-full inline-flex items-center justify-center gap-2"
                    onClick={() =>
                      navigate(
                        `/student-progress/${selectedRow.student_id}?class_id=${selectedRow.class_id}&month=${selectedRow.month}`
                      )
                    }
                  >
                    <Eye size={16} />
                    Mở dashboard học viên
                  </button>
                  <button
                    type="button"
                    className="btn-primary w-full inline-flex items-center justify-center gap-2"
                    onClick={() => openPrintPreview(selectedRow)}
                    disabled={printUnavailable}
                    data-testid="print-selected-progress"
                  >
                    <Printer size={16} />
                    In báo cáo này
                  </button>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center">
                  <FileText className="mx-auto text-slate-300" size={42} />
                  <p className="mt-3 text-sm font-semibold text-slate-500">
                    Bấm “Xem” trên một dòng để tạo bản in phụ huynh.
                  </p>
                </div>
              )}
            </ListPanel>
          </section>
        </>
      )}
      </div>
      {printRow && <ProgressPrintPreview row={printRow} onClose={() => setPrintRow(null)} />}
    </OperationalPage>
  );
}

function InlineAssessmentCell({ row, onCanonicalSaved, onRowStateChange }) {
  const key = rowKey(row);
  const onStateChange = useCallback((state) => onRowStateChange(key, state), [key, onRowStateChange]);
  useEffect(() => () => onRowStateChange(key, {dirty:false,saving:false}), [key, onRowStateChange]);
  return (
    <td className="px-4 py-4 align-top">
      <ReportInlineAssessment row={row} onCanonicalSaved={onCanonicalSaved} onStateChange={onStateChange} />
    </td>
  );
}

function MiniStat({ icon, label, value }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="rounded-2xl bg-slate-50 p-2 text-indigo-600">
          {createElement(icon, { size: 18 })}
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
          <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
        </div>
      </div>
    </div>
  );
}
