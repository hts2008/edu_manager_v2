import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildStudentProgressReport,
  detectEnglishTrack,
} from "../lib/student-progress-report.js";
import { buildProgressFramework } from "../lib/student-progress-assessment.js";
import type { ReportCubeRow } from "../lib/report-cube.js";

function row(overrides: Partial<ReportCubeRow> = {}): ReportCubeRow {
  return {
    student_id: "student-1",
    student_name: "Bui Minh Tuan",
    class_id: "class-1",
    class_name: "Movers 3",
    month: "2026-06",
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
    fee_amount: 900000,
    fee_status: "ready",
    fee_source: "monthly_fee_line",
    fee_confidence: "calculated",
    fee_needs_review: false,
    risk_flags: [],
    ...overrides,
  };
}

describe("student progress parent report", () => {
  it("detects the initial English certificate tracks from class names", () => {
    assert.equal(detectEnglishTrack("Starters A1"), "starters");
    assert.equal(detectEnglishTrack("MOVERS 3"), "movers");
    assert.equal(detectEnglishTrack("Flyer B2"), "flyers");
    assert.equal(detectEnglishTrack("KET Foundation"), "ket");
    assert.equal(detectEnglishTrack("PET B1 Intensive"), "pet");
    assert.equal(detectEnglishTrack("General English"), "unknown");
  });

  it("builds honest monthly report rows without fabricating academic skill scores", () => {
    const result = buildStudentProgressReport({
      rows: [row()],
      parentsByStudentId: new Map([
        ["student-1", { name: "Bui Van Nam", phone: "0909000000" }],
      ]),
    });

    assert.equal(result.rows.length, 1);
    const reportRow = result.rows[0];
    assert.equal(reportRow.parent_name, "Bui Van Nam");
    assert.equal(reportRow.english_track, "movers");
    assert.equal(reportRow.cefr_level, "A1");
    assert.equal(reportRow.progress_score, 90.7);
    assert.equal(reportRow.learning_evidence_coverage, 75);
    assert.equal(reportRow.skill_scores.length, 4);
    assert.ok(reportRow.skill_scores.every((skill) => skill.status === "missing_input"));
    assert.match(reportRow.parent_summary, /Movers/);
    assert.equal(result.summary.missing_academic_input_count, 1);
    assert.equal(result.summary.average_progress_score, 90.7);
  });

  it("computes month-over-month trend per student and class", () => {
    const result = buildStudentProgressReport({
      rows: [
        row({
          month: "2026-05",
          actual_present_rate: 70,
          record_completion_rate: 80,
          status_counts: {
            present: 5,
            absent_with_fee: 1,
            absent_no_fee: 1,
            holiday: 0,
            make_up: 0,
          },
        }),
        row({
          month: "2026-06",
          actual_present_rate: 95,
          record_completion_rate: 100,
          status_counts: {
            present: 8,
            absent_with_fee: 0,
            absent_no_fee: 0,
            holiday: 0,
            make_up: 0,
          },
        }),
      ],
    });

    const june = result.rows.find((item) => item.month === "2026-06");
    assert.equal(june?.trend_label, "improving");
    assert.ok((june?.trend_delta || 0) > 5);
  });

  it("marks rows with no attendance basis as insufficient data and recommends setup work", () => {
    const result = buildStudentProgressReport({
      rows: [
        row({
          class_name: "General English",
          expected_sessions: 0,
          recorded_sessions: 0,
          actual_sessions: 0,
          chargeable_sessions: 0,
          actual_present_rate: 0,
          record_completion_rate: 0,
          monthly_fee_line_id: null,
          monthly_fee_id: null,
          fee_status: null,
          risk_flags: ["expected_sessions_unavailable"],
        }),
      ],
    });

    assert.equal(result.rows[0].readiness_band, "insufficient_data");
    assert.equal(result.rows[0].english_track, "unknown");
    assert.ok(result.rows[0].next_actions.some((item) => item.includes("lich hoc")));
    assert.equal(result.summary.insufficient_data_count, 1);
  });

  it("merges teacher-entered progress into the parent report", () => {
    const result = buildStudentProgressReport({
      rows: [row()],
      progressMonthsByKey: new Map([
        [
          "student-1\u0000class-1\u00002026-06",
          {
            id: "progress-1",
            studentId: "student-1",
            classId: "class-1",
            month: "2026-06",
            trackKey: "movers",
            classType: "communicative",
            progressScore: 88,
            attendanceScore: 92,
            consistencyScore: 84,
            learningEvidenceCoverage: 96,
            trackReadiness: "on_track",
            focusSkillKey: "speaking",
            focusSkillLabel: "Speaking",
            teacherNote: "Need more speaking practice",
            parentSummary: "Teacher summary overrides proxy row.",
            nextActions: ["Practice speaking daily"],
            evidenceNotes: ["Teacher-entered notes"],
            rubricSnapshot: {},
            academicInputStatus: "complete",
            shieldTotal: 6,
            pointsTotal: 42,
            mockTestScore: 78,
            finalizedAt: null,
            skills: [
              {
                skill_key: "listening",
                skill_label: "Listening",
                score: 80,
                max_score: 100,
                weight: 25,
                status: "available",
                note: "Strong",
                source: "teacher_input",
                sort_order: 0,
              },
              {
                skill_key: "speaking",
                skill_label: "Speaking",
                score: 75,
                max_score: 100,
                weight: 25,
                status: "available",
                note: "Needs fluency",
                source: "teacher_input",
                sort_order: 1,
              },
            ],
            dailyEntries: [],
          },
        ],
      ]),
    });

    const reportRow = result.rows[0];
    assert.equal(reportRow.progress_score, 88);
    assert.equal(reportRow.readiness_band, "on_track");
    assert.equal(reportRow.progress_assessment.hasTeacherInput, true);
    assert.equal(reportRow.skill_scores[0].status, "available");
    assert.equal(reportRow.parent_summary, "Teacher summary overrides proxy row.");
    assert.equal(reportRow.progress_month_id, "progress-1");
  });

  it("exposes the seven new progress skill domains in the framework", () => {
    const framework = buildProgressFramework();
    assert.equal(framework.skill_domains.length, 7);
    assert.ok(framework.skill_domains.some((item) => item.key === "mock_test"));
  });

  it("keeps empty teacher skill scores as missing input instead of zero", () => {
    const result = buildStudentProgressReport({
      rows: [row()],
      progressMonthsByKey: new Map([
        [
          "student-1\u0000class-1\u00002026-06",
          {
            id: "progress-empty-skills",
            studentId: "student-1",
            classId: "class-1",
            month: "2026-06",
            trackKey: "starters",
            classType: "communicative",
            teacherNote: "Teacher note without fabricated scores",
            skills: [
              {
                skill_key: "listening",
                skill_label: "Listening",
                score: null,
                max_score: 100,
                status: "missing_input",
              },
            ],
            dailyEntries: [],
          },
        ],
      ]),
    });

    const listening = result.rows[0].skill_scores.find(
      (skill) => skill.key === "listening"
    );
    assert.equal(listening?.score, null);
    assert.equal(listening?.status, "missing_input");
  });

  it("builds skill and teacher-input analytics without counting missing scores as zero", () => {
    const result = buildStudentProgressReport({
      rows: [row()],
      progressMonthsByKey: new Map([
        [
          "student-1\u0000class-1\u00002026-06",
          {
            id: "progress-chart",
            studentId: "student-1",
            classId: "class-1",
            month: "2026-06",
            trackKey: "movers",
            classType: "communicative",
            teacherNote: "Monthly input",
            skills: [
              {
                skill_key: "listening",
                skill_label: "Listening",
                score: 80,
                max_score: 100,
                status: "available",
              },
              {
                skill_key: "speaking",
                skill_label: "Speaking",
                score: null,
                max_score: 100,
                status: "missing_input",
              },
            ],
            dailyEntries: [],
          },
        ],
      ]),
    });

    const listening = result.charts.skill_averages.find(
      (skill) => skill.key === "listening"
    );
    const speaking = result.charts.skill_averages.find(
      (skill) => skill.key === "speaking"
    );
    assert.equal(listening?.average_score, 80);
    assert.equal(listening?.input_count, 1);
    assert.equal(speaking?.average_score, null);
    assert.equal(speaking?.input_count, 0);
    assert.ok(
      result.charts.academic_input.some(
        (item) => item.label === "partial" && item.count === 1
      )
    );
  });
});
