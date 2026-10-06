import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveAcademicSettings,
  snapshotAcademicSettings,
} from "../lib/academic-settings.js";
import { getDifficultyWeight } from "../lib/progress-difficulty.js";
import {
  buildProgressAssessment,
  buildProgressRubric,
  detectProgressTrackKey,
} from "../lib/student-progress-assessment.js";
import type { ReportCubeRow } from "../lib/report-cube.js";

function reportRow(overrides: Partial<ReportCubeRow> = {}): ReportCubeRow {
  return {
    student_id: "student-1",
    student_name: "Nguyen An",
    class_id: "class-1",
    class_name: "Movers 3",
    month: "2026-08",
    expected_sessions: 8,
    recorded_sessions: 8,
    chargeable_sessions: 7,
    actual_sessions: 8,
    status_counts: {
      present: 7,
      absent_with_fee: 0,
      absent_no_fee: 1,
      holiday: 0,
      make_up: 0,
    },
    actual_present_rate: 87.5,
    chargeable_rate: 87.5,
    record_completion_rate: 100,
    monthly_fee_line_id: "line-1",
    monthly_fee_id: "fee-1",
    fee_amount: 900_000,
    fee_status: "ready",
    fee_source: "monthly_fee_line",
    fee_confidence: "calculated",
    fee_needs_review: false,
    risk_flags: [],
    ...overrides,
  };
}

describe("admin console academic settings wiring", () => {
  it("preserves the approved defaults when no settings context is supplied", () => {
    const settings = resolveAcademicSettings();

    assert.deepEqual(settings.scoreBlend, {
      skill: 0.6,
      attendance: 0.25,
      consistency: 0.15,
    });
    assert.deepEqual(settings.readinessThresholds, {
      onTrack: 85,
      watch: 70,
      riskAdjusted: 78,
    });
    assert.deepEqual(
      buildProgressRubric("movers", "communicative").map(({ key, weight }) => ({
        key,
        weight,
      })),
      [
        { key: "listening", weight: 26 },
        { key: "speaking", weight: 26 },
        { key: "reading", weight: 16 },
        { key: "writing", weight: 16 },
        { key: "homework", weight: 8 },
        { key: "daily_practice", weight: 8 },
        { key: "mock_test", weight: 0 },
      ],
    );
    assert.equal(getDifficultyWeight("ket", "flyers"), 1.15);
  });

  it("applies tenant academic settings to track detection and rubric weights", () => {
    const context = {
      "academic.track_catalog": [
        {
          key: "starters",
          label: "Starter custom",
          cefr: "Pre A1",
          keywords: ["foundation"],
          canDo: "custom outcome",
        },
        ...resolveAcademicSettings().trackCatalog.filter((track) => track.key !== "starters"),
      ],
      "academic.rubric_track_overrides": {
        ...resolveAcademicSettings().rubricTrackOverrides,
        starters: {
          listening: 40,
          speaking: 20,
          reading: 10,
          writing: 10,
          homework: 10,
          daily_practice: 10,
          mock_test: 0,
        },
      },
    };

    assert.equal(detectProgressTrackKey("Foundation A", context), "starters");
    assert.equal(buildProgressRubric("starters", "communicative", context)[0].weight, 40);
  });

  it("applies configured score blend and readiness thresholds and snapshots them", () => {
    const context = {
      "academic.score_blend": { skill: 1, attendance: 0, consistency: 0 },
      "academic.readiness_thresholds": { onTrack: 95, watch: 80, riskAdjusted: 90 },
    };
    const assessment = buildProgressAssessment({
      row: reportRow(),
      settings: context,
      progressMonth: {
        id: "progress-1",
        studentId: "student-1",
        classId: "class-1",
        month: "2026-08",
        trackKey: "movers",
        classType: "communicative",
        attendanceScore: 100,
        consistencyScore: 100,
        skills: [
          { skill_key: "listening", score: 80, max_score: 100 },
          { skill_key: "speaking", score: 80, max_score: 100 },
        ],
      },
    });

    assert.equal(assessment.progressScore, 80);
    assert.equal(assessment.readinessBand, "watch");
    assert.deepEqual(
      (assessment.rubricSnapshot.academicSettings as { scoreBlend: unknown }).scoreBlend,
      context["academic.score_blend"],
    );
    assert.deepEqual(snapshotAcademicSettings(context), assessment.rubricSnapshot.academicSettings);
  });

  it("applies configured fallback and consistency policies", () => {
    const assessment = buildProgressAssessment({
      row: reportRow({
        expected_sessions: 10,
        recorded_sessions: 8,
        actual_present_rate: 50,
        record_completion_rate: 80,
        status_counts: {
          present: 5,
          absent_with_fee: 1,
          absent_no_fee: 2,
          holiday: 0,
          make_up: 0,
        },
      }),
      settings: {
        "academic.fallback_score_weights": { attendance: 1, completion: 0 },
        "academic.consistency_penalties": {
          missingSession: 1,
          absentNoFee: 2,
          absentWithFee: 3,
        },
      },
    });

    assert.equal(assessment.progressScore, 50);
    assert.equal(assessment.attendanceScore, 50);
    assert.equal(assessment.consistencyScore, 91);
  });

  it("applies configured Cambridge difficulty delta and clamps", () => {
    const context = {
      "academic.difficulty_weights": { delta: 0.2, min: 0.8, max: 1.2 },
    };

    assert.equal(getDifficultyWeight("ket", "flyers", null, context), 1.2);
    assert.equal(getDifficultyWeight("starters", "pet", null, context), 0.8);
  });
});
