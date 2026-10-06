import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ReportCubeRow } from "../lib/report-cube.js";
import { buildStudentProgressReport } from "../lib/student-progress-report.js";
import type { ProgressMonthSnapshot } from "../lib/student-progress-assessment.js";

function row(month: string): ReportCubeRow {
  return {
    student_id: "student-1", student_name: "Nguyen An", class_id: "class-1",
    class_name: "Movers 3", month, expected_sessions: 10, recorded_sessions: 8,
    chargeable_sessions: 7, actual_sessions: 8,
    status_counts: { present: 5, absent_with_fee: 1, absent_no_fee: 2, holiday: 0, make_up: 0 },
    actual_present_rate: 50, chargeable_rate: 70, record_completion_rate: 80,
    monthly_fee_line_id: null, monthly_fee_id: null, fee_amount: 0,
    fee_status: "unallocated", fee_source: "unallocated", fee_confidence: "unallocated",
    fee_needs_review: false, risk_flags: [],
  };
}

function progress(month: string): ProgressMonthSnapshot {
  return {
    id: `progress-${month}`, studentId: "student-1", classId: "class-1", month,
    trackKey: "movers", classType: "communicative",
    skills: [
      { skill_key: "listening", score: 80, max_score: 100 },
      { skill_key: "speaking", score: 80, max_score: 100 },
    ],
  };
}

describe("admin console academic runtime wiring", () => {
  it("preserves report defaults when no tenant override is supplied", () => {
    const report = buildStudentProgressReport({ rows: [row("2026-08")] });
    assert.equal(report.rows[0].progress_score, 60.8);
    assert.equal(report.rows[0].consistency_score, 67);
    assert.equal(report.rows[0].readiness_band, "needs_support");
  });

  it("applies the academic settings associated with each business month", () => {
    const progressMonthsByKey = new Map([
      ["student-1\u0000class-1\u00002026-08", progress("2026-08")],
      ["student-1\u0000class-1\u00002026-09", progress("2026-09")],
    ]);
    const academicSettingsByMonth = new Map([
      ["2026-09", {
        "academic.score_blend": { skill: 1, attendance: 0, consistency: 0 },
        "academic.readiness_thresholds": { onTrack: 95, watch: 75, riskAdjusted: 90 },
      }],
    ]);
    const report = buildStudentProgressReport({
      rows: [row("2026-08"), row("2026-09")], progressMonthsByKey, academicSettingsByMonth,
    });
    const byMonth = new Map(report.rows.map((item) => [item.month, item]));
    assert.equal(byMonth.get("2026-08")?.progress_score, 72.7);
    assert.equal(byMonth.get("2026-09")?.progress_score, 80);
    assert.equal(byMonth.get("2026-09")?.readiness_band, "watch");
  });
});
