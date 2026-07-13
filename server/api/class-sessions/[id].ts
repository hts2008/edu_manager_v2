import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import { type AuthedRequest, errorResponse, requireAuth, successResponse } from "../../../lib/auth.js";
import { ApiError, getRequiredString, sendApiError } from "../../../lib/api-utils.js";
import {
  claimClassMonthPlan,
  ensureClassMonthPlan,
  type AttendancePeriodPlanStatus,
} from "../../../lib/class-month-plan.js";
import {
  assertMonthMutable,
  billingMonthForDate,
  CLASS_SESSION_KINDS,
  CLASS_SESSION_STATUSES,
  classSessionToDto,
  ClassSessionError,
  dateOnly,
  enumValue,
  EXTRA_FEE_MODES,
  normalizeClassSessionError,
  parseDateOnly,
  validateMakeupDate,
} from "../../../lib/class-sessions.js";

function integerVersion(value: unknown, field: "version" | "expected_version", minimum: number) {
  const parsed = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isInteger(parsed) || Number(parsed) < minimum) {
    throw new ClassSessionError(
      "VERSION_REQUIRED",
      `${field} must be ${minimum === 0 ? "a non-negative" : "a positive"} integer`,
      400,
    );
  }
  return Number(parsed);
}

export function resolveReplacementForSessionId(
  nextKind: (typeof CLASS_SESSION_KINDS)[number],
  requestedReplacementForId: unknown,
  existingReplacementForId: unknown,
) {
  if (nextKind !== "makeup") return null;
  const replacementForSessionId = requestedReplacementForId === undefined
    ? existingReplacementForId
    : requestedReplacementForId || null;
  return getRequiredString(replacementForSessionId, "replacement_for_id");
}

async function getExisting(db: any, id: string) {
  const session = await db.classSession.findUnique({ where: { id } });
  if (!session) throw new ApiError("SESSION_NOT_FOUND", "Class session not found", 404);
  return session;
}

function assertSessionMonthInvariant(session: any) {
  const sessionMonth = dateOnly(session.sessionDate).slice(0, 7);
  billingMonthForDate(session.sessionDate, session.billingMonth);
  return sessionMonth;
}

async function ensurePlanAggregate(
  db: any,
  classId: string,
  month: string,
  actorId?: string | null,
) {
  const period = await db.attendancePeriod.findUnique({
    where: { classId_periodMonth: { classId, periodMonth: month } },
    select: { status: true },
  });
  return ensureClassMonthPlan(db, {
    classId,
    billingMonth: month,
    attendancePeriodStatus: (period?.status ?? "open") as AttendancePeriodPlanStatus,
    actorId,
    snapshot: { source: "class_session_by_id_route" },
  });
}

async function getSession(req: AuthedRequest, id: string, res: VercelResponse) {
  const session = await getExisting(prisma, id);
  const month = assertSessionMonthInvariant(session);
  const aggregate = await ensurePlanAggregate(prisma, session.classId, month, req.user.userId);
  return successResponse(res, {
    state: aggregate.state,
    version: aggregate.revision,
    session: classSessionToDto(session),
  });
}

async function patchSession(req: AuthedRequest, id: string, res: VercelResponse) {
  const body = req.body || {};
  const rowVersion = integerVersion(body.version, "version", 0);
  const aggregateVersion = integerVersion(body.expected_version, "expected_version", 1);
  const initial = await getExisting(prisma, id);
  const originalMonth = assertSessionMonthInvariant(initial);
  const existingAggregate = await ensurePlanAggregate(
    prisma,
    initial.classId,
    originalMonth,
    req.user.userId,
  );
  const snapshot: Record<string, unknown> = {
    operation: "patch",
    session_id: id,
    before: classSessionToDto(initial),
  };
  let saved: any;

  const aggregate = await claimClassMonthPlan(prisma, {
    planId: existingAggregate.id,
    expectedRevision: aggregateVersion,
    actorId: req.user.userId,
    eventType: "class_session_patch",
    targetState: "open",
    snapshot,
  }, async (tx) => {
    await assertMonthMutable(tx, initial.classId, originalMonth);
    const existing = await getExisting(tx, id);
    const currentMonth = assertSessionMonthInvariant(existing);
    if (existing.classId !== initial.classId || currentMonth !== originalMonth) {
      throw new ClassSessionError("VERSION_CONFLICT", "The class session changed; reload and retry", 409);
    }

    const nextDate = body.session_date ? parseDateOnly(body.session_date) : existing.sessionDate;
    const nextMonth = dateOnly(nextDate).slice(0, 7);
    if (nextMonth !== originalMonth) {
      throw new ClassSessionError("SESSION_DATE_OUTSIDE_MONTH", "A session cannot be moved to another month", 400);
    }
    const billingMonth = billingMonthForDate(nextDate, body.billing_month ?? existing.billingMonth);
    const nextKind = enumValue(body.kind, CLASS_SESSION_KINDS, "kind", existing.kind as any);
    const nextStatus = enumValue(body.status, CLASS_SESSION_STATUSES, "status", existing.status as any);
    const nextExtraFeeMode = enumValue(body.extra_fee_mode, EXTRA_FEE_MODES, "extra_fee_mode", existing.extraFeeMode as any);
    const replacementForSessionId = resolveReplacementForSessionId(
      nextKind,
      body.replacement_for_id,
      existing.replacementForId,
    );
    if (nextKind === "makeup") {
      const original = await tx.classSession.findUnique({ where: { id: replacementForSessionId } });
      if (!original || original.classId !== existing.classId || original.kind !== "regular") {
        throw new ClassSessionError("INVALID_REPLACEMENT_SESSION", "replacement_for_session_id must reference a regular session in this class", 400);
      }
      assertSessionMonthInvariant(original);
      validateMakeupDate(original.sessionDate, nextDate);
    }

    const updated = await tx.classSession.updateMany({
      where: { id, version: rowVersion },
      data: {
        ...(body.session_date !== undefined && { sessionDate: nextDate }),
        billingMonth,
        kind: nextKind,
        status: nextStatus,
        extraFeeMode: nextExtraFeeMode,
        ...(body.notes !== undefined && { notes: body.notes || null }),
        replacementForId: replacementForSessionId,
        version: { increment: 1 },
        updatedById: req.user.userId,
      },
    });
    if (updated.count !== 1) {
      throw new ClassSessionError("VERSION_CONFLICT", "The class session changed; reload and retry", 409);
    }
    saved = await getExisting(tx, id);
    assertSessionMonthInvariant(saved);
    snapshot.after = classSessionToDto(saved);
  });

  return successResponse(res, {
    state: aggregate.state,
    version: aggregate.revision,
    session: classSessionToDto(saved),
  });
}

async function deleteSession(req: AuthedRequest, id: string, res: VercelResponse) {
  const rowVersion = integerVersion(req.query.version ?? req.body?.version, "version", 0);
  const aggregateVersion = integerVersion(
    req.query.expected_version ?? req.body?.expected_version,
    "expected_version",
    1,
  );
  const initial = await getExisting(prisma, id);
  const month = assertSessionMonthInvariant(initial);
  const existingAggregate = await ensurePlanAggregate(
    prisma,
    initial.classId,
    month,
    req.user.userId,
  );
  const snapshot = {
    operation: "delete",
    session_id: id,
    deleted_session: classSessionToDto(initial),
  };

  const aggregate = await claimClassMonthPlan(prisma, {
    planId: existingAggregate.id,
    expectedRevision: aggregateVersion,
    actorId: req.user.userId,
    eventType: "class_session_delete",
    targetState: "open",
    snapshot,
  }, async (tx) => {
    await assertMonthMutable(tx, initial.classId, month);
    const existing = await getExisting(tx, id);
    const currentMonth = assertSessionMonthInvariant(existing);
    if (existing.classId !== initial.classId || currentMonth !== month) {
      throw new ClassSessionError("VERSION_CONFLICT", "The class session changed; reload and retry", 409);
    }
    const attendanceCount = await tx.attendance.count({ where: { classSessionId: id } });
    if (attendanceCount > 0) {
      throw new ClassSessionError("SESSION_HAS_ATTENDANCE", "A session with attendance cannot be deleted", 409);
    }
    const deleted = await tx.classSession.deleteMany({ where: { id, version: rowVersion } });
    if (deleted.count !== 1) {
      throw new ClassSessionError("VERSION_CONFLICT", "The class session changed; reload and retry", 409);
    }
  });

  return successResponse(res, {
    state: aggregate.state,
    version: aggregate.revision,
    deleted: true,
    id,
  });
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  try {
    const id = getRequiredString(req.query.id, "id");
    if (req.method === "GET") return await getSession(req, id, res);
    if (req.method === "PATCH") return await patchSession(req, id, res);
    if (req.method === "DELETE") return await deleteSession(req, id, res);
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET, PATCH, and DELETE are allowed", 405);
  } catch (error) {
    return sendApiError(res, normalizeClassSessionError(error), "CLASS_SESSION_ERROR");
  }
}

export default requireAuth(handler);
