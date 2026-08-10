import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  CAMBRIDGE_EXAM_SET_LEVELS,
  DIFFICULTY_WEIGHT_DELTA,
  MAX_DIFFICULTY_WEIGHT,
  MIN_DIFFICULTY_WEIGHT,
  computeWeightedScore,
  getDifficultyWeight,
  normalizeProgressEntrySemantics,
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

    for (const [entryIndex, entryLevel] of CAMBRIDGE_EXAM_SET_LEVELS.entries()) {
      for (const [classIndex, classLevel] of CAMBRIDGE_EXAM_SET_LEVELS.entries()) {
        assert.equal(
          getDifficultyWeight(entryLevel, classLevel),
          expected[entryIndex][classIndex],
          `${entryLevel} entry relative to ${classLevel} class`
        );
      }
    }
  });

  it("keeps task difficulty descriptive until an academic rubric is approved", () => {
    assert.equal(getDifficultyWeight("flyers", "flyers", "easy"), 1);
    assert.equal(getDifficultyWeight("flyers", "flyers", "medium"), 1);
    assert.equal(getDifficultyWeight("flyers", "flyers", "hard"), 1);
    assert.equal(getDifficultyWeight("ket", "flyers", "hard"), 1.15);
  });

  it("dual-reads legacy Cambridge values during rolling deployment", () => {
    assert.deepEqual(normalizeProgressEntrySemantics(null, "flyers"), {
      examSetLevel: "flyers",
      difficultyLevel: null,
    });
    assert.deepEqual(normalizeProgressEntrySemantics("ket", "hard"), {
      examSetLevel: "ket",
      difficultyLevel: "hard",
    });
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

  it("migrates legacy Cambridge values without inventing task difficulty", () => {
    const migration = readFileSync(
      "prisma/migrations/20260806_progress_exam_set_and_difficulty/migration.sql",
      "utf8",
    );
    assert.match(migration, /"exam_set_level" = "difficulty_level"/);
    assert.doesNotMatch(migration, /"difficulty_level" = NULL/);
    assert.match(migration, /'starters', 'movers', 'flyers', 'ket', 'pet'/);
    assert.doesNotMatch(migration, /ADD CONSTRAINT/);
  });
});
