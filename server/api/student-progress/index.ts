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
  getNumber,
  getString,
  logActivity,
  parseMonthRange,
  sendApiError,
  toDateOnly,
} from "../../../lib/api-utils.js";
import { buildReportCube } from "../../../lib/report-cube.js";
import {
  buildProgressAssessment,
  buildProgressRubric,
  defaultClassTypeForTrack,
  detectProgressTrackKey,
  normalizeProgressClassType,
  type ProgressClassType,
  type ProgressMonthSnapshot,
  type ProgressSkillInput,
  type ProgressSkillKey,
  type ProgressTrackKey,
} from "../../../lib/student-progress-assessment.js";
import {
  assertProgressMonthEditable,
  buildProgressRevisionSnapshot,
  normalizeReopenReason,
} from "../../../lib/student-progress-finalization.js";
import {
  studentProgressUpsertSchema,
  validateBody,
} from "../../../lib/validation.js";

const SKILL_KEYS: ProgressSkillKey[] = [
  "listening",
  "speaking",
  "reading",
  "writing",
  "homework",
  "daily_practice",
  "mock_test",
];

function progressKey(studentId: string, classId: string, month: string) {
  return `${studentId}\u0000${classId}\u0000${month}`;
}

function safeArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function progressMonthToDto(record: any) {
  return {
    id: record.id,
    student_id: record.studentId,
    student_name: record.student?.fullName || null,
    parent_name: record.student?.parent?.fullName || null,
    parent_phone: record.student?.parent?.phone || null,
    class_id: record.classId,
    class_name: record.class?.className || null,
    month: record.month,
    track_key: record.trackKey,
    class_type: record.classType,
    progress_score: record.progressScore,
    attendance_score: record.attendanceScore,
    consistency_score: record.consistencyScore,
    learning_evidence_coverage: record.learningEvidenceCoverage,
    track_readiness: record.trackReadiness,
    focus_skill_key: record.focusSkillKey,
    focus_skill_label: record.focusSkillLabel,
    teacher_note: record.teacherNote,
    parent_summary: record.parentSummary,
    next_actions: safeArray(record.nextActions),
    evidence_notes: safeArray(record.evidenceNotes),
    rubric_snapshot: record.rubricSnapshot || null,
    academic_input_status: record.academicInputStatus,
    shield_total: record.shieldTotal,
    points_total: record.pointsTotal,
    mock_test_score: record.mockTestScore,
    daily_average_score: record.dailyAverageScore,
    daily_latest_score: record.dailyLatestScore,
    daily_score_delta: record.dailyScoreDelta,
    daily_assessment_count: record.dailyAssessmentCount,
    finalized_at: record.finalizedAt,
    is_finalized: Boolean(record.finalizedAt),
    revision_number: record.revisionNumber || 0,
    created_by: record.createdById,
    updated_by: record.updatedById,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    skills:
      record.skills?.map((skill: any) => ({
        id: skill.id,
        skill_key: skill.skillKey,
        skill_label: skill.skillLabel,
        score: skill.score,
        max_score: skill.maxScore,
        weight: skill.weight,
        status: skill.status,
        note: skill.note,
        source: skill.source,
        sort_order: skill.sortOrder,
      })) || [],
    daily_entries:
      record.dailyEntries?.map((entry: any) => ({
        id: entry.id,
        entry_date: toDateOnly(entry.entryDate),
        entry_type: entry.entryType,
        skill_key: entry.skillKey,
        score: entry.score,
        shield_count: entry.shieldCount,
        note: entry.note,
        created_by: entry.createdById,
        created_at: entry.createdAt,
      })) || [],
    revisions:
      record.revisions?.map((revision: any) => ({
        id: revision.id,
        revision_number: revision.revisionNumber,
        event_type: revision.eventType,
        reason: revision.reason,
        actor_id: revision.actorId,
        created_at: revision.createdAt,
      })) || [],
  };
}

function recordToSnapshot(record: any): ProgressMonthSnapshot {
  return {
    id: record.id,
    studentId: record.studentId,
    classId: record.classId,
    month: record.month,
    trackKey: record.trackKey,
    classType: record.classType,
    progressScore: record.progressScore,
    attendanceScore: record.attendanceScore,
    consistencyScore: record.consistencyScore,
    learningEvidenceCoverage: record.learningEvidenceCoverage,
    trackReadiness: record.trackReadiness,
    focusSkillKey: record.focusSkillKey,
    focusSkillLabel: record.focusSkillLabel,
    teacherNote: record.teacherNote,
    parentSummary: record.parentSummary,
    nextActions: record.nextActions,
    evidenceNotes: record.evidenceNotes,
    rubricSnapshot: record.rubricSnapshot,
    academicInputStatus: record.academicInputStatus,
    shieldTotal: record.shieldTotal,
    pointsTotal: record.pointsTotal,
    mockTestScore: record.mockTestScore,
    finalizedAt: record.finalizedAt,
    skills:
      record.skills?.map((skill: any) => ({
        skill_key: skill.skillKey,
        skill_label: skill.skillLabel,
        score: skill.score,
        max_score: skill.maxScore,
        weight: skill.weight,
        status: skill.status,
        note: skill.note,
        source: skill.source,
        sort_order: skill.sortOrder,
      })) || [],
    dailyEntries:
      record.dailyEntries?.map((entry: any) => ({
        entry_date: entry.entryDate,
        entry_type: entry.entryType,
        skill_key: entry.skillKey,
        score: entry.score,
        shield_count: entry.shieldCount,
        note: entry.note,
      })) || [],
  };
}

function normalizeSkillInputs(input: {
  skills: ProgressSkillInput[];
  trackKey: ProgressTrackKey;
  classType: ProgressClassType;
}) {
  const byKey = new Map<ProgressSkillKey, ProgressSkillInput>();
  for (const skill of input.skills || []) {
    if (SKILL_KEYS.includes(skill.skill_key)) byKey.set(skill.skill_key, skill);
  }

  return buildProgressRubric(input.trackKey, input.classType).map((rubricSkill) => {
    const source = byKey.get(rubricSkill.key);
    const rawScore = source?.score;
    const score =
      rawScore === null || rawScore === undefined || Number.isNaN(Number(rawScore))
        ? null
        : Number(rawScore);
    const maxScore = Math.max(1, Number(source?.max_score || 100));
    return {
      skill_key: rubricSkill.key,
      skill_label: source?.skill_label || rubricSkill.label,
      score,
      max_score: maxScore,
      weight: Number(source?.weight ?? rubricSkill.weight),
      status: score === null ? "missing_input" : "available",
      note: source?.note || null,
      source: source?.source || "teacher_input",
      sort_order: Number(source?.sort_order ?? rubricSkill.sortOrder),
    };
  });
}

async function loadOperationalRow(studentId: string, classId: string, month: string) {
  const { startDate, endDate } = parseMonthRange(month);
  const enrollmentPeriod = await prisma.enrollmentPeriod.findFirst({
    where: {
      studentId,
      classId,
      startedAt: { lt: endDate },
      OR: [{ endedAt: null }, { endedAt: { gt: startDate } }],
      student: { deletedAt: null },
    },
    select: {
      startedAt: true,
      endedAt: true,
      student: { select: { fullName: true } },
      class: {
        select: {
          className: true,
          feePerDay: true,
          scheduleDays: true,
          sessionsPerWeek: true,
        },
      },
    },
    orderBy: { startedAt: "desc" },
  });
  const legacyEnrollment = enrollmentPeriod
    ? null
    : await prisma.studentClass.findFirst({
        where: {
          studentId,
          classId,
          student: { deletedAt: null },
        },
        include: {
          student: { select: { fullName: true } },
          class: {
            select: {
              className: true,
              feePerDay: true,
              scheduleDays: true,
              sessionsPerWeek: true,
            },
          },
        },
      });
  const enrollment = enrollmentPeriod
    ? {
        enrollmentDate: enrollmentPeriod.startedAt,
        enrollmentEndDate: enrollmentPeriod.endedAt,
        student: enrollmentPeriod.student,
        class: enrollmentPeriod.class,
      }
    : legacyEnrollment
      ? { ...legacyEnrollment, enrollmentEndDate: null }
      : null;

  if (!enrollment) {
    throw new ApiError("ENROLLMENT_NOT_FOUND", "Student is not enrolled in this class", 404);
  }

  const [
    attendanceRows,
    feeLineRows,
    monthlyFeeRows,
    classMonthPlanRows,
    classSessionRows,
  ] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        studentId,
        classId,
        attendanceDate: { gte: startDate, lte: endDate },
      },
      select: {
        studentId: true,
        classId: true,
        attendanceDate: true,
        status: true,
        isMakeUp: true,
      },
    }),
    prisma.monthlyFeeLine.findMany({
      where: { studentId, classId, month },
      select: {
        id: true,
        monthlyFeeId: true,
        studentId: true,
        classId: true,
        month: true,
        expectedSessions: true,
        calculationSnapshot: true,
        amount: true,
        status: true,
        allocationConfidence: true,
      },
    }),
    prisma.monthlyFee.findMany({
      where: { studentId, month },
      select: {
        id: true,
        studentId: true,
        month: true,
        totalDays: true,
        totalAmount: true,
        status: true,
        receiptId: true,
        paidAt: true,
      },
    }),
    prisma.classMonthPlan.findMany({
      where: { classId, billingMonth: month },
      select: {
        classId: true,
        billingMonth: true,
        revisions: {
          orderBy: { revision: "desc" },
          select: { revision: true, snapshot: true },
        },
      },
    }),
    prisma.classSession.findMany({
      where: { classId, billingMonth: month, kind: "regular" },
      select: {
        classId: true,
        billingMonth: true,
        sessionDate: true,
        kind: true,
        status: true,
      },
    }),
  ]);

  const cube = buildReportCube({
    months: [month],
    enrollments: [
      {
        studentId,
        studentName: enrollment.student.fullName,
        classId,
        className: enrollment.class.className,
        enrollmentDate: enrollment.enrollmentDate,
        enrollmentEndDate: enrollment.enrollmentEndDate,
        feePerDay: enrollment.class.feePerDay,
        scheduleDays: enrollment.class.scheduleDays,
        sessionsPerWeek: enrollment.class.sessionsPerWeek,
      },
    ],
    attendance: attendanceRows,
    feeLines: feeLineRows,
    monthlyFees: monthlyFeeRows,
    classMonthPlans: classMonthPlanRows.map((row) => ({
      classId: row.classId,
      billingMonth: row.billingMonth,
      revisions: row.revisions,
    })),
    classSessions: classSessionRows,
  });

  const row = cube.students.find(
    (item) => item.student_id === studentId && item.class_id === classId && item.month === month
  );
  if (!row) {
    throw new ApiError(
      "PROGRESS_MONTH_OUT_OF_ENROLLMENT",
      "Progress month is before the enrollment month",
      400
    );
  }
  return row;
}

async function listProgress(req: AuthedRequest, res: VercelResponse) {
  const where: any = {};
  const month = getString(req.query.month);
  const from = getString(req.query.from);
  const to = getString(req.query.to);
  const studentId = getString(req.query.student_id || req.query.studentId);
  const classId = getString(req.query.class_id || req.query.classId);
  const page = Math.max(getNumber(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(getNumber(req.query.limit || req.query.page_size) || 100, 1), 500);

  if (month) where.month = month;
  if (!month && (from || to)) {
    where.month = {};
    if (from) where.month.gte = from;
    if (to) where.month.lte = to;
  }
  if (studentId) where.studentId = studentId;
  if (classId && classId !== "all") where.classId = classId;

  const [records, total] = await Promise.all([
    prisma.studentProgressMonth.findMany({
      where,
      include: {
        student: { select: { fullName: true, parent: { select: { fullName: true, phone: true } } } },
        class: { select: { className: true } },
        skills: { orderBy: { sortOrder: "asc" } },
        dailyEntries: { orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }] },
        revisions: { orderBy: { revisionNumber: "desc" }, take: 20 },
      },
      orderBy: [{ month: "desc" }, { student: { fullName: "asc" } }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.studentProgressMonth.count({ where }),
  ]);

  return successResponse(res, {
    progress_months: records.map(progressMonthToDto),
    total,
    page,
    limit,
  });
}

async function reopenProgress(req: AuthedRequest, res: VercelResponse) {
  const studentId = getString(req.body?.student_id || req.body?.studentId);
  const classId = getString(req.body?.class_id || req.body?.classId);
  const month = getString(req.body?.month);
  if (!studentId || !classId || !month) {
    throw new ApiError(
      "PROGRESS_REOPEN_TARGET_REQUIRED",
      "student_id, class_id, and month are required",
      400
    );
  }
  const reason = normalizeReopenReason(req.body?.reason || req.body?.reopen_reason);

  const record = await prisma.$transaction(async (tx) => {
    const current = await tx.studentProgressMonth.findUnique({
      where: { studentId_classId_month: { studentId, classId, month } },
      include: {
        skills: { orderBy: { sortOrder: "asc" } },
        dailyEntries: { orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }] },
      },
    });
    if (!current) {
      throw new ApiError("PROGRESS_MONTH_NOT_FOUND", "Progress month not found", 404);
    }
    if (!current.finalizedAt) {
      throw new ApiError("PROGRESS_MONTH_NOT_FINALIZED", "Progress month is already open", 409);
    }

    const revisionNumber = current.revisionNumber + 1;
    await tx.studentProgressRevision.create({
      data: {
        progressMonthId: current.id,
        revisionNumber,
        eventType: "reopened",
        reason,
        snapshot: buildProgressRevisionSnapshot(current),
        actorId: req.user.id,
      },
    });
    await tx.studentProgressMonth.update({
      where: { id: current.id },
      data: { finalizedAt: null, revisionNumber, updatedById: req.user.id },
    });
    return tx.studentProgressMonth.findUniqueOrThrow({
      where: { id: current.id },
      include: {
        student: { select: { fullName: true, parent: { select: { fullName: true, phone: true } } } },
        class: { select: { className: true } },
        skills: { orderBy: { sortOrder: "asc" } },
        dailyEntries: { orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }] },
        revisions: { orderBy: { revisionNumber: "desc" }, take: 20 },
      },
    });
  }, { isolationLevel: "Serializable" });

  await logActivity(req, req.user.id, "REOPEN_STUDENT_PROGRESS", "student_progress", record.id);
  return successResponse(res, { progress_month: progressMonthToDto(record) });
}

async function upsertProgress(req: AuthedRequest, res: VercelResponse) {
  if (
    Object.prototype.hasOwnProperty.call(req.body || {}, "daily_entries") ||
    Object.prototype.hasOwnProperty.call(req.body || {}, "dailyEntries")
  ) {
    throw new ApiError(
      "DAILY_ENTRY_API_REQUIRED",
      "Use /api/student-progress/daily to create, replace, or delete daily entries",
      409
    );
  }

  const body = validateBody(studentProgressUpsertSchema, {
    ...req.body,
    student_id: req.body?.student_id || req.body?.studentId,
    class_id: req.body?.class_id || req.body?.classId,
    track_key: req.body?.track_key || req.body?.trackKey,
    class_type: req.body?.class_type || req.body?.classType,
    teacher_note: req.body?.teacher_note ?? req.body?.teacherNote,
    parent_summary: req.body?.parent_summary ?? req.body?.parentSummary,
    focus_skill_key: req.body?.focus_skill_key || req.body?.focusSkillKey,
    focus_skill_label: req.body?.focus_skill_label ?? req.body?.focusSkillLabel,
    mock_test_score: req.body?.mock_test_score ?? req.body?.mockTestScore,
  });

  const row = await loadOperationalRow(body.student_id, body.class_id, body.month);
  const existing = await prisma.studentProgressMonth.findUnique({
    where: {
      studentId_classId_month: {
        studentId: body.student_id,
        classId: body.class_id,
        month: body.month,
      },
    },
    include: {
      skills: { orderBy: { sortOrder: "asc" } },
      dailyEntries: { orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }] },
    },
  });
  assertProgressMonthEditable(existing?.finalizedAt);

  const trackKey = (body.track_key || existing?.trackKey || detectProgressTrackKey(row.class_name)) as ProgressTrackKey;
  const classType = body.class_type
    ? normalizeProgressClassType(body.class_type)
    : existing?.classType
      ? normalizeProgressClassType(existing.classType)
      : defaultClassTypeForTrack(trackKey);
  const normalizedSkills = normalizeSkillInputs({
    skills: body.skills,
    trackKey,
    classType,
  });
  const dailyRollupSkills = new Map(
    (existing?.skills || [])
      .filter((skill: any) => skill.source === "daily_rollup")
      .map((skill: any) => [skill.skillKey, skill])
  );
  const skills = normalizedSkills.map((skill) => {
    const dailyRollup = dailyRollupSkills.get(skill.skill_key) as any;
    if (!dailyRollup) return skill;
    return {
      skill_key: skill.skill_key,
      skill_label: dailyRollup.skillLabel,
      score: dailyRollup.score,
      max_score: dailyRollup.maxScore,
      weight: dailyRollup.weight,
      status: dailyRollup.score === null ? "missing_input" : "available",
      note: dailyRollup.note,
      source: "daily_rollup",
      sort_order: dailyRollup.sortOrder,
    };
  });
  const dailyEntries =
    existing?.dailyEntries?.map((entry: any) => ({
      entry_date: entry.entryDate,
      entry_type: entry.entryType,
      skill_key: entry.skillKey,
      score: entry.score,
      shield_count: entry.shieldCount,
      note: entry.note,
    })) || [];
  const shieldTotal = dailyEntries.reduce(
    (sum: number, entry: any) => sum + Number(entry.shield_count || 0),
    0
  );
  const pointsTotal = Math.round(
    dailyEntries.reduce((sum: number, entry: any) => sum + Number(entry.score || 0), 0)
  );
  const mockScores = dailyEntries
    .filter((entry: any) => entry.entry_type === "mock_test" && entry.score !== null)
    .map((entry: any) => Number(entry.score));
  const mockSkillScore = skills.find((skill) => skill.skill_key === "mock_test")?.score;
  const mockTestScore =
    body.mock_test_score ??
    (mockSkillScore === null || mockSkillScore === undefined
      ? mockScores.length
        ? Math.round(
            (mockScores.reduce((sum: number, score: number) => sum + score, 0) /
              mockScores.length) *
              10
          ) / 10
        : null
      : mockSkillScore);

  const snapshot: ProgressMonthSnapshot = {
    id: existing?.id || "new",
    studentId: body.student_id,
    classId: body.class_id,
    month: body.month,
    trackKey,
    classType,
    focusSkillKey: body.focus_skill_key || (existing?.focusSkillKey as ProgressSkillKey | null) || null,
    focusSkillLabel: body.focus_skill_label || existing?.focusSkillLabel || null,
    teacherNote: body.teacher_note ?? existing?.teacherNote ?? null,
    parentSummary: body.parent_summary ?? existing?.parentSummary ?? null,
    shieldTotal,
    pointsTotal,
    mockTestScore,
    finalizedAt: body.finalized ? existing?.finalizedAt || new Date() : null,
    skills,
    dailyEntries,
  };
  const assessment = buildProgressAssessment({
    row,
    progressMonth: snapshot,
    previousScore: existing?.progressScore ?? null,
  });
  const finalizedAt = body.finalized ? existing?.finalizedAt || new Date() : null;

  const record = await prisma.$transaction(async (tx) => {
    const transactionalExisting = await tx.studentProgressMonth.findUnique({
      where: {
        studentId_classId_month: {
          studentId: body.student_id,
          classId: body.class_id,
          month: body.month,
        },
      },
    });
    assertProgressMonthEditable(transactionalExisting?.finalizedAt);

    const saved = await tx.studentProgressMonth.upsert({
      where: {
        studentId_classId_month: {
          studentId: body.student_id,
          classId: body.class_id,
          month: body.month,
        },
      },
      create: {
        studentId: body.student_id,
        classId: body.class_id,
        month: body.month,
        trackKey: assessment.trackKey,
        classType: assessment.classType,
        progressScore: assessment.progressScore,
        attendanceScore: assessment.attendanceScore,
        consistencyScore: assessment.consistencyScore,
        learningEvidenceCoverage: assessment.learningEvidenceCoverage,
        trackReadiness: assessment.readinessBand,
        focusSkillKey: assessment.focusSkillKey,
        focusSkillLabel: assessment.focusSkillLabel,
        teacherNote: snapshot.teacherNote,
        parentSummary: assessment.parentSummary,
        nextActions: assessment.nextActions,
        evidenceNotes: assessment.evidenceNotes,
        rubricSnapshot: assessment.rubricSnapshot,
        academicInputStatus: assessment.academicInputStatus,
        shieldTotal: assessment.shieldTotal,
        pointsTotal: assessment.pointsTotal,
        mockTestScore: assessment.mockTestScore,
        finalizedAt,
        createdById: req.user.id,
        updatedById: req.user.id,
      },
      update: {
        trackKey: assessment.trackKey,
        classType: assessment.classType,
        progressScore: assessment.progressScore,
        attendanceScore: assessment.attendanceScore,
        consistencyScore: assessment.consistencyScore,
        learningEvidenceCoverage: assessment.learningEvidenceCoverage,
        trackReadiness: assessment.readinessBand,
        focusSkillKey: assessment.focusSkillKey,
        focusSkillLabel: assessment.focusSkillLabel,
        teacherNote: snapshot.teacherNote,
        parentSummary: assessment.parentSummary,
        nextActions: assessment.nextActions,
        evidenceNotes: assessment.evidenceNotes,
        rubricSnapshot: assessment.rubricSnapshot,
        academicInputStatus: assessment.academicInputStatus,
        shieldTotal: assessment.shieldTotal,
        pointsTotal: assessment.pointsTotal,
        mockTestScore: assessment.mockTestScore,
        finalizedAt,
        updatedById: req.user.id,
      },
    });

    await tx.studentProgressSkill.deleteMany({ where: { progressMonthId: saved.id } });
    if (skills.length) {
      await tx.studentProgressSkill.createMany({
        data: skills.map((skill) => ({
          progressMonthId: saved.id,
          skillKey: skill.skill_key,
          skillLabel: skill.skill_label || skill.skill_key,
          score: skill.score,
          maxScore: Number(skill.max_score || 100),
          weight: Number(skill.weight || 0),
          status: skill.status || (skill.score === null ? "missing_input" : "available"),
          note: skill.note,
          source: skill.source,
          sortOrder: Number(skill.sort_order || 0),
        })),
      });
    }

    if (body.finalized) {
      const revisionNumber = saved.revisionNumber + 1;
      const finalizedRecord = await tx.studentProgressMonth.update({
        where: { id: saved.id },
        data: { revisionNumber },
        include: {
          skills: { orderBy: { sortOrder: "asc" } },
          dailyEntries: { orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }] },
        },
      });
      await tx.studentProgressRevision.create({
        data: {
          progressMonthId: saved.id,
          revisionNumber,
          eventType: "finalized",
          snapshot: buildProgressRevisionSnapshot(finalizedRecord),
          actorId: req.user.id,
        },
      });
    }

    return tx.studentProgressMonth.findUniqueOrThrow({
      where: { id: saved.id },
      include: {
        student: { select: { fullName: true, parent: { select: { fullName: true, phone: true } } } },
        class: { select: { className: true } },
        skills: { orderBy: { sortOrder: "asc" } },
        dailyEntries: { orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }] },
        revisions: { orderBy: { revisionNumber: "desc" }, take: 20 },
      },
    });
  }, { isolationLevel: "Serializable" });

  await logActivity(req, req.user.id, "UPSERT_STUDENT_PROGRESS", "student_progress", record.id);

  return successResponse(
    res,
    {
      progress_month: progressMonthToDto(record),
      assessment: buildProgressAssessment({
        row,
        progressMonth: recordToSnapshot(record),
        previousScore: existing?.progressScore ?? null,
      }),
      key: progressKey(body.student_id, body.class_id, body.month),
    },
    existing ? 200 : 201
  );
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  try {
    if (req.method === "GET") return listProgress(req, res);
    if (
      (req.method === "POST" || req.method === "PUT") &&
      String(req.body?.action || "").toLowerCase() === "reopen"
    ) {
      return reopenProgress(req, res);
    }
    if (req.method === "POST" || req.method === "PUT") return upsertProgress(req, res);
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
  } catch (error) {
    return sendApiError(res, error, "STUDENT_PROGRESS_ERROR");
  }
}

export default requireAuth(handler, ["admin"]);
