import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CAMBRIDGE_DIFFICULTY_LEVELS,
  DIFFICULTY_WEIGHT_DELTA,
  MAX_DIFFICULTY_WEIGHT,
  MIN_DIFFICULTY_WEIGHT,
  computeWeightedScore,
  getDifficultyWeight,
} from "../lib/progress-difficulty.js";

describe("student progress difficulty engine", () => {
  it("locks the complete Cambridge 5x5 relative-weight matrix", () => {
    const expected = [
      [1, 0.85, 0.7, 0.7, 0.7],
      [1.15, 1, 0.85, 0.7, 0.7],
      [1.3, 1.15, 1, 0.85, 0.7],
      [1.3, 1.3, 1.15, 1, 0.85],
      [1.3, 1.3, 1.3, 1.15, 1],
    ];

    for (const [entryIndex, entryLevel] of CAMBRIDGE_DIFFICULTY_LEVELS.entries()) {
      for (const [classIndex, classLevel] of CAMBRIDGE_DIFFICULTY_LEVELS.entries()) {
        assert.equal(
          getDifficultyWeight(entryLevel, classLevel),
          expected[entryIndex][classIndex],
          `${entryLevel} entry relative to ${classLevel} class`
        );
      }
    }
  });

  it("exports the approved formula constants", () => {
    assert.equal(DIFFICULTY_WEIGHT_DELTA, 0.15);
    assert.equal(MIN_DIFFICULTY_WEIGHT, 0.7);
    assert.equal(MAX_DIFFICULTY_WEIGHT, 1.3);
  });

  it("uses neutral weight for missing, unknown, and non-Cambridge tracks", () => {
    assert.equal(getDifficultyWeight(null, "movers"), 1);
    assert.equal(getDifficultyWeight("flyers", null), 1);
    assert.equal(getDifficultyWeight("unknown", "movers"), 1);
    assert.equal(getDifficultyWeight("ket", "Pre A1 Starters"), 1);
    assert.equal(getDifficultyWeight("pet", "IELTS"), 1);
  });

  it("computes a display-only weighted score capped at 100 and rounded to one decimal", () => {
    assert.equal(computeWeightedScore(80, 1.15), 92);
    assert.equal(computeWeightedScore(83.36, 1.15), 95.9);
    assert.equal(computeWeightedScore(90, 1.3), 100);
    assert.equal(computeWeightedScore(0, 1.3), 0);
  });

  it("preserves missing raw scores instead of coercing null to zero", () => {
    assert.equal(computeWeightedScore(null, 1.15), null);
    assert.equal(computeWeightedScore(undefined, 1.15), null);
    assert.equal(computeWeightedScore(Number.NaN, 1.15), null);
  });
});
