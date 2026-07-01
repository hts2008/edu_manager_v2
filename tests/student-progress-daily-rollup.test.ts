import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { summarizeDailyAssessmentRollup } from "../lib/student-progress-assessment.js";

describe("daily student progress rollup", () => {
  it("computes average, latest, delta, count, and weakest-skill focus", () => {
    const rollup = summarizeDailyAssessmentRollup([
      {
        entry_date: "2026-06-03",
        entry_type: "skill_assessment",
        skill_key: "listening",
        score: 60,
      },
      {
        entry_date: "2026-06-10",
        entry_type: "skill_assessment",
        skill_key: "listening",
        score: 80,
      },
      {
        entry_date: "2026-06-05",
        entry_type: "skill_assessment",
        skill_key: "speaking",
        score: 50,
      },
      {
        entry_date: "2026-06-12",
        entry_type: "mock_test",
        skill_key: "reading",
        score: 99,
      },
    ]);

    assert.equal(rollup.averageScore, 63.3);
    assert.equal(rollup.latestScore, 80);
    assert.equal(rollup.scoreDelta, 20);
    assert.equal(rollup.assessmentCount, 3);
    assert.equal(rollup.focusSkillKey, "speaking");
    assert.equal(rollup.focusSkillLabel, "Nói");
    assert.deepEqual(
      rollup.skills.map((skill) => ({
        key: skill.skillKey,
        status: skill.status,
        average: skill.averageScore,
        latest: skill.latestScore,
        delta: skill.scoreDelta,
        count: skill.assessmentCount,
      })),
      [
        {
          key: "listening",
          status: "available",
          average: 70,
          latest: 80,
          delta: 20,
          count: 2,
        },
        {
          key: "speaking",
          status: "available",
          average: 50,
          latest: 50,
          delta: 0,
          count: 1,
        },
      ]
    );
  });

  it("keeps missing skill inputs null instead of coercing them to zero", () => {
    const rollup = summarizeDailyAssessmentRollup([
      {
        entry_date: "2026-06-03",
        entry_type: "skill_assessment",
        skill_key: "listening",
        score: null,
      },
      {
        entry_date: "2026-06-04",
        entry_type: "note",
        note: "Extra practice outside the attendance schedule",
      },
    ]);

    assert.equal(rollup.averageScore, null);
    assert.equal(rollup.latestScore, null);
    assert.equal(rollup.scoreDelta, null);
    assert.equal(rollup.assessmentCount, 0);
    assert.equal(rollup.focusSkillKey, null);
    assert.equal(rollup.focusSkillLabel, null);
    assert.deepEqual(rollup.skills, [
      {
        skillKey: "listening",
        skillLabel: "Nghe",
        status: "missing_input",
        averageScore: null,
        latestScore: null,
        scoreDelta: null,
        assessmentCount: 0,
      },
    ]);
  });

  it("uses entry date ordering rather than request order for latest and delta", () => {
    const rollup = summarizeDailyAssessmentRollup([
      {
        entry_date: "2026-06-20",
        entry_type: "skill_assessment",
        skill_key: "writing",
        score: 75,
      },
      {
        entry_date: "2026-06-02",
        entry_type: "skill_assessment",
        skill_key: "writing",
        score: 55,
      },
      {
        entry_date: "2026-06-11",
        entry_type: "skill_assessment",
        skill_key: "writing",
        score: 65,
      },
    ]);

    assert.equal(rollup.latestScore, 75);
    assert.equal(rollup.scoreDelta, 20);
    assert.equal(rollup.skills[0]?.latestScore, 75);
    assert.equal(rollup.skills[0]?.scoreDelta, 20);
  });
});
