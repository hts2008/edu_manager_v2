import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";
import {
  classCreateSchema,
  classEnrollmentActionSchema,
  classUpdateSchema,
  validateBody,
} from "../../../lib/validation.js";
import {
  acquireStudentEnrollmentAdvisoryLocks,
  assertClassDefinitionWritable,
  assertEnrollmentMutationWritable,
  deactivateEnrollmentPeriods,
} from "../../../lib/enrollment.js";
import { ApiError, sendApiError } from "../../../lib/api-utils.js";
import { parseDateOnly } from "../../../lib/class-sessions.js";

export const CLASS_WRITE_TRANSACTION_OPTIONS = {
  maxWait: 5_000,
  timeout: 15_000,
} as const;

export function isClassWriteTimeout(error: unknown) {
  return (error as { code?: unknown })?.code === "P2028";
}

function businessDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function resolveEnrollmentEffectiveAt(value?: string, now = new Date()) {
  const effectiveAt = parseDateOnly(
    value || businessDateKey(now),
    "enrollment_effective_date",
  );
  const today = parseDateOnly(businessDateKey(now), "current_business_date");
  if (effectiveAt > today) {
    throw new ApiError(
      "ENROLLMENT_EFFECTIVE_DATE_IN_FUTURE",
      "Enrollment effective date cannot be in the future",
      400,
    );
  }
  return effectiveAt;
}

function isHistoricalEnrollment(effectiveAt: Date, now = new Date()) {
  const today = parseDateOnly(businessDateKey(now), "current_business_date");
  return effectiveAt < today;
}

export function assertHistoricalEnrollmentAllowed(
  role: "admin" | "receptionist" | undefined,
  effectiveAt: Date,
  adjustExistingEnrollmentStart = false,
  backdateReason?: string | null,
  now = new Date(),
) {
  const requiresHistoricalControls =
    isHistoricalEnrollment(effectiveAt, now) || adjustExistingEnrollmentStart;
  if (!requiresHistoricalControls) return;
  if (role !== "admin") {
    throw new ApiError(
      "FORBIDDEN",
      "Only administrators can backdate or correct enrollment periods",
      403,
    );
  }
  if (!backdateReason?.trim()) {
    throw new ApiError(
      "BACKDATE_REASON_REQUIRED",
      "A reason is required for historical enrollment changes",
      400,
    );
  }
}

type BulkEnrollmentOptions = {
  adjustExistingEnrollmentStart?: boolean;
  backdateReason?: string | null;
  actorId?: string;
  actorRole?: "admin" | "receptionist";
  now?: Date;
};

type StudentDetails = {
  id: string;
  fullName: string;
  dateOfBirth?: Date | null;
  gender?: string | null;
  phone?: string | null;
  parentId?: string | null;
};

type StudentClassRosterRow = {
  studentId: string;
  status: string;
  enrollmentDate: Date;
  student: StudentDetails;
};

type EnrollmentPeriodRosterRow = {
  studentId: string;
  startedAt: Date;
  endedAt?: Date | null;
  student: StudentDetails;
};

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function buildHistoricalClassRoster(
  studentClasses: StudentClassRosterRow[],
  enrollmentPeriods: EnrollmentPeriodRosterRow[],
) {
  const roster = new Map<string, { row: any; hasProjection: boolean }>();
  const studentFields = (student: StudentDetails) => ({
    id: student.id,
    full_name: student.fullName,
    date_of_birth: student.dateOfBirth ?? null,
    gender: student.gender ?? null,
    phone: student.phone ?? null,
    parent_id: student.parentId ?? null,
  });

  for (const link of studentClasses) {
    roster.set(link.studentId, {
      hasProjection: true,
      row: {
        ...studentFields(link.student),
        enrollment_status: link.status,
        enrollment_date: dateOnly(link.enrollmentDate),
        enrollment_periods: [],
      },
    });
  }

  for (const period of enrollmentPeriods) {
    let entry = roster.get(period.studentId);
    if (!entry) {
      entry = {
        hasProjection: false,
        row: {
          ...studentFields(period.student),
          enrollment_status: "inactive",
          enrollment_date: dateOnly(period.startedAt),
          enrollment_periods: [],
        },
      };
      roster.set(period.studentId, entry);
    }
    entry.row.enrollment_periods.push({
      started_at: dateOnly(period.startedAt),
      ended_at: period.endedAt ? dateOnly(period.endedAt) : null,
    });
    if (!entry.hasProjection) {
      if (period.endedAt == null) entry.row.enrollment_status = "active";
      if (dateOnly(period.startedAt) > entry.row.enrollment_date) {
        entry.row.enrollment_date = dateOnly(period.startedAt);
      }
    }
  }

  return [...roster.values()]
    .map(({ row }) => ({
      ...row,
      enrollment_periods: row.enrollment_periods.sort(
        (a: { started_at: string }, b: { started_at: string }) =>
          a.started_at.localeCompare(b.started_at),
      ),
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}

const CLASS_MONTH_ROSTER_IMPACT_FIELDS = [
  "schedule_days",
  "schedule_required",
  "sessions_per_week",
  "session_required",
  "start_time",
  "end_time",
  "billing_policy",
  "fee_per_day",
] as const;

export function hasClassMonthRosterImpact(body: Record<string, unknown>) {
  return CLASS_MONTH_ROSTER_IMPACT_FIELDS.some((field) => body[field] !== undefined);
}

export async function enrollStudentsInClass(
  tx: any,
  classId: string,
  studentIds: string[] = [],
  effectiveAt = resolveEnrollmentEffectiveAt(),
  options: BulkEnrollmentOptions = {},
) {
  const uniqueIds = [...new Set(studentIds.filter(Boolean))];
  if (!uniqueIds.length) {
    return { requested: 0, enrolled: 0, reactivated: 0, adjusted: 0, skipped: 0 };
  }

  const requiresHistoricalControls =
    isHistoricalEnrollment(effectiveAt, options.now) ||
    Boolean(options.adjustExistingEnrollmentStart);
  assertHistoricalEnrollmentAllowed(
    options.actorRole,
    effectiveAt,
    options.adjustExistingEnrollmentStart,
    options.backdateReason,
    options.now,
  );
  if (requiresHistoricalControls && !options.actorId) {
    throw new ApiError(
      "BACKDATE_ACTOR_REQUIRED",
      "An authenticated actor is required for historical enrollment changes",
      400,
    );
  }
  await acquireStudentEnrollmentAdvisoryLocks(tx, uniqueIds);
  await assertEnrollmentMutationWritable(tx, [classId], effectiveAt);

  const classData = await tx.class.findUnique({
    where: { id: classId },
    select: { id: true, maxStudents: true },
  });
  if (!classData) {
    throw new Error("CLASS_NOT_FOUND");
  }

  const validStudents = await tx.student.findMany({
    where: { id: { in: uniqueIds }, status: "active", deletedAt: null },
    select: { id: true },
  });
  const validIds = new Set(validStudents.map((student: any) => student.id));
  const existingLinks = await tx.studentClass.findMany({
    where: { classId, studentId: { in: uniqueIds } },
    select: { id: true, studentId: true, status: true, enrollmentDate: true },
  });
  const existingByStudent = new Map(
    existingLinks.map((link: any) => [link.studentId, link])
  );
  const activeIds = new Set(
    existingLinks
      .filter((link: any) => link.status === "active")
      .map((link: any) => link.studentId)
  );
  const idsToActivate = uniqueIds.filter((studentId) => validIds.has(studentId));
  const idsNewToActive = idsToActivate.filter((studentId) => !activeIds.has(studentId));

  const activeCount = await tx.studentClass.count({
    where: { classId, status: "active" },
  });
  if (activeCount + idsNewToActive.length > classData.maxStudents) {
    throw new Error("CLASS_CAPACITY_EXCEEDED");
  }

  const newStudentIds = idsToActivate.filter(
    (studentId) => !existingByStudent.has(studentId)
  );
  const reactivatedStudentIds = idsToActivate.filter((studentId) => {
    const link: any = existingByStudent.get(studentId);
    return link && link.status !== "active";
  });

  const openPeriods = await tx.enrollmentPeriod.findMany({
    where: {
      classId,
      studentId: { in: idsToActivate },
      endedAt: null,
    },
    select: { id: true, studentId: true, startedAt: true },
  });
  const openPeriodByStudent = new Map(
    openPeriods.map((period: any) => [period.studentId, period]),
  );
  const studentsWithOpenPeriod = new Set(
    openPeriods.map((period: any) => period.studentId)
  );

  const activeStudentIdsToAdjust = options.adjustExistingEnrollmentStart
    ? idsToActivate.filter((studentId) => {
        if (!activeIds.has(studentId)) return false;
        const period: any = openPeriodByStudent.get(studentId);
        return period && period.startedAt > effectiveAt;
      })
    : [];
  const activeStudentsWithoutPeriodToAdjust = options.adjustExistingEnrollmentStart
    ? idsToActivate.filter((studentId) => {
        if (!activeIds.has(studentId) || studentsWithOpenPeriod.has(studentId)) return false;
        const link: any = existingByStudent.get(studentId);
        return link?.enrollmentDate > effectiveAt;
      })
    : [];
  const projectionStudentIdsToAdjust = [
    ...activeStudentIdsToAdjust,
    ...activeStudentsWithoutPeriodToAdjust,
  ];
  const adjustmentBeforeByStudent = new Map(
    projectionStudentIdsToAdjust.map((studentId) => {
      const period: any = openPeriodByStudent.get(studentId);
      const link: any = existingByStudent.get(studentId);
      return [studentId, period?.startedAt || link?.enrollmentDate];
    }),
  );

  const periodRows = idsToActivate
    .filter((studentId) => !studentsWithOpenPeriod.has(studentId))
    .map((studentId) => {
      const existing: any = existingByStudent.get(studentId);
      const wasActive = existing?.status === "active";
      return {
        studentId,
        classId,
        startedAt: wasActive && !options.adjustExistingEnrollmentStart
          ? existing.enrollmentDate
          : effectiveAt,
        source: wasActive ? "projection_backfill" : "class_bulk_enroll",
      };
    });
  const overlap = periodRows.length > 0 &&
      typeof tx.enrollmentPeriod.findFirst === "function"
    ? await tx.enrollmentPeriod.findFirst({
        where: {
          classId,
          OR: periodRows.map((row) => ({
            studentId: row.studentId,
            OR: [
              { endedAt: null },
              { endedAt: { gt: row.startedAt } },
            ],
          })),
        },
        select: { id: true, studentId: true, startedAt: true, endedAt: true },
      })
    : null;
  if (overlap) {
    throw new ApiError(
      "ENROLLMENT_OVERLAP",
      "The requested enrollment start date overlaps existing enrollment history",
      409,
      { student_id: overlap.studentId },
    );
  }

  if (newStudentIds.length) {
    await tx.studentClass.createMany({
      data: newStudentIds.map((studentId) => ({
        studentId,
        classId,
        enrollmentDate: effectiveAt,
        status: "active",
      })),
    });
  }
  if (reactivatedStudentIds.length) {
    await tx.studentClass.updateMany({
      where: { classId, studentId: { in: reactivatedStudentIds } },
      data: { status: "active", enrollmentDate: effectiveAt },
    });
  }
  if (activeStudentIdsToAdjust.length > 0) {
    const openPeriodIds = activeStudentIdsToAdjust.map(
      (studentId) => (openPeriodByStudent.get(studentId) as any).id,
    );
    const overlap = await tx.enrollmentPeriod.findFirst({
      where: {
        classId,
        studentId: { in: activeStudentIdsToAdjust },
        id: { notIn: openPeriodIds },
        OR: [{ endedAt: null }, { endedAt: { gt: effectiveAt } }],
      },
      select: { id: true, studentId: true, startedAt: true, endedAt: true },
    });
    if (overlap) {
      throw new ApiError(
        "ENROLLMENT_OVERLAP",
        "The requested enrollment start date overlaps existing enrollment history",
        409,
        { student_id: overlap.studentId },
      );
    }
    await tx.enrollmentPeriod.updateMany({
      where: { id: { in: openPeriodIds }, startedAt: { gt: effectiveAt } },
      data: { startedAt: effectiveAt, source: "class_bulk_backdate" },
    });
  }
  if (projectionStudentIdsToAdjust.length > 0) {
    await tx.studentClass.updateMany({
      where: {
        classId,
        studentId: { in: projectionStudentIdsToAdjust },
        status: "active",
        enrollmentDate: { gt: effectiveAt },
      },
      data: { enrollmentDate: effectiveAt },
    });
  }

  if (periodRows.length) {
    await tx.enrollmentPeriod.createMany({ data: periodRows });
  }

  const historicalAuditStudentIds = isHistoricalEnrollment(effectiveAt, options.now)
    ? [
        ...newStudentIds,
        ...reactivatedStudentIds,
        ...periodRows.map((row) => row.studentId),
      ]
    : [];
  const auditStudentIds = [
    ...new Set([
      ...historicalAuditStudentIds,
      ...projectionStudentIdsToAdjust,
    ]),
  ];
  if (auditStudentIds.length > 0) {
    const auditPeriods = await tx.enrollmentPeriod.findMany({
      where: {
        classId,
        studentId: { in: auditStudentIds },
        startedAt: { lte: effectiveAt },
        OR: [{ endedAt: null }, { endedAt: { gt: effectiveAt } }],
      },
      select: { id: true, studentId: true },
      orderBy: { startedAt: "desc" },
    });
    const auditPeriodByStudent = new Map<string, { id: string; studentId: string }>();
    for (const period of auditPeriods) {
      if (!auditPeriodByStudent.has(period.studentId)) {
        auditPeriodByStudent.set(period.studentId, period);
      }
    }
    const adjusted = new Set(projectionStudentIdsToAdjust);
    const newlyEnrolled = new Set(newStudentIds);
    const reactivated = new Set(reactivatedStudentIds);
    await tx.activityLog.createMany({
      data: auditStudentIds.map((studentId) => {
        const period = auditPeriodByStudent.get(studentId);
        const link: any = existingByStudent.get(studentId);
        if (!period) {
          throw new ApiError(
            "ENROLLMENT_AUDIT_TARGET_MISSING",
            "Enrollment history was written but its audit target could not be resolved",
            500,
            { student_id: studentId, class_id: classId },
          );
        }
        const before = adjusted.has(studentId)
          ? adjustmentBeforeByStudent.get(studentId) as Date
          : link?.enrollmentDate as Date | undefined;
        const action = adjusted.has(studentId)
          ? "ENROLLMENT_START_CORRECTED"
          : newlyEnrolled.has(studentId)
            ? "HISTORICAL_ENROLLMENT_CREATED"
            : reactivated.has(studentId)
              ? "HISTORICAL_ENROLLMENT_REACTIVATED"
              : "HISTORICAL_ENROLLMENT_PERIOD_BACKFILLED";
        return {
          userId: options.actorId,
          action: JSON.stringify({
            action,
            actor_id: options.actorId,
            reason: options.backdateReason?.trim(),
            student_id: studentId,
            class_id: classId,
            before: before?.toISOString() ?? null,
            after: effectiveAt.toISOString(),
          }),
          entityType: "EnrollmentPeriod",
          entityId: period.id,
        };
      }),
    });
  }

  return {
    requested: uniqueIds.length,
    enrolled: newStudentIds.length,
    reactivated: reactivatedStudentIds.length,
    adjusted: projectionStudentIdsToAdjust.length,
    skipped:
      uniqueIds.length - newStudentIds.length - reactivatedStudentIds.length -
      projectionStudentIdsToAdjust.length,
  };
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  // GET - List all classes OR single class by ID
  if (req.method === "GET") {
    try {
      const { id, status } = req.query;

      // Single class retrieval
      if (id) {
        if (typeof id !== "string") {
          return errorResponse(
            res,
            "INVALID_ID",
            "Class ID must be a string",
            400
          );
        }

        const classData = await prisma.class.findUnique({
          where: { id },
          include: {
            teacher: { select: { id: true, fullName: true } },
            studentClasses: {
              include: {
                student: {
                  select: {
                    id: true,
                    fullName: true,
                    dateOfBirth: true,
                    gender: true,
                    phone: true,
                    parentId: true,
                  },
                },
              },
            },
            enrollmentPeriods: {
              include: {
                student: {
                  select: {
                    id: true,
                    fullName: true,
                    dateOfBirth: true,
                    gender: true,
                    phone: true,
                    parentId: true,
                  },
                },
              },
              orderBy: { startedAt: "asc" },
            },
          },
        });

        if (!classData) {
          return errorResponse(res, "NOT_FOUND", "Class not found", 404);
        }

        // Transform to snake_case
        const result = {
          id: classData.id,
          class_name: classData.className,
          schedule_days: classData.scheduleDays,
          schedule_required: classData.scheduleRequired,
          sessions_per_week: classData.sessionsPerWeek,
          session_required: classData.sessionRequired,
          start_time: classData.startTime,
          end_time: classData.endTime,
          fee_per_day: classData.feePerDay,
          billing_policy: classData.billingPolicy,
          max_students: classData.maxStudents,
          status: classData.status,
          notes: classData.notes,
          teacher_id: classData.teacherId,
          teacher_name: classData.teacher?.fullName || null,
          students: buildHistoricalClassRoster(
            classData.studentClasses,
            classData.enrollmentPeriods,
          ),
          student_count: classData.studentClasses.filter(
            (sc: any) => sc.status === "active",
          ).length,
          created_at: classData.createdAt,
        };

        return successResponse(res, result);
      }

      // List all classes
      const where: any = {};
      if (status && status !== "all") {
        where.status = status as string;
      } else if (!status) {
        where.status = "active";
      }

      const rawClasses = await prisma.class.findMany({
        where,
        include: {
          teacher: { select: { id: true, fullName: true } },
          _count: {
            select: {
              studentClasses: { where: { status: "active" } },
            },
          },
        },
        orderBy: { className: "asc" },
      });

      // Map to snake_case format expected by frontend
      const classes = rawClasses.map((c: any) => ({
        id: c.id,
        class_name: c.className,
        schedule_days: c.scheduleDays,
        schedule_required: c.scheduleRequired,
        sessions_per_week: c.sessionsPerWeek,
        session_required: c.sessionRequired,
        start_time: c.startTime,
        end_time: c.endTime,
        fee_per_day: c.feePerDay,
        billing_policy: c.billingPolicy,
        max_students: c.maxStudents,
        status: c.status,
        notes: c.notes,
        teacher_id: c.teacherId,
        teacher_name: c.teacher?.fullName || null,
        student_count: c._count.studentClasses,
        created_at: c.createdAt,
      }));

      return successResponse(res, { classes });
    } catch (error) {
      console.error("Classes GET error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  // POST - Create new class
  if (req.method === "POST") {
    try {
      const id = typeof req.query.id === "string" ? req.query.id : null;
      const action = req.body?.action;
      if (id && ["enroll", "bulk_enroll"].includes(action)) {
        const actionBody = validateBody(classEnrollmentActionSchema, req.body);
        const studentIds = actionBody.student_ids.length > 0
          ? actionBody.student_ids
          : [actionBody.student_id].filter(Boolean) as string[];
        const effectiveAt = resolveEnrollmentEffectiveAt(
          actionBody.enrollment_effective_date,
        );
        assertHistoricalEnrollmentAllowed(
          req.user.role,
          effectiveAt,
          actionBody.adjust_existing_enrollment_start,
          actionBody.enrollment_backdate_reason,
        );
        const result = await prisma.$transaction(
          (tx) => enrollStudentsInClass(tx, id, studentIds, effectiveAt, {
            adjustExistingEnrollmentStart:
              actionBody.adjust_existing_enrollment_start,
            backdateReason: actionBody.enrollment_backdate_reason,
            actorId: req.user.userId,
            actorRole: req.user.role,
          }),
          CLASS_WRITE_TRANSACTION_OPTIONS
        );
        return successResponse(res, result);
      }

      const body = validateBody(classCreateSchema, req.body);
      const enrollmentEffectiveAt = resolveEnrollmentEffectiveAt(
        body.enrollment_effective_date,
      );
      assertHistoricalEnrollmentAllowed(
        req.user.role,
        enrollmentEffectiveAt,
        body.adjust_existing_enrollment_start,
        body.enrollment_backdate_reason,
      );

      const data: any = {
          className: body.class_name,
          scheduleDays: body.schedule_days ?? null,
          scheduleRequired: body.schedule_required || false,
          sessionsPerWeek: body.sessions_per_week || null,
          sessionRequired: body.session_required || false,
          startTime: body.start_time,
          endTime: body.end_time,
          feePerDay: body.fee_per_day,
          billingPolicy: body.billing_policy ||
            (body.schedule_days || body.sessions_per_week ? "monthly_prorated" : "per_session"),
          maxStudents: body.max_students || 50,
          teacherId: body.teacher_id || null,
          notes: body.notes,
      };

      const result = await prisma.$transaction(
        async (tx) => {
          const newClass = await tx.class.create({
            data,
            include: { teacher: true },
          });
          const enrollment = await enrollStudentsInClass(
            tx,
            newClass.id,
            body.student_ids,
            enrollmentEffectiveAt,
            {
              adjustExistingEnrollmentStart:
                body.adjust_existing_enrollment_start,
              backdateReason: body.enrollment_backdate_reason,
              actorId: req.user.userId,
              actorRole: req.user.role,
            },
          );
          return { newClass, enrollment };
        },
        CLASS_WRITE_TRANSACTION_OPTIONS
      );

      return res.status(201).json({
        success: true,
        data: { class: result.newClass, enrollment: result.enrollment },
      });
    } catch (error) {
      console.error("Create class error:", error);
      if ((error as Error).message === "CLASS_CAPACITY_EXCEEDED") {
        return errorResponse(
          res,
          "CLASS_CAPACITY_EXCEEDED",
          "Class does not have enough capacity for selected students",
          400
        );
      }
      if ((error as Error).message === "CLASS_NOT_FOUND") {
        return errorResponse(res, "CLASS_NOT_FOUND", "Class not found", 404);
      }
      if (isClassWriteTimeout(error)) {
        return errorResponse(
          res,
          "CLASS_WRITE_TIMEOUT",
          "Class save timed out; please retry",
          503
        );
      }
      return sendApiError(res, error, "CLASS_CREATE_ERROR");
    }
  }

  // PUT - Update class
  if (req.method === "PUT") {
    try {
      const { id } = req.query;

      if (!id || typeof id !== "string") {
        return errorResponse(res, "INVALID_ID", "Class ID is required", 400);
      }

      const body = validateBody(classUpdateSchema, req.body);
      const hasEnrollmentMutation =
        body.student_ids !== undefined || body.adjust_existing_enrollment_start;
      const enrollmentEffectiveAt = resolveEnrollmentEffectiveAt(
        body.enrollment_effective_date,
      );
      if (hasEnrollmentMutation) {
        assertHistoricalEnrollmentAllowed(
          req.user.role,
          enrollmentEffectiveAt,
          body.adjust_existing_enrollment_start,
          body.enrollment_backdate_reason,
        );
      }

      const data: any = {
          ...(body.class_name && { className: body.class_name }),
          ...(body.schedule_days !== undefined && { scheduleDays: body.schedule_days }),
          ...(body.schedule_required !== undefined && {
            scheduleRequired: body.schedule_required,
          }),
          ...(body.sessions_per_week !== undefined && {
            sessionsPerWeek: body.sessions_per_week || null,
          }),
          ...(body.session_required !== undefined && {
            sessionRequired: body.session_required,
          }),
          ...(body.start_time && { startTime: body.start_time }),
          ...(body.end_time && { endTime: body.end_time }),
          ...(body.fee_per_day && { feePerDay: body.fee_per_day }),
          ...(body.billing_policy !== undefined && { billingPolicy: body.billing_policy }),
          ...(body.max_students && { maxStudents: body.max_students }),
          ...(body.teacher_id !== undefined && { teacherId: body.teacher_id }),
          ...(body.status && { status: body.status }),
          ...(body.notes !== undefined && { notes: body.notes }),
      };

      const result = await prisma.$transaction(
        async (tx) => {
          if (hasClassMonthRosterImpact(body)) {
            await assertClassDefinitionWritable(tx, [id]);
          }
          const updatedClass = await tx.class.update({
            where: { id },
            data,
            include: { teacher: true },
          });
          const enrollment = hasEnrollmentMutation
            ? await enrollStudentsInClass(
                tx,
                id,
                body.student_ids || [],
                enrollmentEffectiveAt,
                {
                  adjustExistingEnrollmentStart:
                    body.adjust_existing_enrollment_start,
                  backdateReason: body.enrollment_backdate_reason,
                  actorId: req.user.userId,
                  actorRole: req.user.role,
                },
              )
            : {
                requested: 0,
                enrolled: 0,
                reactivated: 0,
                adjusted: 0,
                skipped: 0,
              };
          return { updatedClass, enrollment };
        },
        CLASS_WRITE_TRANSACTION_OPTIONS
      );

      return successResponse(res, {
        class: result.updatedClass,
        enrollment: result.enrollment,
      });
    } catch (error) {
      console.error("Update class error:", error);
      if ((error as Error).message === "CLASS_CAPACITY_EXCEEDED") {
        return errorResponse(
          res,
          "CLASS_CAPACITY_EXCEEDED",
          "Class does not have enough capacity for selected students",
          400
        );
      }
      if ((error as Error).message === "CLASS_NOT_FOUND") {
        return errorResponse(res, "CLASS_NOT_FOUND", "Class not found", 404);
      }
      if (isClassWriteTimeout(error)) {
        return errorResponse(
          res,
          "CLASS_WRITE_TIMEOUT",
          "Class save timed out; please retry",
          503
        );
      }
      return sendApiError(res, error, "CLASS_UPDATE_ERROR");
    }
  }

  // DELETE - Delete class
  if (req.method === "DELETE") {
    try {
      const { id } = req.query;

      if (!id || typeof id !== "string") {
        return errorResponse(res, "INVALID_ID", "Class ID is required", 400);
      }

      const classWithStudents = await prisma.class.findUnique({
        where: { id },
        include: {
          _count: {
            select: { studentClasses: true },
          },
        },
      });

      if (!classWithStudents) {
        return errorResponse(res, "NOT_FOUND", "Class not found", 404);
      }

      await prisma.$transaction(async (tx) => {
        await deactivateEnrollmentPeriods(tx, { classId: id });
        await tx.class.update({
          where: { id },
          data: { status: "inactive" },
        });
      });

      return successResponse(res, { message: "Class archived successfully" });
    } catch (error) {
      console.error("Delete class error:", error);
      return sendApiError(res, error, "CLASS_DELETE_ERROR");
    }
  }

  return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

export default requireAuth(handler);
