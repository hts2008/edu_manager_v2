import { ApiError } from "./api-utils.js";
import { scheduleSnapshotFromRevision } from "./class-month-schedule-snapshot.js";
import { generateFixedWeekdayDates } from "./class-sessions.js";

export type AttendanceExpectedSource =
  | "published_plan_snapshot"
  | "none";

export type AttendanceWeeklyDeficit = {
  week_start: string;
  expected: number;
  actual: number;
  missing_count: number;
  missing_dates: string[];
};

export type RegularPlanCoverage = {
  expected_source: AttendanceExpectedSource;
  actual: number;
  expected: number;
  missing_count: number;
  missing_dates: string[];
  weekly_deficits: AttendanceWeeklyDeficit[];
  recommended_action: string | null;
};

export type AttendanceReadinessIssueCode =
  | "MISSING_PUBLISHED_PLAN"
  | "SESSION_UNRESOLVED"
  | "ATTENDANCE_INCOMPLETE"
  | "ENROLLMENT_CONFLICT";

export type AttendanceReadinessIssue = {
  code: AttendanceReadinessIssueCode;
  message: string;
  session_id?: string;
  session_date?: string;
  student_ids?: string[];
  expected_sessions?: number;
  actual_sessions?: number;
  recommended_action?: string;
};

export type AttendancePeriodReadiness = {
  ready: boolean;
  class_id: string;
  month: string;
  summary: {
    expected_regular_sessions: number;
    regular_sessions: number;
    resolved_sessions: number;
    expected_students: number;
    missing_attendance_records: number;
    expected_source: AttendanceExpectedSource;
    actual: number;
    expected: number;
    missing_count: number;
    missing_dates: string[];
    weekly_deficits: AttendanceWeeklyDeficit[];
    recommended_action: string | null;
  };
  issues: AttendanceReadinessIssue[];
};

type SessionRow = {
  id: string;
  sessionDate: Date | string;
  kind: string;
  status: string;
};

type AttendanceRow = {
  studentId: string;
  classSessionId?: string | null;
  attendanceDate: Date | string;
};

type EnrollmentRow = {
  studentId: string;
  startedAt: Date | string;
  endedAt?: Date | string | null;
};

type ProjectionRow = {
  studentId: string;
  enrollmentDate?: Date | string | null;
  status?: string | null;
  student?: { status?: string | null } | null;
};

function dateOnly(value: Date | string) {
  return (value instanceof Date ? value : new Date(value)).toISOString().slice(0, 10);
}

function monthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1)),
  };
}

function periodContainsDate(period: EnrollmentRow, date: string) {
  const start = dateOnly(period.startedAt);
  const end = period.endedAt ? dateOnly(period.endedAt) : null;
  return date >= start && (!end || date < end);
}

function projectionContainsDate(projection: ProjectionRow | undefined, date: string) {
  if (!projection) return false;
  if (projection.status && projection.status !== "active") return false;
  if (projection.student?.status && projection.student.status !== "active") return false;
  if (!projection.enrollmentDate) return true;
  return date >= dateOnly(projection.enrollmentDate);
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function explicitRegularDatesFromRevision(value: unknown) {
  const root = record(value);
  const payload = record(root?.payload) ?? root;
  if (!payload) return [];
  const requestedDates = Array.isArray(payload.requested_dates)
    ? payload.requested_dates
    : [];
  const sessionDates = Array.isArray(payload.sessions)
    ? payload.sessions.flatMap((value) => {
        const session = record(value);
        return session?.kind === "regular" && typeof session.session_date === "string"
          ? [session.session_date]
          : [];
      })
    : [];
  return [...new Set([...requestedDates, ...sessionDates]
    .filter((value): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)))]
    .sort();
}

function isLegacyLedgerSnapshot(value: unknown) {
  const root = record(value);
  const payload = record(root?.payload);
  return root?.source === "class_month_plan_backfill"
    || payload?.source === "class_month_plan_backfill"
    || root?.class_session_count !== undefined
    || payload?.class_session_count !== undefined;
}

function mondayStart(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - ((value.getUTCDay() + 6) % 7));
  return value.toISOString().slice(0, 10);
}

function weeklyDeficits(expectedDates: string[], actualDates: Set<string>) {
  const weeks = new Map<string, string[]>();
  for (const date of expectedDates) {
    const week = mondayStart(date);
    const dates = weeks.get(week) || [];
    dates.push(date);
    weeks.set(week, dates);
  }
  return [...weeks.entries()].flatMap(([weekStart, dates]) => {
    const missingDates = dates.filter((date) => !actualDates.has(date));
    return missingDates.length === 0
      ? []
      : [{
          week_start: weekStart,
          expected: dates.length,
          actual: dates.length - missingDates.length,
          missing_count: missingDates.length,
          missing_dates: missingDates,
        }];
  });
}

export function buildRegularPlanCoverage(input: {
  month: string;
  sessions: SessionRow[];
  expectedRegularSessions?: number;
  expectedSource?: AttendanceExpectedSource;
  expectedDates?: string[];
}): RegularPlanCoverage {
  const regularSessions = input.sessions.filter((session) => session.kind === "regular");
  const actualDates = new Set(regularSessions.map((session) => dateOnly(session.sessionDate)));
  const hasPublishedExpected = Number.isInteger(input.expectedRegularSessions);
  const source = input.expectedSource
    ?? (hasPublishedExpected ? "published_plan_snapshot" : "none");
  const expected = hasPublishedExpected
    ? Math.max(0, Math.trunc(Number(input.expectedRegularSessions)))
    : 0;
  const expectedDates = [...new Set(input.expectedDates || [])].sort();
  const missingDates = expectedDates.filter((date) => !actualDates.has(date));
  const missingCount = Math.max(expected - regularSessions.length, missingDates.length, 0);
  const differsFromPublished = source === "published_plan_snapshot"
    && (regularSessions.length !== expected || missingDates.length > 0);
  const recommendedAction = source === "none"
    ? "Publish explicit regular session dates for the month before submitting attendance"
    : differsFromPublished
      ? "Reconcile the regular session ledger with the published month plan before submitting attendance"
      : null;
  return {
    expected_source: source,
    actual: regularSessions.length,
    expected,
    missing_count: missingCount,
    missing_dates: missingDates,
    weekly_deficits: weeklyDeficits(expectedDates, actualDates),
    recommended_action: recommendedAction,
  };
}

export async function resolveAuthoritativeRegularPlan(
  db: any,
  input: {
    month: string;
    sessions: SessionRow[];
    plan?: { id: string; revision: number } | null;
  },
): Promise<RegularPlanCoverage> {
  if (input.plan && typeof db.classMonthPlanRevision?.findUnique === "function") {
    const current = await db.classMonthPlanRevision.findUnique({
      where: { planId_revision: { planId: input.plan.id, revision: input.plan.revision } },
      select: { snapshot: true },
    });
    const revisions: Array<{ snapshot?: unknown }> = current ? [current] : [];
    if (typeof db.classMonthPlanRevision.findMany === "function") {
      const history = await db.classMonthPlanRevision.findMany({
        where: { planId: input.plan.id, revision: { lte: input.plan.revision } },
        orderBy: { revision: "desc" },
        select: { snapshot: true },
      });
      revisions.push(...history);
    }
    for (const revision of revisions) {
      const schedule = scheduleSnapshotFromRevision(revision.snapshot);
      if (!schedule) continue;
      const explicitDates = explicitRegularDatesFromRevision(revision.snapshot);
      const isExplicit = explicitDates.length > 0
        || schedule.schedule_days.length > 0
        || isLegacyLedgerSnapshot(revision.snapshot);
      if (!isExplicit) continue;
      const expectedDates = explicitDates.length > 0
        ? explicitDates
        : schedule.schedule_days.length > 0
          ? generateFixedWeekdayDates(input.month, schedule.schedule_days)
          : [];
      return buildRegularPlanCoverage({
        month: input.month,
        sessions: input.sessions,
        expectedRegularSessions: schedule.expected_regular_sessions,
        expectedSource: "published_plan_snapshot",
        expectedDates,
      });
    }
  }
  return buildRegularPlanCoverage({ month: input.month, sessions: input.sessions });
}

export function analyzeAttendancePeriodReadiness(input: {
  classId: string;
  month: string;
  sessions: SessionRow[];
  attendance: AttendanceRow[];
  enrollmentPeriods: EnrollmentRow[];
  projections: ProjectionRow[];
  expectedRegularSessions?: number;
  expectedSource?: AttendanceExpectedSource;
  expectedDates?: string[];
  planCoverage?: RegularPlanCoverage;
}): AttendancePeriodReadiness {
  const regularSessions = input.sessions.filter((session) => session.kind === "regular");
  const issues: AttendanceReadinessIssue[] = [];
  const coverage = input.planCoverage ?? buildRegularPlanCoverage({
    month: input.month,
    sessions: input.sessions,
    expectedRegularSessions: input.expectedRegularSessions,
    expectedSource: input.expectedSource,
    expectedDates: input.expectedDates,
  });
  if (
    coverage.expected_source === "published_plan_snapshot"
    && (coverage.actual !== coverage.expected || coverage.missing_count > 0)
  ) {
    issues.push({
      code: "MISSING_PUBLISHED_PLAN",
      message: `Regular session plan for ${input.month} is incomplete: expected ${coverage.expected}, found ${coverage.actual}`,
      expected_sessions: coverage.expected,
      actual_sessions: coverage.actual,
      recommended_action: coverage.recommended_action || undefined,
    });
  } else if (coverage.expected_source === "none") {
    issues.push({
      code: "MISSING_PUBLISHED_PLAN",
      message: `No regular session plan exists for ${input.month}`,
      recommended_action: coverage.recommended_action || undefined,
    });
  }

  const periodsByStudent = new Map<string, EnrollmentRow[]>();
  for (const period of input.enrollmentPeriods) {
    const periods = periodsByStudent.get(period.studentId) || [];
    periods.push(period);
    periodsByStudent.set(period.studentId, periods);
  }
  const projectionByStudent = new Map(
    input.projections.map((projection) => [projection.studentId, projection]),
  );
  const candidateStudentIds = new Set<string>([
    ...input.enrollmentPeriods.map((period) => period.studentId),
    ...input.projections.map((projection) => projection.studentId),
  ]);

  const isEligible = (studentId: string, date: string) => {
    const periods = periodsByStudent.get(studentId) || [];
    if (periods.length > 0) return periods.some((period) => periodContainsDate(period, date));
    return projectionContainsDate(projectionByStudent.get(studentId), date);
  };

  const attendanceKeys = new Set<string>();
  for (const row of input.attendance) {
    const date = dateOnly(row.attendanceDate);
    attendanceKeys.add(`${row.studentId}:${row.classSessionId || `date:${date}`}`);
    const periods = periodsByStudent.get(row.studentId) || [];
    if (periods.length === 0) {
      issues.push({
        code: "ENROLLMENT_CONFLICT",
        message: `Attendance on ${date} has no EnrollmentPeriod history`,
        session_date: date,
        student_ids: [row.studentId],
        recommended_action: "Backfill the student's EnrollmentPeriod history, then rerun readiness",
      });
    } else if (!periods.some((period) => periodContainsDate(period, date))) {
      issues.push({
        code: "ENROLLMENT_CONFLICT",
        message: `Attendance on ${date} is outside the student's enrollment period`,
        session_date: date,
        student_ids: [row.studentId],
      });
    }
  }

  let resolvedSessions = 0;
  let missingAttendanceRecords = 0;
  const expectedStudentIds = new Set<string>();
  for (const session of regularSessions) {
    const date = dateOnly(session.sessionDate);
    const eligibleStudentIds = [...candidateStudentIds].filter((studentId) =>
      isEligible(studentId, date),
    );
    eligibleStudentIds.forEach((studentId) => expectedStudentIds.add(studentId));

    if (session.status === "planned") {
      issues.push({
        code: "SESSION_UNRESOLVED",
        message: `Class session on ${date} is still planned`,
        session_id: session.id,
        session_date: date,
      });
      continue;
    }
    resolvedSessions += 1;
    if (session.status !== "held") continue;

    const missingStudentIds = eligibleStudentIds.filter((studentId) =>
      !attendanceKeys.has(`${studentId}:${session.id}`) &&
      !attendanceKeys.has(`${studentId}:date:${date}`),
    );
    if (missingStudentIds.length > 0) {
      missingAttendanceRecords += missingStudentIds.length;
      issues.push({
        code: "ATTENDANCE_INCOMPLETE",
        message: `Attendance is incomplete for the class session on ${date}`,
        session_id: session.id,
        session_date: date,
        student_ids: missingStudentIds,
      });
    }
  }

  return {
    ready: issues.length === 0,
    class_id: input.classId,
    month: input.month,
    summary: {
      expected_regular_sessions: coverage.expected,
      regular_sessions: regularSessions.length,
      resolved_sessions: resolvedSessions,
      expected_students: expectedStudentIds.size,
      missing_attendance_records: missingAttendanceRecords,
      ...coverage,
    },
    issues,
  };
}

export async function getAttendancePeriodReadiness(
  db: any,
  input: { classId: string; month: string },
): Promise<AttendancePeriodReadiness> {
  if (!db.classSession?.findMany) {
    return {
      ready: true,
      class_id: input.classId,
      month: input.month,
      summary: {
        expected_regular_sessions: 0,
        regular_sessions: 0,
        resolved_sessions: 0,
        expected_students: 0,
        missing_attendance_records: 0,
        expected_source: "none",
        actual: 0,
        expected: 0,
        missing_count: 0,
        missing_dates: [],
        weekly_deficits: [],
        recommended_action: null,
      },
      issues: [],
    };
  }

  const bounds = monthBounds(input.month);
  const sessions = await db.classSession.findMany({
    where: { classId: input.classId, billingMonth: input.month },
    orderBy: [{ sessionDate: "asc" }, { id: "asc" }],
  });
  const [attendance, enrollmentPeriods, projections, monthPlan] = await Promise.all([
    db.attendance.findMany({
      where: {
        classId: input.classId,
        attendanceDate: { gte: bounds.start, lt: bounds.end },
      },
      select: {
        studentId: true,
        classSessionId: true,
        attendanceDate: true,
      },
    }),
    db.enrollmentPeriod?.findMany
      ? db.enrollmentPeriod.findMany({
          where: { classId: input.classId },
          select: { studentId: true, startedAt: true, endedAt: true },
        })
      : [],
    db.studentClass.findMany({
      where: {
        classId: input.classId,
        enrollmentDate: { lt: bounds.end },
        student: { deletedAt: null },
      },
      select: {
        studentId: true,
        enrollmentDate: true,
        status: true,
        student: { select: { status: true } },
      },
    }),
    db.classMonthPlan?.findUnique
      ? db.classMonthPlan.findUnique({
          where: {
            classId_billingMonth: {
              classId: input.classId,
              billingMonth: input.month,
            },
          },
          select: { id: true, revision: true },
        })
      : null,
  ]);
  const coverage = await resolveAuthoritativeRegularPlan(db, {
    month: input.month,
    sessions,
    plan: monthPlan,
  });

  return analyzeAttendancePeriodReadiness({
    classId: input.classId,
    month: input.month,
    sessions,
    attendance,
    enrollmentPeriods,
    projections,
    planCoverage: coverage,
  });
}

export function assertAttendancePeriodReady(readiness: AttendancePeriodReadiness) {
  if (readiness.ready) return;
  const issue = readiness.issues[0];
  throw new ApiError(issue.code, issue.message, 409, readiness);
}
