import { createElement, useDeferredValue, useEffect, useMemo, useState } from "react";
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
import { reportsService, studentProgressService } from "../services/api";
import { useAsyncData } from "../hooks/useAsyncData";
import ProgressInputPanel from "../components/student-progress/ProgressInputPanel";
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
  PageIntro,
} from "../components/ui/OperationalPage";

const PAGE_SIZE_OPTIONS = [50, 100, 200];
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
const PROGRESS_SKILL_FIELDS = [
  { skill_key: "listening", skill_label: "Nghe" },
  { skill_key: "speaking", skill_label: "Nói" },
  { skill_key: "reading", skill_label: "Đọc" },
  { skill_key: "writing", skill_label: "Viết" },
  { skill_key: "homework", skill_label: "BTVN" },
  { skill_key: "daily_practice", skill_label: "Luyện hằng ngày" },
  { skill_key: "mock_test", skill_label: "Bài kiểm tra / đề" },
];

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
    from: `${month.slice(0, 4)}-01`,
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

function nullableNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function stringifyInput(value) {
  return value === null || value === undefined ? "" : String(value);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function defaultClassType(row) {
  const track = row?.progress_assessment?.trackKey || row?.english_track;
  if (["ket", "pet"].includes(track)) return "exam_prep";
  if (["starters", "movers", "flyers"].includes(track)) return "communicative";
  return "mixed";
}

function buildProgressForm(row, progressMonth) {
  if (!row) return null;
  const recordSkills = new Map(
    (progressMonth?.skills || []).map((skill) => [skill.skill_key, skill])
  );
  const assessmentSkills = new Map(
    (row.progress_assessment?.skillScores || []).map((skill) => [skill.key, skill])
  );

  return {
    track_key:
      progressMonth?.track_key ||
      row.progress_assessment?.trackKey ||
      row.english_track ||
      "unknown",
    class_type:
      progressMonth?.class_type ||
      row.progress_assessment?.classType ||
      defaultClassType(row),
    focus_skill_key:
      progressMonth?.focus_skill_key ||
      row.progress_assessment?.focusSkillKey ||
      "",
    focus_skill_label:
      progressMonth?.focus_skill_label ||
      row.progress_assessment?.focusSkillLabel ||
      "",
    teacher_note: progressMonth?.teacher_note || "",
    parent_summary: progressMonth?.parent_summary || "",
    finalized: Boolean(progressMonth?.finalized_at),
    skills: PROGRESS_SKILL_FIELDS.map((skill, index) => {
      const recordSkill = recordSkills.get(skill.skill_key);
      const assessmentSkill = assessmentSkills.get(skill.skill_key);
      const source = recordSkill || assessmentSkill || {};
      const status = source.status || assessmentSkill?.status;
      return {
        skill_key: skill.skill_key,
        skill_label: recordSkill?.skill_label || assessmentSkill?.label || skill.skill_label,
        score: stringifyInput(source.score),
        max_score: stringifyInput(recordSkill?.max_score || 100),
        weight: recordSkill?.weight ?? null,
        status: status || "missing_input",
        note:
          recordSkill?.note ||
          (assessmentSkill?.status === "available" ? assessmentSkill.note || "" : ""),
        source: recordSkill?.source || "teacher_input",
        sort_order: recordSkill?.sort_order ?? index,
      };
    }),
    daily_entries: (progressMonth?.daily_entries || progressMonth?.dailyEntries || []).map((entry) => ({
      entry_date: entry.entry_date || "",
      entry_type: entry.entry_type || "daily_practice",
      skill_key: entry.skill_key || "",
      score: stringifyInput(entry.score),
      shield_count: stringifyInput(entry.shield_count || 0),
      note: entry.note || "",
    })),
  };
}

function serializeProgressForm(row, form) {
  return {
    student_id: row.student_id,
    class_id: row.class_id,
    month: row.month,
    track_key: form.track_key,
    class_type: form.class_type,
    focus_skill_key: form.focus_skill_key || null,
    focus_skill_label: form.focus_skill_label || null,
    teacher_note: form.teacher_note || null,
    parent_summary: form.parent_summary || null,
    finalized: Boolean(form.finalized),
    skills: (form.skills || []).map((skill) => ({
      skill_key: skill.skill_key,
      skill_label: skill.skill_label,
      score: nullableNumber(skill.score),
      max_score: nullableNumber(skill.max_score) || 100,
      weight: nullableNumber(skill.weight),
      status: nullableNumber(skill.score) === null ? "missing_input" : "available",
      note: skill.note || null,
      source: skill.source || "teacher_input",
      sort_order: skill.sort_order,
    })),
    daily_entries: (form.daily_entries || []).map((entry) => ({
      entry_date: entry.entry_date,
      entry_type: entry.entry_type,
      skill_key: entry.skill_key || null,
      score: nullableNumber(entry.score),
      shield_count: nullableNumber(entry.shield_count) || 0,
      note: entry.note || null,
    })),
  };
}

function rowKey(row) {
  return row ? `${row.student_id}\u0000${row.class_id}\u0000${row.month}` : "";
}

function getAssessment(row) {
  return row?.progress_assessment || null;
}

function getRowSkills(row) {
  const assessmentSkills = getAssessment(row)?.skillScores;
  if (Array.isArray(assessmentSkills) && assessmentSkills.length) {
    return assessmentSkills.map((skill) => ({
      key: skill.key,
      label: skill.label,
      score: skill.score,
      status: skill.status,
      note: skill.note,
    }));
  }
  return (row?.skill_scores || []).map((skill) => ({
    key: skill.key,
    label: skill.label,
    score: skill.score,
    status:
      skill.status ||
      (skill.score === null || skill.score === undefined ? "missing_input" : "available"),
    note: skill.note,
  }));
}

function academicStatusLabel(row) {
  const status = getAssessment(row)?.academicInputStatus || row?.academic_input_status;
  if (status === "complete") return "Đã đủ điểm kỹ năng";
  if (status === "partial") return "Đã nhập một phần";
  return "Thiếu điểm kỹ năng";
}

function teacherInputLabel(row) {
  return getAssessment(row)?.hasTeacherInput || row?.has_teacher_input
    ? "Có input giáo viên"
    : "Cần giáo viên nhập";
}

function buildPrintableRow(row, form) {
  if (!row || !form) return row;
  return {
    ...row,
    parent_summary: form.parent_summary || row.parent_summary,
    skill_scores: (form.skills || []).map((skill) => ({
      key: skill.skill_key,
      label: skill.skill_label,
      score: nullableNumber(skill.score),
      status: nullableNumber(skill.score) === null ? "missing_input" : "available",
      note: skill.note || "",
    })),
    progress_assessment: {
      ...(row.progress_assessment || {}),
      hasTeacherInput:
        (form.skills || []).some((skill) => nullableNumber(skill.score) !== null) ||
        (form.daily_entries || []).length > 0 ||
        Boolean(form.teacher_note),
      academicInputStatus: (form.skills || []).every(
        (skill) => nullableNumber(skill.score) !== null
      )
        ? "complete"
        : (form.skills || []).some((skill) => nullableNumber(skill.score) !== null)
          ? "partial"
          : "missing_input",
      focusSkillLabel: form.focus_skill_label || row.progress_assessment?.focusSkillLabel || null,
      skillScores: (form.skills || []).map((skill) => ({
        key: skill.skill_key,
        label: skill.skill_label,
        score: nullableNumber(skill.score),
        status: nullableNumber(skill.score) === null ? "missing_input" : "available",
        note: skill.note || "",
      })),
    },
  };
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
      row.progress_score,
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

function printProgressReport(row) {
  if (!row) return;
  const assessment = getAssessment(row);
  const skills = getRowSkills(row)
    .map(
      (skill) =>
        `<tr><td>${escapeHtml(skill.label)}</td><td>${escapeHtml(skill.score ?? "Chua nhap")}</td><td>${escapeHtml(skill.note)}</td></tr>`
    )
    .join("");
  const actions = (row.next_actions || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const evidence = (row.evidence_notes || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const focusSkill = assessment?.focusSkillLabel || row.focus_skill_label || academicStatusLabel(row);
  const teacherStatus = teacherInputLabel(row);
  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Bao cao tien bo - ${escapeHtml(row.student_name)}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
        h1 { margin: 0; font-size: 28px; }
        h2 { margin-top: 28px; font-size: 18px; }
        .muted { color: #64748b; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 24px 0; }
        .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; }
        .value { font-size: 24px; font-weight: 800; margin-top: 8px; }
        table { border-collapse: collapse; width: 100%; margin-top: 12px; }
        th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; vertical-align: top; }
        th { background: #f8fafc; }
        @media print { button { display: none; } body { margin: 18mm; } }
      </style>
    </head>
    <body>
      <button onclick="window.print()">In bao cao</button>
      <h1>Bao cao tien bo hoc vien</h1>
      <p class="muted">${escapeHtml(row.month)} - ${escapeHtml(row.class_name)} - ${escapeHtml(row.track_label)} (${escapeHtml(row.cefr_level)})</p>
      <h2>${escapeHtml(row.student_name)}</h2>
      <p>Phu huynh: ${escapeHtml(row.parent_name || "Chua co")} - ${escapeHtml(row.parent_phone || "")}</p>
      <div class="grid">
        <div class="card"><div>Diem tien bo</div><div class="value">${escapeHtml(row.progress_score)}/100</div></div>
        <div class="card"><div>Chuyen can</div><div class="value">${escapeHtml(row.actual_present_rate)}%</div></div>
        <div class="card"><div>Buoi hoc</div><div class="value">${escapeHtml(row.recorded_sessions)}/${escapeHtml(row.expected_sessions)}</div></div>
        <div class="card"><div>Do phu du lieu</div><div class="value">${escapeHtml(row.learning_evidence_coverage)}%</div></div>
      </div>
      <h2>Nhan xet thang</h2>
      <p>${escapeHtml(row.parent_summary)}</p>
      <p class="muted">Input hoc thuat: ${escapeHtml(teacherStatus)}. Trong tam thang toi: ${escapeHtml(focusSkill)}.</p>
      <h2>Ky nang Cambridge</h2>
      <table>
        <thead><tr><th>Ky nang</th><th>Diem</th><th>Ghi chu</th></tr></thead>
        <tbody>${skills}</tbody>
      </table>
      <h2>Khuyen nghi thang toi</h2>
      <ul>${actions}</ul>
      <h2>Ghi chu du lieu</h2>
      <ul>${evidence}</ul>
    </body>
  </html>`;
  const printWindow = window.open("", "_blank", "width=980,height=720");
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
}

export default function StudentProgressReportPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [selectedRow, setSelectedRow] = useState(null);
  const [progressForm, setProgressForm] = useState(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressSaving, setProgressSaving] = useState(false);
  const [progressMessage, setProgressMessage] = useState(null);
  const deferredSearch = useDeferredValue(filters.q);
  const query = useMemo(
    () => makeQuery(filters, deferredSearch, refreshNonce),
    [filters, deferredSearch, refreshNonce]
  );
  const requestKey = JSON.stringify(query);
  const progressState = useAsyncData(async () => {
    const response = await reportsService.getStudentProgress(query);
    return { ...response.data, __requestKey: requestKey };
  }, requestKey);
  const data = progressState.data;
  const rows = data?.students || [];
  const summary = data?.summary || {};
  const charts = data?.charts || {};
  const isInitialLoading = progressState.loading && !data;
  const isRefreshing = progressState.loading && Boolean(data);
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
    if (latest && latest !== selectedRow) setSelectedRow(latest);
  }, [rows, selectedRow]);

  useEffect(() => {
    if (!selectedRow) {
      setProgressForm(null);
      setProgressMessage(null);
      return;
    }

    let active = true;
    setProgressLoading(true);
    setProgressMessage(null);
    studentProgressService
      .getAll({
        student_id: selectedRow.student_id,
        class_id: selectedRow.class_id,
        month: selectedRow.month,
        limit: 1,
      })
      .then((response) => {
        if (!active) return;
        if (!response.success) {
          setProgressForm(buildProgressForm(selectedRow, null));
          setProgressMessage({
            type: "error",
            text: response.error?.message || "Không tải được bản ghi tiến độ.",
          });
          return;
        }
        const record = response.data?.progress_months?.[0] || null;
        setProgressForm(buildProgressForm(selectedRow, record));
      })
      .finally(() => {
        if (active) setProgressLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedRow?.student_id, selectedRow?.class_id, selectedRow?.month]);

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
      value: `${summary.average_progress_score || 0}/100`,
      helper: "Proxy từ dữ liệu vận hành thật",
      icon: TrendingUp,
      tone: "emerald",
    },
    {
      label: "Chuyên cần TB",
      value: `${summary.average_attendance_score || 0}/100`,
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
    setFilters((current) => ({ ...current, [key]: value, page: key === "page" ? value : 1 }));
  }

  async function saveProgressForm() {
    if (!selectedRow || !progressForm) return;
    setProgressSaving(true);
    setProgressMessage(null);

    try {
      const response = await studentProgressService.saveMonth(
        serializeProgressForm(selectedRow, progressForm)
      );
      if (!response.success) {
        setProgressMessage({
          type: "error",
          text: response.error?.message || "Khong luu duoc tien do.",
        });
        return;
      }

      const savedRecord = response.data?.progress_month || null;
      setProgressForm(buildProgressForm(selectedRow, savedRecord));
      setProgressMessage({ type: "success", text: "Da luu tien do hoc vien." });
      setRefreshNonce((value) => value + 1);
    } catch (error) {
      setProgressMessage({
        type: "error",
        text: error?.message || "Khong luu duoc tien do.",
      });
    } finally {
      setProgressSaving(false);
    }
  }

  return (
    <OperationalPage data-testid="student-progress-page">
      <PageIntro
        eyebrow="Học thuật · Parent Report"
        title="Báo cáo tiến bộ học viên"
        description="Theo dõi tiến độ hàng tháng cho phụ huynh dựa trên dữ liệu lớp, điểm danh, học phí và khung Starters/Movers/Flyers/KET/PET. Các điểm kỹ năng chưa có input sẽ được ghi rõ, không tự suy diễn."
        status="Evidence-first"
        actions={
          <>
            <button
              type="button"
              className="btn-secondary inline-flex items-center gap-2"
              onClick={() => setRefreshNonce((value) => value + 1)}
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
          </>
        }
      />

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
          <label className="text-sm font-bold text-slate-700">
            Lớp học
            <select
              className="input mt-2"
              value={filters.class_id}
              onChange={(event) => updateFilter("class_id", event.target.value)}
            >
              <option value="all">Tất cả lớp</option>
              {(data?.meta?.classes || []).map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.class_name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">
            Track
            <select
              className="input mt-2"
              value={filters.track}
              onChange={(event) => updateFilter("track", event.target.value)}
            >
              <option value="all">Tất cả track</option>
              {Object.entries(data?.framework?.tracks || {}).map(([key, track]) => (
                <option key={key} value={key}>
                  {track.label}
                </option>
              ))}
            </select>
          </label>
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
          <button className="btn-primary mt-5" type="button" onClick={() => progressState.reload()}>
            Thử lại
          </button>
        </section>
      ) : (
        <>
          {isRefreshing && (
            <LoadingProgress label="Đang cập nhật báo cáo, dữ liệu cũ vẫn được giữ trên màn hình..." />
          )}

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
                    data={charts.skill_averages || []}
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

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]">
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
                      <th className="px-4 py-3 text-left">Tháng</th>
                      <th className="px-4 py-3 text-left">Tiến bộ</th>
                      <th className="px-4 py-3 text-left">Dữ liệu</th>
                      <th className="px-4 py-3 text-left">Trạng thái</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {rows.map((row) => (
                      <tr key={`${row.student_id}-${row.class_id}-${row.month}`} className="hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <div className="font-black text-slate-950">{row.student_name}</div>
                          <div className="text-xs text-slate-500">{row.parent_name || "Chưa có phụ huynh"}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-800">{row.class_name}</div>
                          <div className="mt-1 inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                            {row.track_label} · {row.cefr_level}
                          </div>
                        </td>
                        <td className="px-4 py-4 font-bold text-slate-700">{monthLabel(row.month)}</td>
                        <td className="px-4 py-4">
                          <div className="font-black text-slate-950">{row.progress_score}/100</div>
                          <div className="mt-1 h-2 w-28 rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-indigo-500"
                              style={{ width: `${Math.min(100, row.progress_score)}%` }}
                            />
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {row.recorded_sessions}/{row.expected_sessions} buổi · {row.actual_present_rate}% có mặt
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-800">{row.learning_evidence_coverage}%</div>
                          <div
                            className={`text-xs ${
                              getAssessment(row)?.hasTeacherInput || row.has_teacher_input
                                ? "text-emerald-600"
                                : "text-amber-600"
                            }`}
                          >
                            {academicStatusLabel(row)}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-400">
                            {teacherInputLabel(row)}
                          </div>
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
                              onClick={() => setSelectedRow(row)}
                            >
                              <Eye size={14} />
                              Xem
                            </button>
                            <button
                              type="button"
                              className="btn-primary inline-flex items-center gap-2 px-3 py-2 text-xs"
                              onClick={() => printProgressReport(row)}
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
              className="xl:sticky xl:top-4 xl:self-start"
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
                    <MiniStat icon={BookOpenCheck} label="Tiến bộ" value={`${selectedRow.progress_score}/100`} />
                    <MiniStat icon={Activity} label="Buổi học" value={`${selectedRow.recorded_sessions}/${selectedRow.expected_sessions}`} />
                    <MiniStat icon={ShieldAlert} label="Độ phủ dữ liệu" value={`${selectedRow.learning_evidence_coverage}%`} />
                  </div>
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
                  <ProgressInputPanel
                    row={selectedRow}
                    form={progressForm}
                    loading={progressLoading}
                    saving={progressSaving}
                    message={progressMessage}
                    onChange={setProgressForm}
                    onSave={saveProgressForm}
                  />
                  <button
                    type="button"
                    className="btn-primary w-full inline-flex items-center justify-center gap-2"
                    onClick={() => printProgressReport(buildPrintableRow(selectedRow, progressForm))}
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
    </OperationalPage>
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
