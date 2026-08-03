import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildStudentProgressTimeline,
  buildStudentProgressComparison,
  chooseTimelineGranularity,
  MAX_PROGRESS_RANGE_DAYS,
} from "../lib/student-progress-timeline.js";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const timelineApi = fs.readFileSync(
  path.join(root, "server/api/student-progress/timeline.ts"),
  "utf8"
);
const router = fs.readFileSync(path.join(root, "api/router.ts"), "utf8");

const records = [
  {
    month: "2026-06",
    trackKey: "flyers",
    finalizedAt: null,
    dailyEntries: [
      { id: "e1", entryDate: new Date("2026-06-01T00:00:00Z"), entryType: "mock_test", skillKey: "listening", score: 60, difficultyLevel: "flyers", entryLabel: "Test 1", shieldCount: 0, note: null, gradedByTeacherId: null, gradedByTeacher: null },
      { id: "e2", entryDate: new Date("2026-06-03T00:00:00Z"), entryType: "mock_test", skillKey: "listening", score: 80, difficultyLevel: "ket", entryLabel: "Test 2", shieldCount: 0, note: null, gradedByTeacherId: null, gradedByTeacher: null },
      { id: "e3", entryDate: new Date("2026-06-03T00:00:00Z"), entryType: "skill_assessment", skillKey: "speaking", score: null, difficultyLevel: "flyers", entryLabel: null, shieldCount: 0, note: null, gradedByTeacherId: null, gradedByTeacher: null },
    ],
  },
];

describe("student progress timeline domain", () => {
  it("wires an authenticated receptionist-readable timeline route", () => {
    assert.match(timelineApi, /requireAuth\(handler, \["admin", "receptionist"\]\)/);
    assert.match(timelineApi, /buildStudentProgressTimeline\(months, from, to\)/);
    assert.match(router, /\["student-progress", "timeline"\]/);
  });
  it("chooses bounded granularity for short, medium, and long ranges", () => {
    assert.equal(chooseTimelineGranularity("2026-06-01", "2026-06-30"), "day");
    assert.equal(chooseTimelineGranularity("2026-01-01", "2026-05-31"), "week");
    assert.equal(chooseTimelineGranularity("2025-01-01", "2026-06-30"), "month");
  });

  it("keeps missing values null while computing raw, weighted, and daily delta", () => {
    const result = buildStudentProgressTimeline(records as any, "2026-06-01", "2026-06-05");
    assert.equal(result.granularity, "day");
    assert.equal(result.days.length, 2);
    assert.equal(result.days[0]?.skills.listening.raw_score, 60);
    assert.equal(result.days[1]?.skills.listening.weighted_score, 92);
    assert.equal(result.days[1]?.skills.speaking.raw_score, null);
    assert.equal(result.days[1]?.delta, 20);
    const listening = result.series.listening;
    assert.equal(listening.length, 5);
    assert.equal(listening[1]?.raw_score, null);
    assert.equal(listening[2]?.raw_score, 80);
  });

  it("marks finalized days and aggregates annual ranges to at most one point per month", () => {
    const finalized = [{ ...records[0], finalizedAt: new Date("2026-07-01T00:00:00Z") }];
    const result = buildStudentProgressTimeline(finalized as any, "2025-07-01", "2026-06-30");
    assert.equal(result.granularity, "month");
    assert.equal(result.days[0]?.month_finalized, true);
    assert.equal(result.series.listening.length, 12);
  });

  it("compares each skill with an equally-sized previous period without inventing zeroes", () => {
    const current = buildStudentProgressTimeline(records as any, "2026-06-01", "2026-06-05");
    const previous = buildStudentProgressTimeline([], "2026-05-27", "2026-05-31");
    const comparison = buildStudentProgressComparison(current, previous);
    assert.equal(comparison.skills.listening.current_raw_score, 70);
    assert.equal(comparison.skills.listening.previous_raw_score, null);
    assert.equal(comparison.skills.listening.raw_delta, null);
    assert.equal(MAX_PROGRESS_RANGE_DAYS, 732);
  });
});
