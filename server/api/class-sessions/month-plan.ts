import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import { type AuthedRequest, errorResponse, requireAuth, successResponse } from "../../../lib/auth.js";
import { ApiError, getRequiredString, sendApiError } from "../../../lib/api-utils.js";
import {
  claimClassMonthPlan,
  ensureClassMonthPlan,
  type AttendancePeriodPlanStatus,
  withClassMonthPlanRosterWrite,
} from "../../../lib/class-month-plan.js";
import { normalizeScheduleDays } from "../../../lib/tuition.js";
import {
  buildRegularPlanCoverage,
  resolveAuthoritativeRegularPlan,
} from "../../../lib/attendance-period-readiness.js";
import {
  buildScheduleSnapshot,
  loadPersistedScheduleSnapshot,
  scheduleSnapshotFromRevision,
  type ScheduleSnapshot,
} from "../../../lib/class-month-schedule-snapshot.js";
export { buildScheduleSnapshot, scheduleSnapshotFromRevision } from "../../../lib/class-month-schedule-snapshot.js";
import {
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
  dateOnly,
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

export function readOnlyPlanState(
  aggregateState: "open" | "frozen" | null | undefined,
  attendancePeriodStatus: "open" | "submitted" | "approved" | "locked" | null | undefined,
) {
  if (aggregateState) return aggregateState;
  return attendancePeriodStatus && attendancePeriodStatus !== "open" ? "frozen" : "open";
}

function expectedRevision(value: unknown) {
  const revision = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isInteger(revision) || Number(revision) < 0) {
    throw new ClassSessionError(
      "VERSION_REQUIRED",
      "expected_version must be a non-negative integer",
      400,
    );
  }
  return Number(revision);
}

export function resolveFixedMonthPlanWeekdays(
  requestedWeekdays: unknown,
  persistedWeekdays: unknown,
) {
  const source = requestedWeekdays === undefined
    ? normalizeScheduleDays(persistedWeekdays)
    : requestedWeekdays;
  if (
    !Array.isArray(source)
    || source.length === 0
    || source.some((day) => !Number.isInteger(day) || Number(day) < 0 || Number(day) > 6)
  ) {
    throw new ClassSessionError(
      "INVALID_WEEKDAYS",
      "weekdays must contain unique integers from 0 (Sunday) to 6 (Saturday)",
      400,
    );
  }
  return [...new Set(source as number[])].sort((a, b) => a - b);
}

export function parsePatchSessionAdditions(value: unknown): Array<Record<string, unknown>> {
  if (value === undefined) return [];
  if (
    !Array.isArray(value)
    || value.some((entry) => !entry || typeof entry !== "object" || Array.isArray(entry))
  ) {
    throw new ClassSessionError(
      "INVALID_ADD_SESSIONS",
      "add_sessions must be an array of session objects",
      400,
    );
  }
  return value as Array<Record<string, unknown>>;
}

export function requiredChangeReason(value: unknown) {
  const reason = getRequiredString(value, "reason").trim();
  if (!reason) throw new ApiError("MISSING_FIELD", "reason is required", 400);
  return reason;
}

export function resolveMutationExpectedRevision(
  requestedRevision: number,
  ensured: { created: boolean; aggregate: { revision: number } },
) {
  if (requestedRevision !== 0) return requestedRevision;
  if (ensured.created) return ensured.aggregate.revision;
  throw new ClassSessionError(
    "CLASS_MONTH_PLAN_REVISION_CONFLICT",
    "Class month plan changed; reload it before retrying",
    409,
    { expected_revision: 0, current_revision: ensured.aggregate.revision },
  );
}

export function synchronizeFlexiblePlanSnapshot(
  snapshot: Record<string, unknown>,
  scheduleSnapshot: ScheduleSnapshot,
  rows: Array<{ kind: string; sessionDate: Date | string }>,
) {
  if (scheduleSnapshot.schedule_days.length > 0) return [];
  const regularDates = rows
    .filter((row) => row.kind === "regular")
    .map((row) => dateOnly(row.sessionDate));
  scheduleSnapshot.expected_regular_sessions = regularDates.length;
  Object.assign(snapshot, scheduleSnapshot, { requested_dates: regularDates });
  return regularDates;
}

function maxSessionVersion(rows: Array<{ version: number }>) {
  return rows.reduce((max, row) => Math.max(max, row.version), 0);
}

function assertPlanSessionMonthInvariant(rows: any[], classId: string, month: string) {
  for (const row of rows) {
    const sessionMonth = dateOnly(row.sessionDate).slice(0, 7);
    if (row.classId !== classId || sessionMonth !== month || row.billingMonth !== sessionMonth) {
      throw new ClassSessionError(
        "BILLING_MONTH_MISMATCH",
        "Every session_date must belong to its class month plan and match billing_month",
        409,
        { session_id: row.id, session_month: sessionMonth, billing_month: row.billingMonth },
      );
    }
  }
}

async function loadPlan(db: any, classId: string, month: string) {
  return db.classSession.findMany({
    where: { classId, sessionDate: monthBounds(month) },
    orderBy: [{ sessionDate: "asc" }, { id: "asc" }],
  });
}

async function ensurePlanAggregate(
  db: any,
  classId: string,
  month: string,
  scheduleSnapshot: ScheduleSnapshot,
  actorId?: string | null,
) {
  const existingPlan = await db.classMonthPlan.findUnique({
    where: { classId_billingMonth: { classId, billingMonth: month } },
    select: { id: true, revision: true },
  });
  const persistedScheduleSnapshot = existingPlan
    ? await loadPersistedScheduleSnapshot(db, existingPlan)
    : null;
  const period = await db.attendancePeriod.findUnique({
    where: { classId_periodMonth: { classId, periodMonth: month } },
    select: { status: true },
  });
  const aggregate = await ensureClassMonthPlan(db, {
    classId,
    billingMonth: month,
    attendancePeriodStatus: (period?.status ?? "open") as AttendancePeriodPlanStatus,
    actorId,
    snapshot: {
      source: "class_session_month_plan_route",
      ...(persistedScheduleSnapshot ?? scheduleSnapshot),
    },
  });
  return { aggregate, created: !existingPlan };
}

async function getMonthPlan(req: AuthedRequest, res: VercelResponse) {
  const { classId, month } = requestIdentity(req);
  const classData = await prisma.class.findUnique({
    where: { id: classId },
    select: { id: true },
  });
  if (!classData) throw new ApiError("CLASS_NOT_FOUND", "Class not found", 404);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const aggregate = await prisma.classMonthPlan.findUnique({
      where: { classId_billingMonth: { classId, billingMonth: month } },
      select: { id: true, state: true, revision: true },
    });
    const period = aggregate
      ? null
      : await prisma.attendancePeriod.findUnique({
          where: { classId_periodMonth: { classId, periodMonth: month } },
          select: { id: true, status: true },
        });
    const rows = await loadPlan(prisma, classId, month);
    assertPlanSessionMonthInvariant(rows, classId, month);
    const coverage = await resolveAuthoritativeRegularPlan(prisma, {
      month,
      sessions: rows,
      plan: aggregate,
    });
    const verifiedAggregate = await prisma.classMonthPlan.findUnique({
      where: { classId_billingMonth: { classId, billingMonth: month } },
      select: { id: true, state: true, revision: true },
    });
    const verifiedPeriod = aggregate
      ? null
      : await prisma.attendancePeriod.findUnique({
          where: { classId_periodMonth: { classId, periodMonth: month } },
          select: { id: true, status: true },
        });
    const sameRevision = (aggregate?.id ?? null) === (verifiedAggregate?.id ?? null)
      && (aggregate?.revision ?? 0) === (verifiedAggregate?.revision ?? 0)
      && (aggregate?.state ?? "open") === (verifiedAggregate?.state ?? "open");
    const samePeriod = (period?.id ?? null) === (verifiedPeriod?.id ?? null)
      && (period?.status ?? null) === (verifiedPeriod?.status ?? null);
    if (!sameRevision || !samePeriod) continue;
    return successResponse(res, {
      class_id: classId,
      month,
      state: readOnlyPlanState(aggregate?.state, period?.status),
      attendance_period_status: period?.status ?? null,
      version: aggregate?.revision ?? 0,
      expected_regular_sessions: coverage.expected,
      ...coverage,
      sessions: rows.map(classSessionToDto),
    });
  }
  throw new ClassSessionError(
    "CLASS_MONTH_PLAN_REVISION_CONFLICT",
    "Class month plan changed while loading; retry the request",
    409,
  );
}

async function replaceMonthPlan(req: AuthedRequest, res: VercelResponse) {
  const { classId, month } = requestIdentity(req);
  const body = req.body || {};
  const aggregateVersion = expectedRevision(body.expected_version);
  const changeReason = requiredChangeReason(body.reason);
  const { aggregate, plan, rows, scheduleSnapshot } = await withClassMonthPlanRosterWrite(
    prisma,
    classId,
    month,
    async (tx) => {
      const classData = await tx.class.findUnique({
        where: { id: classId },
        select: { id: true, scheduleDays: true, sessionsPerWeek: true },
      });
      if (!classData) throw new ApiError("CLASS_NOT_FOUND", "Class not found", 404);
      const fixedWeekdays = body.schedule_mode === "fixed_weekdays"
        ? resolveFixedMonthPlanWeekdays(body.weekdays, classData.scheduleDays)
        : [];
      const plan = buildMonthPlan({
        class_id: classId,
        month,
        schedule_mode: body.schedule_mode,
        weekdays: fixedWeekdays,
        dates: body.dates,
        sessions_per_week: body.sessions_per_week ?? classData.sessionsPerWeek,
      });
      const replacementScheduleSnapshot = buildScheduleSnapshot(
        {
          scheduleDays: [],
          sessionsPerWeek: body.sessions_per_week ?? classData.sessionsPerWeek,
        },
        month,
        plan.dates.length,
      );
      replacementScheduleSnapshot.schedule_days = fixedWeekdays;
      const currentScheduleSnapshot = buildScheduleSnapshot(classData, month);
      const ensured = await ensurePlanAggregate(
        tx,
        classId,
        month,
        currentScheduleSnapshot,
        req.user.userId,
      );
      const existingAggregate = ensured.aggregate;
      const snapshot: Record<string, unknown> = {
        operation: "replace",
        requested_dates: plan.dates,
        ...replacementScheduleSnapshot,
      };
      let rows: any[] = [];
      const aggregate = await claimClassMonthPlan(tx, {
        planId: existingAggregate.id,
        expectedRevision: resolveMutationExpectedRevision(aggregateVersion, ensured),
        actorId: req.user.userId,
        reason: changeReason,
        eventType: "month_plan_replace",
        targetState: "open",
        snapshot,
      }, async (claimTx) => {
        await assertMonthMutable(claimTx, classId, month);
        const current = await loadPlan(claimTx, classId, month);
        assertPlanSessionMonthInvariant(current, classId, month);
        assertRowVersions(current, body.row_versions);
        const requestedDateSet = new Set(plan.dates);
        const kindConflict = current.find(
          (row: any) => row.kind !== "regular" && requestedDateSet.has(dateOnly(row.sessionDate)),
        );
        if (kindConflict) {
          throw new ClassSessionError(
            "SESSION_KIND_CONFLICT",
            "PUT cannot replace a makeup or extra session with a regular session; use PATCH",
            409,
            {
              session_id: kindConflict.id,
              session_date: dateOnly(kindConflict.sessionDate),
              existing_kind: kindConflict.kind,
              requested_kind: "regular",
            },
          );
        }
        if (current.some((row: any) => row.kind !== "regular" && !plan.dates.includes(dateOnly(row.sessionDate)))) {
          throw new ClassSessionError(
            "NON_REGULAR_SESSION_REQUIRES_PATCH",
            "PUT cannot remove makeup, extra, or holiday sessions; use PATCH",
            409,
          );
        }
        const nextRowVersion = maxSessionVersion(current) + 1;
        const retainedDates = new Set(plan.dates);
        const removedRegularSessions = current.filter(
          (row: any) => row.kind === "regular" && !retainedDates.has(dateOnly(row.sessionDate)),
        );
        await assertNoAttendanceForRemovedSessions(claimTx, removedRegularSessions);
        await claimTx.classSession.deleteMany({
          where: {
            classId,
            sessionDate: monthBounds(month),
            kind: "regular",
            NOT: { sessionDate: { in: plan.dates.map((date) => parseDateOnly(date)) } },
          },
        });
        for (const date of plan.dates) {
          const billingMonth = billingMonthForDate(date, month);
          await claimTx.classSession.upsert({
            where: { classId_sessionDate: { classId, sessionDate: parseDateOnly(date) } },
            create: {
              classId,
              sessionDate: parseDateOnly(date),
              billingMonth,
              kind: "regular",
              status: "planned",
              version: nextRowVersion,
              source: "month_plan",
              createdById: req.user.userId,
              updatedById: req.user.userId,
            },
            update: {
              billingMonth,
              version: nextRowVersion,
              updatedById: req.user.userId,
            },
          });
        }
        rows = await loadPlan(claimTx, classId, month);
        assertPlanSessionMonthInvariant(rows, classId, month);
        snapshot.sessions = rows.map(classSessionToDto);
      });
      return { aggregate, plan, rows, scheduleSnapshot: replacementScheduleSnapshot };
    },
  );

  return successResponse(res, {
    class_id: classId,
    month,
    state: aggregate.state,
    version: aggregate.revision,
    expected_regular_sessions: scheduleSnapshot.expected_regular_sessions,
    ...buildRegularPlanCoverage({
      month,
      sessions: rows,
      expectedRegularSessions: scheduleSnapshot.expected_regular_sessions,
      expectedSource: "published_plan_snapshot",
      expectedDates: plan.dates,
    }),
    warnings: plan.warnings,
    sessions: rows.map(classSessionToDto),
  });
}

async function patchMonthPlan(req: AuthedRequest, res: VercelResponse) {
  const { classId, month } = requestIdentity(req);
  const body = req.body || {};
  const aggregateVersion = expectedRevision(body.expected_version);
  const changeReason = requiredChangeReason(body.reason);
  const additions = parsePatchSessionAdditions(body.add_sessions);
  const removeIds: string[] = Array.isArray(body.remove_session_ids)
    ? Array.from(new Set<string>((body.remove_session_ids as unknown[]).filter((id): id is string => typeof id === "string")))
    : [];
  if (!additions.length && !removeIds.length) {
    throw new ClassSessionError("EMPTY_PATCH", "add_sessions or remove_session_ids is required", 400);
  }

  const snapshot: Record<string, unknown> = {
    operation: "patch",
    add_sessions: additions,
    remove_session_ids: removeIds,
  };
  const { aggregate, rows, scheduleSnapshot } = await withClassMonthPlanRosterWrite(
    prisma,
    classId,
    month,
    async (tx) => {
      const classData = await tx.class.findUnique({
        where: { id: classId },
        select: { id: true, scheduleDays: true, sessionsPerWeek: true },
      });
      if (!classData) throw new ApiError("CLASS_NOT_FOUND", "Class not found", 404);
      const currentScheduleSnapshot = buildScheduleSnapshot(classData, month);
      const ensured = await ensurePlanAggregate(
        tx,
        classId,
        month,
        currentScheduleSnapshot,
        req.user.userId,
      );
      const existingAggregate = ensured.aggregate;
      const scheduleSnapshot =
        await loadPersistedScheduleSnapshot(tx, existingAggregate) ?? currentScheduleSnapshot;
      Object.assign(snapshot, scheduleSnapshot);
      let rows: any[] = [];
      const aggregate = await claimClassMonthPlan(tx, {
        planId: existingAggregate.id,
        expectedRevision: resolveMutationExpectedRevision(aggregateVersion, ensured),
        actorId: req.user.userId,
        reason: changeReason,
        eventType: "month_plan_patch",
        targetState: "open",
        snapshot,
      }, async (claimTx) => {
    await assertMonthMutable(claimTx, classId, month);
    const current = await loadPlan(claimTx, classId, month);
    assertPlanSessionMonthInvariant(current, classId, month);
    assertRowVersions(current, body.row_versions);
    const currentById = new Map(current.map((row: any) => [row.id, row]));
    if (removeIds.some((id) => !currentById.has(id))) {
      throw new ClassSessionError("SESSION_NOT_FOUND", "A session selected for removal was not found", 404);
    }
    await assertNoAttendanceForRemovedSessions(
      claimTx,
      removeIds.map((id) => currentById.get(id) as any),
    );
    const retained = current.filter((row: any) => !removeIds.includes(row.id));
    assertUniqueMakeupReplacements(retained, additions);
    const nextRowVersion = maxSessionVersion(current) + 1;
    if (removeIds.length) {
      await claimTx.classSession.deleteMany({ where: { classId, id: { in: removeIds } } });
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
      await claimTx.classSession.create({
        data: {
          classId,
          sessionDate: parseDateOnly(date),
          billingMonth,
          kind,
          status,
          extraFeeMode,
          replacementForId: replacementForSessionId,
          notes: addition.notes || null,
          version: nextRowVersion,
          source: "month_plan_patch",
          createdById: req.user.userId,
          updatedById: req.user.userId,
        },
      });
    }
    await claimTx.classSession.updateMany({
      where: { classId, sessionDate: monthBounds(month) },
      data: { version: nextRowVersion, updatedById: req.user.userId },
    });
    rows = await loadPlan(claimTx, classId, month);
    assertPlanSessionMonthInvariant(rows, classId, month);
    synchronizeFlexiblePlanSnapshot(snapshot, scheduleSnapshot, rows);
    snapshot.sessions = rows.map(classSessionToDto);
      });
      return { aggregate, rows, scheduleSnapshot };
    },
  );

  return successResponse(res, {
    class_id: classId,
    month,
    state: aggregate.state,
    version: aggregate.revision,
    expected_regular_sessions: scheduleSnapshot.expected_regular_sessions,
    ...buildRegularPlanCoverage({
      month,
      sessions: rows,
      expectedRegularSessions: scheduleSnapshot.expected_regular_sessions,
      expectedSource: "published_plan_snapshot",
      expectedDates: Array.isArray(snapshot.requested_dates)
        ? snapshot.requested_dates as string[]
        : undefined,
    }),
    sessions: rows.map(classSessionToDto),
  });
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") return await getMonthPlan(req, res);
    if ((req.method === "PUT" || req.method === "PATCH") && req.user.role !== "admin") {
      throw new ApiError("FORBIDDEN", "Forbidden", 403);
    }
    if (req.method === "PUT") return await replaceMonthPlan(req, res);
    if (req.method === "PATCH") return await patchMonthPlan(req, res);
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET, PUT, and PATCH are allowed", 405);
  } catch (error) {
    return sendApiError(res, normalizeClassSessionError(error), "CLASS_SESSION_MONTH_PLAN_ERROR");
  }
}

export default requireAuth(handler);
