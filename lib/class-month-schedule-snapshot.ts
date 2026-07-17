import { expectedSessionsForClass, normalizeScheduleDays } from "./tuition.js";

export type ClassScheduleSource = {
  scheduleDays?: unknown;
  sessionsPerWeek?: number | null;
};

export type ScheduleSnapshot = {
  schedule_days: number[];
  sessions_per_week: number | null;
  expected_regular_sessions: number;
};

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function nonNegativeInteger(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function firstNonNegativeInteger(values: unknown[]): number | null {
  for (const value of values) {
    const parsed = nonNegativeInteger(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

export function buildScheduleSnapshot(
  classData: ClassScheduleSource,
  month: string,
  expectedRegularSessions?: number,
): ScheduleSnapshot {
  const scheduleDays = normalizeScheduleDays(classData.scheduleDays);
  const rawSessionsPerWeek = Number(classData.sessionsPerWeek || 0);
  const sessionsPerWeek = rawSessionsPerWeek > 0
    ? Math.trunc(rawSessionsPerWeek)
    : null;
  const calculated = scheduleDays.length
    ? expectedSessionsForClass(classData, month).expectedSessions
    : 0;
  return {
    schedule_days: scheduleDays,
    sessions_per_week: sessionsPerWeek,
    expected_regular_sessions: Number.isInteger(expectedRegularSessions)
      ? Math.max(0, Number(expectedRegularSessions))
      : calculated,
  };
}

export function scheduleSnapshotFromRevision(value: unknown): ScheduleSnapshot | null {
  const root = objectRecord(value);
  if (!root) return null;
  const payload = objectRecord(root.payload);
  const expectedRegularSessions = firstNonNegativeInteger([
    payload?.expected_regular_sessions,
    root.expected_regular_sessions,
    payload?.class_session_count,
    root.class_session_count,
  ]);
  if (expectedRegularSessions === null) return null;
  const scheduleDaysValue = payload?.schedule_days ?? root.schedule_days;
  const sessionsPerWeekValue = payload?.sessions_per_week ?? root.sessions_per_week;
  const scheduleDays = Array.isArray(scheduleDaysValue)
    ? [...new Set(scheduleDaysValue.map(Number))]
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        .sort((a, b) => a - b)
    : [];
  return {
    schedule_days: scheduleDays,
    sessions_per_week:
      Number(sessionsPerWeekValue) > 0
        ? Math.trunc(Number(sessionsPerWeekValue))
        : null,
    expected_regular_sessions: expectedRegularSessions,
  };
}

export async function loadPersistedScheduleSnapshot(
  db: any,
  plan: { id: string; revision: number },
) {
  if (typeof db.classMonthPlanRevision?.findUnique !== "function") return null;
  const revision = await db.classMonthPlanRevision.findUnique({
    where: { planId_revision: { planId: plan.id, revision: plan.revision } },
    select: { snapshot: true },
  });
  const current = scheduleSnapshotFromRevision(revision?.snapshot);
  if (current) return current;
  if (typeof db.classMonthPlanRevision.findMany !== "function") return null;
  const history = await db.classMonthPlanRevision.findMany({
    where: { planId: plan.id, revision: { lte: plan.revision } },
    orderBy: { revision: "desc" },
    select: { snapshot: true },
  });
  for (const entry of history) {
    const persisted = scheduleSnapshotFromRevision(entry.snapshot);
    if (persisted) return persisted;
  }
  return null;
}

export async function scheduleSnapshotForWrite(
  db: any,
  classId: string,
  month: string,
  classData: ClassScheduleSource,
) {
  const plan = await db.classMonthPlan.findUnique({
    where: { classId_billingMonth: { classId, billingMonth: month } },
    select: { id: true, revision: true },
  });
  if (plan) {
    const persisted = await loadPersistedScheduleSnapshot(db, plan);
    if (persisted) return persisted;
  }
  return buildScheduleSnapshot(classData, month);
}
