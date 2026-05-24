export type TuitionClassInput = {
  feePerDay?: number | null;
  scheduleDays?: unknown;
  sessionsPerWeek?: number | null;
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
};

export const CHARGEABLE_ATTENDANCE_STATUSES = ["present", "absent_with_fee"];

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

  const numericDays = value
    .map((item) => {
      if (typeof item === "number") return item;
      const key = String(item).trim().toLowerCase();
      return (
        {
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
        }[key] ?? Number.NaN
      );
    })
    .filter((item) => Number.isInteger(item));

  const usesJsConvention = numericDays.includes(0);
  const normalized = numericDays
    .map((day) => {
      if (usesJsConvention) return day;
      if (day >= 1 && day <= 7) return day - 1;
      return day;
    })
    .filter((day) => day >= 0 && day <= 6);

  return [...new Set(normalized)].sort((a, b) => a - b);
}

export function normalizeScheduleDays(raw: unknown) {
  return normalizeRawScheduleDays(raw);
}

export function countScheduleDaysInMonth(month: string, scheduleDays: number[]) {
  if (!scheduleDays.length) return 0;
  const { year, monthIndex } = parseMonthParts(month);
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const wanted = new Set(scheduleDays);
  let count = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const weekday = new Date(Date.UTC(year, monthIndex, day)).getUTCDay();
    if (wanted.has(weekday)) count += 1;
  }
  return count;
}

export function countCalendarRowsInMonth(month: string) {
  const { year, monthIndex } = parseMonthParts(month);
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return Math.ceil((firstWeekday + daysInMonth) / 7);
}

export function expectedSessionsForClass(classData: TuitionClassInput, month: string) {
  const scheduleDays = normalizeScheduleDays(classData.scheduleDays);
  if (scheduleDays.length) {
    return {
      expectedSessions: countScheduleDaysInMonth(month, scheduleDays),
      scheduleStrategy: "schedule_days" as const,
      scheduleDays,
    };
  }

  const sessionsPerWeek = Number(classData.sessionsPerWeek || 0);
  if (sessionsPerWeek > 0) {
    return {
      expectedSessions: countCalendarRowsInMonth(month) * sessionsPerWeek,
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
  };
}
