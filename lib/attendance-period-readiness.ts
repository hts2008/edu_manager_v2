import { ApiError } from "./api-utils.js";
import { loadPersistedScheduleSnapshot } from "./class-month-schedule-snapshot.js";
import { expectedSessionsForClass } from "./tuition.js";

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

export function analyzeAttendancePeriodReadiness(input: {
  classId: string;
  month: string;
  sessions: SessionRow[];
  attendance: AttendanceRow[];
  enrollmentPeriods: EnrollmentRow[];
  projections: ProjectionRow[];
  expectedRegularSessions?: number;
}): AttendancePeriodReadiness {
  const regularSessions = input.sessions.filter((session) => session.kind === "regular");
  const issues: AttendanceReadinessIssue[] = [];
  const expectedRegularSessions = Math.max(
    0,
    Math.trunc(Number(input.expectedRegularSessions) || 0),
  );
  if (expectedRegularSessions > 0 && regularSessions.length !== expectedRegularSessions) {
    issues.push({
      code: "MISSING_PUBLISHED_PLAN",
      message: `Regular session plan for ${input.month} is incomplete: expected ${expectedRegularSessions}, found ${regularSessions.length}`,
      expected_sessions: expectedRegularSessions,
      actual_sessions: regularSessions.length,
      recommended_action: "Record every scheduled week in the month before submitting attendance",
    });
  } else if (regularSessions.length === 0) {
    issues.push({
      code: "MISSING_PUBLISHED_PLAN",
      message: `No regular session plan exists for ${input.month}`,
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
      expected_regular_sessions: expectedRegularSessions,
      regular_sessions: regularSessions.length,
      resolved_sessions: resolvedSessions,
      expected_students: expectedStudentIds.size,
      missing_attendance_records: missingAttendanceRecords,
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
      },
      issues: [],
    };
  }

  const bounds = monthBounds(input.month);
  const sessions = await db.classSession.findMany({
    where: { classId: input.classId, billingMonth: input.month },
    orderBy: [{ sessionDate: "asc" }, { id: "asc" }],
  });
  const [attendance, enrollmentPeriods, projections, classRecord, monthPlan] = await Promise.all([
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
    db.class?.findUnique
      ? db.class.findUnique({
          where: { id: input.classId },
          select: { scheduleDays: true, sessionsPerWeek: true },
        })
      : null,
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

  const persistedScheduleSnapshot = monthPlan
    ? await loadPersistedScheduleSnapshot(db, monthPlan)
    : null;
  const expectedRegularSessions = persistedScheduleSnapshot?.expected_regular_sessions
    ?? (classRecord
      ? expectedSessionsForClass(
          {
            scheduleDays: classRecord.scheduleDays,
            sessionsPerWeek: classRecord.sessionsPerWeek,
          },
          input.month,
        ).expectedSessions
      : undefined);

  return analyzeAttendancePeriodReadiness({
    classId: input.classId,
    month: input.month,
    sessions,
    attendance,
    enrollmentPeriods,
    projections,
    expectedRegularSessions,
  });
}

export function assertAttendancePeriodReady(readiness: AttendancePeriodReadiness) {
  if (readiness.ready) return;
  const issue = readiness.issues[0];
  throw new ApiError(issue.code, issue.message, 409, readiness);
}
