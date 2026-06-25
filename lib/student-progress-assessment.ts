import type { ReportCubeRow } from "./report-cube.js";

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

export type ProgressEntryType = "homework" | "daily_practice" | "mock_test" | "shield" | "note";

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
  progressScore: number;
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

const BASE_RUBRICS: Record<
  ProgressClassType,
  Record<ProgressSkillKey, number>
> = {
  communicative: {
    listening: 25,
    speaking: 25,
    reading: 15,
    writing: 15,
    homework: 10,
    daily_practice: 10,
    mock_test: 0,
  },
  exam_prep: {
    listening: 15,
    speaking: 15,
    reading: 25,
    writing: 25,
    homework: 8,
    daily_practice: 4,
    mock_test: 8,
  },
  mixed: {
    listening: 20,
    speaking: 20,
    reading: 20,
    writing: 20,
    homework: 10,
    daily_practice: 5,
    mock_test: 5,
  },
};

const TRACK_RUBRIC_OVERRIDES: Partial<
  Record<ProgressTrackKey, Partial<Record<ProgressSkillKey, number>>>
> = {
  starters: {
    listening: 28,
    speaking: 28,
    reading: 14,
    writing: 14,
    homework: 8,
    daily_practice: 8,
    mock_test: 0,
  },
  movers: {
    listening: 26,
    speaking: 26,
    reading: 16,
    writing: 16,
    homework: 8,
    daily_practice: 8,
    mock_test: 0,
  },
  flyers: {
    listening: 22,
    speaking: 22,
    reading: 18,
    writing: 18,
    homework: 10,
    daily_practice: 10,
    mock_test: 0,
  },
  ket: {
    listening: 18,
    speaking: 18,
    reading: 24,
    writing: 24,
    homework: 8,
    daily_practice: 4,
    mock_test: 4,
  },
  pet: {
    listening: 16,
    speaking: 16,
    reading: 26,
    writing: 26,
    homework: 8,
    daily_practice: 4,
    mock_test: 4,
  },
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

export function detectProgressTrackKey(className: string | null | undefined): ProgressTrackKey {
  const normalized = String(className || "").toLowerCase();
  for (const [key, track] of Object.entries(TRACKS) as Array<
    [ProgressTrackKey, (typeof TRACKS)[ProgressTrackKey]]
  >) {
    if (key === "unknown") continue;
    if (track.keywords.some((keyword) => normalized.includes(keyword))) return key;
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
  classType: ProgressClassType
) {
  const base = { ...BASE_RUBRICS[classType] };
  const override = TRACK_RUBRIC_OVERRIDES[trackKey];
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
  const score = Number(entry.score);
  return Number.isFinite(score) ? score : null;
}

function fallbackProgressScore(row: ReportCubeRow) {
  if (row.expected_sessions <= 0) return 0;
  return round1(clamp(row.actual_present_rate * 0.72 + row.record_completion_rate * 0.28));
}

function fallbackConsistencyScore(row: ReportCubeRow) {
  if (row.expected_sessions <= 0) return 0;
  const missingPenalty = Math.max(0, row.expected_sessions - row.recorded_sessions) * 4;
  const absencePenalty = row.status_counts.absent_no_fee * 10 + row.status_counts.absent_with_fee * 5;
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
  progressScore: number
): ProgressAssessmentResult["readinessBand"] {
  if (row.expected_sessions <= 0 || row.recorded_sessions <= 0) return "insufficient_data";
  if (row.risk_flags.includes("attendance_incomplete") || row.risk_flags.includes("low_present_rate")) {
    return progressScore >= 78 ? "watch" : "needs_support";
  }
  if (progressScore >= 85) return "on_track";
  if (progressScore >= 70) return "watch";
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
}) {
  const { row, progressMonth, parentName } = input;
  const trackKey = progressMonth?.trackKey || detectProgressTrackKey(row.class_name);
  const classType = progressMonth?.classType
    ? normalizeProgressClassType(progressMonth.classType)
    : defaultClassTypeForTrack(trackKey);
  const track = TRACKS[trackKey];
  const rubric = buildProgressRubric(trackKey, classType);
  const skillMap = new Map(
    (progressMonth?.skills || []).map((skill) => [skill.skill_key, skill])
  );

  const skillScores = rubric.map((skill, index) => {
    const entry = skillMap.get(skill.key);
    const score = entry ? normalizeSkillScore(entry.score, entry.max_score ?? 100) : null;
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
    };
  });

  const totalWeight = skillScores.reduce((sum, skill) => sum + (skill.weight || 0), 0);
  const availableWeight = skillScores.reduce(
    (sum, skill) => sum + ((skill.status === "available" ? skill.weight || 0 : 0)),
    0
  );
  const weightedSkillScore =
    availableWeight > 0
      ? round1(
          skillScores.reduce((sum, skill) => {
            if (skill.status !== "available" || skill.score === null) return sum;
            return sum + skill.score * (skill.weight || 0);
          }, 0) / availableWeight
        )
      : null;

  const teacherEntries = countTeacherEntries(progressMonth);
  const hasTeacherInput = skillScores.some((skill) => skill.status === "available") ||
    teacherEntries.dailyCount > 0 ||
    (progressMonth?.teacherNote?.trim()?.length || 0) > 0;

  const attendanceScore = progressMonth?.attendanceScore ?? fallbackProgressScore(row);
  const consistencyScore = progressMonth?.consistencyScore ?? fallbackConsistencyScore(row);
  const evidenceCoverage = progressMonth?.learningEvidenceCoverage ?? fallbackCoverage(row);

  const progressScore = progressMonth?.progressScore ??
    (weightedSkillScore === null
      ? fallbackProgressScore(row)
      : round1(
          clamp(weightedSkillScore * 0.6 + attendanceScore * 0.25 + consistencyScore * 0.15)
        ));

  const readinessBand =
    progressMonth?.trackReadiness === "on_track" ||
    progressMonth?.trackReadiness === "watch" ||
    progressMonth?.trackReadiness === "needs_support" ||
    progressMonth?.trackReadiness === "insufficient_data"
      ? progressMonth.trackReadiness
      : fallbackReadiness(row, progressScore);

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

  const academicInputStatus: ProgressAssessmentResult["academicInputStatus"] = !hasTeacherInput
    ? "missing_input"
    : availableWeight >= totalWeight
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
    attendanceScore,
    consistencyScore,
    learningEvidenceCoverage: evidenceCoverage,
    readinessBand,
    trendLabel: buildTrendLabel(input.previousScore === undefined ? null : input.previousScore === null ? null : round1(progressScore - input.previousScore)),
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
    rubricSnapshot: {
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
