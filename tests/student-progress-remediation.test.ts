import assert from "node:assert/strict";
import test from "node:test";
import { buildProgressAssessment, summarizeDailyAssessmentRollup } from "../lib/student-progress-assessment.js";
import { buildStudentProgressReport } from "../lib/student-progress-report.js";
import type { ProgressMonthSnapshot } from "../lib/student-progress-assessment.js";
import type { ReportCubeRow } from "../lib/report-cube.js";

function row(month = "2026-09"): ReportCubeRow {
  return {
    student_id: "student", student_name: "Student", class_id: "class", class_name: "Movers", month,
    expected_sessions: 8, recorded_sessions: 8, chargeable_sessions: 8, actual_sessions: 8,
    actual_present_rate: 100, chargeable_rate: 100, record_completion_rate: 100,
    status_counts: { present: 8, absent_with_fee: 0, absent_no_fee: 0, holiday: 0, make_up: 0 },
    monthly_fee_line_id: null, monthly_fee_id: null, fee_amount: 0, fee_status: null,
    fee_source: "none", fee_confidence: "none", fee_needs_review: false, risk_flags: [],
  } as ReportCubeRow;
}

function dailyMonth(month = "2026-09", score = 80): ProgressMonthSnapshot {
  return {
    id: month, studentId: "student", classId: "class", month, trackKey: "movers",
    skills: [], dailyEntries: [{ entry_date: `${month}-01`, entry_type: "skill_assessment", skill_key: "listening", score }],
  };
}

test("TP-ACA-05/06 daily-only score and skill survive a finalize-shaped assessment", () => {
  const result = buildProgressAssessment({ row: row(), progressMonth: dailyMonth() });
  assert.equal(result.progressScore, 80);
  assert.equal(result.skillScores.find((skill) => skill.key === "listening")?.score, 80);
  assert.equal(result.skillScores.filter((skill) => skill.score === null).length, 6);
  assert.equal((result as any).scoreSource, "daily_raw");
});

test("TP-ACA-01 monthly daily academic 60 to80 compares academic values", () => {
  const report = buildStudentProgressReport({
    rows: [row("2026-08"), row()],
    progressMonthsByKey: new Map([
      ["student\u0000class\u00002026-08", dailyMonth("2026-08", 60)],
      ["student\u0000class\u00002026-09", dailyMonth()],
    ]),
  });
  const current = report.rows.find((item) => item.month === "2026-09")!;
  assert.equal(current.trend_delta, 20);
  assert.equal(current.trend_label, "improving");
});

test("TP-ACA-02 source changes do not generate a declining trend", () => {
  const report = buildStudentProgressReport({
    rows: [row("2026-08"), row()],
    progressMonthsByKey: new Map([["student\u0000class\u00002026-09", dailyMonth()]]),
  });
  assert.equal(report.rows.find((item) => item.month === "2026-09")?.trend_delta, null);
});

test("TP-ACA-04 missing immediately preceding month does not bridge older evidence", () => {
  const report = buildStudentProgressReport({
    rows: [row("2026-07"), row()],
    progressMonthsByKey: new Map([
      ["student\u0000class\u00002026-07", dailyMonth("2026-07", 60)],
      ["student\u0000class\u00002026-09", dailyMonth()],
    ]),
  });
  assert.equal(report.rows.find((item) => item.month === "2026-09")?.trend_delta, null);
});

test("TP-ACA-07 manual zero remains valid and does not become daily80", () => {
  const month = dailyMonth();
  month.skills = [{ skill_key: "listening", score: 0, source: "teacher_input" }];
  const result = buildProgressAssessment({ row: row(), progressMonth: month });
  assert.equal(result.skillScores.find((skill) => skill.key === "listening")?.score, 0);
  assert.equal((result as any).scoreSource, "manual_monthly");
});

test("TP-ACA-11 cross-skill scores do not create longitudinal decline", () => {
  const result = summarizeDailyAssessmentRollup([
    { entry_date: "2026-09-01", entry_type: "skill_assessment", skill_key: "listening", score: 90 },
    { entry_date: "2026-09-02", entry_type: "skill_assessment", skill_key: "speaking", score: 50 },
  ]);
  assert.equal(result.scoreDelta, null);
  assert.ok(result.skills.every((skill) => skill.scoreDelta === null));
});

test("TP-ACA-12 same-date skill average is stable regardless of entry order", () => {
  const entries = [60, 80].map((score) => ({
    entry_date: "2026-09-01", entry_type: "skill_assessment" as const, skill_key: "listening" as const, score,
  }));
  const result = summarizeDailyAssessmentRollup(entries);
  assert.deepEqual(result, summarizeDailyAssessmentRollup([...entries].reverse()));
  assert.equal(result.latestScore, 70);
  assert.equal(result.scoreDelta, null);
});

test("TP-ACA-08 stale persisted open-month cache cannot override evidence", () => {
  const month = dailyMonth();
  month.progressScore = 100;
  assert.equal(buildProgressAssessment({ row: row(), progressMonth: month }).progressScore, 80);
});

test("finalized legacy rubric remains unchanged and has unknown provenance", () => {
  const month = dailyMonth();
  const snapshot = { trackKey: "movers", legacyVersion: "old-policy" };
  month.finalizedAt = new Date("2026-10-01");
  month.progressScore = 73;
  month.rubricSnapshot = snapshot;
  const result = buildProgressAssessment({ row: row(), progressMonth: month });
  assert.equal(result.progressScore, 73);
  assert.equal(result.scoreSource, "legacy_unknown");
  assert.deepEqual(result.rubricSnapshot, snapshot);
});

test("intermediate assessment basis changes suppress longitudinal growth", () => {
  const entries = ["movers", "flyers", "movers"].map((exam_set_level, index) => ({
    entry_date: `2026-09-0${index + 1}`, entry_type: "skill_assessment" as const,
    skill_key: "listening" as const, score: 60 + index * 10, exam_set_level,
  }));
  const result = summarizeDailyAssessmentRollup(entries);
  assert.equal(result.scoreDelta, null);
  assert.equal(result.skills.find((skill) => skill.skillKey === "listening")?.scoreDelta, null);
});
