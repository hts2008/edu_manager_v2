import type { VercelRequest, VercelResponse } from "../../../lib/vercel-types.js";
import {
  AuthedRequest,
  errorResponse,
  handleCors,
  successResponse,
} from "../../../lib/auth.js";
import { requirePermission } from "../../../lib/require-permission.js";
import {
  ApiError,
  getString,
  sendApiError,
  toDateOnly,
} from "../../../lib/api-utils.js";
import {
  defaultClassTypeForTrack,
  buildProgressAssessment,
  detectProgressTrackKey,
  PROGRESS_SKILL_LABELS,
  summarizeDailyAssessmentRollup,
  type ProgressDailyEntryInput,
  type ProgressSkillKey,
} from "../../../lib/student-progress-assessment.js";
import { appendProgressActivity, assertProgressMonthEditable } from "../../../lib/student-progress-finalization.js";
import { normalizeProgressEntrySemantics } from "../../../lib/progress-difficulty.js";
import { assertAttendanceWriteEnrollment } from "../../../lib/attendance-enrollment-guard.js";
import {
  deriveMockTestScores,
} from "../../../lib/student-progress-daily-metrics.js";
import { loadProgressOperationalRow } from "../../../lib/student-progress-operational-row.js";
import { getSettings } from "../../../lib/settings.js";
import { storedProgressScore } from "../../../lib/student-progress-evidence.js";
import {
  studentProgressDailyDeleteSchema,
  studentProgressDailyPutSchema,
  studentProgressDailyQuerySchema,
  validateBody,
} from "../../../lib/validation.js";

const DAILY_ROLLUP_SOURCE = "daily_rollup";
const ALL_SKILL_COUNT = Object.keys(PROGRESS_SKILL_LABELS).length;

function requireTenantId(req: AuthedRequest): string {
  const tenantId = req.user.tenantId;
  if (!tenantId) {
    throw new ApiError(
      "TENANT_CONTEXT_REQUIRED",
      "A tenant-scoped session is required for student progress",
      409,
    );
  }
  return tenantId;
}

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function nextDate(value: Date) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function dailyEntryToDto(entry: any) {
  const semantics = normalizeProgressEntrySemantics(
    entry.examSetLevel,
    entry.difficultyLevel
  );
  return {
    id: entry.id,
    entry_date: toDateOnly(entry.entryDate),
    entry_type: entry.entryType,
    skill_key: entry.skillKey,
    score: entry.score,
    shield_count: entry.shieldCount,
    exam_set_level: semantics.examSetLevel,
    difficulty_level: semantics.difficultyLevel,
    entry_label: entry.entryLabel,
    graded_by_teacher_id: entry.gradedByTeacherId,
    note: entry.note,
    created_by: entry.createdById,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  };
}

function rollupToDto(rollup: ReturnType<typeof summarizeDailyAssessmentRollup>) {
  return {
    average_score: rollup.averageScore,
    latest_score: rollup.latestScore,
    score_delta: rollup.scoreDelta,
    assessment_count: rollup.assessmentCount,
    focus_skill_key: rollup.focusSkillKey,
    focus_skill_label: rollup.focusSkillLabel,
    skills: rollup.skills.map((skill) => ({
      skill_key: skill.skillKey,
      skill_label: skill.skillLabel,
      status: skill.status,
      average_score: skill.averageScore,
      latest_score: skill.latestScore,
      score_delta: skill.scoreDelta,
      assessment_count: skill.assessmentCount,
    })),
  };
}

function progressMonthRollupToDto(record: any) {
  if (!record) return null;
  return {
    id: record.id,
    student_id: record.studentId,
    class_id: record.classId,
    month: record.month,
    progress_score: storedProgressScore(record),
    score_source: record.rubricSnapshot?.scoreEvidence?.source || (record.finalizedAt ? "legacy_unknown" : null),
    track_key: record.trackKey,
    daily_average_score: record.dailyAverageScore,
    daily_latest_score: record.dailyLatestScore,
    daily_score_delta: record.dailyScoreDelta,
    daily_assessment_count: record.dailyAssessmentCount,
    focus_skill_key: record.focusSkillKey,
    focus_skill_label: record.focusSkillLabel,
    academic_input_status: record.academicInputStatus,
    shield_total: record.shieldTotal,
    points_total: record.pointsTotal,
    mock_test_score: record.mockTestScore,
    finalized_at: record.finalizedAt,
    is_finalized: Boolean(record.finalizedAt),
    revision_number: record.revisionNumber || 0,
    updated_at: record.updatedAt,
  };
}

function entryRowsToRollupInput(entries: any[]): ProgressDailyEntryInput[] {
  return entries.map((entry) => ({
    entry_date: entry.entryDate,
    entry_type: entry.entryType,
    skill_key: entry.skillKey,
    score: entry.score,
    shield_count: entry.shieldCount,
    exam_set_level: normalizeProgressEntrySemantics(entry.examSetLevel, entry.difficultyLevel).examSetLevel,
    difficulty_level: normalizeProgressEntrySemantics(entry.examSetLevel, entry.difficultyLevel).difficultyLevel,
    note: entry.note,
  }));
}

function average(values: number[]) {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

export async function recomputeMonthlyRollup(
  tx: any,
  progressMonth: any,
  tenantId: string,
  userId: string
) {
  const entries = await tx.studentProgressDailyEntry.findMany({
    where: { tenantId, progressMonthId: progressMonth.id },
    orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
  });
  const rollup = summarizeDailyAssessmentRollup(entryRowsToRollupInput(entries));
  const availableSkills = rollup.skills.filter(
    (skill) => skill.status === "available" && skill.averageScore !== null
  );

  const existingSkills = await tx.studentProgressSkill.findMany({
    where: { tenantId, progressMonthId: progressMonth.id },
    select: { skillKey: true, score: true, source: true, maxScore: true, weight: true },
  });
  const manualSkills = existingSkills.filter(
    (skill: any) => skill.source !== DAILY_ROLLUP_SOURCE
  );

  // Daily evidence has dedicated rollup columns. Remove legacy generated skill
  // rows so it can never overwrite teacher-authored monthly skill input.
  await tx.studentProgressSkill.deleteMany({
    where: {
      tenantId,
      progressMonthId: progressMonth.id,
      source: DAILY_ROLLUP_SOURCE,
    },
  });

  const availableSkillKeys = new Set([
    ...manualSkills
      .filter((skill: any) => skill.score !== null)
      .map((skill: any) => skill.skillKey),
    ...availableSkills.map((skill) => skill.skillKey),
  ]);
  const availableSkillCount = availableSkillKeys.size;
  const academicInputStatus =
    availableSkillCount === 0
      ? "missing_input"
      : availableSkillCount >= ALL_SKILL_COUNT
        ? "complete"
        : "partial";
  const shieldTotal = entries.reduce(
    (sum: number, entry: any) => sum + Math.max(0, Number(entry.shieldCount || 0)),
    0
  );
  const pointsTotal = Math.round(
    entries.reduce((sum: number, entry: any) => {
      const score = Number(entry.score);
      return Number.isFinite(score) ? sum + score : sum;
    }, 0)
  );
  const mockTestScores = deriveMockTestScores(entries);
  const [row, settings] = await Promise.all([
    loadProgressOperationalRow(tx, progressMonth.studentId, progressMonth.classId, progressMonth.month),
    getSettings(tx, { tenantId, group: "academic", effectiveMonth: progressMonth.month }),
  ]);
  if (settings.settings.some((setting: any) => setting.warnings?.length)) {
    throw new ApiError("INVALID_SETTING_VALUE", "Invalid academic settings", 409);
  }
  const assessment = buildProgressAssessment({ row, settings: { settings: settings.settings }, progressMonth: {
    id: progressMonth.id, studentId: progressMonth.studentId, classId: progressMonth.classId,
    month: progressMonth.month, trackKey: progressMonth.trackKey, classType: progressMonth.classType,
    teacherNote: progressMonth.teacherNote, dailyEntries: entryRowsToRollupInput(entries),
    skills: manualSkills.map((skill: any) => ({ skill_key: skill.skillKey, score: skill.score,
      max_score: skill.maxScore, weight: skill.weight, source: skill.source })),
  } });

  const updatedProgressMonth = await tx.studentProgressMonth.update({
    where: { id: progressMonth.id, tenantId },
    data: {
      progressScore: assessment.progressScore ?? 0,
      attendanceScore: assessment.attendanceScore,
      consistencyScore: assessment.consistencyScore,
      trackReadiness: assessment.readinessBand,
      rubricSnapshot: assessment.rubricSnapshot,
      learningEvidenceCoverage: Math.round((availableSkillCount / ALL_SKILL_COUNT) * 1000) / 10,
      dailyAverageScore: rollup.averageScore,
      dailyLatestScore: rollup.latestScore,
      dailyScoreDelta: rollup.scoreDelta,
      dailyAssessmentCount: rollup.assessmentCount,
      focusSkillKey:
        rollup.focusSkillKey || (manualSkills.length ? progressMonth.focusSkillKey : null),
      focusSkillLabel:
        rollup.focusSkillLabel || (manualSkills.length ? progressMonth.focusSkillLabel : null),
      academicInputStatus,
      shieldTotal,
      pointsTotal,
      mockTestScore: average(mockTestScores),
      updatedById: userId,
    },
  });

  return { entries, progressMonth: updatedProgressMonth, rollup };
}

async function runSerializableTransaction<T>(
  db: AuthedRequest["db"],
  operation: (tx: any) => Promise<T>
): Promise<T> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await db.$transaction(operation, {
        isolationLevel: "Serializable",
      });
    } catch (error: any) {
      if (error?.code !== "P2034") throw error;
      if (attempt === 3) throw new ApiError("DAILY_PROGRESS_CONFLICT", "Progress changed concurrently; reload and retry", 409);
    }
  }
  throw new ApiError("DAILY_PROGRESS_CONFLICT", "Could not serialize daily progress update", 409);
}

function queryInput(req: AuthedRequest) {
  return {
    student_id: getString(req.query.student_id || req.query.studentId),
    class_id: getString(req.query.class_id || req.query.classId),
    month: getString(req.query.month),
    entry_date: getString(req.query.entry_date || req.query.entryDate),
  };
}

async function listDailyEntries(req: AuthedRequest, res: VercelResponse) {
  const tenantId = requireTenantId(req);
  const query = validateBody(studentProgressDailyQuerySchema, queryInput(req));
  const month = query.month || query.entry_date?.slice(0, 7) || "";
  const progressMonth = await req.db.studentProgressMonth.findUnique({
    where: {
      tenantId_studentId_classId_month: {
        tenantId,
        studentId: query.student_id,
        classId: query.class_id,
        month,
      },
    },
  });

  if (!progressMonth) {
    const emptyRollup = summarizeDailyAssessmentRollup([]);
    return successResponse(res, {
      progress_month: null,
      student_id: query.student_id,
      class_id: query.class_id,
      month,
      entry_date: query.entry_date || null,
      note: null,
      daily_entries: [],
      rollup: rollupToDto(emptyRollup),
    });
  }

  const selectedDate = query.entry_date ? parseDateOnly(query.entry_date) : null;
  const dailyEntries = await req.db.studentProgressDailyEntry.findMany({
    where: {
      tenantId,
      progressMonthId: progressMonth.id,
      ...(selectedDate
        ? { entryDate: { gte: selectedDate, lt: nextDate(selectedDate) } }
        : {}),
    },
    orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
  });
  const monthlyEntries = selectedDate
    ? await req.db.studentProgressDailyEntry.findMany({
        where: { tenantId, progressMonthId: progressMonth.id },
        orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
      })
    : dailyEntries;
  const rollup = summarizeDailyAssessmentRollup(entryRowsToRollupInput(monthlyEntries));
  const note =
    dailyEntries.find((entry: any) => entry.entryType === "note" && entry.note)?.note || null;
  const progressDto = progressMonthRollupToDto(progressMonth);
  if (progressDto && !progressMonth.finalizedAt) {
    const [row, settings, skills] = await Promise.all([
      loadProgressOperationalRow(req.db, query.student_id, query.class_id, month),
      getSettings(req.db, { tenantId, group: "academic", effectiveMonth: month }),
      req.db.studentProgressSkill.findMany({ where: { tenantId, progressMonthId: progressMonth.id } }),
    ]);
    if (settings.settings.some((setting: any) => setting.warnings?.length)) {
      throw new ApiError("INVALID_SETTING_VALUE", "Invalid academic settings", 409);
    }
    const assessment = buildProgressAssessment({ row, settings: { settings: settings.settings },
      progressMonth: { id: progressMonth.id, studentId: query.student_id, classId: query.class_id,
        month, trackKey: progressMonth.trackKey as any, classType: progressMonth.classType as any,
        dailyEntries: entryRowsToRollupInput(monthlyEntries), skills: skills.map((skill: any) => ({
          skill_key: skill.skillKey, score: skill.score, max_score: skill.maxScore, source: skill.source,
        })) } });
    Object.assign(progressDto, { progress_score: assessment.progressScore, score_source: assessment.scoreSource });
  }

  return successResponse(res, {
    progress_month: progressDto,
    student_id: query.student_id,
    class_id: query.class_id,
    month,
    entry_date: query.entry_date || null,
    note,
    daily_entries: dailyEntries.map(dailyEntryToDto),
    rollup: rollupToDto(rollup),
  });
}

async function replaceDailyEntries(req: AuthedRequest, res: VercelResponse) {
  const tenantId = requireTenantId(req);
  const body = validateBody(studentProgressDailyPutSchema, {
    ...req.body,
    student_id: req.body?.student_id || req.body?.studentId,
    class_id: req.body?.class_id || req.body?.classId,
    entry_date: req.body?.entry_date || req.body?.entryDate,
  });
  const entryDate = parseDateOnly(body.entry_date);
  const month = body.entry_date.slice(0, 7);
  const enrollment = (await req.db.studentClass.findFirst({
    where: {
      tenantId,
      studentId: body.student_id,
      classId: body.class_id,
      student: { deletedAt: null },
    },
    include: {
      class: {
        select: {
          className: true,
          teacherId: true,
          teacher: { select: { status: true } },
        },
      },
    },
  })) as null | {
    class: {
      className: string;
      teacherId: string | null;
      teacher: { status: string } | null;
    };
  };
  if (!enrollment) {
    throw new ApiError("ENROLLMENT_NOT_FOUND", "Student is not enrolled in this class", 404);
  }

  const requestedGraderIds = new Set(
    body.entries
      .map((entry) => entry.graded_by_teacher_id)
      .filter((teacherId): teacherId is string => Boolean(teacherId))
  );
  if (
    requestedGraderIds.size > 0 &&
    (requestedGraderIds.size !== 1 ||
      !enrollment.class.teacherId ||
      !requestedGraderIds.has(enrollment.class.teacherId) ||
      enrollment.class.teacher?.status !== "active")
  ) {
    throw new ApiError(
      "GRADER_NOT_ASSIGNED",
      "graded_by_teacher_id must be the active teacher assigned to this class",
      400
    );
  }

  const attendance = await req.db.attendance.findFirst({
    where: {
      tenantId,
      studentId: body.student_id,
      classId: body.class_id,
      attendanceDate: { gte: entryDate, lt: nextDate(entryDate) },
    },
    select: { id: true },
  });
  const attendanceContextAvailable = true;
  const contextNote =
    body.note?.trim() ||
    body.entries.find((entry) => entry.note?.trim())?.note?.trim() ||
    null;
  if (attendanceContextAvailable && !attendance && !contextNote) {
    throw new ApiError(
      "NON_ATTENDANCE_NOTE_REQUIRED",
      "note is required when entry_date is not an attendance date",
      400
    );
  }

  const normalizedEntries = body.entries.map((entry) => {
    const semantics = normalizeProgressEntrySemantics(
      entry.exam_set_level,
      entry.difficulty_level
    );
    return {
      entryType: entry.entry_type,
      skillKey: entry.skill_key || null,
      score: entry.score ?? null,
      shieldCount: entry.shield_count || 0,
      examSetLevel: semantics.examSetLevel,
      difficultyLevel: semantics.difficultyLevel,
      entryLabel: entry.entry_label || null,
      gradedByTeacherId: entry.graded_by_teacher_id || null,
      note: entry.note || null,
    };
  });
  if (
    body.note?.trim() &&
    !normalizedEntries.some(
      (entry) => entry.entryType === "note" && entry.note === body.note?.trim()
    )
  ) {
    normalizedEntries.push({
      entryType: "note",
      skillKey: null,
      score: null,
      shieldCount: 0,
      examSetLevel: null,
      difficultyLevel: null,
      entryLabel: null,
      gradedByTeacherId: null,
      note: body.note.trim(),
    });
  }

  const result = await runSerializableTransaction(req.db, async (tx) => {
    const assignment = await tx.class.findFirst({ where: { id: body.class_id, tenantId },
      select: { className: true, teacherId: true, teacher: { select: { status: true } } } });
    if (!assignment || (requestedGraderIds.size > 0 &&
      (requestedGraderIds.size !== 1 || !assignment.teacherId ||
        !requestedGraderIds.has(assignment.teacherId) || assignment.teacher?.status !== "active"))) {
      throw new ApiError("GRADER_NOT_ASSIGNED", "Assigned active teacher changed; reload and retry", 409);
    }
    const effectiveSettings = await getSettings(tx, { tenantId, group: "academic", effectiveMonth: month });
    if (effectiveSettings.settings.some((setting: any) => setting.warnings?.length)) {
      throw new ApiError("INVALID_SETTING_VALUE", "Invalid academic settings", 409);
    }
    await assertAttendanceWriteEnrollment(tx, {
      classId: body.class_id,
      records: [{ studentId: body.student_id, attendanceDate: entryDate }],
    });
    const existing = await tx.studentProgressMonth.findUnique({
      where: {
        tenantId_studentId_classId_month: {
          tenantId,
          studentId: body.student_id,
          classId: body.class_id,
          month,
        },
      },
    });
    assertProgressMonthEditable(existing?.finalizedAt);
    const trackKey = existing?.trackKey || detectProgressTrackKey(assignment.className,
      { settings: effectiveSettings.settings });
    const progressMonth =
      existing ||
      (await tx.studentProgressMonth.create({
        data: {
          tenantId,
          studentId: body.student_id,
          classId: body.class_id,
          month,
          trackKey,
          classType: defaultClassTypeForTrack(trackKey),
          academicInputStatus: "missing_input",
          createdById: req.user.id,
          updatedById: req.user.id,
        },
      }));

    await tx.studentProgressDailyEntry.deleteMany({
      where: {
        tenantId,
        progressMonthId: progressMonth.id,
        entryDate: { gte: entryDate, lt: nextDate(entryDate) },
      },
    });
    if (normalizedEntries.length) {
      await tx.studentProgressDailyEntry.createMany({
        data: normalizedEntries.map((entry) => ({
          tenantId,
          progressMonthId: progressMonth.id,
          entryDate,
          entryType: entry.entryType,
          skillKey: entry.skillKey,
          score: entry.score,
          shieldCount: entry.shieldCount,
          examSetLevel: entry.examSetLevel,
          difficultyLevel: entry.difficultyLevel,
          entryLabel: entry.entryLabel,
          gradedByTeacherId: entry.gradedByTeacherId,
          note: entry.note,
          createdById: req.user.id,
        })),
      });
    }

    const recomputed = await recomputeMonthlyRollup(
      tx,
      progressMonth,
      tenantId,
      req.user.id
    );
    await appendProgressActivity(tx, req, "REPLACE_STUDENT_PROGRESS_DAILY", progressMonth.id);
    return recomputed;
  });

  const selectedEntries = result.entries.filter(
    (entry: any) => toDateOnly(entry.entryDate) === body.entry_date
  );
  return successResponse(res, {
    progress_month: progressMonthRollupToDto(result.progressMonth),
    student_id: body.student_id,
    class_id: body.class_id,
    month,
    entry_date: body.entry_date,
    note: contextNote,
    daily_entries: selectedEntries.map(dailyEntryToDto),
    rollup: rollupToDto(result.rollup),
  });
}

async function deleteDailyEntries(req: AuthedRequest, res: VercelResponse) {
  const tenantId = requireTenantId(req);
  const query = validateBody(studentProgressDailyDeleteSchema, queryInput(req));
  const entryDate = parseDateOnly(query.entry_date);
  const month = query.entry_date.slice(0, 7);
  const progressMonth = await req.db.studentProgressMonth.findUnique({
    where: {
      tenantId_studentId_classId_month: {
        tenantId,
        studentId: query.student_id,
        classId: query.class_id,
        month,
      },
    },
  });

  if (!progressMonth) {
    return successResponse(res, {
      progress_month: null,
      student_id: query.student_id,
      class_id: query.class_id,
      month,
      entry_date: query.entry_date,
      deleted_count: 0,
      daily_entries: [],
      rollup: rollupToDto(summarizeDailyAssessmentRollup([])),
    });
  }

  const result = await runSerializableTransaction(req.db, async (tx) => {
    const current = await tx.studentProgressMonth.findUnique({
      where: { id: progressMonth.id, tenantId },
    });
    if (!current) {
      throw new ApiError("PROGRESS_MONTH_NOT_FOUND", "Progress month not found", 404);
    }
    assertProgressMonthEditable(current.finalizedAt);
    const deleted = await tx.studentProgressDailyEntry.deleteMany({
      where: {
        tenantId,
        progressMonthId: progressMonth.id,
        entryDate: { gte: entryDate, lt: nextDate(entryDate) },
      },
    });
    const recomputed = await recomputeMonthlyRollup(
      tx,
      current,
      tenantId,
      req.user.id
    );
    await appendProgressActivity(tx, req, "DELETE_STUDENT_PROGRESS_DAILY", progressMonth.id);
    return { ...recomputed, deletedCount: deleted.count };
  });

  return successResponse(res, {
    progress_month: progressMonthRollupToDto(result.progressMonth),
    student_id: query.student_id,
    class_id: query.class_id,
    month,
    entry_date: query.entry_date,
    deleted_count: result.deletedCount,
    daily_entries: [],
    rollup: rollupToDto(result.rollup),
  });
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  try {
    if (req.method === "GET") return listDailyEntries(req, res);
    if (req.method === "PUT") return replaceDailyEntries(req, res);
    if (req.method === "DELETE") return deleteDailyEntries(req, res);
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
  } catch (error) {
    return sendApiError(res, error, "STUDENT_PROGRESS_DAILY_ERROR");
  }
}

const viewHandler = requirePermission("progress.view", handler);
const gradeHandler = requirePermission("progress.grade", handler);

export default function route(req: VercelRequest, res: VercelResponse) {
  return req.method === "GET"
    ? viewHandler(req, res)
    : gradeHandler(req, res);
}
