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
      feeLines: [],
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
});
