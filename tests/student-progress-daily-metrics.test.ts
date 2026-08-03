import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deriveMockTestScores,
  resolveMonthlyProgressScore,
} from "../lib/student-progress-daily-metrics.js";

describe("student progress daily metrics", () => {
  it("derives one mock-test score from normalized skill rows and a scoreless marker", () => {
    const scores = deriveMockTestScores([
      { entryDate: "2026-06-03", entryType: "skill_assessment", skillKey: "listening", score: 80 },
      { entryDate: "2026-06-03", entryType: "skill_assessment", skillKey: "speaking", score: 60 },
      { entryDate: "2026-06-03", entryType: "mock_test", score: null },
    ]);
    assert.deepEqual(scores, [70]);
  });

  it("prefers an explicit scored mock-test over a same-day derived value", () => {
    const scores = deriveMockTestScores([
      { entryDate: "2026-06-03", entryType: "skill_assessment", skillKey: "listening", score: 80 },
      { entryDate: "2026-06-03", entryType: "mock_test", score: 75 },
      { entryDate: "2026-06-03", entryType: "mock_test", score: null },
    ]);
    assert.deepEqual(scores, [75]);
  });
});

describe("monthly progress score resolution", () => {
  it("preserves the teacher-authored monthly score when manual skills exist", () => {
    assert.equal(
      resolveMonthlyProgressScore({
        dailyAverageScore: 64,
        previousProgressScore: 82,
        manualSkillCount: 2,
      }),
      82
    );
  });

  it("uses the daily average only when no manual monthly skills exist", () => {
    assert.equal(
      resolveMonthlyProgressScore({
        dailyAverageScore: 64,
        previousProgressScore: 82,
        manualSkillCount: 0,
      }),
      64
    );
  });

  it("clears a stale daily-derived score after the last evidence is deleted", () => {
    assert.equal(
      resolveMonthlyProgressScore({
        dailyAverageScore: null,
        previousProgressScore: 82,
        manualSkillCount: 0,
      }),
      0
    );
  });
});
