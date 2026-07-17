import { ApiError } from "./api-utils.js";

export type SessionKind = "regular" | "makeup" | "extra";
export type ScheduleMode = "fixed_weekdays" | "flexible";

export class ClassSessionError extends ApiError {}

type MonthPlanInput = {
  class_id: string;
  month: string;
  schedule_mode: ScheduleMode;
  weekdays?: number[];
  dates?: string[];
  sessions_per_week?: number | null;
};

export type MonthPlanWarning = {
  code: "SESSIONS_PER_WEEK_MISMATCH";
  expected: number;
  actual: number;
};

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseMonth(month: unknown) {
  const match = typeof month === "string" ? MONTH_PATTERN.exec(month) : null;
  const year = Number(match?.[1]);
  const monthNumber = Number(match?.[2]);
  if (!match || monthNumber < 1 || monthNumber > 12) {
    throw new ClassSessionError("INVALID_MONTH", "month must be YYYY-MM", 400);
  }
  return { year, monthNumber };
}

export function parseDateOnly(value: unknown, field = "session_date") {
  const match = typeof value === "string" ? DATE_PATTERN.exec(value) : null;
  if (!match) {
    throw new ClassSessionError("INVALID_DATE", `${field} must be YYYY-MM-DD`, 400);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new ClassSessionError("INVALID_DATE", `${field} must be a real calendar date`, 400);
  }
  return date;
}

export function dateOnly(value: Date | string) {
  return (value instanceof Date ? value : parseDateOnly(value)).toISOString().slice(0, 10);
}

export function assertDateInMonth(date: string, month: string) {
  parseMonth(month);
  parseDateOnly(date);
  if (!date.startsWith(`${month}-`)) {
    throw new ClassSessionError(
      "SESSION_DATE_OUTSIDE_MONTH",
      "session_date must be inside the requested month",
      400,
    );
  }
}

export function generateFixedWeekdayDates(month: string, weekdays: number[]) {
  const { year, monthNumber } = parseMonth(month);
  const unique = [...new Set(weekdays)].sort((a, b) => a - b);
  if (!unique.length || unique.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    throw new ClassSessionError(
      "INVALID_WEEKDAYS",
      "weekdays must contain unique integers from 0 (Sunday) to 6 (Saturday)",
      400,
    );
  }
  const wanted = new Set(unique);
  const result: string[] = [];
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(Date.UTC(year, monthNumber - 1, day));
    if (wanted.has(date.getUTCDay())) result.push(date.toISOString().slice(0, 10));
  }
  return result;
}

export function buildMonthPlan(input: MonthPlanInput) {
  if (!input.class_id?.trim()) {
    throw new ClassSessionError("CLASS_ID_REQUIRED", "class_id is required", 400);
  }
  parseMonth(input.month);
  let dates: string[];
  let cadence: number;
  if (input.schedule_mode === "fixed_weekdays") {
    dates = generateFixedWeekdayDates(input.month, input.weekdays || []);
    cadence = new Set(input.weekdays || []).size;
  } else if (input.schedule_mode === "flexible") {
    if (!Array.isArray(input.dates) || input.dates.length === 0) {
      throw new ClassSessionError("DATES_REQUIRED", "dates are required for a flexible plan", 400);
    }
    dates = [...new Set(input.dates)];
    dates.forEach((date) => assertDateInMonth(date, input.month));
    dates.sort();
    cadence = 0;
  } else {
    throw new ClassSessionError("INVALID_SCHEDULE_MODE", "schedule_mode is invalid", 400);
  }

  const warnings: MonthPlanWarning[] = [];
  if (
    input.schedule_mode === "fixed_weekdays" &&
    input.sessions_per_week != null &&
    input.sessions_per_week !== cadence
  ) {
    warnings.push({
      code: "SESSIONS_PER_WEEK_MISMATCH",
      expected: input.sessions_per_week,
      actual: cadence,
    });
  }
  return { dates, warnings };
}

export function validateMakeupDate(originalDate: string | Date, makeupDate: string | Date) {
  const original = dateOnly(originalDate);
  const makeup = dateOnly(makeupDate);
  if (original.slice(0, 7) !== makeup.slice(0, 7)) {
    throw new ClassSessionError(
      "MAKEUP_MUST_BE_SAME_MONTH",
      "A makeup session must be in the same month as the replaced regular session",
      409,
    );
  }
}

export function billingMonthForDate(value: string | Date, supplied?: unknown) {
  const derived = dateOnly(value).slice(0, 7);
  if (supplied !== undefined && supplied !== derived) {
    throw new ClassSessionError(
      "BILLING_MONTH_MISMATCH",
      "billing_month must match session_date",
      400,
    );
  }
  return derived;
}

export function assertExpectedVersion(actual: number, expected: unknown) {
  if (!Number.isInteger(expected) || Number(expected) < 0) {
    throw new ClassSessionError("VERSION_REQUIRED", "version must be a non-negative integer", 400);
  }
  if (actual !== expected) {
    throw new ClassSessionError("VERSION_CONFLICT", "The session plan changed; reload and retry", 409);
  }
}

export function assertRowVersions(
  rows: Array<{ id: string; version: number }>,
  supplied: unknown,
) {
  if (supplied === undefined) return;
  if (!supplied || typeof supplied !== "object" || Array.isArray(supplied)) {
    throw new ClassSessionError("INVALID_ROW_VERSIONS", "row_versions must be an id-to-version object", 400);
  }
  const actual = new Map(rows.map((row) => [row.id, row.version]));
  for (const [id, version] of Object.entries(supplied as Record<string, unknown>)) {
    if (!actual.has(id)) {
      throw new ClassSessionError("SESSION_NOT_FOUND", `Class session ${id} was not found`, 404);
    }
    if (!Number.isInteger(version) || actual.get(id) !== version) {
      throw new ClassSessionError("VERSION_CONFLICT", "A class session changed; reload and retry", 409);
    }
  }
}

export function classSessionToDto(session: any) {
  return {
    id: session.id,
    class_id: session.classId,
    session_date: dateOnly(session.sessionDate),
    billing_month: session.billingMonth,
    kind: session.kind,
    status: session.status,
    extra_fee_mode: session.extraFeeMode,
    replacement_for_id: session.replacementForId ?? session.replacementForSessionId ?? null,
    source: session.source,
    notes: session.notes ?? null,
    version: session.version,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  };
}

export function monthBounds(month: string) {
  const { year, monthNumber } = parseMonth(month);
  return {
    gte: new Date(Date.UTC(year, monthNumber - 1, 1)),
    lt: new Date(Date.UTC(year, monthNumber, 1)),
  };
}

export const PROTECTED_ATTENDANCE_PERIOD_STATUSES = ["submitted", "approved", "locked"] as const;
export const CLASS_SESSION_KINDS = ["regular", "makeup", "extra"] as const;
export const CLASS_SESSION_STATUSES = ["planned", "held", "cancelled", "holiday"] as const;
export const EXTRA_FEE_MODES = ["included", "surcharge"] as const;

export function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
  fallback?: T,
) {
  const resolved = value === undefined ? fallback : value;
  if (typeof resolved !== "string" || !allowed.includes(resolved as T)) {
    throw new ClassSessionError(
      `INVALID_${field.toUpperCase()}`,
      `${field} must be one of: ${allowed.join(", ")}`,
      400,
    );
  }
  return resolved as T;
}

export function normalizeClassSessionError(error: unknown) {
  const code = (error as { code?: unknown })?.code;
  if (code === "P2002") {
    return new ClassSessionError("SESSION_DATE_CONFLICT", "A class session already exists on this date", 409);
  }
  if (code === "P2003") {
    return new ClassSessionError("SESSION_IN_USE", "The class session is referenced and cannot be removed", 409);
  }
  return error;
}

export async function assertMonthMutable(db: any, classId: string, month: string) {
  const protectedPeriod = await db.attendancePeriod.findFirst({
    where: {
      classId,
      periodMonth: month,
      status: { in: [...PROTECTED_ATTENDANCE_PERIOD_STATUSES] },
    },
    select: { id: true, status: true },
  });
  if (protectedPeriod) {
    throw new ClassSessionError(
      "SESSION_PLAN_PROTECTED",
      `Session plan is immutable while attendance period is ${protectedPeriod.status}`,
      409,
    );
  }

  if (
    typeof db.monthlyFeeLine?.findFirst !== "function" ||
    typeof db.monthlyFee?.findFirst !== "function"
  ) {
    throw new ClassSessionError(
      "SESSION_PLAN_FINANCE_CHECK_UNAVAILABLE",
      "Cannot verify whether protected finance depends on this session plan",
      503,
    );
  }

  const protectedLine = await db.monthlyFeeLine.findFirst({
    where: {
      classId,
      month,
      OR: [
        { status: { in: ["confirmed", "paid"] } },
        { receiptId: { not: null } },
        { paidAt: { not: null } },
        { receiptLines: { some: {} } },
        { monthlyFee: { status: { in: ["confirmed", "paid"] } } },
        { monthlyFee: { receiptId: { not: null } } },
        { monthlyFee: { paidAt: { not: null } } },
      ],
    },
    select: { id: true },
  });
  if (protectedLine) {
    throw new ClassSessionError(
      "SESSION_PLAN_FINANCE_PROTECTED",
      "Session plan is immutable because confirmed, paid, or receipt-linked finance depends on it",
      409,
    );
  }

  const bounds = monthBounds(month);
  const protectedAggregate = await db.monthlyFee.findFirst({
    where: {
      month,
      OR: [
        { status: { in: ["confirmed", "paid"] } },
        { receiptId: { not: null } },
        { paidAt: { not: null } },
      ],
      student: {
        OR: [
          {
            enrollmentPeriods: {
              some: {
                classId,
                startedAt: { lt: bounds.lt },
                OR: [
                  { endedAt: null },
                  { endedAt: { gt: bounds.gte } },
                ],
              },
            },
          },
          {
            studentClasses: {
              some: {
                classId,
                status: "active",
                enrollmentDate: { lt: bounds.lt },
              },
            },
          },
        ],
      },
    },
    select: { id: true },
  });
  if (protectedAggregate) {
    throw new ClassSessionError(
      "SESSION_PLAN_FINANCE_PROTECTED",
      "Session plan is immutable because confirmed, paid, or receipt-linked finance depends on it",
      409,
    );
  }
}

export async function assertNoAttendanceForRemovedSessions(
  db: any,
  sessions: Array<string | { id: string; classId: string; sessionDate: Date | string }>,
) {
  if (!sessions.length) return;
  const sessionIds = sessions.map((session) => typeof session === "string" ? session : session.id);
  const legacyDates = sessions
    .filter((session): session is { id: string; classId: string; sessionDate: Date | string } => typeof session !== "string")
    .map((session) => ({ classId: session.classId, attendanceDate: parseDateOnly(dateOnly(session.sessionDate)) }));
  const attendanceCount = await db.attendance.count({
    where: {
      OR: [
        { classSessionId: { in: sessionIds } },
        ...legacyDates.map((legacy) => ({
          classSessionId: null,
          classId: legacy.classId,
          attendanceDate: legacy.attendanceDate,
        })),
      ],
    },
  });
  if (attendanceCount > 0) {
    throw new ClassSessionError(
      "SESSION_HAS_ATTENDANCE",
      "A class session with attendance cannot be removed",
      409,
    );
  }
}

export function assertUniqueMakeupReplacements(current: any[], additions: any[]) {
  const replacementIds = new Set<string>();
  for (const row of current) {
    if (row.kind === "makeup" && row.replacementForId) replacementIds.add(row.replacementForId);
  }
  for (const addition of additions) {
    if (addition.kind !== "makeup") continue;
    const replacementId = addition.replacement_for_id;
    if (typeof replacementId === "string" && replacementIds.has(replacementId)) {
      throw new ClassSessionError(
        "DUPLICATE_MAKEUP_REPLACEMENT",
        "A regular session can have only one makeup replacement in a month",
        409,
      );
    }
    if (typeof replacementId === "string") replacementIds.add(replacementId);
  }
}
