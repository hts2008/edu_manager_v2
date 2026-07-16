import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildMonthPlanFeePreview,
  findMonthPlanDateConflicts,
  getEditableAttendanceDates,
  normalizeAttendancePlanReadiness,
} from "../src/components/attendance/attendanceReadiness.js";
import {
  buildMondayCalendarWeeks,
  buildMonthPlanRequest,
  buildMonthPlanPatchRequest,
  calculateTuitionCharge,
  classifyAttendanceDate,
  generateFixedMonthPlanDates,
  normalizeMonthPlanResponse,
} from "../src/utils/tuitionV3.js";

describe("attendance month-plan workflow", () => {
  it("normalizes actionable readiness metrics and a backend-provided source", () => {
    assert.deepEqual(
      normalizeAttendancePlanReadiness({
        month: "2026-11",
        expected_source: "published_plan_snapshot",
        summary: {
          expected_regular_sessions: 9,
          regular_sessions: 7,
        },
        issues: [{ code: "MISSING_PUBLISHED_PLAN" }],
      }),
      {
        month: "2026-11",
        expected: 9,
        expectedKnown: true,
        actual: 7,
        missing: 2,
        source: "Kế hoạch tháng đã công bố",
        hasPublishedPlanIssue: true,
      },
    );
  });

  it("falls back to issue fields without inventing a missing backend source", () => {
    assert.deepEqual(
      normalizeAttendancePlanReadiness({
        issues: [{
          code: "MISSING_PUBLISHED_PLAN",
          expected_sessions: 4,
          actual_sessions: 1,
        }],
      }),
      {
        month: "",
        expected: 4,
        expectedKnown: true,
        actual: 1,
        missing: 3,
        source: "Chưa được backend cung cấp",
        hasPublishedPlanIssue: true,
      },
    );
  });

  it("preserves an explicit missing-date count even when totals match", () => {
    const result = normalizeAttendancePlanReadiness({
      summary: {
        expected: 2,
        actual: 2,
        missing_count: 1,
        expected_source: "published_plan_snapshot",
      },
      issues: [{ code: "MISSING_PUBLISHED_PLAN" }],
    });
    assert.equal(result.missing, 1);
  });

  it("distinguishes an explicit zero-session expectation from a missing expectation", () => {
    assert.equal(normalizeAttendancePlanReadiness({
      summary: { expected_regular_sessions: 0 },
      issues: [{ code: "MISSING_PUBLISHED_PLAN" }],
    }).expectedKnown, true);
    assert.equal(normalizeAttendancePlanReadiness({
      issues: [{ code: "MISSING_PUBLISHED_PLAN" }],
    }).expectedKnown, false);
  });

  it("previews the exact monthly package total and per-session total", () => {
    assert.deepEqual(buildMonthPlanFeePreview({
      billingPolicy: "monthly_prorated",
      feeAmount: 1_000_000,
      sessionCount: 3,
    }), {
      billingPolicy: "monthly_prorated",
      sessionCount: 3,
      total: 1_000_000,
    });
    assert.deepEqual(buildMonthPlanFeePreview({
      billingPolicy: "per_session",
      feeAmount: 120_000,
      sessionCount: 3,
    }), {
      billingPolicy: "per_session",
      sessionCount: 3,
      total: 360_000,
    });
    assert.equal(buildMonthPlanFeePreview({
      billingPolicy: "monthly_prorated",
      feeAmount: 1_000_000,
      sessionCount: 0,
    }), null);
    assert.equal(buildMonthPlanFeePreview({
      feeAmount: 1_000_000,
      sessionCount: 3,
    }), null);
  });

  it("finds non-regular dates and only reports requested-date conflicts", () => {
    const sessions = [
        { date: "2026-11-02", kind: "regular" },
        { session_date: "2026-11-04", kind: "makeup" },
        { date: "2026-11-09T00:00:00.000Z", kind: "extra" },
        { date: "2026-11-20", kind: "makeup" },
    ];
    assert.deepEqual(findMonthPlanDateConflicts(sessions), ["2026-11-04", "2026-11-09", "2026-11-20"]);
    assert.deepEqual(
      findMonthPlanDateConflicts(sessions)
        .filter((date) => ["2026-11-02", "2026-11-20"].includes(date)),
      ["2026-11-20"],
    );
  });

  it("keeps only dates whose attendance month is open or not created yet", () => {
    const dates = [
      { dateStr: "2026-08-31" },
      { dateStr: "2026-09-01" },
      { dateStr: "2026-09-02" },
    ];
    assert.deepEqual(
      getEditableAttendanceDates(dates, {
        "2026-08": { status: "locked" },
        "2026-09": { status: "open" },
      }).map((item) => item.dateStr),
      ["2026-09-01", "2026-09-02"],
    );
  });

  it("builds every calendar row as a complete Monday-Sunday week across month boundaries", () => {
    const weeks = buildMondayCalendarWeeks(2026, 7, [1, 3]);

    assert.deepEqual(
      weeks[0].map((item) => item.dateStr),
      [
        "2026-07-27",
        "2026-07-28",
        "2026-07-29",
        "2026-07-30",
        "2026-07-31",
        "2026-08-01",
        "2026-08-02",
      ],
    );
    assert.deepEqual(
      weeks.at(-1).map((item) => item.dateStr),
      [
        "2026-08-31",
        "2026-09-01",
        "2026-09-02",
        "2026-09-03",
        "2026-09-04",
        "2026-09-05",
        "2026-09-06",
      ],
    );
    assert.ok(weeks.every((week) => week.length === 7));
    assert.equal(weeks[0][0].weekday, 1);
    assert.equal(weeks[0][6].weekday, 0);
    assert.equal(weeks[0][0].isCurrentMonth, false);
    assert.equal(weeks[0][5].isCurrentMonth, true);
  });

  it("classifies published regular dates before the global class schedule", () => {
    const publishedPlan = {
      expected_source: "published_plan_snapshot",
      sessions: [
        { id: "regular-friday", date: "2026-08-07", kind: "regular" },
        { id: "makeup-monday", date: "2026-08-03", kind: "makeup" },
      ],
    };

    assert.equal(
      classifyAttendanceDate({
        date: "2026-08-03",
        monthPlan: publishedPlan,
        scheduleDays: [1],
      }).kind,
      "makeup",
    );
    assert.equal(
      classifyAttendanceDate({
        date: "2026-08-07",
        monthPlan: publishedPlan,
        scheduleDays: [1],
      }).kind,
      "regular",
    );
    assert.equal(
      classifyAttendanceDate({
        date: "2026-08-10",
        monthPlan: publishedPlan,
        scheduleDays: [1],
      }).kind,
      "makeup",
    );
  });

  it("generates a fixed weekday preview for any requested month", () => {
    assert.deepEqual(generateFixedMonthPlanDates("2026-11", [1, 3]), [
      "2026-11-02",
      "2026-11-04",
      "2026-11-09",
      "2026-11-11",
      "2026-11-16",
      "2026-11-18",
      "2026-11-23",
      "2026-11-25",
      "2026-11-30",
    ]);
  });

  it("defensively normalizes nested month-plan responses", () => {
    assert.deepEqual(
      normalizeMonthPlanResponse({
        data: {
          plan: { revision: 4, plan_source: "migration" },
          sessions: [
            { id: "r-2", session_date: "2026-11-09", kind: "regular", version: 7 },
            { id: "r-1", date: "2026-11-02", kind: "regular", version: 6 },
            { id: "m-1", date: "2026-11-03", kind: "makeup", version: 5 },
          ],
        },
      }),
      {
        version: 4,
        state: "open",
        source: "migration",
        expectedRegularSessions: 2,
        regularDates: ["2026-11-02", "2026-11-09"],
        sessions: [
          { id: "r-2", session_date: "2026-11-09", kind: "regular", version: 7 },
          { id: "r-1", date: "2026-11-02", kind: "regular", version: 6 },
          { id: "m-1", date: "2026-11-03", kind: "makeup", version: 5 },
        ],
      },
    );
  });

  it("builds fixed and flexible replacement requests with optimistic row versions", () => {
    const plan = normalizeMonthPlanResponse({
      version: 0,
      expected_source: "current_regular_session_ledger",
      sessions: [
        { id: "regular-1", date: "2026-11-02", kind: "regular", version: 8 },
      ],
    });

    assert.deepEqual(
      buildMonthPlanRequest({
        classId: "class-1",
        month: "2026-11",
        mode: "fixed_weekdays",
        weekdays: [3, 1, 1],
        sessionsPerWeek: 2,
        selectedDates: [],
        reason: "Bổ sung lịch chính khóa tháng 11",
        plan,
      }),
      {
        class_id: "class-1",
        month: "2026-11",
        expected_version: 0,
        row_versions: { "regular-1": 8 },
        schedule_mode: "fixed_weekdays",
        weekdays: [1, 3],
        sessions_per_week: 2,
        reason: "Bổ sung lịch chính khóa tháng 11",
      },
    );

    assert.deepEqual(
      buildMonthPlanRequest({
        classId: "class-1",
        month: "2026-11",
        mode: "flexible",
        selectedDates: ["2026-11-20", "2026-11-03", "2026-11-03"],
        reason: "Điều chỉnh lịch linh hoạt",
        plan,
      }).dates,
      ["2026-11-03", "2026-11-20"],
    );
    assert.throws(
      () => buildMonthPlanRequest({
        classId: "class-1",
        month: "2026-11",
        mode: "flexible",
        selectedDates: ["2026-11-03"],
        reason: "",
        plan,
      }),
      /reason/i,
    );
  });

  it("uses PATCH semantics to preserve non-regular sessions while changing regular dates", () => {
    assert.deepEqual(
      buildMonthPlanPatchRequest({
        classId: "class-1",
        month: "2026-11",
        requestedDates: ["2026-11-03", "2026-11-17"],
        reason: "Điều chỉnh lịch chính khóa",
        plan: {
          version: 4,
          sessions: [
            { id: "regular-1", date: "2026-11-02", kind: "regular", version: 8 },
            { id: "makeup-1", date: "2026-11-04", kind: "makeup", version: 9 },
            { id: "extra-1", date: "2026-11-09", kind: "extra", version: 10 },
          ],
        },
      }),
      {
        class_id: "class-1",
        month: "2026-11",
        expected_version: 4,
        row_versions: { "regular-1": 8, "makeup-1": 9, "extra-1": 10 },
        reason: "Điều chỉnh lịch chính khóa",
        add_sessions: [
          { session_date: "2026-11-03", billing_month: "2026-11", kind: "regular", status: "planned" },
          { session_date: "2026-11-17", billing_month: "2026-11", kind: "regular", status: "planned" },
        ],
        remove_session_ids: ["regular-1"],
      },
    );
  });

  it("preserves the exact package total instead of multiplying a rounded unit", () => {
    assert.equal(
      calculateTuitionCharge({
        billingPolicy: "monthly_prorated",
        feeAmount: 1_000_000,
        plannedSessions: 3,
        chargedSessions: 3,
      }),
      1_000_000,
    );
    assert.equal(
      calculateTuitionCharge({
        billingPolicy: "monthly_prorated",
        feeAmount: 1_000_000,
        regularSessions: [
          { id: "r-3", date: "2026-11-17", kind: "regular" },
          { id: "r-1", date: "2026-11-03", kind: "regular" },
          { id: "r-2", date: "2026-11-10", kind: "regular" },
          { id: "makeup", date: "2026-11-04", kind: "makeup" },
          { id: "extra", date: "2026-11-05", kind: "extra" },
        ],
        chargedSessionDates: [
          "2026-11-03",
          "2026-11-04",
          "2026-11-05",
          "2026-11-17",
        ],
      }),
      666_667,
    );
    assert.equal(
      calculateTuitionCharge({
        billingPolicy: "monthly_prorated",
        feeAmount: 1_000_000,
        regularSessions: [
          { id: "r-3", date: "2026-11-17", kind: "regular" },
          { id: "r-1", date: "2026-11-03", kind: "regular" },
          { id: "r-2", date: "2026-11-10", kind: "regular" },
        ],
        chargedSessionDates: ["2026-11-03"],
      }),
      333_334,
    );
    assert.equal(
      calculateTuitionCharge({
        billingPolicy: "per_session",
        feeAmount: 120_000,
        regularSessions: [
          { id: "regular", date: "2026-11-03", kind: "regular" },
          { id: "makeup", date: "2026-11-04", kind: "makeup" },
        ],
        chargedSessionDates: ["2026-11-03", "2026-11-04"],
      }),
      120_000,
    );
    assert.equal(
      calculateTuitionCharge({
        billingPolicy: "monthly_prorated",
        feeAmount: 1_000_000,
        regularSessions: [
          { id: "regular", date: "2026-11-03", kind: "regular", status: "planned" },
          { id: "holiday", date: "2026-11-10", kind: "regular", status: "holiday" },
        ],
        chargedSessionDates: ["2026-11-03", "2026-11-10"],
      }),
      500_000,
    );
  });
});
