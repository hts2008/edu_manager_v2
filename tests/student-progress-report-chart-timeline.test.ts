import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseMonthRange } from "../lib/api-utils.js";
import { buildStudentProgressTimeline, buildStudentProgressComparison } from "../lib/student-progress-timeline.js";

const source = readFileSync(new URL("../server/api/reports/student-progress.ts", import.meta.url), "utf8");
function build(row: any, records: any[]) {
  const block = source.match(/const currentRange = ([\s\S]*?)const lastEntryDate/);
  assert.ok(block);
  const scoped = records.filter(record => record.tenantId === "t1" &&
    record.studentId === row.student_id && record.classId === row.class_id);
  const previousMonth = (month: string) => {
    const [year, number] = month.split("-").map(Number);
    return new Date(Date.UTC(year, number - 2, 1)).toISOString().slice(0, 7);
  };
  const factory = new Function("row", "current", "previous", "academicSettingsByMonth",
    "parseMonthRange", "dateOnly", "previousMonth", "buildStudentProgressTimeline",
    "buildStudentProgressComparison", "const currentRange = " + block[1].replace("(end: Date)", "(end)") +
      "; return {...currentTimeline, comparison: {previous_from: dateOnly(previousRange.startDate), previous_to: inclusiveTo(previousRange.endDate), ...alertComparison}};");
  return factory(row, scoped.find(record => record.month === row.month),
    scoped.find(record => record.month === previousMonth(row.month)), new Map(), parseMonthRange,
    (date: Date) => date.toISOString().slice(0, 10), previousMonth,
    buildStudentProgressTimeline, buildStudentProgressComparison);
}
const row = { student_id: "s1", class_id: "c1", month: "2026-10" };
const entry = (day: string, score: number, skillKey = "listening") =>
  ({ entryDate: new Date(day), entryType: "skill_assessment", skillKey, score, examSetLevel: "movers" });
const record = (month: string, entries: any[], scope = {}) =>
  ({ tenantId: "t1", studentId: "s1", classId: "c1", month, trackKey: "movers", dailyEntries: entries, ...scope });

test("row timeline preserves zero, missing skills and dashboard cumulative evidence semantics", () => {
  const timeline = build(row, [record("2026-10", [
    entry("2026-10-01", 0), entry("2026-10-02", 60), entry("2026-10-02", 100, "speaking"),
  ])]);
  assert.equal(timeline.days[0].skills.listening.raw_score, 0);
  assert.equal(timeline.days[0].skills.reading.raw_score, null);
  assert.equal(Object.keys(timeline.days[0].skills).length, 7);
  assert.equal(timeline.days[1].cumulative_points, 160);
  assert.equal(timeline.comparison.skills.listening.current_raw_score, 30);
  assert.equal(timeline.comparison.skills.reading.current_raw_score, null);
});

test("comparison retains previous calendar month without fabricating earlier evidence", () => {
  const timeline = build(row, [
    record("2026-08", [entry("2026-08-30", 100), entry("2026-08-31", 20)]),
    record("2026-09", [entry("2026-09-01", 40)]),
    record("2026-10", [entry("2026-10-01", 60)]),
  ]);
  assert.equal(timeline.comparison.previous_from, "2026-09-01");
  assert.equal(timeline.comparison.previous_to, "2026-09-30");
  assert.equal(timeline.comparison.previous_raw_score, 40);
  assert.equal(timeline.comparison.raw_delta, 20);
  assert.equal(timeline.comparison.baseline_kind, "previous_calendar_month");
});

test("missing evidence stays empty and foreign tenant/student/class cannot enter row charts", () => {
  const timeline = build(row, [
    record("2026-10", [entry("2026-10-01", 100)], { studentId: "s2" }),
    record("2026-10", [entry("2026-10-01", 100)], { classId: "c2" }),
    record("2026-10", [entry("2026-10-01", 100)], { tenantId: "t2" }),
  ]);
  assert.deepEqual(timeline.days, []);
  assert.equal(timeline.comparison.current_raw_score, null);
  assert.equal(timeline.comparison.raw_delta, null);
});

test("endpoint exposes chart timelines from existing batch and exact student/class/month lookup", () => {
  assert.match(source, /chart_timeline: \{/);
  assert.match(source, /\.\.\.currentTimeline/);
  assert.match(source, /progressKey\(row\.student_id, row\.class_id, row\.month\)/);
  assert.match(source, /progressKey\(row\.student_id, row\.class_id, previousMonth\(row\.month\)\)/);
  assert.equal((source.match(/req\.db\.studentProgressMonth\.findMany/g) || []).length, 1);
  assert.match(source, /month: \{ in: \[\.\.\.new Set\(\[\.\.\.query\.months, previousMonth\(query\.from\)\]\)\] \}/);
});
