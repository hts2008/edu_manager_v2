import assert from "node:assert/strict";
import { it } from "node:test";
import { buildStudentProgressTimeline, buildStudentProgressComparison, getTimelineBaseline, isTimelineScoreDrop } from "../lib/student-progress-timeline.js";
import { snapshotAcademicSettings } from "../lib/academic-settings.js";
import { loadTimelineAcademicSettings } from "../lib/student-progress-timeline-settings.js";

const entry = (date: string, skill: string, score: number, exam = "movers") => ({ entryDate: date, entryType: "skill_assessment", skillKey: skill, score, examSetLevel: exam });
const timeline = (entries: ReturnType<typeof entry>[]) => buildStudentProgressTimeline([{ month: "2026-06", trackKey: "movers", dailyEntries: entries }], "2026-06-01", "2026-06-30");
it("changed skill observation proportions cannot create a false decline", () => {
  const previous = timeline([entry("2026-06-01", "listening", 100), entry("2026-06-02", "listening", 100), entry("2026-06-03", "listening", 100), entry("2026-06-04", "speaking", 0)]);
  const current = timeline([entry("2026-06-01", "listening", 100), entry("2026-06-02", "speaking", 0), entry("2026-06-03", "speaking", 0), entry("2026-06-04", "speaking", 0)]);
  const result = buildStudentProgressComparison(current, previous);
  assert.equal(result.raw_delta, null);
  assert.equal(result.alert_score_drop, false);
  assert.equal(result.comparison_reason, "basis_changed");
});
it("mixed known and unknown weighting is not comparable", () => {
  const records = [
    { month: "2026-05", trackKey: "movers", finalizedAt: "2026-06-01", dailyEntries: [entry("2026-05-31", "listening", 80)] },
    { month: "2026-06", trackKey: "movers", dailyEntries: [entry("2026-06-01", "listening", 80)] },
  ];
  const mixed = buildStudentProgressTimeline(records, "2026-05-31", "2026-06-01");
  const result = buildStudentProgressComparison(mixed, timeline([entry("2026-06-02", "listening", 80)]));
  assert.equal(result.skills.listening.weighted_delta, null);
  assert.equal(result.skills.listening.weighted_comparison_reason, "settings_provenance_unavailable");
});
it("R4 suppresses changed coverage and single-date skill growth", () => {
  const result = timeline([entry("2026-06-01", "listening", 90), entry("2026-06-02", "speaking", 50)]);
  assert.equal(result.summary.growth, null);
  assert.equal(result.days[1].delta, null);
  assert.equal(result.summary.skills.listening.growth, null);
});
it("R5 uses each month and frozen camelCase settings", () => {
  const settings = { "academic.difficulty_weights": { delta: 0.30, min: 0.7, max: 1.3 } };
  const records = [
    { month: "2026-06", trackKey: "movers", finalizedAt: "2026-07-01", rubricSnapshot: { academicSettings: snapshotAcademicSettings(settings) }, dailyEntries: [entry("2026-06-01", "listening", 80, "flyers")] },
    { month: "2026-07", trackKey: "movers", dailyEntries: [entry("2026-07-01", "listening", 80, "flyers")] },
  ];
  const result = buildStudentProgressTimeline(records, "2026-06-01", "2026-07-31");
  assert.deepEqual(result.days.map((day) => day.weighted_score), [100, 92]);
});
it("R4 pins calendar versus custom baselines and strict alert threshold", () => {
  assert.deepEqual(getTimelineBaseline("2026-03-01", "2026-03-31"), { from: "2026-02-01", to: "2026-02-28", kind: "previous_calendar_month" });
  assert.deepEqual(getTimelineBaseline("2026-03-02", "2026-03-04"), { from: "2026-02-27", to: "2026-03-01", kind: "previous_equal_window" });
  assert.equal(isTimelineScoreDrop(85, 100), false);
  assert.equal(isTimelineScoreDrop(84.9, 100), true);
  assert.equal(isTimelineScoreDrop(0, 0), false);
  assert.equal(isTimelineScoreDrop(10, null), false);
});
it("R4 uses canonical basis_changed and missing_evidence comparison reasons", () => {
  const current = timeline([entry("2026-06-01", "speaking", 50)]);
  const previous = timeline([entry("2026-06-01", "listening", 90)]);
  const changed = buildStudentProgressComparison(current, previous);
  assert.equal(changed.comparison_reason, "basis_changed");
  assert.equal(changed.raw_delta, null);
  assert.equal(changed.alert_score_drop, false);
  assert.equal(changed.skills.speaking.comparison_reason, "missing_evidence");
});
it("R5 loader scopes tenant and rejects invalid stored settings", async () => {
  const calls: string[] = [];
  const db = {
    tenant: { findUnique: async ({ where }: any) => { calls.push(where.id); return { configVersion: 1 }; } },
    settingValue: { findMany: async ({ where }: any) => { calls.push(where.tenantId); return []; } },
  };
  const settings = await loadTimelineAcademicSettings(db, "tenant-a", [{ month: "2026-06" }, { month: "2026-07" }, { month: "2026-05", finalizedAt: "2026-06-01" }]);
  assert.deepEqual(Object.keys(settings), ["2026-06", "2026-07"]);
  assert.ok(calls.every((id) => id === "tenant-a"));
  await assert.rejects(loadTimelineAcademicSettings(db, undefined, []), /Tenant context/);
  const invalidDb = { tenant: db.tenant, settingValue: { findMany: async () => [{ id: "invalid", tenantId: "tenant-a", key: "academic.difficulty_weights", value: { delta: -5 }, effectiveFromMonth: "2026-06", revision: 1 }] } };
  await assert.rejects(loadTimelineAcademicSettings(invalidDb, "tenant-a", [{ month: "2026-06" }]), /Invalid academic settings/);
});
it("R4 keeps matching date progression and same-date order invariance", () => {
  const entries = [entry("2026-06-01", "listening", 60), entry("2026-06-01", "listening", 80), entry("2026-06-02", "listening", 90)];
  assert.equal(timeline(entries).summary.growth, 20);
  assert.deepEqual(timeline(entries).summary, timeline([...entries].reverse()).summary);
});
it("R4 suppresses changed exam calibration", () => {
  assert.equal(timeline([entry("2026-06-01", "listening", 60), entry("2026-06-02", "listening", 90, "flyers")]).summary.growth, null);
});
it("R4 practice remains points, never academic achievement", () => {
  const result = timeline([{ ...entry("2026-06-01", "listening", 90), entryType: "mock_test" }]);
  assert.equal(result.days[0].raw_score, null);
  assert.equal(result.summary.cumulative_points, 90);
});
it("R5 resolves effective month overrides and frozen legacy uncertainty", () => {
  const records = [{ month: "2026-06", trackKey: "movers", dailyEntries: [entry("2026-06-01", "listening", 80, "flyers")] }];
  const result = buildStudentProgressTimeline(records, "2026-06-01", "2026-06-30", { "2026-06": { "academic.difficulty_weights": { delta: 0.30, min: 0.7, max: 1.3 } } });
  assert.equal(result.days[0].weighted_score, 100);
  const frozen = buildStudentProgressTimeline([{ ...records[0], finalizedAt: "2026-07-01" }], "2026-06-01", "2026-06-30");
  assert.equal(frozen.days[0].weighted_score, null);
});
