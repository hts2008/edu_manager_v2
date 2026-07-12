import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import { type AuthedRequest, errorResponse, requireAuth, successResponse } from "../../../lib/auth.js";
import { ApiError, getRequiredString, sendApiError } from "../../../lib/api-utils.js";
import { normalizeScheduleDays } from "../../../lib/tuition.js";
import {
  assertExpectedVersion,
  assertNoAttendanceForRemovedSessions,
  assertMonthMutable,
  assertRowVersions,
  assertUniqueMakeupReplacements,
  billingMonthForDate,
  buildMonthPlan,
  CLASS_SESSION_KINDS,
  CLASS_SESSION_STATUSES,
  classSessionToDto,
  ClassSessionError,
  enumValue,
  EXTRA_FEE_MODES,
  monthBounds,
  parseDateOnly,
  parseMonth,
  normalizeClassSessionError,
  validateMakeupDate,
} from "../../../lib/class-sessions.js";

function requestIdentity(req: AuthedRequest) {
  const classId = getRequiredString(req.body?.class_id ?? req.query.class_id, "class_id");
  const month = getRequiredString(req.body?.month ?? req.query.month, "month");
  parseMonth(month);
  if (req.body?.billing_month !== undefined && req.body.billing_month !== month) {
    throw new ClassSessionError("BILLING_MONTH_MISMATCH", "billing_month must match month", 400);
  }
  return { classId, month };
}

function planVersion(rows: Array<{ version: number }>) {
  return rows.reduce((max, row) => Math.max(max, row.version), 0);
}

async function loadPlan(db: any, classId: string, month: string) {
  return db.classSession.findMany({
    where: { classId, sessionDate: monthBounds(month) },
    orderBy: [{ sessionDate: "asc" }, { id: "asc" }],
  });
}

async function getMonthPlan(req: AuthedRequest, res: VercelResponse) {
  const { classId, month } = requestIdentity(req);
  const rows = await loadPlan(prisma, classId, month);
  return successResponse(res, {
    class_id: classId,
    month,
    version: planVersion(rows),
    sessions: rows.map(classSessionToDto),
  });
}

async function replaceMonthPlan(req: AuthedRequest, res: VercelResponse) {
  const { classId, month } = requestIdentity(req);
  const classData = await prisma.class.findUnique({
    where: { id: classId },
    select: { id: true, scheduleDays: true, sessionsPerWeek: true },
  });
  if (!classData) throw new ApiError("CLASS_NOT_FOUND", "Class not found", 404);
  const body = req.body || {};
  const plan = buildMonthPlan({
    class_id: classId,
    month,
    schedule_mode: body.schedule_mode,
    weekdays: normalizeScheduleDays(body.weekdays ?? classData.scheduleDays),
    dates: body.dates,
    sessions_per_week: body.sessions_per_week ?? classData.sessionsPerWeek,
  });

  const rows = await prisma.$transaction(async (tx) => {
    await assertMonthMutable(tx, classId, month);
    const current = await loadPlan(tx, classId, month);
    assertExpectedVersion(planVersion(current), body.expected_version);
    assertRowVersions(current, body.row_versions);
    if (current.some((row: any) => row.kind !== "regular" && !plan.dates.includes(row.sessionDate.toISOString().slice(0, 10)))) {
      throw new ClassSessionError(
        "NON_REGULAR_SESSION_REQUIRES_PATCH",
        "PUT cannot remove makeup, extra, or holiday sessions; use PATCH",
        409,
      );
    }
    const nextVersion = planVersion(current) + 1;
    const retainedDates = new Set(plan.dates);
    const removedRegularSessions = current.filter(
      (row: any) => row.kind === "regular" && !retainedDates.has(row.sessionDate.toISOString().slice(0, 10)),
    );
    await assertNoAttendanceForRemovedSessions(tx, removedRegularSessions);
    await tx.classSession.deleteMany({
      where: {
        classId,
        sessionDate: monthBounds(month),
        kind: "regular",
        NOT: { sessionDate: { in: plan.dates.map((date) => parseDateOnly(date)) } },
      },
    });
    for (const date of plan.dates) {
      await tx.classSession.upsert({
        where: { classId_sessionDate: { classId, sessionDate: parseDateOnly(date) } },
        create: {
          classId,
          sessionDate: parseDateOnly(date),
          billingMonth: billingMonthForDate(date, month),
          kind: "regular",
          status: "planned",
          version: nextVersion,
          source: "month_plan",
          createdById: req.user.userId,
          updatedById: req.user.userId,
        },
        update: { version: nextVersion, updatedById: req.user.userId },
      });
    }
    return loadPlan(tx, classId, month);
  }, { isolationLevel: "Serializable" });

  return successResponse(res, {
    class_id: classId,
    month,
    version: planVersion(rows),
    warnings: plan.warnings,
    sessions: rows.map(classSessionToDto),
  });
}

async function patchMonthPlan(req: AuthedRequest, res: VercelResponse) {
  const { classId, month } = requestIdentity(req);
  const body = req.body || {};
  const additions = Array.isArray(body.add_sessions) ? body.add_sessions : [];
  const removeIds: string[] = Array.isArray(body.remove_session_ids)
    ? Array.from(new Set<string>((body.remove_session_ids as unknown[]).filter((id): id is string => typeof id === "string")))
    : [];
  if (!additions.length && !removeIds.length) {
    throw new ClassSessionError("EMPTY_PATCH", "add_sessions or remove_session_ids is required", 400);
  }

  const rows = await prisma.$transaction(async (tx) => {
    await assertMonthMutable(tx, classId, month);
    const current = await loadPlan(tx, classId, month);
    assertExpectedVersion(planVersion(current), body.expected_version);
    assertRowVersions(current, body.row_versions);
    const currentById = new Map(current.map((row: any) => [row.id, row]));
    if (removeIds.some((id) => !currentById.has(id))) {
      throw new ClassSessionError("SESSION_NOT_FOUND", "A session selected for removal was not found", 404);
    }
    await assertNoAttendanceForRemovedSessions(
      tx,
      removeIds.map((id) => currentById.get(id) as any),
    );
    const retained = current.filter((row: any) => !removeIds.includes(row.id));
    assertUniqueMakeupReplacements(retained, additions);
    const nextVersion = planVersion(current) + 1;
    if (removeIds.length) {
      await tx.classSession.deleteMany({ where: { classId, id: { in: removeIds } } });
    }
    for (const addition of additions) {
      const date = getRequiredString(addition.session_date, "session_date");
      if (!date.startsWith(`${month}-`)) {
        throw new ClassSessionError("SESSION_DATE_OUTSIDE_MONTH", "session_date must be inside the requested month", 400);
      }
      const kind = enumValue(addition.kind, CLASS_SESSION_KINDS, "kind", "extra");
      const status = enumValue(addition.status, CLASS_SESSION_STATUSES, "status", "planned");
      const extraFeeMode = enumValue(addition.extra_fee_mode, EXTRA_FEE_MODES, "extra_fee_mode", "included");
      const billingMonth = billingMonthForDate(date, addition.billing_month ?? month);
      let replacementForSessionId: string | null = null;
      if (kind === "makeup") {
        replacementForSessionId = getRequiredString(addition.replacement_for_id, "replacement_for_id");
        const original = currentById.get(replacementForSessionId) as any;
        if (!original || original.classId !== classId || original.kind !== "regular") {
          throw new ClassSessionError("INVALID_REPLACEMENT_SESSION", "replacement_for_session_id must reference a regular session in this class", 400);
        }
        validateMakeupDate(original.sessionDate, date);
      }
      await (tx.classSession as any).create({
        data: {
          classId,
          sessionDate: parseDateOnly(date),
          billingMonth,
          kind,
          status,
          extraFeeMode,
          replacementForId: replacementForSessionId,
          notes: addition.notes || null,
          version: nextVersion,
          source: "month_plan_patch",
          createdById: req.user.userId,
          updatedById: req.user.userId,
        },
      });
    }
    await tx.classSession.updateMany({
      where: { classId, sessionDate: monthBounds(month) },
      data: { version: nextVersion, updatedById: req.user.userId },
    });
    return loadPlan(tx, classId, month);
  }, { isolationLevel: "Serializable" });

  return successResponse(res, {
    class_id: classId,
    month,
    version: planVersion(rows),
    sessions: rows.map(classSessionToDto),
  });
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") return await getMonthPlan(req, res);
    if (req.method === "PUT") return await replaceMonthPlan(req, res);
    if (req.method === "PATCH") return await patchMonthPlan(req, res);
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET, PUT, and PATCH are allowed", 405);
  } catch (error) {
    return sendApiError(res, normalizeClassSessionError(error), "CLASS_SESSION_MONTH_PLAN_ERROR");
  }
}

export default requireAuth(handler);
