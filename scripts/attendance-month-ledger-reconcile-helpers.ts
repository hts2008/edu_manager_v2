export const ATTENDANCE_GENERATED_SOURCES = [
  "attendance_bulk",
  "attendance_single",
] as const;

export type ReconciliationOptions = {
  apply: boolean;
  actorId: string | null;
  classId: string;
  month: string;
  reason: string | null;
};

export type AttendanceRow = {
  id: string;
  studentId: string;
  classSessionId: string | null;
  classSessionDate: Date | null;
  attendanceDate: Date;
  status: string;
};

export type EnrollmentPeriodRow = {
  id: string;
  studentId: string;
  startedAt: Date;
  endedAt: Date | null;
  source: string;
};

export type EnrollmentStartCorrection = {
  enrollment_period_id: string;
  student_id: string;
  current_started_at: string;
  proposed_started_at: string;
  source: string;
  evidence_attendance_id: string;
  evidence_attendance_status: string;
};

const VALUE_ARGUMENTS = ["class-id", "month", "reason", "actor-id"] as const;
const REAL_ATTENDANCE_STATUSES = new Set(["present", "absent_with_fee", "absent_no_fee"]);

export function isRealAttendanceEvidence(row: AttendanceRow) {
  return Boolean(
    row.id &&
    row.classSessionId &&
    row.classSessionDate &&
    row.classSessionDate.getTime() === row.attendanceDate.getTime() &&
    REAL_ATTENDANCE_STATUSES.has(row.status),
  );
}

function argument(args: string[], name: string) {
  const prefix = `--${name}=`;
  return args.find((value) => value.startsWith(prefix))?.slice(prefix.length).trim() || null;
}

export function parseReconciliationArgs(args: string[]): ReconciliationOptions {
  const seen = new Set<string>();
  for (const value of args) {
    const name = value === "--apply"
      ? "apply"
      : VALUE_ARGUMENTS.find((candidate) => value.startsWith(`--${candidate}=`));
    if (!name) throw new Error(`Unknown argument: ${value}`);
    if (seen.has(name)) throw new Error(`Duplicate argument: --${name}`);
    seen.add(name);
  }

  const apply = args.includes("--apply");
  const classId = argument(args, "class-id");
  const month = argument(args, "month");
  const reason = argument(args, "reason");
  const actorId = argument(args, "actor-id");

  if (!classId) throw new Error("--class-id=<id> is required");
  if (/\s/.test(classId)) throw new Error("--class-id must not contain whitespace");
  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error("--month=YYYY-MM is required");
  }
  if (apply && (!reason || reason.length < 8)) {
    throw new Error("--apply requires --reason with at least 8 characters");
  }
  if (reason && (reason.length > 500 || /[\r\n\0]/.test(reason))) {
    throw new Error("--reason must be a single line with at most 500 characters");
  }
  if (apply && !actorId) throw new Error("--apply requires --actor-id=<user-id> for audit");
  if (actorId && /\s/.test(actorId)) throw new Error("--actor-id must not contain whitespace");
  return { apply, actorId, classId, month, reason };
}

export function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function monthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    startDate: new Date(Date.UTC(year, monthNumber - 1, 1)),
    nextMonth: new Date(Date.UTC(year, monthNumber, 1)),
  };
}

function earliestRealAttendance(attendance: AttendanceRow[]) {
  const earliest = new Map<string, AttendanceRow>();
  for (const row of attendance) {
    if (!isRealAttendanceEvidence(row)) continue;
    const current = earliest.get(row.studentId);
    if (
      !current ||
      row.attendanceDate < current.attendanceDate ||
      (row.attendanceDate.getTime() === current.attendanceDate.getTime() && row.id < current.id)
    ) {
      earliest.set(row.studentId, row);
    }
  }
  return earliest;
}

function periodsByStudent(periods: EnrollmentPeriodRow[]) {
  const grouped = new Map<string, EnrollmentPeriodRow[]>();
  for (const period of periods) {
    grouped.set(period.studentId, [...(grouped.get(period.studentId) || []), period]);
  }
  for (const rows of grouped.values()) {
    rows.sort((left, right) => left.startedAt.getTime() - right.startedAt.getTime());
  }
  return grouped;
}

function periodCovers(period: EnrollmentPeriodRow, attendanceDate: Date) {
  return period.startedAt <= attendanceDate &&
    (period.endedAt === null || attendanceDate < period.endedAt);
}

export function findEnrollmentStartCorrections(
  attendance: AttendanceRow[],
  periods: EnrollmentPeriodRow[],
): EnrollmentStartCorrection[] {
  const earliest = earliestRealAttendance(attendance);
  const grouped = periodsByStudent(periods);
  const corrections: EnrollmentStartCorrection[] = [];

  for (const [studentId, evidence] of [...earliest].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const attendanceDate = evidence.attendanceDate;
    const studentPeriods = grouped.get(studentId) || [];
    if (studentPeriods.some((period) => periodCovers(period, attendanceDate))) continue;
    const laterPeriod = studentPeriods.find(
      (period) =>
        period.startedAt > attendanceDate &&
        (period.endedAt === null || attendanceDate < period.endedAt),
    );
    if (!laterPeriod) continue;
    corrections.push({
      enrollment_period_id: laterPeriod.id,
      student_id: studentId,
      current_started_at: dateKey(laterPeriod.startedAt),
      proposed_started_at: dateKey(attendanceDate),
      source: laterPeriod.source,
      evidence_attendance_id: evidence.id,
      evidence_attendance_status: evidence.status,
    });
  }
  return corrections;
}

export function findStudentsWithoutEnrollmentPeriod(
  attendance: AttendanceRow[],
  periods: EnrollmentPeriodRow[],
  corrections: EnrollmentStartCorrection[],
) {
  const earliest = earliestRealAttendance(attendance);
  const corrected = new Set(corrections.map((row) => row.student_id));
  return [...earliest.keys()]
    .filter((studentId) => {
      if (corrected.has(studentId)) return false;
      const attendanceDate = earliest.get(studentId)!.attendanceDate;
      return !periods.some(
        (period) => period.studentId === studentId && periodCovers(period, attendanceDate),
      );
    })
    .sort();
}
