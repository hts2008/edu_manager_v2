export type TuitionClassInput = {
  feePerDay?: number | null;
  scheduleDays?: unknown;
  sessionsPerWeek?: number | null;
  enrollmentStart?: Date | string | null;
  enrollmentEnd?: Date | string | null;
};

export type TuitionResult = {
  billingMode: "monthly_package" | "per_session_legacy";
  expectedSessions: number;
  chargedSessions: number;
  feePerSession: number;
  totalAmount: number;
  monthlyTuition: number | null;
  scheduleStrategy: "schedule_days" | "sessions_per_week" | "legacy";
  scheduleDays: number[];
  extraSessions: boolean;
};

export type TuitionClassChargeInput = TuitionClassInput & {
  chargedSessions?: number | null;
};

export type StudentMonthlyTuitionResult = {
  totalDays: number;
  totalAmount: number;
  classes: Array<TuitionResult & { classId?: string | null }>;
};

export type AttendanceSessionPolicyOptions = {
  isMakeUp?: boolean | null;
  makeUpReason?: string | null;
  defaultMakeUpReason?: string | null;
};

export type AttendanceSessionPolicyResult = {
  isMakeUp: boolean;
  makeUpReason: string | null;
  offSchedule: boolean;
  scheduleDays: number[];
};

export const CHARGEABLE_ATTENDANCE_STATUSES = ["present", "absent_with_fee"];
export const DEFAULT_WEEKLY_SESSION_DAYS = [1, 2, 3, 4, 5, 6];
export const DEFAULT_MAKE_UP_REASON = "Hoc bu ngoai lich";

export function parseMonthParts(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new Error("month must be YYYY-MM");
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) throw new Error("month must be YYYY-MM");
  return { year, monthIndex };
}

function normalizeRawScheduleDays(raw: unknown): number[] {
  if (!raw) return [];
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];

  const parsedDays = value
    .map((item) => {
      if (typeof item === "number") {
        return { day: item, convention: "numeric" as const };
      }
      const key = String(item).trim().toLowerCase();
      const labelDay = {
        sunday: 0,
        cn: 0,
        monday: 1,
        mon: 1,
        t2: 1,
        tuesday: 2,
        tue: 2,
        t3: 2,
        wednesday: 3,
        wed: 3,
        t4: 3,
        thursday: 4,
        thu: 4,
        t5: 4,
        friday: 5,
        fri: 5,
        t6: 5,
        saturday: 6,
        sat: 6,
        t7: 6,
      }[key];
      if (labelDay !== undefined) {
        return { day: labelDay, convention: "js" as const };
      }
      return { day: Number(key), convention: "numeric" as const };
    })
    .filter((item) => Number.isInteger(item.day));

  const numericUsesJsConvention = parsedDays.some(
    (item) => item.convention === "numeric" && item.day === 0
  );
  const normalized = parsedDays
    .map((item) => {
      if (item.convention === "js" || numericUsesJsConvention) return item.day;
      if (item.day >= 1 && item.day <= 7) return item.day - 1;
      return item.day;
    })
    .filter((day) => day >= 0 && day <= 6);

  return [...new Set(normalized)].sort((a, b) => a - b);
}

export function normalizeScheduleDays(raw: unknown) {
  return normalizeRawScheduleDays(raw);
}

function getUtcWeekday(value: Date | string) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.getUTCDay();
  }

  const dateText = String(value || "").trim();
  if (!dateText) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}/.test(dateText)
    ? dateText.slice(0, 10)
    : null;
  const parsed = new Date(dateOnly ? `${dateOnly}T00:00:00.000Z` : dateText);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getUTCDay();
}

export function resolveAttendanceSessionPolicy(
  classData: TuitionClassInput,
  attendanceDate: Date | string,
  options: AttendanceSessionPolicyOptions = {}
): AttendanceSessionPolicyResult {
  const scheduleDays = normalizeScheduleDays(classData.scheduleDays);
  const weekday = getUtcWeekday(attendanceDate);
  const offSchedule =
    scheduleDays.length > 0 && weekday !== null && !scheduleDays.includes(weekday);
  const isMakeUp = Boolean(options.isMakeUp) || offSchedule;
  const requestedReason = String(options.makeUpReason || "").trim();

  return {
    isMakeUp,
    makeUpReason: isMakeUp
      ? requestedReason ||
        (offSchedule
          ? options.defaultMakeUpReason || DEFAULT_MAKE_UP_REASON
          : null)
      : null,
    offSchedule,
    scheduleDays,
  };
}

function enrollmentDayBounds(classData: TuitionClassInput, month: string) {
  const { year, monthIndex } = parseMonthParts(month);
  const monthStart = new Date(Date.UTC(year, monthIndex, 1));
  const monthEndExclusive = new Date(Date.UTC(year, monthIndex + 1, 1));
  const requestedStart = classData.enrollmentStart
    ? new Date(classData.enrollmentStart)
    : monthStart;
  const requestedEnd = classData.enrollmentEnd
    ? new Date(classData.enrollmentEnd)
    : monthEndExclusive;
  const start = requestedStart > monthStart ? requestedStart : monthStart;
  const endExclusive = requestedEnd < monthEndExclusive ? requestedEnd : monthEndExclusive;
  return { start, endExclusive };
}

export function countScheduleDaysInMonth(
  month: string,
  scheduleDays: number[],
  enrollment: Pick<TuitionClassInput, "enrollmentStart" | "enrollmentEnd"> = {},
) {
  return listScheduleDatesInMonth(month, scheduleDays, enrollment).length;
}

export function listScheduleDatesInMonth(
  month: string,
  scheduleDays: number[],
  enrollment: Pick<TuitionClassInput, "enrollmentStart" | "enrollmentEnd"> = {},
) {
  if (!scheduleDays.length) return [];
  const { year, monthIndex } = parseMonthParts(month);
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const { start, endExclusive } = enrollmentDayBounds(enrollment, month);
  const wanted = new Set(scheduleDays);
  const dates: string[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(Date.UTC(year, monthIndex, day));
    if (date < start || date >= endExclusive) continue;
    const weekday = date.getUTCDay();
    if (wanted.has(weekday)) dates.push(date.toISOString().slice(0, 10));
  }
  return dates;
}

export function countCalendarRowsInMonth(month: string) {
  const { year, monthIndex } = parseMonthParts(month);
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return Math.ceil((firstWeekday + daysInMonth) / 7);
}

function getMondayWeekKey(date: Date) {
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() + mondayOffset);
  return monday.toISOString().slice(0, 10);
}

export function countMonthBoundedWeeklySessions(
  month: string,
  sessionsPerWeek: number,
  allowedWeekdays = DEFAULT_WEEKLY_SESSION_DAYS,
  enrollment: Pick<TuitionClassInput, "enrollmentStart" | "enrollmentEnd"> = {},
) {
  const safeSessionsPerWeek = Math.max(0, Math.trunc(Number(sessionsPerWeek) || 0));
  if (safeSessionsPerWeek <= 0) return 0;

  const { year, monthIndex } = parseMonthParts(month);
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const { start, endExclusive } = enrollmentDayBounds(enrollment, month);
  const allowed = new Set(allowedWeekdays);
  const availableDaysByWeek = new Map<string, number>();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(Date.UTC(year, monthIndex, day));
    if (date < start || date >= endExclusive) continue;
    if (!allowed.has(date.getUTCDay())) continue;
    const weekKey = getMondayWeekKey(date);
    availableDaysByWeek.set(weekKey, (availableDaysByWeek.get(weekKey) || 0) + 1);
  }

  return Array.from(availableDaysByWeek.values()).reduce(
    (sum, daysInWeek) => sum + Math.min(safeSessionsPerWeek, daysInWeek),
    0
  );
}

export function expectedSessionsForClass(classData: TuitionClassInput, month: string) {
  const scheduleDays = normalizeScheduleDays(classData.scheduleDays);
  if (scheduleDays.length) {
    return {
      expectedSessions: countScheduleDaysInMonth(month, scheduleDays, classData),
      scheduleStrategy: "schedule_days" as const,
      scheduleDays,
    };
  }

  const sessionsPerWeek = Number(classData.sessionsPerWeek || 0);
  if (sessionsPerWeek > 0) {
    return {
      expectedSessions: countMonthBoundedWeeklySessions(
        month,
        sessionsPerWeek,
        DEFAULT_WEEKLY_SESSION_DAYS,
        classData,
      ),
      scheduleStrategy: "sessions_per_week" as const,
      scheduleDays,
    };
  }

  return {
    expectedSessions: 0,
    scheduleStrategy: "legacy" as const,
    scheduleDays,
  };
}

export function calculateTuitionForClass(
  classData: TuitionClassInput,
  month: string,
  chargedSessions: number
): TuitionResult {
  const unitOrMonthlyAmount = Number(classData.feePerDay || 0);
  const safeChargedSessions = Math.max(0, Math.trunc(Number(chargedSessions) || 0));
  const { expectedSessions, scheduleStrategy, scheduleDays } = expectedSessionsForClass(
    classData,
    month
  );

  if (scheduleStrategy === "legacy") {
    return {
      billingMode: "per_session_legacy",
      expectedSessions: safeChargedSessions,
      chargedSessions: safeChargedSessions,
      feePerSession: unitOrMonthlyAmount,
      totalAmount: Math.round(safeChargedSessions * unitOrMonthlyAmount),
      monthlyTuition: null,
      scheduleStrategy,
      scheduleDays,
      extraSessions: false,
    };
  }

  const safeExpectedSessions = Math.max(expectedSessions, 1);
  return {
    billingMode: "monthly_package",
    expectedSessions: safeExpectedSessions,
    chargedSessions: safeChargedSessions,
    feePerSession: Math.round(unitOrMonthlyAmount / safeExpectedSessions),
    totalAmount: Math.round(
      (safeChargedSessions * unitOrMonthlyAmount) / safeExpectedSessions
    ),
    monthlyTuition: unitOrMonthlyAmount,
    scheduleStrategy,
    scheduleDays,
    extraSessions: safeChargedSessions > safeExpectedSessions,
  };
}

export function calculateStudentMonthlyTuition(
  classCharges: TuitionClassChargeInput[],
  month: string
): StudentMonthlyTuitionResult {
  const classes = classCharges.map((classData: any) => ({
    classId: classData.classId || classData.id || null,
    ...calculateTuitionForClass(
      classData,
      month,
      Number(classData.chargedSessions || 0)
    ),
  }));

  return {
    totalDays: classes.reduce((sum, item) => sum + item.chargedSessions, 0),
    totalAmount: classes.reduce((sum, item) => sum + item.totalAmount, 0),
    classes,
  };
}
