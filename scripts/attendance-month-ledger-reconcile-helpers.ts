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

export type AttendanceOutsideEnrollmentPeriod = {
  attendance_id: string;
  student_id: string;
  attendance_date: string;
  attendance_status: string;
  resolution: "adjust_enrollment_start" | "unresolved";
  enrollment_period_id: string | null;
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

function compareAttendance(left: AttendanceRow, right: AttendanceRow) {
  return left.studentId.localeCompare(right.studentId) ||
    left.attendanceDate.getTime() - right.attendanceDate.getTime() ||
    left.id.localeCompare(right.id);
}

function realAttendanceOutsidePeriods(
  attendance: AttendanceRow[],
  periods: EnrollmentPeriodRow[],
) {
  const grouped = periodsByStudent(periods);
  return attendance
    .filter(isRealAttendanceEvidence)
    .sort(compareAttendance)
    .filter((row) =>
      !(grouped.get(row.studentId) || []).some((period) =>
        periodCovers(period, row.attendanceDate)));
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
  const grouped = periodsByStudent(periods);
  const correctionEvidence = new Map<
    string,
    { period: EnrollmentPeriodRow; evidence: AttendanceRow }
  >();

  for (const evidence of realAttendanceOutsidePeriods(attendance, periods)) {
    const studentId = evidence.studentId;
    const attendanceDate = evidence.attendanceDate;
    const studentPeriods = grouped.get(studentId) || [];
    const laterPeriod = studentPeriods.find(
      (period) =>
        period.startedAt > attendanceDate &&
        (period.endedAt === null || attendanceDate < period.endedAt),
    );
    if (!laterPeriod) continue;
    const current = correctionEvidence.get(laterPeriod.id);
    if (!current || compareAttendance(evidence, current.evidence) < 0) {
      correctionEvidence.set(laterPeriod.id, { period: laterPeriod, evidence });
    }
  }
  return [...correctionEvidence.values()]
    .sort((left, right) =>
      compareAttendance(left.evidence, right.evidence) ||
      left.period.id.localeCompare(right.period.id))
    .map(({ period, evidence }) => ({
      enrollment_period_id: period.id,
      student_id: evidence.studentId,
      current_started_at: dateKey(period.startedAt),
      proposed_started_at: dateKey(evidence.attendanceDate),
      source: period.source,
      evidence_attendance_id: evidence.id,
      evidence_attendance_status: evidence.status,
    }));
}

export function findAttendanceOutsideEnrollmentPeriods(
  attendance: AttendanceRow[],
  periods: EnrollmentPeriodRow[],
  corrections: EnrollmentStartCorrection[],
): AttendanceOutsideEnrollmentPeriod[] {
  const periodsById = new Map(periods.map((period) => [period.id, period]));
  return realAttendanceOutsidePeriods(attendance, periods).map((row) => {
    const correction = corrections.find((candidate) => {
      if (candidate.student_id !== row.studentId) return false;
      const period = periodsById.get(candidate.enrollment_period_id);
      if (!period) return false;
      const correctedStart = new Date(`${candidate.proposed_started_at}T00:00:00.000Z`);
      return correctedStart <= row.attendanceDate &&
        (period.endedAt === null || row.attendanceDate < period.endedAt);
    });
    return {
      attendance_id: row.id,
      student_id: row.studentId,
      attendance_date: dateKey(row.attendanceDate),
      attendance_status: row.status,
      resolution: correction ? "adjust_enrollment_start" : "unresolved",
      enrollment_period_id: correction?.enrollment_period_id || null,
    };
  });
}

export function findStudentsWithoutEnrollmentPeriod(
  attendance: AttendanceRow[],
  periods: EnrollmentPeriodRow[],
  corrections: EnrollmentStartCorrection[],
) {
  return [...new Set(
    findAttendanceOutsideEnrollmentPeriods(attendance, periods, corrections)
      .filter((row) => row.resolution === "unresolved")
      .map((row) => row.student_id),
  )].sort();
}
