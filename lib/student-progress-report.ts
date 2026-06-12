import type { ReportCubeRow } from "./report-cube.js";

export type EnglishTrackKey =
  | "starters"
  | "movers"
  | "flyers"
  | "ket"
  | "pet"
  | "unknown";

type SkillStatus = "missing_input" | "available";

export type ProgressSkill = {
  key: string;
  label: string;
  status: SkillStatus;
  score: number | null;
  note: string;
};

export type ProgressReportRow = ReportCubeRow & {
  parent_name: string | null;
  parent_phone: string | null;
  english_track: EnglishTrackKey;
  track_label: string;
  cefr_level: string;
  progress_score: number;
  attendance_score: number;
  consistency_score: number;
  learning_evidence_coverage: number;
  trend_delta: number | null;
  trend_label: "improving" | "stable" | "declining" | "new";
  readiness_band: "on_track" | "watch" | "needs_support" | "insufficient_data";
  skill_scores: ProgressSkill[];
  parent_summary: string;
  next_actions: string[];
  evidence_notes: string[];
};

export type StudentProgressSummary = {
  student_count: number;
  class_count: number;
  row_count: number;
  average_progress_score: number;
  average_attendance_score: number;
  average_learning_evidence_coverage: number;
  on_track_count: number;
  watch_count: number;
  needs_support_count: number;
  insufficient_data_count: number;
  missing_academic_input_count: number;
};

const TRACKS: Record<
  EnglishTrackKey,
  { label: string; cefr: string; keywords: string[]; canDo: string }
> = {
  starters: {
    label: "Pre A1 Starters",
    cefr: "Pre A1",
    keywords: ["starter", "starters"],
    canDo: "lam quen tieng Anh, tu vung lop hoc, cau hoi ca nhan don gian",
  },
  movers: {
    label: "A1 Movers",
    cefr: "A1",
    keywords: ["mover", "movers"],
    canDo: "hoi dap ve doi song hang ngay va mo ta su vat quen thuoc",
  },
  flyers: {
    label: "A2 Flyers",
    cefr: "A2",
    keywords: ["flyer", "flyers"],
    canDo: "ket noi cau, hieu huong dan va giao tiep trong tinh huong quen thuoc",
  },
  ket: {
    label: "A2 Key / KET",
    cefr: "A2",
    keywords: ["ket", "key", "a2 key"],
    canDo: "doc viet thong tin don gian, nghe thong bao cham, hoi dap co ban",
  },
  pet: {
    label: "B1 Preliminary / PET",
    cefr: "B1",
    keywords: ["pet", "preliminary", "b1"],
    canDo: "doc y chinh, viet email/bai ngan, nghe hoi thoai doi song, tuong tac tu tin hon",
  },
  unknown: {
    label: "Chua xac dinh",
    cefr: "N/A",
    keywords: [],
    canDo: "can gan track hoc thuat cho lop de bao cao ro hon",
  },
};

const SKILL_TEMPLATE = [
  ["listening", "Listening"],
  ["reading_writing", "Reading & Writing"],
  ["speaking", "Speaking"],
  ["vocabulary_grammar", "Vocabulary & Grammar"],
] as const;

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]) {
  if (!values.length) return 0;
  return round1(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function keyFor(row: Pick<ReportCubeRow, "student_id" | "class_id">) {
  return `${row.student_id}\u0000${row.class_id}`;
}

export function detectEnglishTrack(className: string | null | undefined): EnglishTrackKey {
  const normalized = String(className || "").toLowerCase();
  for (const [key, track] of Object.entries(TRACKS) as Array<
    [EnglishTrackKey, (typeof TRACKS)[EnglishTrackKey]]
  >) {
    if (key === "unknown") continue;
    if (track.keywords.some((keyword) => normalized.includes(keyword))) return key;
  }
  return "unknown";
}

function buildMissingSkillScores(): ProgressSkill[] {
  return SKILL_TEMPLATE.map(([key, label]) => ({
    key,
    label,
    status: "missing_input",
    score: null,
    note: "Chua co diem/rubric hoc thuat duoc nhap cho ky bao cao nay.",
  }));
}

function scoreAttendance(row: ReportCubeRow) {
  if (row.expected_sessions <= 0) return 0;
  return round1(clamp(row.actual_present_rate * 0.72 + row.record_completion_rate * 0.28));
}

function scoreConsistency(row: ReportCubeRow) {
  if (row.expected_sessions <= 0) return 0;
  const missingPenalty = Math.max(0, row.expected_sessions - row.recorded_sessions) * 4;
  const absencePenalty = row.status_counts.absent_no_fee * 10 + row.status_counts.absent_with_fee * 5;
  return round1(clamp(100 - missingPenalty - absencePenalty));
}

function evidenceCoverage(row: ReportCubeRow) {
  let score = 0;
  if (row.expected_sessions > 0) score += 25;
  if (row.recorded_sessions > 0) score += 30;
  if (row.monthly_fee_line_id || row.monthly_fee_id) score += 15;
  if (row.fee_status) score += 5;
  return score;
}

function readinessBand(
  row: ReportCubeRow,
  progressScore: number
): ProgressReportRow["readiness_band"] {
  if (row.expected_sessions <= 0 || row.recorded_sessions <= 0) return "insufficient_data";
  if (row.risk_flags.includes("attendance_incomplete") || row.risk_flags.includes("low_present_rate")) {
    return progressScore >= 78 ? "watch" : "needs_support";
  }
  if (progressScore >= 85) return "on_track";
  if (progressScore >= 70) return "watch";
  return "needs_support";
}

function trendLabel(delta: number | null): ProgressReportRow["trend_label"] {
  if (delta === null) return "new";
  if (delta >= 5) return "improving";
  if (delta <= -5) return "declining";
  return "stable";
}

function nextActions(row: ReportCubeRow, track: EnglishTrackKey) {
  const actions: string[] = [];
  if (row.expected_sessions <= 0) {
    actions.push("Cap nhat lich hoc/lop de tinh dung so buoi ky vong.");
  }
  if (row.recorded_sessions < row.expected_sessions) {
    actions.push("Hoan tat diem danh trong thang truoc khi in bao cao phu huynh.");
  }
  if (row.actual_sessions > 0 && row.actual_present_rate < 80) {
    actions.push("Trao doi voi phu huynh ve chuyen can va sap xep bu hoc neu can.");
  }
  if (track === "unknown") {
    actions.push("Gan track Starters/Movers/Flyers/KET/PET cho lop de co muc tieu hoc thuat ro.");
  }
  actions.push("Nhap diem/nhan xet Listening, Reading & Writing, Speaking de bao cao hoc thuat day du.");
  return actions.slice(0, 4);
}

function evidenceNotes(row: ReportCubeRow) {
  const notes = [
    "Chi so hien tai duoc tinh tu attendance, lich lop va fee ledger that trong he thong.",
  ];
  if (row.expected_sessions <= 0) notes.push("Thieu so buoi ky vong nen khong du de danh gia tien bo.");
  if (!row.monthly_fee_line_id && !row.monthly_fee_id) notes.push("Chua co dong hoc phi thang nay.");
  notes.push("Chua co bang diem hoc thuat nen cac skill Cambridge duoc danh dau missing input.");
  return notes;
}

function parentSummary(
  row: ReportCubeRow,
  track: (typeof TRACKS)[EnglishTrackKey],
  progressScore: number,
  band: ProgressReportRow["readiness_band"]
) {
  const bandText: Record<ProgressReportRow["readiness_band"], string> = {
    on_track: "dang theo dung tien do",
    watch: "can theo doi them",
    needs_support: "can ho tro som",
    insufficient_data: "chua du du lieu de ket luan",
  };
  return `${row.student_name} hoc lop ${row.class_name} theo track ${track.label}. Thang ${row.month}, he thong ghi nhan ${row.recorded_sessions}/${row.expected_sessions} buoi, ty le co mat ${row.actual_present_rate}%, diem tien do van hanh ${progressScore}/100 va trang thai ${bandText[band]}.`;
}

export function buildStudentProgressReport(input: {
  rows: ReportCubeRow[];
  parentsByStudentId?: Map<string, { name: string | null; phone: string | null }>;
}) {
  const sorted = [...input.rows].sort(
    (a, b) =>
      a.student_name.localeCompare(b.student_name) ||
      a.class_name.localeCompare(b.class_name) ||
      a.month.localeCompare(b.month)
  );
  const previousByKey = new Map<string, number>();
  const reportRows: ProgressReportRow[] = [];

  for (const row of sorted) {
    const attendanceScore = scoreAttendance(row);
    const consistencyScore = scoreConsistency(row);
    const progressScore = round1(clamp(attendanceScore * 0.72 + consistencyScore * 0.28));
    const previousScore = previousByKey.get(keyFor(row));
    const trendDelta = previousScore === undefined ? null : round1(progressScore - previousScore);
    previousByKey.set(keyFor(row), progressScore);

    const englishTrack = detectEnglishTrack(row.class_name);
    const track = TRACKS[englishTrack];
    const band = readinessBand(row, progressScore);
    const parent = input.parentsByStudentId?.get(row.student_id);

    reportRows.push({
      ...row,
      parent_name: parent?.name || null,
      parent_phone: parent?.phone || null,
      english_track: englishTrack,
      track_label: track.label,
      cefr_level: track.cefr,
      progress_score: progressScore,
      attendance_score: attendanceScore,
      consistency_score: consistencyScore,
      learning_evidence_coverage: evidenceCoverage(row),
      trend_delta: trendDelta,
      trend_label: trendLabel(trendDelta),
      readiness_band: band,
      skill_scores: buildMissingSkillScores(),
      parent_summary: parentSummary(row, track, progressScore, band),
      next_actions: nextActions(row, englishTrack),
      evidence_notes: evidenceNotes(row),
    });
  }

  return {
    rows: reportRows.sort(
      (a, b) =>
        Number(b.readiness_band === "needs_support") -
          Number(a.readiness_band === "needs_support") ||
        b.month.localeCompare(a.month) ||
        a.student_name.localeCompare(b.student_name)
    ),
    summary: summarizeStudentProgress(reportRows),
    charts: buildStudentProgressCharts(reportRows),
    framework: {
      tracks: Object.fromEntries(
        Object.entries(TRACKS).map(([key, value]) => [
          key,
          {
            label: value.label,
            cefr_level: value.cefr,
            can_do_focus: value.canDo,
          },
        ])
      ),
      skill_domains: SKILL_TEMPLATE.map(([key, label]) => ({ key, label })),
      score_note:
        "progress_score phase 1 is an operational progress proxy from attendance/record completeness, not a formal Cambridge score.",
    },
  };
}

export function summarizeStudentProgress(rows: ProgressReportRow[]): StudentProgressSummary {
  const students = new Set(rows.map((row) => row.student_id));
  const classes = new Set(rows.map((row) => row.class_id));
  return {
    student_count: students.size,
    class_count: classes.size,
    row_count: rows.length,
    average_progress_score: average(rows.map((row) => row.progress_score)),
    average_attendance_score: average(rows.map((row) => row.attendance_score)),
    average_learning_evidence_coverage: average(
      rows.map((row) => row.learning_evidence_coverage)
    ),
    on_track_count: rows.filter((row) => row.readiness_band === "on_track").length,
    watch_count: rows.filter((row) => row.readiness_band === "watch").length,
    needs_support_count: rows.filter((row) => row.readiness_band === "needs_support").length,
    insufficient_data_count: rows.filter((row) => row.readiness_band === "insufficient_data").length,
    missing_academic_input_count: rows.filter((row) =>
      row.skill_scores.some((skill) => skill.status === "missing_input")
    ).length,
  };
}

export function buildStudentProgressCharts(rows: ProgressReportRow[]) {
  const monthly = new Map<string, ProgressReportRow[]>();
  const tracks = new Map<string, number>();
  const readiness = new Map<string, number>();

  for (const row of rows) {
    const monthRows = monthly.get(row.month) || [];
    monthRows.push(row);
    monthly.set(row.month, monthRows);
    tracks.set(row.track_label, (tracks.get(row.track_label) || 0) + 1);
    readiness.set(row.readiness_band, (readiness.get(row.readiness_band) || 0) + 1);
  }

  return {
    monthly: Array.from(monthly.entries())
      .map(([month, items]) => ({
        month,
        progress_score: average(items.map((row) => row.progress_score)),
        attendance_score: average(items.map((row) => row.attendance_score)),
        evidence_coverage: average(items.map((row) => row.learning_evidence_coverage)),
        row_count: items.length,
      }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    tracks: Array.from(tracks.entries()).map(([label, count]) => ({ label, count })),
    readiness: Array.from(readiness.entries()).map(([label, count]) => ({ label, count })),
  };
}
