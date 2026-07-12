export class ProgressFinalizationError extends Error {
  code: string;
  status: number;
  statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = "ProgressFinalizationError";
    this.code = code;
    this.status = statusCode;
    this.statusCode = statusCode;
  }
}

export function assertProgressMonthEditable(finalizedAt: Date | string | null | undefined) {
  if (!finalizedAt) return;
  throw new ProgressFinalizationError(
    "PROGRESS_MONTH_FINALIZED",
    "This progress month is finalized; reopen it with an admin reason before editing",
    409
  );
}

export function normalizeReopenReason(value: unknown) {
  const reason = typeof value === "string" ? value.trim() : "";
  if (reason.length < 10) {
    throw new ProgressFinalizationError(
      "PROGRESS_REOPEN_REASON_REQUIRED",
      "A reopen reason of at least 10 characters is required",
      400
    );
  }
  return reason;
}

function dateOnly(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

function isoDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
}

export function buildProgressRevisionSnapshot(record: any) {
  return {
    id: record.id,
    student_id: record.studentId,
    class_id: record.classId,
    month: record.month,
    track_key: record.trackKey ?? null,
    class_type: record.classType ?? null,
    progress_score: record.progressScore ?? 0,
    attendance_score: record.attendanceScore ?? 0,
    consistency_score: record.consistencyScore ?? 0,
    learning_evidence_coverage: record.learningEvidenceCoverage ?? 0,
    track_readiness: record.trackReadiness ?? null,
    focus_skill_key: record.focusSkillKey ?? null,
    focus_skill_label: record.focusSkillLabel ?? null,
    teacher_note: record.teacherNote ?? null,
    parent_summary: record.parentSummary ?? null,
    next_actions: Array.isArray(record.nextActions) ? record.nextActions : [],
    evidence_notes: Array.isArray(record.evidenceNotes) ? record.evidenceNotes : [],
    rubric_snapshot: record.rubricSnapshot ?? null,
    academic_input_status: record.academicInputStatus ?? "missing_input",
    shield_total: record.shieldTotal ?? 0,
    points_total: record.pointsTotal ?? 0,
    mock_test_score: record.mockTestScore ?? null,
    daily_average_score: record.dailyAverageScore ?? null,
    daily_latest_score: record.dailyLatestScore ?? null,
    daily_score_delta: record.dailyScoreDelta ?? null,
    daily_assessment_count: record.dailyAssessmentCount ?? 0,
    finalized_at: isoDate(record.finalizedAt),
    skills: (record.skills || []).map((skill: any) => ({
      skill_key: skill.skillKey,
      skill_label: skill.skillLabel,
      score: skill.score ?? null,
      max_score: skill.maxScore ?? 100,
      weight: skill.weight ?? 0,
      status: skill.status ?? (skill.score == null ? "missing_input" : "available"),
      note: skill.note ?? null,
      source: skill.source ?? null,
      sort_order: skill.sortOrder ?? 0,
    })),
    daily_entries: (record.dailyEntries || []).map((entry: any) => ({
      id: entry.id,
      entry_date: dateOnly(entry.entryDate),
      entry_type: entry.entryType,
      skill_key: entry.skillKey ?? null,
      score: entry.score ?? null,
      shield_count: entry.shieldCount ?? 0,
      note: entry.note ?? null,
      created_by: entry.createdById ?? null,
      created_at: isoDate(entry.createdAt),
    })),
  };
}
