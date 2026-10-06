import assert from "node:assert/strict";
import { it } from "node:test";
import * as progress from "../src/utils/studentProgressDashboard.js";

it("formats missing and nonfinite scores without fabricating zero", () => {
  for (const value of [null, undefined, NaN, Infinity, ""]) assert.equal(progress.formatProgressValue(value, "/100"), "—");
  assert.equal(progress.formatProgressValue(0, "/100"), "0/100");
  assert.equal(progress.formatProgressDelta(0), "0");
  assert.equal(progress.formatProgressDelta(20), "+20");
  assert.equal(progress.formatProgressDelta(null), "—");
  assert.equal(progress.progressDeltaTone(null), "text-slate-500");
  assert.equal(progress.progressDeltaTone(NaN), "text-slate-500");
});
it("invalidates older requests and cancelled generations", async () => {
  const guard = progress.createProgressRequestGuard();
  const first = guard.begin();
  const second = guard.begin();
  assert.equal(first.isCurrent(), false);
  assert.equal(second.isCurrent(), true);
  guard.cancel();
  assert.equal(second.isCurrent(), false);
});
it("only the current async response can commit data or clear loading", async () => {
  const guard = progress.createProgressRequestGuard();
  let resolveOld;
  let resolveNew;
  const state = { data: null, loading: true };
  const load = async (promise) => {
    const request = guard.begin();
    const data = await promise;
    if (request.isCurrent()) Object.assign(state, { data, loading: false });
  };
  const old = load(new Promise((resolve) => { resolveOld = resolve; }));
  const latest = load(new Promise((resolve) => { resolveNew = resolve; }));
  resolveOld("old student");
  await old;
  assert.deepEqual(state, { data: null, loading: true });
  resolveNew("current student");
  await latest;
  assert.deepEqual(state, { data: "current student", loading: false });
});
it("grader lookup failure is explicit while valid empty lists remain available", async () => {
  assert.deepEqual(await progress.loadProgressGraders(async () => { throw new Error("403"); }), { teachers: [], unavailable: true });
  assert.deepEqual(await progress.loadProgressGraders(async () => ({ success: false })), { teachers: [], unavailable: true });
  assert.deepEqual(await progress.loadProgressGraders(async () => ({ success: true, data: { teachers: [] } })), { teachers: [], unavailable: false });
});
it("uses selected month metadata and never range-wide track", () => {
  assert.equal(progress.selectedProgressMonthTrack({ progress_month: { track_key: "movers" } }, [{ month: "2026-06", english_track: "flyers" }], "2026-06-01"), "movers");
  assert.equal(progress.selectedProgressMonthTrack({}, [{ month: "2026-06", english_track: "flyers" }, { month: "2026-07", english_track: "pet" }], "2026-06-01"), "flyers");
  assert.equal(progress.selectedProgressMonthTrack({}, [{ month: "2026-07", english_track: "pet" }], "2026-06-01"), "");
});
it("labels actual source and contributing skills without treating fallback as contributors", () => {
  const row = { score_source: "daily_raw", progress_assessment: { contributors: ["listening"], skillScores: [{ key: "speaking", score: 90 }] } };
  assert.equal(progress.progressEvidenceLabel(row), "Điểm thô hằng ngày · Nghe");
  assert.equal(progress.progressEvidenceLabel({ score_source: "missing" }), "Chưa có dữ liệu");
  assert.equal(progress.progressEvidenceLabel({ score_source: "manual_monthly", progress_assessment: { contributors: ["reading", "writing"] } }), "Điểm tháng · Đọc · Viết");
  assert.equal(progress.progressEvidenceLabel({ score_source: "legacy_unknown" }), "Nguồn lịch sử chưa xác định");
});
it("chart rows sanitize nonfinite values and changed calibration has no latest delta", () => {
  assert.equal(progress.buildProgressChartRows({ listening: [{ period: "2026-06-01", raw_score: NaN }] })[0].listening, null);
  const rows = progress.buildLatestSkillDeltaRows([
    { skills: { listening: { raw_score: 60, signature: "movers" } } },
    { skills: { listening: { raw_score: 80, signature: "flyers" } } },
  ]);
  assert.equal(rows[0].delta, null);
  assert.equal(progress.buildSkillGrowthRows({ skills: { listening: { growth: NaN } } })[0].growth, null);
});
