import { ApiError } from "./api-utils.js";

type AttendanceEnrollmentRecord = {
  studentId: string;
  attendanceDate: Date | string;
};

type EnrollmentPeriodRow = {
  studentId: string;
  startedAt: Date | string;
  endedAt?: Date | string | null;
};

type EnrollmentProjectionRow = {
  studentId: string;
  enrollmentDate?: Date | string | null;
  status?: string | null;
  student?: { status?: string | null } | null;
};

export type AttendanceEnrollmentConflict = {
  student_id: string;
  attendance_date: string;
  code: "ATTENDANCE_OUTSIDE_ENROLLMENT";
};

function dateOnly(value: Date | string) {
  return (value instanceof Date ? value : new Date(value)).toISOString().slice(0, 10);
}

function periodContainsDate(period: EnrollmentPeriodRow, date: string) {
  const startedAt = dateOnly(period.startedAt);
  const endedAt = period.endedAt ? dateOnly(period.endedAt) : null;
  return date >= startedAt && (!endedAt || date < endedAt);
}

function projectionContainsDate(
  projection: EnrollmentProjectionRow | undefined,
  date: string,
) {
  if (!projection || projection.status !== "active") return false;
  if (projection.student?.status && projection.student.status !== "active") return false;
  if (!projection.enrollmentDate) return true;
  return date >= dateOnly(projection.enrollmentDate);
}

export function findAttendanceEnrollmentConflicts(input: {
  records: AttendanceEnrollmentRecord[];
  enrollmentPeriods: EnrollmentPeriodRow[];
  projections: EnrollmentProjectionRow[];
}) {
  const periodsByStudent = new Map<string, EnrollmentPeriodRow[]>();
  for (const period of input.enrollmentPeriods) {
    const rows = periodsByStudent.get(period.studentId) || [];
    rows.push(period);
    periodsByStudent.set(period.studentId, rows);
  }
  const projectionsByStudent = new Map(
    input.projections.map((projection) => [projection.studentId, projection]),
  );

  const conflicts: AttendanceEnrollmentConflict[] = [];
  for (const record of input.records) {
    const attendanceDate = dateOnly(record.attendanceDate);
    const periods = periodsByStudent.get(record.studentId) || [];
    const eligible = periods.length > 0
      ? periods.some((period) => periodContainsDate(period, attendanceDate))
      : projectionContainsDate(projectionsByStudent.get(record.studentId), attendanceDate);
    if (!eligible) {
      conflicts.push({
        student_id: record.studentId,
        attendance_date: attendanceDate,
        code: "ATTENDANCE_OUTSIDE_ENROLLMENT",
      });
    }
  }
  return conflicts;
}

export function assertAttendanceRecordsWithinEnrollment(input: {
  records: AttendanceEnrollmentRecord[];
  enrollmentPeriods: EnrollmentPeriodRow[];
  projections: EnrollmentProjectionRow[];
}) {
  const conflicts = findAttendanceEnrollmentConflicts(input);
  if (conflicts.length === 0) return;

  const first = conflicts[0];
  throw new ApiError(
    "ATTENDANCE_OUTSIDE_ENROLLMENT",
    `Attendance on ${first.attendance_date} is outside the student's enrollment period`,
    409,
    {
      conflicts,
      recommended_action:
        "Set the student's enrollment effective date before saving historical attendance",
    },
  );
}

export async function assertAttendanceWriteEnrollment(
  tx: any,
  input: { classId: string; records: AttendanceEnrollmentRecord[] },
) {
  if (input.records.length === 0) return;
  const studentIds = [...new Set(input.records.map((record) => record.studentId))];
  const [enrollmentPeriods, projections] = await Promise.all([
    tx.enrollmentPeriod.findMany({
      where: { classId: input.classId, studentId: { in: studentIds } },
      select: { studentId: true, startedAt: true, endedAt: true },
    }),
    tx.studentClass.findMany({
      where: { classId: input.classId, studentId: { in: studentIds } },
      select: {
        studentId: true,
        enrollmentDate: true,
        status: true,
        student: { select: { status: true } },
      },
    }),
  ]);

  assertAttendanceRecordsWithinEnrollment({
    records: input.records,
    enrollmentPeriods,
    projections,
  });
}
