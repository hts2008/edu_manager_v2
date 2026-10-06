import type { ReportCubeRow } from "./report-cube.js";
import {
  academicEntrySignature,
  PROGRESS_FORMULA_VERSION,
  scoredAcademicEntries,
  type ProgressScoreSource,
} from "./student-progress-evidence.js";
import {
  resolveAcademicSettings,
  academicContextFromSnapshot,
  snapshotAcademicSettings,
  type AcademicSettingsContext,
} from "./academic-settings.js";

export type ProgressTrackKey =
  | "starters"
  | "movers"
  | "flyers"
  | "ket"
  | "pet"
  | "unknown";

export type ProgressClassType = "communicative" | "exam_prep" | "mixed";

export type ProgressSkillKey =
  | "listening"
  | "speaking"
  | "reading"
  | "writing"
  | "homework"
  | "daily_practice"
  | "mock_test";

export type ProgressEntryType =
  | "homework"
  | "daily_practice"
  | "skill_assessment"
  | "mock_test"
  | "shield"
  | "note";

export type ProgressSkillInput = {
  skill_key: ProgressSkillKey;
  skill_label?: string | null;
  score?: number | null;
  max_score?: number | null;
  weight?: number | null;
  status?: string | null;
  note?: string | null;
  source?: string | null;
  sort_order?: number | null;
};

export type ProgressDailyEntryInput = {
  entry_date: string | Date;
  entry_type: ProgressEntryType;
  skill_key?: ProgressSkillKey | null;
  score?: number | null;
  shield_count?: number | null;
  exam_set_level?: string | null;
  difficulty_level?: string | null;
  entry_label?: string | null;
  graded_by_teacher_id?: string | null;
  note?: string | null;
};

export type ProgressMonthSnapshot = {
  id: string;
  studentId: string;
  classId: string;
  month: string;
  trackKey?: ProgressTrackKey | null;
  classType?: ProgressClassType | null;
  progressScore?: number | null;
  attendanceScore?: number | null;
  consistencyScore?: number | null;
  learningEvidenceCoverage?: number | null;
  trackReadiness?: string | null;
  focusSkillKey?: ProgressSkillKey | null;
  focusSkillLabel?: string | null;
  teacherNote?: string | null;
  parentSummary?: string | null;
  nextActions?: unknown;
  evidenceNotes?: unknown;
  rubricSnapshot?: unknown;
  academicInputStatus?: string | null;
  shieldTotal?: number | null;
  pointsTotal?: number | null;
  mockTestScore?: number | null;
  finalizedAt?: string | Date | null;
  skills?: ProgressSkillInput[] | null;
  dailyEntries?: ProgressDailyEntryInput[] | null;
};

export type ProgressAssessmentResult = {
  trackKey: ProgressTrackKey;
  trackLabel: string;
  cefrLevel: string;
  classType: ProgressClassType;
  skillScores: Array<{
    key: ProgressSkillKey;
    label: string;
    status: "missing_input" | "available";
    score: number | null;
    note: string;
  }>;
  progressScore: number | null;
  scoreSource: ProgressScoreSource;
  comparisonSignature: string | null;
  contributors: ProgressSkillKey[];
  evidenceCount: number;
  assessedDateCount: number;
  attendanceScore: number;
  consistencyScore: number;
  learningEvidenceCoverage: number;
  readinessBand: "on_track" | "watch" | "needs_support" | "insufficient_data";
  trendLabel: "improving" | "stable" | "declining" | "new";
  focusSkillKey: ProgressSkillKey | null;
  focusSkillLabel: string | null;
  parentSummary: string;
  nextActions: string[];
  evidenceNotes: string[];
  academicInputStatus: "missing_input" | "partial" | "complete";
  shieldTotal: number;
  pointsTotal: number;
  mockTestScore: number | null;
  hasTeacherInput: boolean;
  rubricSnapshot: Record<string, unknown>;
};

export type DailyAssessmentRollup = {
  averageScore: number | null;
  latestScore: number | null;
  scoreDelta: number | null;
  assessmentCount: number;
  focusSkillKey: ProgressSkillKey | null;
  focusSkillLabel: string | null;
  skills: Array<{
    skillKey: ProgressSkillKey;
    skillLabel: string;
    status: "missing_input" | "available";
    averageScore: number | null;
    latestScore: number | null;
    scoreDelta: number | null;
    assessmentCount: number;
  }>;
};

const TRACKS: Record<
  ProgressTrackKey,
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

export function defaultClassTypeForTrack(trackKey: ProgressTrackKey): ProgressClassType {
  if (trackKey === "starters" || trackKey === "movers" || trackKey === "flyers") {
    return "communicative";
  }
  if (trackKey === "ket" || trackKey === "pet") {
    return "exam_prep";
  }
  return "mixed";
}

const SKILL_ORDER: ProgressSkillKey[] = [
  "listening",
  "speaking",
  "reading",
  "writing",
  "homework",
  "daily_practice",
  "mock_test",
];

export const PROGRESS_SKILL_LABELS: Record<ProgressSkillKey, string> = {
  listening: "Nghe",
  speaking: "Nói",
  reading: "Đọc",
  writing: "Viết",
  homework: "BTVN",
  daily_practice: "Luyện hằng ngày",
  mock_test: "Bài kiểm tra / đề",
};

const PROGRESS_SKILL_HINTS: Record<ProgressSkillKey, string> = {
  listening: "Nghe chậm và nhắc lại để tăng phản xạ.",
  speaking: "Luyện phát âm và nói thành câu ngắn, rõ ý.",
  reading: "Đọc theo cụm và tìm ý chính trước.",
  writing: "Viết câu hoàn chỉnh, chú ý chính tả và cấu trúc.",
  homework: "Hoàn thành bài tập về nhà đúng hạn.",
  daily_practice: "Duy trì luyện tập hằng ngày để không đứt mạch tiến bộ.",
  mock_test: "Làm đề đúng thời gian và rà lỗi sau khi làm.",
};

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

function sortableEntryDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
}

export function summarizeDailyAssessmentRollup(
  entries: ProgressDailyEntryInput[]
): DailyAssessmentRollup {
  const assessmentEntries = entries
    .filter(
      (entry): entry is ProgressDailyEntryInput & { skill_key: ProgressSkillKey } =>
        entry.entry_type === "skill_assessment" &&
        Boolean(entry.skill_key) &&
        SKILL_ORDER.includes(entry.skill_key as ProgressSkillKey)
    )
    .map((entry) => {
      const numericScore =
        entry.score === null || entry.score === undefined ? null : Number(entry.score);
      return {
        ...entry,
        score: Number.isFinite(numericScore) ? clamp(numericScore as number) : null,
      };
    });

  const skillKeys = SKILL_ORDER.filter((skillKey) =>
    assessmentEntries.some((entry) => entry.skill_key === skillKey)
  );
  const skills = skillKeys.map((skillKey) => {
    const skillEntries = assessmentEntries
      .filter((entry) => entry.skill_key === skillKey && entry.score !== null)
      .sort((left, right) => sortableEntryDate(left.entry_date) - sortableEntryDate(right.entry_date));
    const scores = skillEntries.map((entry) => entry.score as number);
    const dates = new Map<number, typeof skillEntries>();
    for (const entry of skillEntries) {
      const date = sortableEntryDate(entry.entry_date);
      dates.set(date, [...(dates.get(date) || []), entry]);
    }
    const datedEntries = [...dates].sort(([a], [b]) => a - b).map(([, entries]) => entries);
    const dailyScores = datedEntries.map((entries) => average(entries.map((entry) => entry.score as number)));
    const firstScore = dailyScores[0] ?? null;
    const latestScore = dailyScores.at(-1) ?? null;

    return {
      skillKey,
      skillLabel: PROGRESS_SKILL_LABELS[skillKey],
      status: scores.length ? ("available" as const) : ("missing_input" as const),
      averageScore: scores.length ? average(scores) : null,
      latestScore,
      scoreDelta:
        dailyScores.length < 2 || firstScore === null || latestScore === null ||
        datedEntries.some((entries) => JSON.stringify(academicEntrySignature(entries)) !==
          JSON.stringify(academicEntrySignature(datedEntries[0])))
          ? null : round1(latestScore - firstScore),
      assessmentCount: scores.length,
    };
  });

  const scoredEntries = assessmentEntries
    .filter((entry): entry is typeof entry & { score: number } => entry.score !== null)
    .sort((left, right) => sortableEntryDate(left.entry_date) - sortableEntryDate(right.entry_date));
  const scores = scoredEntries.map((entry) => entry.score);
  const byDate = new Map<number, typeof scoredEntries>();
  for (const entry of scoredEntries) {
    const date = sortableEntryDate(entry.entry_date);
    byDate.set(date, [...(byDate.get(date) || []), entry]);
  }
  const days = [...byDate].sort(([a], [b]) => a - b).map(([, entries]) => {
    const values = SKILL_ORDER.map((key) => entries.filter((entry) => entry.skill_key === key))
      .filter((entries) => entries.length).map((entries) => average(entries.map((entry) => entry.score)));
    return { score: average(values), signature: JSON.stringify(academicEntrySignature(entries)) };
  });
  const first = days[0];
  const latest = days.at(-1);
  const latestScore = latest?.score ?? null;
  const focusSkill =
    skills
      .filter(
        (skill): skill is typeof skill & { averageScore: number } =>
          skill.averageScore !== null
      )
      .sort(
        (left, right) =>
          left.averageScore - right.averageScore ||
          SKILL_ORDER.indexOf(left.skillKey) - SKILL_ORDER.indexOf(right.skillKey)
      )[0] || null;

  return {
    averageScore: scores.length ? average(scores) : null,
    latestScore,
    scoreDelta:
      days.length < 2 || days.some((day) => day.signature !== first?.signature) ? null : round1(latest!.score - first!.score),
    assessmentCount: scores.length,
    focusSkillKey: focusSkill?.skillKey || null,
    focusSkillLabel: focusSkill?.skillLabel || null,
    skills,
  };
}

export function detectProgressTrackKey(
  className: string | null | undefined,
  settings?: AcademicSettingsContext,
): ProgressTrackKey {
  const normalized = String(className || "").toLowerCase();
  for (const track of resolveAcademicSettings(settings).trackCatalog) {
    if (track.key === "unknown") continue;
    if (track.keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
      return track.key;
    }
  }
  return "unknown";
}

export function normalizeProgressClassType(value: unknown): ProgressClassType {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "exam_prep" || normalized === "exam-prep" || normalized === "exam") {
    return "exam_prep";
  }
  if (normalized === "communicative" || normalized === "communication") {
    return "communicative";
  }
  return "mixed";
}

export function buildProgressRubric(
  trackKey: ProgressTrackKey,
  classType: ProgressClassType,
  settings?: AcademicSettingsContext,
) {
  const academic = resolveAcademicSettings(settings);
  const base = { ...academic.rubricBaseWeights[classType] };
  const override = trackKey === "unknown"
    ? undefined
    : academic.rubricTrackOverrides[trackKey];
  const weights = override ? { ...base, ...override } : base;

  return SKILL_ORDER.map((skillKey, index) => ({
    key: skillKey,
    label: PROGRESS_SKILL_LABELS[skillKey],
    weight: weights[skillKey] ?? 0,
    focusHint: PROGRESS_SKILL_HINTS[skillKey],
    sortOrder: index,
  }));
}

function normalizeSkillScore(score: unknown, maxScore: unknown) {
  if (score === null || score === undefined || score === "") return null;
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) return null;
  const numericMax = Number(maxScore);
  if (!Number.isFinite(numericMax) || numericMax <= 0) {
    return clamp(numericScore);
  }
  return clamp((numericScore / numericMax) * 100);
}

function scoreEntryValue(entry: ProgressDailyEntryInput) {
  if (entry.score === null || entry.score === undefined) return null;
  const score = Number(entry.score);
  return Number.isFinite(score) ? score : null;
}

function fallbackProgressScore(row: ReportCubeRow, settings?: AcademicSettingsContext) {
  if (row.expected_sessions <= 0) return 0;
  const weights = resolveAcademicSettings(settings).fallbackScoreWeights;
  return round1(clamp(
    row.actual_present_rate * weights.attendance +
    row.record_completion_rate * weights.completion,
  ));
}

function fallbackConsistencyScore(row: ReportCubeRow, settings?: AcademicSettingsContext) {
  if (row.expected_sessions <= 0) return 0;
  const penalties = resolveAcademicSettings(settings).consistencyPenalties;
  const missingPenalty = Math.max(0, row.expected_sessions - row.recorded_sessions) * penalties.missingSession;
  const absencePenalty =
    row.status_counts.absent_no_fee * penalties.absentNoFee +
    row.status_counts.absent_with_fee * penalties.absentWithFee;
  return round1(clamp(100 - missingPenalty - absencePenalty));
}

function fallbackCoverage(row: ReportCubeRow) {
  let score = 0;
  if (row.expected_sessions > 0) score += 25;
  if (row.recorded_sessions > 0) score += 30;
  if (row.monthly_fee_line_id || row.monthly_fee_id) score += 15;
  if (row.fee_status) score += 5;
  return score;
}

function fallbackReadiness(
  row: ReportCubeRow,
  progressScore: number,
  settings?: AcademicSettingsContext,
): ProgressAssessmentResult["readinessBand"] {
  const thresholds = resolveAcademicSettings(settings).readinessThresholds;
  if (row.expected_sessions <= 0 || row.recorded_sessions <= 0) return "insufficient_data";
  if (row.risk_flags.includes("attendance_incomplete") || row.risk_flags.includes("low_present_rate")) {
    return progressScore >= thresholds.riskAdjusted ? "watch" : "needs_support";
  }
  if (progressScore >= thresholds.onTrack) return "on_track";
  if (progressScore >= thresholds.watch) return "watch";
  return "needs_support";
}

function buildTrendLabel(delta: number | null): ProgressAssessmentResult["trendLabel"] {
  if (delta === null) return "new";
  if (delta >= 5) return "improving";
  if (delta <= -5) return "declining";
  return "stable";
}

function deriveFocusSkill(
  skillScores: ProgressAssessmentResult["skillScores"],
  rubric: ReturnType<typeof buildProgressRubric>
) {
  const available = skillScores.filter((skill) => skill.status === "available");
  const missing = skillScores.filter((skill) => skill.status === "missing_input");
  const target =
    missing.sort(
      (a, b) =>
        (rubric.find((item) => item.key === b.key)?.weight || 0) -
        (rubric.find((item) => item.key === a.key)?.weight || 0)
    )[0] ||
    available.sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0] ||
    skillScores[0] ||
    null;

  if (!target) return { key: null, label: null };
  return { key: target.key, label: target.label };
}

function countTeacherEntries(progressMonth?: ProgressMonthSnapshot | null) {
  const skillCount = progressMonth?.skills?.length || 0;
  const dailyCount = progressMonth?.dailyEntries?.length || 0;
  return { skillCount, dailyCount };
}

export function buildProgressAssessment(input: {
  row: ReportCubeRow;
  progressMonth?: ProgressMonthSnapshot | null;
  parentName?: string | null;
  previousScore?: number | null;
  settings?: AcademicSettingsContext;
}) {
  const { row, progressMonth, parentName } = input;
  const frozenSettings = progressMonth?.finalizedAt
    ? academicContextFromSnapshot((progressMonth.rubricSnapshot as any)?.academicSettings) : undefined;
  const settings = frozenSettings ?? input.settings;
  const academic = resolveAcademicSettings(settings);
  const trackKey = progressMonth?.trackKey || detectProgressTrackKey(row.class_name, settings);
  const classType = progressMonth?.classType
    ? normalizeProgressClassType(progressMonth.classType)
    : defaultClassTypeForTrack(trackKey);
  const configuredTrack = academic.trackCatalog.find((candidate) => candidate.key === trackKey);
  const track = configuredTrack
    ? {
        label: configuredTrack.label,
        cefr: configuredTrack.cefr,
        keywords: configuredTrack.keywords,
        canDo: configuredTrack.canDo,
      }
    : TRACKS[trackKey];
  const rubric = buildProgressRubric(trackKey, classType, settings);
  const skillMap = new Map(
    (progressMonth?.skills || []).filter((skill) => skill.source !== "daily_rollup")
      .map((skill) => [skill.skill_key, skill])
  );
  const dailyEntries = scoredAcademicEntries(progressMonth?.dailyEntries || [], SKILL_ORDER);
  const dailyRollup = summarizeDailyAssessmentRollup(dailyEntries);

  const skillScores = rubric.map((skill, index) => {
    const entry = skillMap.get(skill.key);
    const manualScore = entry ? normalizeSkillScore(entry.score, entry.max_score ?? 100) : null;
    const dailyScore = dailyRollup.skills.find((item) => item.skillKey === skill.key)?.averageScore ?? null;
    const score = manualScore ?? dailyScore;
    const note =
      entry?.note?.trim() ||
      (entry ? skill.focusHint : "Chua co diem/rubric hoc thuat duoc nhap cho ky bao cao nay.");
    const status: "missing_input" | "available" =
      score === null ? "missing_input" : "available";
    return {
      key: skill.key,
      label: skill.label,
      status,
      score,
      note,
      sortOrder: index,
      weight: skill.weight,
      manualScore,
      source: manualScore !== null ? "manual_monthly" : dailyScore !== null ? "daily_raw" : "missing",
    };
  });

  const totalWeight = skillScores.reduce((sum, skill) => sum + (skill.weight || 0), 0);
  const availableWeight = skillScores.reduce(
    (sum, skill) => sum + ((skill.manualScore !== null ? skill.weight || 0 : 0)),
    0
  );
  const weightedSkillScore =
    availableWeight > 0
      ? round1(
          skillScores.reduce((sum, skill) => {
            if (skill.manualScore === null) return sum;
            return sum + skill.manualScore * (skill.weight || 0);
          }, 0) / availableWeight
        )
      : null;

  const teacherEntries = countTeacherEntries(progressMonth);
  const hasTeacherInput = skillScores.some((skill) => skill.status === "available") ||
    teacherEntries.dailyCount > 0 ||
    (progressMonth?.teacherNote?.trim()?.length || 0) > 0;

  const attendanceScore = progressMonth?.finalizedAt
    ? progressMonth.attendanceScore ?? fallbackProgressScore(row, settings) : fallbackProgressScore(row, settings);
  const consistencyScore = progressMonth?.finalizedAt
    ? progressMonth.consistencyScore ?? fallbackConsistencyScore(row, settings) : fallbackConsistencyScore(row, settings);
  const evidenceCoverage = progressMonth?.finalizedAt && progressMonth.learningEvidenceCoverage != null
    ? progressMonth.learningEvidenceCoverage : hasTeacherInput
    ? round1(skillScores.filter((skill) => skill.score !== null).length / SKILL_ORDER.length * 100)
    : fallbackCoverage(row);

  let scoreSource: ProgressScoreSource = weightedSkillScore !== null ? "manual_monthly"
    : dailyRollup.averageScore !== null ? "daily_raw"
    : row.expected_sessions > 0 && row.recorded_sessions > 0 ? "operational_proxy" : "missing";
  let progressScore =
    (weightedSkillScore === null
      ? dailyRollup.averageScore ?? (scoreSource === "operational_proxy"
        ? round1(clamp(attendanceScore * academic.fallbackScoreWeights.attendance +
          consistencyScore * academic.fallbackScoreWeights.completion)) : null)
      : round1(
          clamp(
            weightedSkillScore * academic.scoreBlend.skill +
            attendanceScore * academic.scoreBlend.attendance +
            consistencyScore * academic.scoreBlend.consistency,
          )
        ));

  const contributors = skillScores.filter((skill) => scoreSource === "manual_monthly"
    ? skill.manualScore !== null && skill.weight > 0 : skill.source === "daily_raw").map((skill) => skill.key);
  let comparisonSignature: string | null = scoreSource === "missing" ? null : JSON.stringify({
    version: PROGRESS_FORMULA_VERSION, source: scoreSource, trackKey, classType,
    basis: scoreSource === "manual_monthly"
      ? { blend: academic.scoreBlend, skills: skillScores.filter((skill) => skill.manualScore !== null).map((skill) => [skill.key, skill.weight]) }
      : scoreSource === "daily_raw" ? academicEntrySignature(dailyEntries)
      : { weights: academic.fallbackScoreWeights, penalties: academic.consistencyPenalties },
  });
  const frozen = (progressMonth?.rubricSnapshot as any)?.scoreEvidence;
  if (progressMonth?.finalizedAt && progressMonth.progressScore !== null && progressMonth.progressScore !== undefined) {
    progressScore = frozen?.source === "missing" ? null : progressMonth.progressScore;
    scoreSource = frozen?.formulaVersion === PROGRESS_FORMULA_VERSION ? frozen.source : "legacy_unknown";
    comparisonSignature = frozen?.formulaVersion === PROGRESS_FORMULA_VERSION ? frozen.comparisonSignature ?? null : null;
  }
  const readinessBand = progressScore === null ? "insufficient_data" :
    progressMonth?.finalizedAt && (progressMonth?.trackReadiness === "on_track" ||
    progressMonth?.trackReadiness === "watch" ||
    progressMonth?.trackReadiness === "needs_support" ||
    progressMonth?.trackReadiness === "insufficient_data")
      ? progressMonth.trackReadiness
      : fallbackReadiness(row, progressScore, settings);

  const focusSkill = progressMonth?.focusSkillKey
    ? {
        key: progressMonth.focusSkillKey,
        label:
          progressMonth.focusSkillLabel ||
          PROGRESS_SKILL_LABELS[progressMonth.focusSkillKey] ||
          progressMonth.focusSkillKey,
      }
    : deriveFocusSkill(
        skillScores.map((skill) => ({
          key: skill.key,
          label: skill.label,
          status: skill.status,
          score: skill.score,
          note: skill.note,
        })),
        rubric
      );

  const teacherNote = progressMonth?.teacherNote?.trim() || "";
  const finalNextActions: string[] = [];
  if (row.expected_sessions <= 0) {
    finalNextActions.push("Cap nhat lich hoc/lop de tinh dung so buoi ky vong.");
  }
  if (row.recorded_sessions < row.expected_sessions) {
    finalNextActions.push("Hoan tat diem danh trong thang truoc khi in bao cao phu huynh.");
  }
  if (row.actual_sessions > 0 && row.actual_present_rate < 80) {
    finalNextActions.push("Trao doi voi phu huynh ve chuyen can va sap xep bu hoc neu can.");
  }
  if (trackKey === "unknown") {
    finalNextActions.push("Gan track Starters/Movers/Flyers/KET/PET cho lop de co muc tieu hoc thuat ro.");
  }
  if (focusSkill.key) {
    finalNextActions.push(
      `Tap trung ${focusSkill.label} trong thang toi: ${rubric.find((item) => item.key === focusSkill.key)?.focusHint || ""}`.trim()
    );
  }
  if (teacherNote) {
    finalNextActions.push(`Ghi chu giao vien: ${teacherNote}`);
  }
  if (finalNextActions.length === 0) {
    finalNextActions.push("Tiep tuc duy tri nhiet do hoc tap va ghi nhan du lieu thang toi.");
  }

  const evidenceNotes: string[] = [];
  if (progressMonth) {
    evidenceNotes.push(
      `Da nhap ${teacherEntries.skillCount}/${skillScores.length} diem ky nang va ${teacherEntries.dailyCount} dong hoc tap trong thang.`
    );
    if ((progressMonth.shieldTotal || 0) > 0) {
      evidenceNotes.push(`Tong khiên/diem luy luyen: ${progressMonth.shieldTotal}.`);
    }
    if ((progressMonth.pointsTotal || 0) > 0) {
      evidenceNotes.push(`Tong diem mo phong/de thi: ${progressMonth.pointsTotal}.`);
    }
    if (progressMonth.mockTestScore !== null && progressMonth.mockTestScore !== undefined) {
      evidenceNotes.push(`Diem de thi thu: ${progressMonth.mockTestScore}.`);
    }
  }
  if (row.expected_sessions <= 0) {
    evidenceNotes.push("Thieu so buoi ky vong nen khong du de danh gia tien bo.");
  }
  if (!row.monthly_fee_line_id && !row.monthly_fee_id) {
    evidenceNotes.push("Chua co dong hoc phi thang nay.");
  }
  if (!progressMonth || !hasTeacherInput) {
    evidenceNotes.push("Chua co bang diem hoc thuat nen cac skill Cambridge duoc danh dau missing input.");
  }

  const academicInputStatus: ProgressAssessmentResult["academicInputStatus"] = !skillScores.some((skill) => skill.score !== null)
    ? "missing_input"
    : skillScores.every((skill) => skill.score !== null)
      ? "complete"
      : "partial";

  const parentSummary =
    progressMonth?.parentSummary?.trim() ||
    `${row.student_name} hoc lop ${row.class_name} theo track ${track.label}. Thang ${row.month}, he thong ghi nhan ${row.recorded_sessions}/${row.expected_sessions} buoi, ty le co mat ${row.actual_present_rate}%, diem tien do ${progressScore}/100${hasTeacherInput ? ` va co ${teacherEntries.skillCount} nhom diem hoc thuat duoc nhap.` : " va cac diem hoc thuat van dang missing input."}`;

  return {
    trackKey,
    trackLabel: track.label,
    cefrLevel: track.cefr,
    classType,
    skillScores: skillScores.map(({ key, label, status, score, note }) => ({
      key,
      label,
      status,
      score,
      note,
    })),
    progressScore,
    scoreSource,
    comparisonSignature,
    contributors,
    evidenceCount: dailyEntries.length,
    assessedDateCount: new Set(dailyEntries.map((entry) => sortableEntryDate(entry.entry_date))).size,
    attendanceScore,
    consistencyScore,
    learningEvidenceCoverage: evidenceCoverage,
    readinessBand,
    trendLabel: buildTrendLabel(progressScore === null || input.previousScore == null ? null : round1(progressScore - input.previousScore)),
    focusSkillKey: focusSkill.key as ProgressSkillKey | null,
    focusSkillLabel: focusSkill.label,
    parentSummary,
    nextActions: finalNextActions.slice(0, 5),
    evidenceNotes,
    academicInputStatus,
    shieldTotal: progressMonth?.shieldTotal ?? 0,
    pointsTotal: progressMonth?.pointsTotal ?? 0,
    mockTestScore: progressMonth?.mockTestScore ?? null,
    hasTeacherInput,
    rubricSnapshot: progressMonth?.finalizedAt && progressMonth.rubricSnapshot &&
      typeof progressMonth.rubricSnapshot === "object" && !Array.isArray(progressMonth.rubricSnapshot)
      ? progressMonth.rubricSnapshot as import("@prisma/client").Prisma.InputJsonObject : {
      academicSettings: snapshotAcademicSettings(settings),
      scoreEvidence: { formulaVersion: PROGRESS_FORMULA_VERSION, source: scoreSource,
        value: progressScore, comparisonSignature, contributors, skillScores: skillScores.map(({ key, score, source }) => ({ key, score, source })) },
      trackKey,
      classType,
      skills: rubric,
      track: {
        label: track.label,
        cefrLevel: track.cefr,
        canDoFocus: track.canDo,
      },
    },
  } satisfies ProgressAssessmentResult;
}

export function buildProgressFramework() {
  return {
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
    skill_domains: SKILL_ORDER.map((key) => ({
      key,
      label: PROGRESS_SKILL_LABELS[key],
    })),
    score_note:
      "progress_score is a monthly assessment blend from teacher-entered academic evidence plus operational attendance/consistency data. Missing inputs remain explicitly marked.",
  };
}
