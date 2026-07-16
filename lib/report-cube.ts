import { getBusinessMonthKey } from "./api-utils.js";
import { scheduleSnapshotFromRevision } from "./class-month-schedule-snapshot.js";

export type ReportBiQuery = {
  from: string;
  to: string;
  months: string[];
  mode: "overview" | "attendance" | "tuition" | "risk";
  class_id: string | null;
  student_id: string | null;
  q: string | null;
  risk_only: boolean;
  page: number;
  page_size: number;
};

export type ReportEnrollment = {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  enrollmentDate: Date;
  enrollmentEndDate?: Date | null;
  feePerDay: number;
  scheduleDays: unknown;
  sessionsPerWeek: number | null;
};

export type ReportAttendance = {
  studentId: string;
  classId: string;
  attendanceDate: Date;
  status: "present" | "absent_with_fee" | "absent_no_fee" | "holiday";
  isMakeUp: boolean;
};

export type ReportFeeLine = {
  id: string;
  monthlyFeeId: string;
  studentId: string;
  classId: string | null;
  month: string;
  expectedSessions?: number | null;
  calculationSnapshot?: unknown;
  amount: number;
  status: string;
  allocationConfidence: string | null;
};

export type ReportClassMonthPlan = {
  classId: string;
  billingMonth: string;
  expectedSessions?: number | null;
  snapshot?: unknown;
  revisions?: Array<{
    revision?: number;
    snapshot: unknown;
  }>;
};

export type ReportClassSession = {
  id?: string;
  classId: string;
  billingMonth: string;
  sessionDate: Date;
  kind: "regular" | "makeup" | "extra";
  status: "planned" | "held" | "cancelled" | "holiday";
};

export type ReportMonthlyFee = {
  id: string;
  studentId: string;
  month: string;
  totalDays?: number | null;
  totalAmount: number;
  status: string;
  receiptId: string | null;
  paidAt: Date | null;
};

type StatusCounts = {
  present: number;
  absent_with_fee: number;
  absent_no_fee: number;
  holiday: number;
  make_up: number;
};

export type ReportCubeRow = {
  student_id: string;
  student_name: string;
  class_id: string;
  class_name: string;
  month: string;
  expected_sessions: number;
  attendance_expected_sessions: number | null;
  billing_expected_sessions: number | null;
  attendance_denominator_source: "month_plan" | "session_ledger" | "missing";
  billing_denominator_source: "fee_line" | "fee_snapshot" | "missing";
  denominator_mismatch: boolean;
  denominator_diagnostic?: {
    status: "match" | "mismatch" | "not_comparable";
    attendance_expected_sessions: number | null;
    billing_expected_sessions: number | null;
    difference: number | null;
  };
  recorded_sessions: number;
  chargeable_sessions: number;
  actual_sessions: number;
  status_counts: StatusCounts;
  actual_present_rate: number;
  chargeable_rate: number;
  record_completion_rate: number;
  monthly_fee_line_id: string | null;
  monthly_fee_id: string | null;
  fee_amount: number | null;
  fee_status: string | null;
  fee_source:
    | "monthly_fee_line"
    | "monthly_fee_single_class"
    | "monthly_fee_unallocated"
    | "missing";
  fee_confidence: string;
  fee_needs_review: boolean;
  risk_flags: string[];
};

type AggregateBucket = {
  student_ids: Set<string>;
  class_ids: Set<string>;
  student_class_month_count: number;
  expected_sessions: number;
  recorded_sessions: number;
  actual_sessions: number;
  chargeable_sessions: number;
  status_counts: StatusCounts;
  fee_amount: number;
  fee_review_count: number;
  risk_count: number;
  denominator_mismatch_count: number;
};

class ReportQueryError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.status = 400;
  }
}

function queryString(value: unknown) {
  if (Array.isArray(value)) return value[0] ? String(value[0]) : undefined;
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

function parsePositiveInteger(value: unknown, fallback: number, max?: number) {
  const parsed = Number.parseInt(queryString(value) || "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return max ? Math.min(parsed, max) : parsed;
}

function normalizeSearchQuery(value: unknown) {
  return (queryString(value) || "").trim().toLowerCase() || null;
}

function normalizeReportMode(value: unknown): ReportBiQuery["mode"] {
  const mode = (queryString(value) || "overview").toLowerCase();
  if (["attendance", "tuition", "risk"].includes(mode)) {
    return mode as ReportBiQuery["mode"];
  }
  return "overview";
}

function assertMonth(value: string, field: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  const month = match ? Number(match[2]) : 0;
  if (!match || month < 1 || month > 12) {
    throw new ReportQueryError("INVALID_MONTH", `${field} must be YYYY-MM`);
  }
}

export function listReportMonths(from: string, to: string) {
  assertMonth(from, "from");
  assertMonth(to, "to");
  if (from > to) {
    throw new ReportQueryError(
      "INVALID_MONTH_RANGE",
      "from must be before or equal to to"
    );
  }

  const [fromYear, fromMonth] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);
  const months: string[] = [];
  const cursor = new Date(Date.UTC(fromYear, fromMonth - 1, 1));
  const end = new Date(Date.UTC(toYear, toMonth - 1, 1));

  while (cursor <= end) {
    months.push(
      `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`
    );
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
}

export function parseReportBiQuery(
  query: Record<string, unknown>,
  now = new Date()
): ReportBiQuery {
  const businessMonth = getBusinessMonthKey(now);
  const from = queryString(query.from) || `${businessMonth.slice(0, 4)}-01`;
  const to = queryString(query.to) || businessMonth;
  const months = listReportMonths(from, to);

  if (months.length > 24) {
    throw new ReportQueryError(
      "REPORT_RANGE_TOO_LARGE",
      "maximum range is 24 months"
    );
  }

  const riskValue = (queryString(query.risk_only) || "").toLowerCase();
  return {
    from,
    to,
    months,
    mode: normalizeReportMode(query.mode ?? query.view ?? query.tab),
    class_id: queryString(query.class_id) || null,
    student_id: queryString(query.student_id) || null,
    q: normalizeSearchQuery(query.q ?? query.query),
    risk_only: ["1", "true", "yes"].includes(riskValue),
    page: parsePositiveInteger(query.page, 1),
    page_size: parsePositiveInteger(query.page_size, 50, 200),
  };
}

export function filterReportRows(
  rows: ReportCubeRow[],
  filters: Pick<ReportBiQuery, "mode" | "class_id" | "student_id" | "q" | "risk_only">
) {
  return rows.filter((row) => {
    if (filters.class_id && row.class_id !== filters.class_id) return false;
    if (filters.student_id && row.student_id !== filters.student_id) return false;
    if ((filters.risk_only || filters.mode === "risk") && row.risk_flags.length === 0) {
      return false;
    }
    if (filters.mode === "attendance") {
      const hasAttendanceRisk = row.risk_flags.some((flag) =>
        [
          "expected_sessions_unavailable",
          "attendance_incomplete",
          "attendance_over_recorded",
          "low_present_rate",
          "denominator_mismatch",
        ].includes(flag)
      );
      if (!hasAttendanceRisk) return false;
    }
    if (filters.mode === "tuition") {
      const needsTuitionAction =
        row.fee_needs_review ||
        row.denominator_mismatch ||
        row.fee_source === "missing" ||
        !row.fee_status ||
        !["paid", "confirmed"].includes(row.fee_status);
      if (!needsTuitionAction) return false;
    }
    if (filters.q) {
      const haystack = [
        row.student_name,
        row.student_id,
        row.class_name,
        row.class_id,
        row.month,
        row.fee_status,
        row.fee_source,
        row.fee_confidence,
        row.attendance_denominator_source,
        row.billing_denominator_source,
        row.denominator_diagnostic?.status,
        ...row.risk_flags,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(filters.q)) return false;
    }
    return true;
  });
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function cubeKey(studentId: string, classId: string, month: string) {
  return `${studentId}\u0000${classId}\u0000${month}`;
}

function studentMonthKey(studentId: string, month: string) {
  return `${studentId}\u0000${month}`;
}

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

function firstNonNegativeInteger(values: unknown[]) {
  for (const value of values) {
    const parsed = nonNegativeInteger(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function expectedSessionsFromCalculationSnapshot(value: unknown) {
  const root = objectRecord(value);
  const summary = objectRecord(root?.summary);
  return firstNonNegativeInteger([
    root?.expectedSessions,
    root?.expected_sessions,
    root?.contractSessions,
    root?.contract_sessions,
    summary?.plannedRegularSlots,
    summary?.planned_regular_slots,
  ]);
}

function resolveBillingDenominator(feeLine: ReportFeeLine | undefined) {
  if (!feeLine) {
    return { value: null, source: "missing" as const };
  }
  const persisted = nonNegativeInteger(feeLine.expectedSessions);
  const snapshot = expectedSessionsFromCalculationSnapshot(
    feeLine.calculationSnapshot
  );
  if (persisted !== null && (persisted > 0 || snapshot === null)) {
    return { value: persisted, source: "fee_line" as const };
  }
  if (snapshot !== null) {
    return { value: snapshot, source: "fee_snapshot" as const };
  }
  return { value: null, source: "missing" as const };
}

function expectedSessionsFromMonthPlan(plan: ReportClassMonthPlan | undefined) {
  if (!plan) return null;
  const persisted = nonNegativeInteger(plan.expectedSessions);
  if (persisted !== null) return persisted;
  const revisions = [...(plan.revisions || [])].sort(
    (left, right) => (right.revision ?? 0) - (left.revision ?? 0),
  );
  for (const revision of revisions) {
    const snapshot = scheduleSnapshotFromRevision(revision.snapshot);
    if (snapshot) return snapshot.expected_regular_sessions;
  }
  return scheduleSnapshotFromRevision(plan.snapshot)?.expected_regular_sessions ?? null;
}

function expectedSessionsFromLedger(
  enrollments: ReportEnrollment[],
  sessions: ReportClassSession[] | undefined
) {
  if (!sessions) return null;
  return sessions.filter((session) => {
    if (session.kind !== "regular") return false;
    const sessionTime = session.sessionDate.getTime();
    return enrollments.some(
      (enrollment) =>
        sessionTime >= enrollment.enrollmentDate.getTime() &&
        (!enrollment.enrollmentEndDate ||
          sessionTime < enrollment.enrollmentEndDate.getTime())
    );
  }).length;
}

function resolveAttendanceDenominator(input: {
  enrollments: ReportEnrollment[];
  month: string;
  monthPlan: ReportClassMonthPlan | undefined;
  sessions: ReportClassSession[] | undefined;
}) {
  const interval = monthInterval(input.month);
  const fullMonthEnrollment =
    input.enrollments.length === 1 &&
    input.enrollments[0].enrollmentDate <= interval.start &&
    (!input.enrollments[0].enrollmentEndDate ||
      input.enrollments[0].enrollmentEndDate >= interval.end);
  if (fullMonthEnrollment) {
    const monthPlan = expectedSessionsFromMonthPlan(input.monthPlan);
    if (monthPlan !== null) return { value: monthPlan, source: "month_plan" as const };
  }
  const ledger = expectedSessionsFromLedger(input.enrollments, input.sessions);
  if (ledger !== null) return { value: ledger, source: "session_ledger" as const };
  return { value: null, source: "missing" as const };
}

function monthInterval(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1)),
  };
}

function enrollmentOverlapsMonth(enrollment: ReportEnrollment, month: string) {
  const interval = monthInterval(month);
  return (
    enrollment.enrollmentDate.getTime() < interval.end.getTime() &&
    (!enrollment.enrollmentEndDate ||
      enrollment.enrollmentEndDate.getTime() > interval.start.getTime())
  );
}

function attendanceWithinEnrollmentPeriod(
  attendanceDate: Date,
  enrollments: ReportEnrollment[]
) {
  const attendanceTime = attendanceDate.getTime();
  return enrollments.some(
    (enrollment) =>
      attendanceTime >= enrollment.enrollmentDate.getTime() &&
      (!enrollment.enrollmentEndDate ||
        attendanceTime < enrollment.enrollmentEndDate.getTime())
  );
}

function emptyStatusCounts(): StatusCounts {
  return {
    present: 0,
    absent_with_fee: 0,
    absent_no_fee: 0,
    holiday: 0,
    make_up: 0,
  };
}

function percentage(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function emptyBucket(): AggregateBucket {
  return {
    student_ids: new Set(),
    class_ids: new Set(),
    student_class_month_count: 0,
    expected_sessions: 0,
    recorded_sessions: 0,
    actual_sessions: 0,
    chargeable_sessions: 0,
    status_counts: emptyStatusCounts(),
    fee_amount: 0,
    fee_review_count: 0,
    risk_count: 0,
    denominator_mismatch_count: 0,
  };
}

function addRow(bucket: AggregateBucket, row: ReportCubeRow) {
  bucket.student_ids.add(row.student_id);
  bucket.class_ids.add(row.class_id);
  bucket.student_class_month_count += 1;
  bucket.expected_sessions += row.expected_sessions;
  bucket.recorded_sessions += row.recorded_sessions;
  bucket.actual_sessions += row.actual_sessions;
  bucket.chargeable_sessions += row.chargeable_sessions;
  bucket.status_counts.present += row.status_counts.present;
  bucket.status_counts.absent_with_fee += row.status_counts.absent_with_fee;
  bucket.status_counts.absent_no_fee += row.status_counts.absent_no_fee;
  bucket.status_counts.holiday += row.status_counts.holiday;
  bucket.status_counts.make_up += row.status_counts.make_up;
  bucket.fee_amount += row.fee_amount || 0;
  if (row.fee_needs_review) bucket.fee_review_count += 1;
  if (row.risk_flags.length) bucket.risk_count += 1;
  if (row.denominator_mismatch) bucket.denominator_mismatch_count += 1;
}

function finishBucket(bucket: AggregateBucket) {
  return {
    student_count: bucket.student_ids.size,
    class_count: bucket.class_ids.size,
    student_class_month_count: bucket.student_class_month_count,
    expected_sessions: bucket.expected_sessions,
    recorded_sessions: bucket.recorded_sessions,
    chargeable_sessions: bucket.chargeable_sessions,
    status_counts: bucket.status_counts,
    actual_present_rate: percentage(
      bucket.status_counts.present,
      bucket.actual_sessions
    ),
    chargeable_rate: percentage(
      bucket.chargeable_sessions,
      bucket.expected_sessions
    ),
    record_completion_rate: percentage(
      bucket.recorded_sessions,
      bucket.expected_sessions
    ),
    fee_amount: bucket.fee_amount,
    fee_review_count: bucket.fee_review_count,
    risk_count: bucket.risk_count,
    denominator_mismatch_count: bucket.denominator_mismatch_count,
  };
}

export function summarizeReportRows(rows: ReportCubeRow[]) {
  const bucket = emptyBucket();
  for (const row of rows) addRow(bucket, row);
  return finishBucket(bucket);
}

export function buildReportCharts(rows: ReportCubeRow[]) {
  const monthly = new Map<string, AggregateBucket>();
  const classes = new Map<
    string,
    { class_id: string; class_name: string; bucket: AggregateBucket }
  >();

  for (const row of rows) {
    const monthBucket = monthly.get(row.month) || emptyBucket();
    addRow(monthBucket, row);
    monthly.set(row.month, monthBucket);

    const classItem =
      classes.get(row.class_id) || {
        class_id: row.class_id,
        class_name: row.class_name,
        bucket: emptyBucket(),
      };
    addRow(classItem.bucket, row);
    classes.set(row.class_id, classItem);
  }

  return {
    monthly: Array.from(monthly.entries())
      .map(([month, bucket]) => ({ month, ...finishBucket(bucket) }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    classes: Array.from(classes.values())
      .map((item) => ({
        class_id: item.class_id,
        class_name: item.class_name,
        ...finishBucket(item.bucket),
      }))
      .sort(
        (a, b) =>
          a.class_name.localeCompare(b.class_name) ||
          a.class_id.localeCompare(b.class_id)
      ),
  };
}

function resolveFee(
  row: ReportCubeRow,
  feeLine: ReportFeeLine | undefined,
  monthlyFee: ReportMonthlyFee | undefined,
  classCount: number
) {
  if (feeLine) {
    row.monthly_fee_line_id = feeLine.id;
    row.monthly_fee_id = feeLine.monthlyFeeId;
    row.fee_amount = Number(feeLine.amount || 0);
    row.fee_status = feeLine.status;
    row.fee_source = "monthly_fee_line";
    row.fee_confidence = feeLine.allocationConfidence || "calculated";
    row.fee_needs_review = !["calculated", "verified"].includes(
      row.fee_confidence
    );
    return;
  }

  if (monthlyFee && classCount === 1) {
    row.monthly_fee_id = monthlyFee.id;
    row.fee_amount = Number(monthlyFee.totalAmount || 0);
    row.fee_status = monthlyFee.status;
    row.fee_source = "monthly_fee_single_class";
    row.fee_confidence = "legacy_single_class";
    row.fee_needs_review = true;
    return;
  }

  if (monthlyFee) {
    row.monthly_fee_id = monthlyFee.id;
    row.fee_source = "monthly_fee_unallocated";
    row.fee_confidence = "unallocated_multi_class";
    row.fee_needs_review = true;
    return;
  }

  row.fee_source = "missing";
  row.fee_confidence = "missing";
  row.fee_needs_review = true;
}

export function buildReportCube(input: {
  months: string[];
  enrollments: ReportEnrollment[];
  attendance: ReportAttendance[];
  feeLines: ReportFeeLine[];
  monthlyFees: ReportMonthlyFee[];
  classMonthPlans?: ReportClassMonthPlan[];
  classSessions?: ReportClassSession[];
}) {
  const rows = new Map<string, ReportCubeRow>();
  const rowEnrollments = new Map<string, ReportEnrollment[]>();
  const classesByStudentMonth = new Map<string, Set<string>>();

  for (const enrollment of input.enrollments) {
    const enrolledMonth = monthKey(enrollment.enrollmentDate);
    for (const month of input.months) {
      if (month < enrolledMonth) continue;
      if (!enrollmentOverlapsMonth(enrollment, month)) continue;
      const key = cubeKey(enrollment.studentId, enrollment.classId, month);
      const enrollmentPeriods = rowEnrollments.get(key) || [];
      enrollmentPeriods.push(enrollment);
      rowEnrollments.set(key, enrollmentPeriods);
      if (rows.has(key)) continue;

      rows.set(key, {
        student_id: enrollment.studentId,
        student_name: enrollment.studentName,
        class_id: enrollment.classId,
        class_name: enrollment.className,
        month,
        expected_sessions: 0,
        attendance_expected_sessions: null,
        billing_expected_sessions: null,
        attendance_denominator_source: "missing",
        billing_denominator_source: "missing",
        denominator_mismatch: false,
        denominator_diagnostic: {
          status: "not_comparable",
          attendance_expected_sessions: null,
          billing_expected_sessions: null,
          difference: null,
        },
        recorded_sessions: 0,
        chargeable_sessions: 0,
        actual_sessions: 0,
        status_counts: emptyStatusCounts(),
        actual_present_rate: 0,
        chargeable_rate: 0,
        record_completion_rate: 0,
        monthly_fee_line_id: null,
        monthly_fee_id: null,
        fee_amount: null,
        fee_status: null,
        fee_source: "missing",
        fee_confidence: "missing",
        fee_needs_review: true,
        risk_flags: [],
      });
      const studentMonth = studentMonthKey(enrollment.studentId, month);
      const classIds = classesByStudentMonth.get(studentMonth) || new Set<string>();
      classIds.add(enrollment.classId);
      classesByStudentMonth.set(studentMonth, classIds);
    }
  }

  for (const record of input.attendance) {
    const key = cubeKey(
      record.studentId,
      record.classId,
      monthKey(record.attendanceDate)
    );
    const row = rows.get(key);
    const enrollments = rowEnrollments.get(key);
    if (!row || !enrollments?.length) continue;
    if (!attendanceWithinEnrollmentPeriod(record.attendanceDate, enrollments)) {
      continue;
    }
    row.status_counts[record.status] += 1;
    if (record.isMakeUp) row.status_counts.make_up += 1;
  }

  const feeLines = new Map<string, ReportFeeLine>();
  for (const line of input.feeLines) {
    if (!line.classId) continue;
    feeLines.set(cubeKey(line.studentId, line.classId, line.month), line);
  }

  const monthlyFees = new Map<string, ReportMonthlyFee>();
  for (const fee of input.monthlyFees) {
    monthlyFees.set(studentMonthKey(fee.studentId, fee.month), fee);
  }

  const classMonthPlans = new Map<string, ReportClassMonthPlan>();
  for (const plan of input.classMonthPlans || []) {
    classMonthPlans.set(cubeKey("", plan.classId, plan.billingMonth), plan);
  }

  const classSessions = new Map<string, ReportClassSession[]>();
  for (const session of input.classSessions || []) {
    const key = cubeKey("", session.classId, session.billingMonth);
    const sessions = classSessions.get(key) || [];
    sessions.push(session);
    classSessions.set(key, sessions);
  }

  for (const [key, row] of rows) {
    const enrollments = rowEnrollments.get(key);
    if (!enrollments?.length) continue;
    const feeLine = feeLines.get(key);
    const monthlyFee = monthlyFees.get(studentMonthKey(row.student_id, row.month));
    const classMonthKey = cubeKey("", row.class_id, row.month);
    const billingDenominator = resolveBillingDenominator(feeLine);
    const attendanceDenominator = resolveAttendanceDenominator({
      enrollments,
      month: row.month,
      monthPlan: classMonthPlans.get(classMonthKey),
      sessions: classSessions.get(classMonthKey),
    });
    row.billing_expected_sessions = billingDenominator.value;
    row.billing_denominator_source = billingDenominator.source;
    row.attendance_expected_sessions = attendanceDenominator.value;
    row.attendance_denominator_source = attendanceDenominator.source;
    row.expected_sessions =
      billingDenominator.value ?? attendanceDenominator.value ?? 0;
    row.denominator_mismatch =
      billingDenominator.value !== null &&
      attendanceDenominator.value !== null &&
      billingDenominator.value !== attendanceDenominator.value;
    const comparable =
      billingDenominator.value !== null && attendanceDenominator.value !== null;
    row.denominator_diagnostic = {
      status: comparable ? (row.denominator_mismatch ? "mismatch" : "match") : "not_comparable",
      attendance_expected_sessions: attendanceDenominator.value,
      billing_expected_sessions: billingDenominator.value,
      difference: comparable ? attendanceDenominator.value! - billingDenominator.value! : null,
    };
    row.recorded_sessions =
      row.status_counts.present +
      row.status_counts.absent_with_fee +
      row.status_counts.absent_no_fee +
      row.status_counts.holiday;
    row.actual_sessions =
      row.status_counts.present +
      row.status_counts.absent_with_fee +
      row.status_counts.absent_no_fee;
    row.chargeable_sessions =
      row.status_counts.present + row.status_counts.absent_with_fee;
    row.actual_present_rate = percentage(
      row.status_counts.present,
      row.actual_sessions
    );
    row.chargeable_rate = percentage(
      row.chargeable_sessions,
      row.expected_sessions
    );
    row.record_completion_rate = percentage(
      row.recorded_sessions,
      row.attendance_expected_sessions ?? row.expected_sessions
    );

    resolveFee(
      row,
      feeLine,
      monthlyFee,
      classesByStudentMonth.get(studentMonthKey(row.student_id, row.month))
        ?.size || 0
    );

    const attendanceExpectedSessions =
      row.attendance_expected_sessions ?? row.expected_sessions;
    if (attendanceExpectedSessions <= 0) {
      row.risk_flags.push("expected_sessions_unavailable");
    } else if (row.recorded_sessions < attendanceExpectedSessions) {
      row.risk_flags.push("attendance_incomplete");
    } else if (row.recorded_sessions > attendanceExpectedSessions) {
      row.risk_flags.push("attendance_over_recorded");
    }
    if (row.actual_sessions > 0 && row.actual_present_rate < 80) {
      row.risk_flags.push("low_present_rate");
    }
    if (row.fee_needs_review) row.risk_flags.push("fee_review");
    if (row.denominator_mismatch) row.risk_flags.push("denominator_mismatch");
  }

  const students = Array.from(rows.values()).sort(
    (a, b) =>
      Number(Boolean(b.risk_flags.length)) - Number(Boolean(a.risk_flags.length)) ||
      a.student_name.localeCompare(b.student_name) ||
      a.class_name.localeCompare(b.class_name) ||
      b.month.localeCompare(a.month)
  );

  return {
    summary: summarizeReportRows(students),
    charts: buildReportCharts(students),
    students,
  };
}
