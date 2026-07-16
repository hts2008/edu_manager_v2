import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildReportCube,
  filterReportRows,
  parseReportBiQuery,
} from "../lib/report-cube.js";

describe("BI report cube", () => {
  it("aggregates attendance status, make-up counts, and metric denominators", () => {
    const result = buildReportCube({
      months: ["2026-06"],
      enrollments: [
        {
          studentId: "student-1",
          studentName: "Nguyen Van A",
          classId: "class-1",
          className: "Math 1",
          enrollmentDate: new Date("2026-01-01T00:00:00.000Z"),
          feePerDay: 900000,
          scheduleDays: [2, 4],
          sessionsPerWeek: null,
        },
      ],
      attendance: [
        {
          studentId: "student-1",
          classId: "class-1",
          attendanceDate: new Date("2026-06-01T00:00:00.000Z"),
          status: "present",
          isMakeUp: false,
        },
        {
          studentId: "student-1",
          classId: "class-1",
          attendanceDate: new Date("2026-06-03T00:00:00.000Z"),
          status: "absent_with_fee",
          isMakeUp: false,
        },
        {
          studentId: "student-1",
          classId: "class-1",
          attendanceDate: new Date("2026-06-08T00:00:00.000Z"),
          status: "absent_no_fee",
          isMakeUp: true,
        },
        {
          studentId: "student-1",
          classId: "class-1",
          attendanceDate: new Date("2026-06-10T00:00:00.000Z"),
          status: "holiday",
          isMakeUp: false,
        },
      ],
      feeLines: [
        {
          id: "line-1",
          monthlyFeeId: "fee-1",
          studentId: "student-1",
          classId: "class-1",
          month: "2026-06",
          expectedSessions: 9,
          amount: 0,
          status: "pending",
          allocationConfidence: "calculated",
        },
      ],
      monthlyFees: [],
    });

    assert.equal(result.students.length, 1);
    const row = result.students[0];
    assert.equal(row.expected_sessions, 9);
    assert.equal(row.recorded_sessions, 4);
    assert.deepEqual(row.status_counts, {
      present: 1,
      absent_with_fee: 1,
      absent_no_fee: 1,
      holiday: 1,
      make_up: 1,
    });
    assert.equal(row.actual_present_rate, 33.3);
    assert.equal(row.chargeable_rate, 22.2);
    assert.equal(row.record_completion_rate, 44.4);
    assert.equal(result.summary.actual_present_rate, 33.3);
    assert.equal(result.summary.chargeable_rate, 22.2);
    assert.equal(result.summary.record_completion_rate, 44.4);
  });

  it("uses class fee lines and never spreads one aggregate fee across multiple classes", () => {
    const result = buildReportCube({
      months: ["2026-05"],
      enrollments: [
        {
          studentId: "student-1",
          studentName: "Nguyen Van A",
          classId: "english",
          className: "English A1",
          enrollmentDate: new Date("2026-01-01T00:00:00.000Z"),
          feePerDay: 500000,
          scheduleDays: null,
          sessionsPerWeek: 2,
        },
        {
          studentId: "student-1",
          studentName: "Nguyen Van A",
          classId: "math",
          className: "Math B1",
          enrollmentDate: new Date("2026-01-01T00:00:00.000Z"),
          feePerDay: 800000,
          scheduleDays: null,
          sessionsPerWeek: 1,
        },
      ],
      attendance: [],
      feeLines: [
        {
          id: "line-english",
          monthlyFeeId: "fee-1",
          studentId: "student-1",
          classId: "english",
          month: "2026-05",
          amount: 500000,
          status: "ready",
          allocationConfidence: "calculated",
        },
      ],
      monthlyFees: [
        {
          id: "fee-1",
          studentId: "student-1",
          month: "2026-05",
          totalAmount: 1300000,
          status: "ready",
          receiptId: null,
          paidAt: null,
        },
      ],
    });

    const english = result.students.find((row) => row.class_id === "english");
    const math = result.students.find((row) => row.class_id === "math");

    assert.equal(english?.fee_amount, 500000);
    assert.equal(english?.fee_source, "monthly_fee_line");
    assert.equal(english?.fee_needs_review, false);
    assert.equal(math?.fee_amount, null);
    assert.equal(math?.fee_source, "monthly_fee_unallocated");
    assert.equal(math?.fee_confidence, "unallocated_multi_class");
    assert.equal(math?.fee_needs_review, true);
    assert.equal(result.summary.fee_amount, 500000);
    assert.equal(result.summary.fee_review_count, 1);
  });

  it("keeps class and month charts aligned with student-class-month rows", () => {
    const result = buildReportCube({
      months: ["2026-05", "2026-06"],
      enrollments: [
        {
          studentId: "student-1",
          studentName: "Nguyen Van A",
          classId: "class-1",
          className: "Math 1",
          enrollmentDate: new Date("2026-05-15T00:00:00.000Z"),
          feePerDay: 500000,
          scheduleDays: null,
          sessionsPerWeek: 2,
        },
      ],
      attendance: [
        {
          studentId: "student-1",
          classId: "class-1",
          attendanceDate: new Date("2026-06-02T00:00:00.000Z"),
          status: "present",
          isMakeUp: true,
        },
      ],
      feeLines: [],
      monthlyFees: [],
    });

    assert.equal(result.students.length, 2);
    assert.deepEqual(
      result.charts.monthly.map((item) => item.month),
      ["2026-05", "2026-06"]
    );
    assert.equal(result.charts.classes.length, 1);
    assert.equal(result.charts.classes[0].student_class_month_count, 2);
    assert.equal(result.summary.student_count, 1);
    assert.equal(result.summary.class_count, 1);
    assert.equal(result.summary.student_class_month_count, 2);
    assert.equal(result.summary.status_counts.make_up, 1);
  });

  it("does not promote aggregate legacy fees to single-class fees after a class filter", () => {
    const result = buildReportCube({
      months: ["2026-05"],
      enrollments: [
        {
          studentId: "student-1",
          studentName: "Nguyen Van A",
          classId: "english",
          className: "English A1",
          enrollmentDate: new Date("2026-01-01T00:00:00.000Z"),
          feePerDay: 500000,
          scheduleDays: null,
          sessionsPerWeek: 2,
        },
        {
          studentId: "student-1",
          studentName: "Nguyen Van A",
          classId: "math",
          className: "Math B1",
          enrollmentDate: new Date("2026-01-01T00:00:00.000Z"),
          feePerDay: 800000,
          scheduleDays: null,
          sessionsPerWeek: 1,
        },
      ],
      attendance: [],
      feeLines: [],
      monthlyFees: [
        {
          id: "fee-1",
          studentId: "student-1",
          month: "2026-05",
          totalAmount: 1300000,
          status: "ready",
          receiptId: null,
          paidAt: null,
        },
      ],
    });

    const filtered = filterReportRows(result.students, {
      mode: "overview",
      class_id: "english",
      student_id: null,
      q: null,
      risk_only: false,
    });

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].fee_amount, null);
    assert.equal(filtered[0].fee_source, "monthly_fee_unallocated");
    assert.equal(filtered[0].fee_confidence, "unallocated_multi_class");
  });

  it("counts first enrollment month expected sessions from the enrollment date", () => {
    const result = buildReportCube({
      months: ["2026-06"],
      enrollments: [
        {
          studentId: "student-1",
          studentName: "Nguyen Van A",
          classId: "class-1",
          className: "Math 1",
          enrollmentDate: new Date("2026-06-15T00:00:00.000Z"),
          feePerDay: 500000,
          scheduleDays: [2, 4],
          sessionsPerWeek: null,
        },
      ],
      attendance: [],
      feeLines: [],
      monthlyFees: [],
      classSessions: [
        "2026-06-16",
        "2026-06-18",
        "2026-06-23",
        "2026-06-25",
        "2026-06-30",
      ].map((date, index) => ({
        id: `session-${index}`,
        classId: "class-1",
        billingMonth: "2026-06",
        sessionDate: new Date(`${date}T00:00:00.000Z`),
        kind: "regular" as const,
        status: "planned" as const,
      })),
    });

    assert.equal(result.students[0].expected_sessions, 5);
  });

  it("filters search across the full report cube before pagination", () => {
    const result = buildReportCube({
      months: ["2026-05"],
      enrollments: [
        {
          studentId: "student-1",
          studentName: "Phuc",
          classId: "starter",
          className: "Starter A1",
          enrollmentDate: new Date("2026-01-01T00:00:00.000Z"),
          feePerDay: 500000,
          scheduleDays: null,
          sessionsPerWeek: null,
        },
        {
          studentId: "student-2",
          studentName: "Gau con",
          classId: "mover",
          className: "Mover 3",
          enrollmentDate: new Date("2026-01-01T00:00:00.000Z"),
          feePerDay: 500000,
          scheduleDays: [6],
          sessionsPerWeek: null,
        },
      ],
      attendance: [],
      feeLines: [],
      monthlyFees: [],
    });

    const filtered = filterReportRows(result.students, {
      mode: "overview",
      class_id: null,
      student_id: null,
      q: "mover",
      risk_only: false,
    });

    assert.deepEqual(filtered.map((row) => row.student_name), ["Gau con"]);
  });

  it("applies report mode filters before pagination so tabs change the dataset", () => {
    const result = buildReportCube({
      months: ["2026-05"],
      enrollments: [
        {
          studentId: "student-1",
          studentName: "Paid Healthy",
          classId: "starter",
          className: "Starter A1",
          enrollmentDate: new Date("2026-01-01T00:00:00.000Z"),
          feePerDay: 500000,
          scheduleDays: [6],
          sessionsPerWeek: null,
        },
        {
          studentId: "student-2",
          studentName: "Needs Review",
          classId: "mover",
          className: "Mover 3",
          enrollmentDate: new Date("2026-01-01T00:00:00.000Z"),
          feePerDay: 500000,
          scheduleDays: null,
          sessionsPerWeek: 2,
        },
      ],
      attendance: [
        ...["2026-05-01", "2026-05-08", "2026-05-15", "2026-05-22", "2026-05-29"].map(
          (date) => ({
            studentId: "student-1",
            classId: "starter",
            attendanceDate: new Date(`${date}T00:00:00.000Z`),
            status: "present",
            isMakeUp: false,
          })
        ),
      ],
      feeLines: [
        {
          id: "line-1",
          monthlyFeeId: "fee-1",
          studentId: "student-1",
          classId: "starter",
          month: "2026-05",
          expectedSessions: 5,
          amount: 2500000,
          status: "paid",
          allocationConfidence: "calculated",
        },
      ],
      monthlyFees: [],
    });

    const attendance = filterReportRows(result.students, {
      mode: "attendance",
      class_id: null,
      student_id: null,
      q: null,
      risk_only: false,
    });
    const tuition = filterReportRows(result.students, {
      mode: "tuition",
      class_id: null,
      student_id: null,
      q: null,
      risk_only: false,
    });
    const risk = filterReportRows(result.students, {
      mode: "risk",
      class_id: null,
      student_id: null,
      q: null,
      risk_only: false,
    });

    assert.deepEqual(attendance.map((row) => row.student_name), ["Needs Review"]);
    assert.deepEqual(tuition.map((row) => row.student_name), ["Needs Review"]);
    assert.deepEqual(risk.map((row) => row.student_name), ["Needs Review"]);
  });

  it("defaults to January through the current business month and rejects ranges over 24 months", () => {
    assert.deepEqual(
      parseReportBiQuery({}, new Date("2026-06-09T02:00:00.000Z")),
      {
        from: "2026-01",
        to: "2026-06",
        months: ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"],
        mode: "overview",
        class_id: null,
        student_id: null,
        q: null,
        risk_only: false,
        page: 1,
        page_size: 50,
      }
    );

    assert.throws(
      () => parseReportBiQuery({ from: "2024-01", to: "2026-01" }),
      /maximum range is 24 months/
    );
  });

  it("never fabricates expected sessions from mutable class cadence", () => {
    const result = buildReportCube({
      months: ["2026-06"],
      enrollments: [
        {
          studentId: "student-1",
          studentName: "Cadence Is Not A Plan",
          classId: "class-1",
          className: "Flexible English",
          enrollmentDate: new Date("2026-01-01T00:00:00.000Z"),
          feePerDay: 900000,
          scheduleDays: [1, 3, 5],
          sessionsPerWeek: 99,
        },
      ],
      attendance: [],
      feeLines: [],
      monthlyFees: [],
    });

    assert.equal(result.students[0].expected_sessions, 0);
    assert.ok(result.students[0].risk_flags.includes("expected_sessions_unavailable"));
  });

  it("prefers persisted fee-line expected sessions over snapshots, plans, and ledgers", () => {
    const result = buildReportCube({
      months: ["2026-06"],
      enrollments: [
        {
          studentId: "student-1",
          studentName: "Nguyen Van A",
          classId: "class-1",
          className: "Flyers",
          enrollmentDate: new Date("2026-01-01T00:00:00.000Z"),
          feePerDay: 900000,
          scheduleDays: null,
          sessionsPerWeek: 3,
        },
      ],
      attendance: [],
      feeLines: [
        {
          id: "line-1",
          monthlyFeeId: "fee-1",
          studentId: "student-1",
          classId: "class-1",
          month: "2026-06",
          expectedSessions: 6,
          calculationSnapshot: { summary: { plannedRegularSlots: 7 } },
          amount: 900000,
          status: "ready",
          allocationConfidence: "calculated",
        },
      ],
      monthlyFees: [],
      classMonthPlans: [
        {
          classId: "class-1",
          billingMonth: "2026-06",
          snapshot: { payload: { expected_regular_sessions: 8 } },
        },
      ],
      classSessions: Array.from({ length: 9 }, (_, index) => ({
        id: `session-${index}`,
        classId: "class-1",
        billingMonth: "2026-06",
        sessionDate: new Date(`2026-06-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`),
        kind: "regular" as const,
        status: "planned" as const,
      })),
    });

    assert.equal(result.students[0].expected_sessions, 6);
  });

  it("uses the persisted fee calculation snapshot when the line field is unavailable", () => {
    const result = buildReportCube({
      months: ["2026-06"],
      enrollments: [
        {
          studentId: "student-1",
          studentName: "Nguyen Van A",
          classId: "class-1",
          className: "Flyers",
          enrollmentDate: new Date("2026-01-01T00:00:00.000Z"),
          feePerDay: 900000,
          scheduleDays: null,
          sessionsPerWeek: 3,
        },
      ],
      attendance: [],
      feeLines: [
        {
          id: "line-1",
          monthlyFeeId: "fee-1",
          studentId: "student-1",
          classId: "class-1",
          month: "2026-06",
          expectedSessions: null,
          calculationSnapshot: { summary: { plannedRegularSlots: 7 } },
          amount: 900000,
          status: "ready",
          allocationConfidence: "calculated",
        },
      ],
      monthlyFees: [],
    });

    assert.equal(result.students[0].expected_sessions, 7);
  });

  it("falls back to a published month-plan revision before the session ledger", () => {
    const result = buildReportCube({
      months: ["2026-06"],
      enrollments: [
        {
          studentId: "student-1",
          studentName: "Nguyen Van A",
          classId: "class-1",
          className: "Flyers",
          enrollmentDate: new Date("2026-01-01T00:00:00.000Z"),
          feePerDay: 900000,
          scheduleDays: null,
          sessionsPerWeek: 3,
        },
      ],
      attendance: [],
      feeLines: [],
      monthlyFees: [],
      classMonthPlans: [
        {
          classId: "class-1",
          billingMonth: "2026-06",
          snapshot: { payload: { expected_regular_sessions: 8 } },
        },
      ],
      classSessions: Array.from({ length: 9 }, (_, index) => ({
        id: `session-${index}`,
        classId: "class-1",
        billingMonth: "2026-06",
        sessionDate: new Date(`2026-06-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`),
        kind: "regular" as const,
        status: "planned" as const,
      })),
    });

    assert.equal(result.students[0].expected_sessions, 8);
  });

  it("skips a metadata-only newest revision and resolves the newest valid snapshot", () => {
    const result = buildReportCube({
      months: ["2026-06"],
      enrollments: [
        {
          studentId: "student-1",
          studentName: "Nguyen Van A",
          classId: "class-1",
          className: "Flyers",
          enrollmentDate: new Date("2026-01-01T00:00:00.000Z"),
          feePerDay: 900000,
          scheduleDays: null,
          sessionsPerWeek: 3,
        },
      ],
      attendance: [],
      feeLines: [],
      monthlyFees: [],
      classMonthPlans: [
        {
          classId: "class-1",
          billingMonth: "2026-06",
          revisions: [
            {
              revision: 4,
              snapshot: { payload: { state: "frozen", updated_by: "admin-1" } },
            },
            {
              revision: 3,
              snapshot: { payload: { expected_regular_sessions: 7 } },
            },
            {
              revision: 2,
              snapshot: { payload: { expected_regular_sessions: 6 } },
            },
          ],
        },
      ],
      classSessions: [],
    });

    assert.equal(result.students[0].expected_sessions, 7);
    assert.equal(result.students[0].attendance_expected_sessions, 7);
    assert.equal(result.students[0].attendance_denominator_source, "month_plan");
  });

  it("counts only regular ledger sessions within the student's enrollment period", () => {
    const result = buildReportCube({
      months: ["2026-06"],
      enrollments: [
        {
          studentId: "student-1",
          studentName: "Nguyen Van A",
          classId: "class-1",
          className: "Flyers",
          enrollmentDate: new Date("2026-06-15T00:00:00.000Z"),
          feePerDay: 900000,
          scheduleDays: null,
          sessionsPerWeek: 3,
        },
      ],
      attendance: [],
      feeLines: [],
      monthlyFees: [],
      classSessions: [
        ["before-enrollment", "2026-06-10", "regular"],
        ["regular-1", "2026-06-16", "regular"],
        ["regular-2", "2026-06-20", "regular"],
        ["makeup", "2026-06-22", "makeup"],
        ["extra", "2026-06-24", "extra"],
      ].map(([id, date, kind]) => ({
        id,
        classId: "class-1",
        billingMonth: "2026-06",
        sessionDate: new Date(`${date}T00:00:00.000Z`),
        kind: kind as "regular" | "makeup" | "extra",
        status: "planned" as const,
      })),
    });

    assert.equal(result.students[0].expected_sessions, 2);
  });

  it("excludes attendance outside the half-open enrollment period from report metrics", () => {
    const result = buildReportCube({
      months: ["2026-06"],
      enrollments: [
        {
          studentId: "student-1",
          studentName: "Nguyen Van A",
          classId: "class-1",
          className: "Flyers",
          enrollmentDate: new Date("2026-06-10T00:00:00.000Z"),
          enrollmentEndDate: new Date("2026-06-20T00:00:00.000Z"),
          feePerDay: 900000,
          scheduleDays: null,
          sessionsPerWeek: 3,
        },
      ],
      attendance: [
        {
          studentId: "student-1",
          classId: "class-1",
          attendanceDate: new Date("2026-06-09T00:00:00.000Z"),
          status: "present",
          isMakeUp: true,
        },
        {
          studentId: "student-1",
          classId: "class-1",
          attendanceDate: new Date("2026-06-10T00:00:00.000Z"),
          status: "present",
          isMakeUp: true,
        },
        {
          studentId: "student-1",
          classId: "class-1",
          attendanceDate: new Date("2026-06-15T00:00:00.000Z"),
          status: "absent_with_fee",
          isMakeUp: false,
        },
        {
          studentId: "student-1",
          classId: "class-1",
          attendanceDate: new Date("2026-06-16T00:00:00.000Z"),
          status: "absent_no_fee",
          isMakeUp: false,
        },
        {
          studentId: "student-1",
          classId: "class-1",
          attendanceDate: new Date("2026-06-17T00:00:00.000Z"),
          status: "holiday",
          isMakeUp: false,
        },
        {
          studentId: "student-1",
          classId: "class-1",
          attendanceDate: new Date("2026-06-20T00:00:00.000Z"),
          status: "present",
          isMakeUp: false,
        },
        {
          studentId: "student-1",
          classId: "class-1",
          attendanceDate: new Date("2026-06-25T00:00:00.000Z"),
          status: "absent_with_fee",
          isMakeUp: false,
        },
      ],
      feeLines: [
        {
          id: "line-1",
          monthlyFeeId: "fee-1",
          studentId: "student-1",
          classId: "class-1",
          month: "2026-06",
          expectedSessions: 4,
          amount: 900000,
          status: "ready",
          allocationConfidence: "calculated",
        },
      ],
      monthlyFees: [],
    });

    const row = result.students[0];
    assert.deepEqual(row.status_counts, {
      present: 1,
      absent_with_fee: 1,
      absent_no_fee: 1,
      holiday: 1,
      make_up: 1,
    });
    assert.equal(row.recorded_sessions, 4);
    assert.equal(row.actual_sessions, 3);
    assert.equal(row.chargeable_sessions, 2);
    assert.equal(row.actual_present_rate, 33.3);
    assert.equal(row.chargeable_rate, 50);
    assert.ok(row.risk_flags.includes("low_present_rate"));
    assert.equal(row.risk_flags.includes("attendance_over_recorded"), false);
  });

  it("creates rows only for months intersecting authoritative enrollment periods", () => {
    const result = buildReportCube({
      months: ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"],
      enrollments: [
        {
          studentId: "student-1",
          studentName: "Nguyen Van A",
          classId: "class-1",
          className: "Flyers",
          enrollmentDate: new Date("2026-01-10T00:00:00.000Z"),
          enrollmentEndDate: new Date("2026-04-01T00:00:00.000Z"),
          feePerDay: 900000,
          scheduleDays: null,
          sessionsPerWeek: 3,
        },
        {
          studentId: "student-1",
          studentName: "Nguyen Van A",
          classId: "class-1",
          className: "Flyers",
          enrollmentDate: new Date("2026-06-01T00:00:00.000Z"),
          enrollmentEndDate: null,
          feePerDay: 900000,
          scheduleDays: null,
          sessionsPerWeek: 3,
        },
      ],
      attendance: [],
      feeLines: [],
      monthlyFees: [],
    });

    assert.deepEqual(
      result.students.map((row) => row.month).sort(),
      ["2026-01", "2026-02", "2026-03", "2026-06"],
    );
  });

  it("keeps a withdrawn and re-enrolled student's historical months visible", () => {
    const result = buildReportCube({
      months: ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"],
      enrollments: [
        {
          studentId: "student-1",
          studentName: "Historical Re-enrollment",
          classId: "class-1",
          className: "Flyers",
          enrollmentDate: new Date("2026-01-10T00:00:00.000Z"),
          enrollmentEndDate: new Date("2026-04-01T00:00:00.000Z"),
          feePerDay: 900000,
          scheduleDays: null,
          sessionsPerWeek: 3,
        },
        {
          studentId: "student-1",
          studentName: "Historical Re-enrollment",
          classId: "class-1",
          className: "Flyers",
          enrollmentDate: new Date("2026-06-15T00:00:00.000Z"),
          enrollmentEndDate: null,
          feePerDay: 900000,
          scheduleDays: null,
          sessionsPerWeek: 3,
        },
      ],
      attendance: [
        {
          studentId: "student-1",
          classId: "class-1",
          attendanceDate: new Date("2026-02-10T00:00:00.000Z"),
          status: "present",
          isMakeUp: false,
        },
        {
          studentId: "student-1",
          classId: "class-1",
          attendanceDate: new Date("2026-06-20T00:00:00.000Z"),
          status: "present",
          isMakeUp: false,
        },
      ],
      feeLines: [],
      monthlyFees: [],
    });

    assert.deepEqual(
      result.students.map((row) => row.month),
      ["2026-07", "2026-06", "2026-03", "2026-02", "2026-01"],
    );
    assert.equal(result.students.find((row) => row.month === "2026-02")?.actual_sessions, 1);
    assert.equal(result.students.find((row) => row.month === "2026-06")?.actual_sessions, 1);
    assert.equal(result.students.find((row) => row.month === "2026-05"), undefined);
  });

  it("treats endedAt as half-open when deriving the attendance denominator", () => {
    const result = buildReportCube({
      months: ["2026-06"],
      enrollments: [
        {
          studentId: "student-1",
          studentName: "Nguyen Van A",
          classId: "class-1",
          className: "Flyers",
          enrollmentDate: new Date("2026-06-01T00:00:00.000Z"),
          enrollmentEndDate: new Date("2026-06-15T00:00:00.000Z"),
          feePerDay: 900000,
          scheduleDays: null,
          sessionsPerWeek: 3,
        },
      ],
      attendance: [],
      feeLines: [],
      monthlyFees: [],
      classSessions: ["2026-06-05", "2026-06-14", "2026-06-15", "2026-06-20"].map(
        (date, index) => ({
          id: `session-${index}`,
          classId: "class-1",
          billingMonth: "2026-06",
          sessionDate: new Date(`${date}T00:00:00.000Z`),
          kind: "regular" as const,
          status: "planned" as const,
        }),
      ),
    });

    assert.equal(result.students.length, 1);
    assert.equal(result.students[0].attendance_expected_sessions, 2);
    assert.equal(result.students[0].attendance_denominator_source, "session_ledger");
  });

  it("exposes attendance and protected billing denominators with mismatch diagnostics", () => {
    const result = buildReportCube({
      months: ["2026-06"],
      enrollments: [
        {
          studentId: "student-1",
          studentName: "Nguyen Van A",
          classId: "class-1",
          className: "Flyers",
          enrollmentDate: new Date("2026-01-01T00:00:00.000Z"),
          enrollmentEndDate: null,
          feePerDay: 900000,
          scheduleDays: null,
          sessionsPerWeek: 3,
        },
      ],
      attendance: [],
      feeLines: [
        {
          id: "line-1",
          monthlyFeeId: "fee-1",
          studentId: "student-1",
          classId: "class-1",
          month: "2026-06",
          expectedSessions: 6,
          calculationSnapshot: { summary: { plannedRegularSlots: 7 } },
          amount: 900000,
          status: "ready",
          allocationConfidence: "verified",
        },
      ],
      monthlyFees: [],
      classMonthPlans: [
        {
          classId: "class-1",
          billingMonth: "2026-06",
          snapshot: { payload: { expected_regular_sessions: 8 } },
        },
      ],
      classSessions: [],
    });

    const row = result.students[0];
    assert.equal(row.expected_sessions, 6, "legacy field must preserve billing truth");
    assert.equal(row.billing_expected_sessions, 6);
    assert.equal(row.billing_denominator_source, "fee_line");
    assert.equal(row.attendance_expected_sessions, 8);
    assert.equal(row.attendance_denominator_source, "month_plan");
    assert.equal(row.denominator_mismatch, true);
    assert.deepEqual(row.denominator_diagnostic, {
      status: "mismatch",
      attendance_expected_sessions: 8,
      billing_expected_sessions: 6,
      difference: 2,
    });
    assert.ok(row.risk_flags.includes("denominator_mismatch"));
    assert.equal(result.summary.denominator_mismatch_count, 1);
  });
});
