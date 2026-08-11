import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  CalendarRange,
  Download,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import ProgressDashboardCharts from "../components/student-progress/ProgressDashboardCharts";
import ProgressTimelineTable from "../components/student-progress/ProgressTimelineTable";
import ProgressDailyEntryForm, {
  buildProgressDayForm,
  createEmptyProgressDayForm,
} from "../components/student-progress/ProgressDailyEntryForm";
import { LoadingProgress, SkeletonBlock } from "../components/ui/LoadingStates";
import { reportsService, studentProgressService, teachersService } from "../services/api";
import { openAuthenticatedPdf } from "../utils/pdfPrint";
import {
  buildDailyEntryPayload,
  formatProgressValue,
  getProgressPeriodRange,
} from "../utils/studentProgressDashboard";

const PERIODS = [
  { value: "week", label: "Tuần" },
  { value: "month", label: "Tháng" },
  { value: "year", label: "Năm" },
  { value: "custom", label: "Tùy chọn" },
];

function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function initialAnchor(month) {
  return month && /^\d{4}-\d{2}$/.test(month) ? `${month}-01` : today();
}

function metricTone(value) {
  if (value === null || value === undefined) return "text-slate-500";
  if (value >= 80) return "text-emerald-700";
  if (value >= 60) return "text-amber-700";
  return "text-rose-700";
}

function Metric({ icon: Icon, label, value, helper, tone = "text-indigo-700" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">{label}</p>
          <p className={`mt-2 text-2xl font-black ${tone}`}>{value}</p>
          <p className="mt-1 text-xs text-slate-500">{helper}</p>
        </div>
        <span className="rounded-xl bg-slate-50 p-2 text-indigo-600">{createElement(Icon, { size: 20 })}</span>
      </div>
    </div>
  );
}

export default function StudentProgressDetailPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const classId = searchParams.get("class_id") || "";
  const initialMonth = searchParams.get("month") || "";
  const [periodMode, setPeriodMode] = useState("month");
  const [anchor, setAnchor] = useState(initialAnchor(initialMonth));
  const [customRange, setCustomRange] = useState(() => getProgressPeriodRange("month", initialAnchor(initialMonth)));
  const [scoreMode, setScoreMode] = useState("raw");
  const [timeline, setTimeline] = useState(null);
  const [reportRows, setReportRows] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [entryDate, setEntryDate] = useState(initialAnchor(initialMonth));
  const [entryForm, setEntryForm] = useState(createEmptyProgressDayForm());
  const [entryLoading, setEntryLoading] = useState(false);
  const [entrySaving, setEntrySaving] = useState(false);
  const [entryDeleting, setEntryDeleting] = useState(false);
  const [entryHasData, setEntryHasData] = useState(false);
  const [entryLocked, setEntryLocked] = useState(false);
  const [entryReady, setEntryReady] = useState(false);
  const [entryMessage, setEntryMessage] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const range = useMemo(
    () => periodMode === "custom" ? customRange : getProgressPeriodRange(periodMode, anchor),
    [periodMode, anchor, customRange],
  );

  const loadTimeline = useCallback(async () => {
    if (!studentId || !classId) {
      setError("Thiếu class_id. Hãy mở dashboard từ danh sách tiến bộ học viên.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [timelineResponse, reportResponse, teachersResponse] = await Promise.all([
        studentProgressService.getTimeline({ student_id: studentId, class_id: classId, ...range }, { skipCache: true }),
        reportsService.getStudentProgress({
          student_id: studentId,
          class_id: classId,
          from: range.from.slice(0, 7),
          to: range.to.slice(0, 7),
          page_size: 200,
        }, { skipCache: true }),
        teachersService.getAll(),
      ]);
      if (!timelineResponse.success) throw new Error(timelineResponse.error?.message || "Không tải được timeline tiến bộ.");
      if (!reportResponse.success) throw new Error(reportResponse.error?.message || "Không tải được chỉ số tổng hợp tiến bộ.");
      setTimeline(timelineResponse.data);
      setReportRows(reportResponse.data?.students || []);
      setTeachers(teachersResponse.success ? teachersResponse.data?.teachers || teachersResponse.data || [] : []);
      const latestDate = timelineResponse.data?.days?.at(-1)?.date;
      const preferred = latestDate || (range.from <= today() && today() <= range.to ? today() : range.from);
      setEntryDate((current) => current >= range.from && current <= range.to ? current : preferred);
    } catch (requestError) {
      setError(requestError.message || "Không tải được dashboard tiến bộ.");
    } finally {
      setLoading(false);
    }
  }, [studentId, classId, range.from, range.to, refreshNonce]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  useEffect(() => {
    if (!studentId || !classId || !entryDate) return;
    let active = true;
    setEntryLoading(true);
    setEntryReady(false);
    setEntryHasData(false);
    setEntryLocked(false);
    setEntryForm(createEmptyProgressDayForm(timeline?.class?.track_key));
    setEntryMessage(null);
    studentProgressService.getDaily(
      { student_id: studentId, class_id: classId, entry_date: entryDate },
      { skipCache: true },
    ).then((response) => {
      if (!active) return;
      if (!response.success) {
        setEntryMessage({ type: "error", text: response.error?.message || "Không tải được evidence ngày." });
        return;
      }
      const track = response.data?.progress_month?.track_key || timeline?.class?.track_key || timeline?.class?.trackKey || "";
      setEntryForm(buildProgressDayForm(response.data, track));
      setEntryHasData((response.data?.daily_entries || []).length > 0);
      setEntryLocked(Boolean(response.data?.progress_month?.is_finalized));
      setEntryReady(true);
    }).catch((requestError) => {
      if (active) setEntryMessage({ type: "error", text: requestError.message || "Không tải được evidence ngày." });
    }).finally(() => {
      if (active) setEntryLoading(false);
    });
    return () => { active = false; };
  }, [studentId, classId, entryDate, timeline?.class?.track_key]);

  async function saveEntry() {
    setEntrySaving(true);
    setEntryMessage(null);
    try {
      const response = await studentProgressService.saveDay(buildDailyEntryPayload({
        studentId,
        classId,
        entryDate,
        form: entryForm,
      }));
      if (!response.success) throw new Error(response.error?.message || "Không lưu được evidence ngày.");
      setEntryHasData(true);
      setEntryMessage({ type: "success", text: `Đã lưu evidence ngày ${entryDate}.` });
      setRefreshNonce((value) => value + 1);
    } catch (requestError) {
      setEntryMessage({ type: "error", text: requestError.message || "Không lưu được evidence ngày." });
    } finally {
      setEntrySaving(false);
    }
  }

  async function deleteEntry() {
    setEntryDeleting(true);
    setEntryMessage(null);
    try {
      const response = await studentProgressService.deleteDay({ student_id: studentId, class_id: classId, entry_date: entryDate });
      if (!response.success) throw new Error(response.error?.message || "Không xóa được evidence ngày.");
      setEntryForm(createEmptyProgressDayForm(timeline?.class?.track_key));
      setEntryHasData(false);
      setEntryMessage({ type: "success", text: `Đã xóa evidence ngày ${entryDate}.` });
      setRefreshNonce((value) => value + 1);
    } catch (requestError) {
      setEntryMessage({ type: "error", text: requestError.message || "Không xóa được evidence ngày." });
    } finally {
      setEntryDeleting(false);
    }
  }

  async function copyPrevious() {
    const previous = [...(timeline?.days || [])].reverse().find((day) => day.date < entryDate);
    if (!previous) {
      setEntryMessage({ type: "error", text: "Không có ngày trước trong kỳ để sao chép." });
      return;
    }
    const response = await studentProgressService.getDaily(
      { student_id: studentId, class_id: classId, entry_date: previous.date },
      { skipCache: true },
    );
    if (!response.success) {
      setEntryMessage({ type: "error", text: response.error?.message || "Không sao chép được ngày trước." });
      return;
    }
    setEntryForm(buildProgressDayForm(response.data, timeline?.class?.track_key));
    setEntryMessage({ type: "success", text: `Đã sao chép dữ liệu từ ${previous.date}; chưa lưu.` });
  }

  async function printPdf() {
    setPdfLoading(true);
    try {
      const query = new URLSearchParams({ student_id: studentId, class_id: classId, ...range });
      await openAuthenticatedPdf(`/api/student-progress/pdf?${query.toString()}`, { autoPrint: false });
    } catch (pdfError) {
      setEntryMessage({ type: "error", text: pdfError.message || "Không mở được PDF tiến bộ." });
    } finally {
      setPdfLoading(false);
    }
  }

  const summary = timeline?.summary || {};
  const latestRow = [...reportRows].sort((left, right) =>
    String(right.month || "").localeCompare(String(left.month || ""))
  )[0] || {};
  const identity = timeline?.student || {};
  const classInfo = timeline?.class || {};
  const focusLabel = latestRow.focus_skill_label || summary.focus_skill_key || "Chưa đủ dữ liệu";

  return (
    <div className="w-full min-w-0 space-y-5" data-testid="student-progress-detail-page">
      <header className="overflow-hidden rounded-2xl border border-indigo-900/20 bg-slate-950 text-white shadow-lg">
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <button type="button" className="inline-flex items-center gap-2 text-sm font-bold text-indigo-200 hover:text-white" onClick={() => navigate("/student-progress")}>
              <ArrowLeft size={16} /> Danh sách tiến bộ
            </button>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Student Progress Intelligence</p>
            <h1 className="mt-2 text-3xl font-black">{identity.name || latestRow.student_name || "Học viên"}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              {classInfo.name || latestRow.class_name || "Lớp học"} · {classInfo.track_key || latestRow.english_track || "unknown"} · Phụ huynh: {identity.parent_name || latestRow.parent_name || "Chưa cập nhật"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary inline-flex items-center gap-2 border-slate-600 bg-slate-900 text-white" onClick={() => setRefreshNonce((value) => value + 1)} disabled={loading}>
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Làm mới
            </button>
            <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={printPdf} disabled={pdfLoading || loading} data-testid="print-progress-pdf">
              <Download size={16} /> {pdfLoading ? "Đang tạo PDF..." : "Xuất PDF phụ huynh"}
            </button>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Bộ lọc tiến bộ">
        <div className="grid gap-4 lg:grid-cols-[auto_minmax(13rem,1fr)_auto] lg:items-end">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Phạm vi</span>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Chọn phạm vi báo cáo">
              {PERIODS.map((period) => (
                <button key={period.value} type="button" className={periodMode === period.value ? "btn-primary" : "btn-secondary"} onClick={() => setPeriodMode(period.value)} aria-pressed={periodMode === period.value}>
                  {period.label}
                </button>
              ))}
            </div>
          </div>
          {periodMode === "custom" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Từ ngày<input className="input mt-2 w-full" type="date" value={customRange.from} onChange={(event) => event.target.value && setCustomRange((value) => ({ ...value, from: event.target.value }))} /></label>
              <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Đến ngày<input className="input mt-2 w-full" type="date" value={customRange.to} onChange={(event) => event.target.value && setCustomRange((value) => ({ ...value, to: event.target.value }))} /></label>
            </div>
          ) : (
            <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              Mốc thời gian
              <input className="input mt-2 w-full" type={periodMode === "year" ? "number" : periodMode === "month" ? "month" : "date"} min={periodMode === "year" ? "2000" : undefined} max={periodMode === "year" ? "2100" : undefined} value={periodMode === "year" ? anchor.slice(0, 4) : periodMode === "month" ? anchor.slice(0, 7) : anchor} onChange={(event) => {
                const value = event.target.value;
                if (!value) return;
                setAnchor(periodMode === "year" ? `${value}-01-01` : periodMode === "month" ? `${value}-01` : value);
              }} />
            </label>
          )}
          <div>
            <span className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Hiển thị chart</span>
            <div className="mt-2 flex gap-2">
              <button type="button" className={scoreMode === "raw" ? "btn-primary" : "btn-secondary"} onClick={() => setScoreMode("raw")}>Điểm thô</button>
              <button type="button" className={scoreMode === "weighted" ? "btn-primary" : "btn-secondary"} onClick={() => setScoreMode("weighted")}>Quy đổi</button>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
          <CalendarRange size={15} /> {range.from} đến {range.to} · API tự tổng hợp theo {timeline?.granularity || "..."}
        </div>
      </section>

      {loading ? (
        <div className="space-y-4" aria-busy="true">
          <LoadingProgress label="Đang phân tích tiến bộ học viên..." />
          <div className="grid gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((item) => <SkeletonBlock key={item} className="h-28" />)}</div>
          <SkeletonBlock className="h-96" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-800" role="alert">
          <div className="flex items-center gap-2 font-black"><AlertTriangle size={20} /> Không tải được dashboard</div>
          <p className="mt-2 text-sm">{error}</p>
          <button type="button" className="btn-secondary mt-4" onClick={() => setRefreshNonce((value) => value + 1)}>Thử lại</button>
        </div>
      ) : (
        <>
          <section className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={BookOpenCheck} label="Điểm gần nhất" value={formatProgressValue(summary.latest_score, "/100")} helper={`Điểm đầu kỳ: ${formatProgressValue(summary.first_score, "/100")}`} tone={metricTone(summary.latest_score)} />
            <Metric icon={TrendingUp} label="Tăng trưởng" value={summary.growth === null || summary.growth === undefined ? "—" : `${summary.growth > 0 ? "+" : ""}${summary.growth}`} helper="So với evidence đầu kỳ" tone={Number(summary.growth) >= 0 ? "text-emerald-700" : "text-rose-700"} />
            <Metric icon={Target} label="Cần tập trung" value={focusLabel} helper={`${timeline?.days?.length || 0} ngày có evidence`} tone="text-amber-700" />
            <Metric icon={Sparkles} label="Điểm cộng dồn" value={formatProgressValue(summary.cumulative_points)} helper={summary.alert_score_drop ? "Cảnh báo giảm trên 15%" : "Chưa phát hiện giảm mạnh"} tone={summary.alert_score_drop ? "text-rose-700" : "text-indigo-700"} />
          </section>

          <ProgressDashboardCharts timeline={timeline} scoreMode={scoreMode} />
          <ProgressTimelineTable days={timeline?.days || []} selectedDate={entryDate} onSelectDate={setEntryDate} />
          <ProgressDailyEntryForm
            entryDate={entryDate}
            form={entryForm}
            teachers={teachers}
            loading={entryLoading}
            saving={entrySaving}
            deleting={entryDeleting}
            locked={entryLocked}
            unavailable={!entryReady}
            hasEntries={entryHasData}
            message={entryMessage}
            onDateChange={setEntryDate}
            onChange={setEntryForm}
            onCopyPrevious={copyPrevious}
            onSave={saveEntry}
            onDelete={deleteEntry}
          />
        </>
      )}
    </div>
  );
}
