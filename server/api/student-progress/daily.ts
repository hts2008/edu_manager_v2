import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  errorResponse,
  handleCors,
  requireAuth,
  successResponse,
} from "../../../lib/auth.js";
import {
  ApiError,
  getString,
  logActivity,
  sendApiError,
  toDateOnly,
} from "../../../lib/api-utils.js";
import {
  defaultClassTypeForTrack,
  detectProgressTrackKey,
  PROGRESS_SKILL_LABELS,
  summarizeDailyAssessmentRollup,
  type ProgressDailyEntryInput,
  type ProgressSkillKey,
} from "../../../lib/student-progress-assessment.js";
import {
  studentProgressDailyDeleteSchema,
  studentProgressDailyPutSchema,
  studentProgressDailyQuerySchema,
  validateBody,
} from "../../../lib/validation.js";

const DAILY_ROLLUP_SOURCE = "daily_rollup";
const ALL_SKILL_COUNT = Object.keys(PROGRESS_SKILL_LABELS).length;

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function nextDate(value: Date) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function dailyEntryToDto(entry: any) {
  return {
    id: entry.id,
    entry_date: toDateOnly(entry.entryDate),
    entry_type: entry.entryType,
    skill_key: entry.skillKey,
    score: entry.score,
    shield_count: entry.shieldCount,
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
    progress_score: record.progressScore,
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
    note: entry.note,
  }));
}

function average(values: number[]) {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

async function recomputeMonthlyRollup(tx: any, progressMonth: any, userId: string) {
  const entries = await tx.studentProgressDailyEntry.findMany({
    where: { progressMonthId: progressMonth.id },
    orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
  });
  const rollup = summarizeDailyAssessmentRollup(entryRowsToRollupInput(entries));
  const availableSkills = rollup.skills.filter(
    (skill) => skill.status === "available" && skill.averageScore !== null
  );

  await tx.studentProgressSkill.deleteMany({
    where: {
      progressMonthId: progressMonth.id,
      source: DAILY_ROLLUP_SOURCE,
      skillKey: { notIn: availableSkills.map((skill) => skill.skillKey) },
    },
  });

  for (const skill of availableSkills) {
    await tx.studentProgressSkill.upsert({
      where: {
        progressMonthId_skillKey: {
          progressMonthId: progressMonth.id,
          skillKey: skill.skillKey,
        },
      },
      create: {
        progressMonthId: progressMonth.id,
        skillKey: skill.skillKey,
        skillLabel: skill.skillLabel,
        score: skill.averageScore,
        maxScore: 100,
        weight: 0,
        status: "available",
        source: DAILY_ROLLUP_SOURCE,
        sortOrder: Object.keys(PROGRESS_SKILL_LABELS).indexOf(skill.skillKey),
      },
      update: {
        skillLabel: skill.skillLabel,
        score: skill.averageScore,
        maxScore: 100,
        status: "available",
        source: DAILY_ROLLUP_SOURCE,
      },
    });
  }

  const skills = await tx.studentProgressSkill.findMany({
    where: { progressMonthId: progressMonth.id },
    select: { score: true },
  });
  const availableSkillCount = skills.filter((skill: any) => skill.score !== null).length;
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
  const mockTestScores = entries
    .filter((entry: any) => entry.entryType === "mock_test" && entry.score !== null)
    .map((entry: any) => Number(entry.score))
    .filter(Number.isFinite);

  const updatedProgressMonth = await tx.studentProgressMonth.update({
    where: { id: progressMonth.id },
    data: {
      progressScore: rollup.averageScore ?? progressMonth.progressScore,
      learningEvidenceCoverage: Math.round((availableSkillCount / ALL_SKILL_COUNT) * 1000) / 10,
      dailyAverageScore: rollup.averageScore,
      dailyLatestScore: rollup.latestScore,
      dailyScoreDelta: rollup.scoreDelta,
      dailyAssessmentCount: rollup.assessmentCount,
      focusSkillKey: rollup.focusSkillKey,
      focusSkillLabel: rollup.focusSkillLabel,
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
  operation: (tx: any) => Promise<T>
): Promise<T> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: "Serializable",
      });
    } catch (error: any) {
      if (error?.code !== "P2034" || attempt === 3) throw error;
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
  const query = validateBody(studentProgressDailyQuerySchema, queryInput(req));
  const month = query.month || query.entry_date?.slice(0, 7) || "";
  const progressMonth = await prisma.studentProgressMonth.findUnique({
    where: {
      studentId_classId_month: {
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
  const dailyEntries = await prisma.studentProgressDailyEntry.findMany({
    where: {
      progressMonthId: progressMonth.id,
      ...(selectedDate
        ? { entryDate: { gte: selectedDate, lt: nextDate(selectedDate) } }
        : {}),
    },
    orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
  });
  const monthlyEntries = selectedDate
    ? await prisma.studentProgressDailyEntry.findMany({
        where: { progressMonthId: progressMonth.id },
        orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
      })
    : dailyEntries;
  const rollup = summarizeDailyAssessmentRollup(entryRowsToRollupInput(monthlyEntries));
  const note =
    dailyEntries.find((entry: any) => entry.entryType === "note" && entry.note)?.note || null;

  return successResponse(res, {
    progress_month: progressMonthRollupToDto(progressMonth),
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
  const body = validateBody(studentProgressDailyPutSchema, {
    ...req.body,
    student_id: req.body?.student_id || req.body?.studentId,
    class_id: req.body?.class_id || req.body?.classId,
    entry_date: req.body?.entry_date || req.body?.entryDate,
  });
  const entryDate = parseDateOnly(body.entry_date);
  const month = body.entry_date.slice(0, 7);
  const enrollment = await prisma.studentClass.findFirst({
    where: {
      studentId: body.student_id,
      classId: body.class_id,
      student: { deletedAt: null },
    },
    include: {
      class: { select: { className: true } },
    },
  });
  if (!enrollment) {
    throw new ApiError("ENROLLMENT_NOT_FOUND", "Student is not enrolled in this class", 404);
  }

  const attendance = await prisma.attendance.findFirst({
    where: {
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

  const normalizedEntries = body.entries.map((entry) => ({
    entryType: entry.entry_type,
    skillKey: entry.skill_key || null,
    score: entry.score ?? null,
    shieldCount: entry.shield_count || 0,
    note: entry.note || null,
  }));
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
      note: body.note.trim(),
    });
  }

  const result = await runSerializableTransaction(async (tx) => {
    const existing = await tx.studentProgressMonth.findUnique({
      where: {
        studentId_classId_month: {
          studentId: body.student_id,
          classId: body.class_id,
          month,
        },
      },
    });
    const trackKey = existing?.trackKey || detectProgressTrackKey(enrollment.class.className);
    const progressMonth =
      existing ||
      (await tx.studentProgressMonth.create({
        data: {
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
        progressMonthId: progressMonth.id,
        entryDate: { gte: entryDate, lt: nextDate(entryDate) },
      },
    });
    if (normalizedEntries.length) {
      await tx.studentProgressDailyEntry.createMany({
        data: normalizedEntries.map((entry) => ({
          progressMonthId: progressMonth.id,
          entryDate,
          entryType: entry.entryType,
          skillKey: entry.skillKey,
          score: entry.score,
          shieldCount: entry.shieldCount,
          note: entry.note,
          createdById: req.user.id,
        })),
      });
    }

    return recomputeMonthlyRollup(tx, progressMonth, req.user.id);
  });

  await logActivity(
    req,
    req.user.id,
    "REPLACE_STUDENT_PROGRESS_DAILY",
    "student_progress",
    result.progressMonth.id
  );

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
  const query = validateBody(studentProgressDailyDeleteSchema, queryInput(req));
  const entryDate = parseDateOnly(query.entry_date);
  const month = query.entry_date.slice(0, 7);
  const progressMonth = await prisma.studentProgressMonth.findUnique({
    where: {
      studentId_classId_month: {
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

  const result = await runSerializableTransaction(async (tx) => {
    const deleted = await tx.studentProgressDailyEntry.deleteMany({
      where: {
        progressMonthId: progressMonth.id,
        entryDate: { gte: entryDate, lt: nextDate(entryDate) },
      },
    });
    const recomputed = await recomputeMonthlyRollup(
      tx,
      progressMonth,
      req.user.id
    );
    return { ...recomputed, deletedCount: deleted.count };
  });

  await logActivity(
    req,
    req.user.id,
    "DELETE_STUDENT_PROGRESS_DAILY",
    "student_progress",
    progressMonth.id
  );

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

export default requireAuth(handler, ["admin"]);
