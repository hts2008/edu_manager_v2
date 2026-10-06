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
  getNumber,
  getString,
  parseMonthRange,
  sendApiError,
  toDateOnly,
} from "../../../lib/api-utils.js";
import { loadProgressOperationalRow } from "../../../lib/student-progress-operational-row.js";
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
  appendProgressActivity,
  buildProgressRevisionSnapshot,
  normalizeReopenReason,
  runSerializableProgressTransaction,
} from "../../../lib/student-progress-finalization.js";
import { normalizeProgressEntrySemantics } from "../../../lib/progress-difficulty.js";
import {
  studentProgressUpsertSchema,
  validateBody,
} from "../../../lib/validation.js";
import { getSettings } from "../../../lib/settings.js";
import type { AcademicSettingsContext } from "../../../lib/academic-settings.js";
import { storedProgressScore } from "../../../lib/student-progress-evidence.js";

const SKILL_KEYS: ProgressSkillKey[] = [
  "listening",
  "speaking",
  "reading",
  "writing",
  "homework",
  "daily_practice",
  "mock_test",
];

async function loadAcademicSettings(
  req: AuthedRequest,
  month: string,
  db = req.db,
): Promise<AcademicSettingsContext> {
  if (!req.user.tenantId) {
    throw new ApiError("TENANT_REQUIRED", "Tenant context is required", 403);
  }
  const resolved = await getSettings(db, {
    tenantId: req.user.tenantId,
    group: "academic",
    effectiveMonth: month,
  });
  if (resolved.settings.some((setting) => setting.warnings?.length)) {
    throw new ApiError("INVALID_SETTING_VALUE", "Invalid academic settings", 409);
  }
  return { settings: resolved.settings };
}

function progressEntryExamSet(entry: any) {
  return normalizeProgressEntrySemantics(
    entry.examSetLevel,
    entry.difficultyLevel
  ).examSetLevel;
}

function progressEntryDifficulty(entry: any) {
  return normalizeProgressEntrySemantics(
    entry.examSetLevel,
    entry.difficultyLevel
  ).difficultyLevel;
}

function assertAdminAction(req: AuthedRequest, action: "finalize" | "reopen") {
  if (req.user.role === "admin") return;
  throw new ApiError("FORBIDDEN", `Only admins can ${action} student progress`, 403);
}

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
    progress_score: storedProgressScore(record),
    score_source: record.rubricSnapshot?.scoreEvidence?.source || (record.finalizedAt ? "legacy_unknown" : null),
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
        exam_set_level: progressEntryExamSet(entry),
        difficulty_level: progressEntryDifficulty(entry),
        entry_label: entry.entryLabel,
        graded_by_teacher_id: entry.gradedByTeacherId,
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
        exam_set_level: progressEntryExamSet(entry),
        difficulty_level: progressEntryDifficulty(entry),
        entry_label: entry.entryLabel,
        graded_by_teacher_id: entry.gradedByTeacherId,
        note: entry.note,
      })) || [],
  };
}

function normalizeSkillInputs(input: {
  skills: ProgressSkillInput[];
  trackKey: ProgressTrackKey;
  classType: ProgressClassType;
  settings?: AcademicSettingsContext;
}) {
  const byKey = new Map<ProgressSkillKey, ProgressSkillInput>();
  for (const skill of input.skills || []) {
    if (SKILL_KEYS.includes(skill.skill_key)) byKey.set(skill.skill_key, skill);
  }

  return buildProgressRubric(input.trackKey, input.classType, input.settings).map((rubricSkill) => {
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
      source: source?.source === "daily_rollup" ? "teacher_input" : source?.source || "teacher_input",
      sort_order: Number(source?.sort_order ?? rubricSkill.sortOrder),
    };
  });
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
    req.db.studentProgressMonth.findMany({
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
    req.db.studentProgressMonth.count({ where }),
  ]);

  const progressMonths = [];
  const monthSettings = new Map<string, Awaited<ReturnType<typeof loadAcademicSettings>>>();
  for (const record of records) {
    const dto = progressMonthToDto(record);
    if (!record.finalizedAt) {
      if (!monthSettings.has(record.month)) monthSettings.set(record.month, await loadAcademicSettings(req, record.month));
      const row = await loadProgressOperationalRow(req.db, record.studentId, record.classId, record.month);
      const assessment = buildProgressAssessment({ row, settings: monthSettings.get(record.month),
        progressMonth: recordToSnapshot(record) });
      Object.assign(dto, { progress_score: assessment.progressScore, score_source: assessment.scoreSource,
        attendance_score: assessment.attendanceScore, consistency_score: assessment.consistencyScore,
        track_readiness: assessment.readinessBand, learning_evidence_coverage: assessment.learningEvidenceCoverage,
        rubric_snapshot: assessment.rubricSnapshot });
    }
    progressMonths.push(dto);
  }
  return successResponse(res, {
    progress_months: progressMonths,
    total,
    page,
    limit,
  });
}

async function reopenProgress(req: AuthedRequest, res: VercelResponse) {
  assertAdminAction(req, "reopen");
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

  const record = await runSerializableProgressTransaction(req.db, async (tx) => {
    const current = await tx.studentProgressMonth.findUnique({
      where: {
        tenantId_studentId_classId_month: {
          tenantId: req.user.tenantId!, studentId, classId, month,
        },
      },
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
        tenantId: req.user.tenantId!,
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
    await appendProgressActivity(tx, req, "REOPEN_STUDENT_PROGRESS", current.id);
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
  if (body.finalized) assertAdminAction(req, "finalize");

  const result = await runSerializableProgressTransaction(req.db, async (tx) => {
  const academicSettings = await loadAcademicSettings(req, body.month, tx as typeof req.db);
  const row = await loadProgressOperationalRow(tx, body.student_id, body.class_id, body.month);
  const existing = await tx.studentProgressMonth.findUnique({
    where: {
      tenantId_studentId_classId_month: {
        tenantId: req.user.tenantId!,
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

  const trackKey = (body.track_key || existing?.trackKey || detectProgressTrackKey(
    row.class_name,
    academicSettings,
  )) as ProgressTrackKey;
  const classType = body.class_type
    ? normalizeProgressClassType(body.class_type)
    : existing?.classType
      ? normalizeProgressClassType(existing.classType)
      : defaultClassTypeForTrack(trackKey);
  const normalizedSkills = normalizeSkillInputs({
    skills: Object.prototype.hasOwnProperty.call(req.body || {}, "skills")
      ? body.skills : recordToSnapshot(existing || {}).skills?.filter((skill) => skill.source !== "daily_rollup") || [],
    trackKey,
    classType,
    settings: academicSettings,
  });
  const skills = normalizedSkills;
  const dailyEntries =
    existing?.dailyEntries?.map((entry: any) => ({
      entry_date: entry.entryDate,
      entry_type: entry.entryType,
      skill_key: entry.skillKey,
      score: entry.score,
      shield_count: entry.shieldCount,
      exam_set_level: progressEntryExamSet(entry),
      difficulty_level: progressEntryDifficulty(entry),
      entry_label: entry.entryLabel,
      graded_by_teacher_id: entry.gradedByTeacherId,
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
    finalizedAt: null,
    skills,
    dailyEntries,
  };
  const assessment = buildProgressAssessment({
    row,
    progressMonth: snapshot,
    previousScore: existing?.progressScore ?? null,
    settings: academicSettings,
  });
  const finalizedAt = body.finalized ? existing?.finalizedAt || new Date() : null;

    const saved = await tx.studentProgressMonth.upsert({
      where: {
        tenantId_studentId_classId_month: {
          tenantId: req.user.tenantId!,
          studentId: body.student_id,
          classId: body.class_id,
          month: body.month,
        },
      },
      create: {
        tenantId: req.user.tenantId!,
        studentId: body.student_id,
        classId: body.class_id,
        month: body.month,
        trackKey: assessment.trackKey,
        classType: assessment.classType,
        progressScore: assessment.progressScore ?? 0,
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
        progressScore: assessment.progressScore ?? 0,
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
          tenantId: req.user.tenantId!,
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
          tenantId: req.user.tenantId!,
          progressMonthId: saved.id,
          revisionNumber,
          eventType: "finalized",
          snapshot: buildProgressRevisionSnapshot(finalizedRecord),
          actorId: req.user.id,
        },
      });
    }

    const record = await tx.studentProgressMonth.findUniqueOrThrow({
      where: { id: saved.id },
      include: {
        student: { select: { fullName: true, parent: { select: { fullName: true, phone: true } } } },
        class: { select: { className: true } },
        skills: { orderBy: { sortOrder: "asc" } },
        dailyEntries: { orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }] },
        revisions: { orderBy: { revisionNumber: "desc" }, take: 20 },
      },
    });
    await appendProgressActivity(tx, req, "UPSERT_STUDENT_PROGRESS", record.id);
    return { record, assessment, existing };
  }, { isolationLevel: "Serializable" });
  const { record, assessment, existing } = result;

  return successResponse(
    res,
    {
      progress_month: progressMonthToDto(record),
      assessment,
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

const viewHandler = requirePermission("progress.view", handler);
const gradeHandler = requirePermission("progress.grade", handler);

export default function route(req: VercelRequest, res: VercelResponse) {
  return req.method === "GET"
    ? viewHandler(req, res)
    : gradeHandler(req, res);
}
