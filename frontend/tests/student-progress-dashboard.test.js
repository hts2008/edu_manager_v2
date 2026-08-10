import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  analyzeDailyEntriesForGrid,
  buildDailyEntryPayload,
  buildLatestSkillDeltaRows,
  buildProgressChartRows,
  buildSkillComparisonRows,
  getProgressPeriodRange,
} from "../src/utils/studentProgressDashboard.js";

describe("student progress dashboard", () => {
  it("builds bounded week, month, and year ranges", () => {
    assert.deepEqual(getProgressPeriodRange("week", "2026-08-05"), {
      from: "2026-08-03",
      to: "2026-08-09",
    });
    assert.deepEqual(getProgressPeriodRange("month", "2024-02-18"), {
      from: "2024-02-01",
      to: "2024-02-29",
    });
    assert.deepEqual(getProgressPeriodRange("year", "2026-08-05"), {
      from: "2026-01-01",
      to: "2026-12-31",
    });
  });

  it("falls back safely when a date input is temporarily empty", () => {
    const range = getProgressPeriodRange("month", "");
    assert.match(range.from, /^\d{4}-\d{2}-01$/);
    assert.match(range.to, /^\d{4}-\d{2}-\d{2}$/);
  });

  it("builds latest-update deltas and current-versus-previous radar rows", () => {
    const deltas = buildLatestSkillDeltaRows([
      { skills: { listening: { raw_score: 60 } } },
      { skills: { listening: { raw_score: 75 } } },
    ]);
    assert.equal(deltas.find((row) => row.key === "listening").delta, 15);
    const comparison = buildSkillComparisonRows({
      skills: { listening: { current_raw_score: 75, previous_raw_score: 60 } },
    });
    assert.equal(comparison.find((row) => row.key === "listening").current, 75);
    assert.equal(comparison.find((row) => row.key === "listening").previous, 60);
  });

  it("preserves null gaps when building raw and weighted chart rows", () => {
    const series = {
      listening: [
        { period: "2026-08-01", raw_score: null, weighted_score: null },
        { period: "2026-08-02", raw_score: 80, weighted_score: 92 },
      ],
    };
    const raw = buildProgressChartRows(series, "raw");
    const weighted = buildProgressChartRows(series, "weighted");
    assert.equal(raw[0].listening, null);
    assert.equal(raw[1].listening, 80);
    assert.equal(weighted[1].listening, 92);
  });

  it("serializes only entered scores and includes assessment metadata", () => {
    const payload = buildDailyEntryPayload({
      studentId: "student-1",
      classId: "class-1",
      entryDate: "2026-08-03",
      form: {
        entry_type: "mock_test",
        exam_set_level: "flyers",
        difficulty_level: "hard",
        entry_label: "Test 2",
        graded_by_teacher_id: "cmteacher001",
        shield_count: "1",
        note: "Cần luyện Speaking",
        skills: [
          { skill_key: "listening", score: "80" },
          { skill_key: "speaking", score: "" },
        ],
      },
    });
    assert.equal(payload.entries[0].entry_type, "skill_assessment");
    assert.equal(payload.entries[0].score, 80);
    assert.equal(payload.entries[0].exam_set_level, "flyers");
    assert.equal(payload.entries[0].difficulty_level, "hard");
    assert.equal(payload.entries[0].entry_label, "Test 2");
    assert.equal(payload.entries[0].graded_by_teacher_id, "cmteacher001");
    assert.equal(payload.entries.filter((entry) => entry.skill_key).length, 1);
    assert.equal(payload.entries.find((entry) => entry.entry_type === "mock_test").entry_label, "Test 2");
    assert.equal(payload.entries.at(-1).entry_type, "shield");
  });

  it("rejects lossy grid edits when a day contains duplicate skills or heterogeneous metadata", () => {
    const duplicateSkill = analyzeDailyEntriesForGrid([
      {
        entry_type: "skill_assessment",
        skill_key: "listening",
        score: 70,
        exam_set_level: "flyers",
        difficulty_level: "medium",
        entry_label: "Flyers Test 1",
        graded_by_teacher_id: "cmteacher001",
      },
      {
        entry_type: "skill_assessment",
        skill_key: "listening",
        score: 82,
        exam_set_level: "flyers",
        difficulty_level: "medium",
        entry_label: "Flyers Test 1",
        graded_by_teacher_id: "cmteacher001",
      },
    ]);
    const heterogeneousMetadata = analyzeDailyEntriesForGrid([
      {
        entry_type: "skill_assessment",
        skill_key: "listening",
        score: 70,
        exam_set_level: "flyers",
        difficulty_level: "medium",
        entry_label: "Flyers Listening 1",
        graded_by_teacher_id: "cmteacher001",
      },
      {
        entry_type: "skill_assessment",
        skill_key: "reading",
        score: 82,
        exam_set_level: "ket",
        difficulty_level: "hard",
        entry_label: "KET Reading 2",
        graded_by_teacher_id: "cmteacher002",
      },
    ]);

    assert.equal(duplicateSkill.safe, false);
    assert.ok(duplicateSkill.reasons.includes("duplicate_skill"));
    assert.equal(heterogeneousMetadata.safe, false);
    assert.ok(heterogeneousMetadata.reasons.includes("heterogeneous_metadata"));
    assert.throws(
      () => buildDailyEntryPayload({
        studentId: "student-1",
        classId: "class-1",
        entryDate: "2026-08-03",
        form: {
          edit_safety: heterogeneousMetadata,
          skills: [{ skill_key: "listening", score: "90" }],
        },
      }),
      /không thể sửa an toàn/i,
    );
  });

  it("allows the grid only when each skill is unique and assessment metadata is homogeneous", () => {
    const safety = analyzeDailyEntriesForGrid([
      {
        entry_type: "skill_assessment",
        skill_key: "listening",
        score: 70,
        exam_set_level: "flyers",
        difficulty_level: "medium",
        entry_label: "Flyers Test 1",
        graded_by_teacher_id: "cmteacher001",
      },
      {
        entry_type: "skill_assessment",
        skill_key: "reading",
        score: 75,
        exam_set_level: "flyers",
        difficulty_level: "medium",
        entry_label: "Flyers Test 1",
        graded_by_teacher_id: "cmteacher001",
      },
    ]);

    assert.deepEqual(safety, { safe: true, reasons: [] });
  });

  it("wires receptionist-safe routes, detail navigation, charts, PDF and loading states", () => {
    const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
    const sidebar = readFileSync(new URL("../src/components/layout/Sidebar.jsx", import.meta.url), "utf8");
    const list = readFileSync(new URL("../src/pages/StudentProgressReportPage.jsx", import.meta.url), "utf8");
    const detail = readFileSync(new URL("../src/pages/StudentProgressDetailPage.jsx", import.meta.url), "utf8");
    const charts = readFileSync(new URL("../src/components/student-progress/ProgressDashboardCharts.jsx", import.meta.url), "utf8");
    const dailyForm = readFileSync(new URL("../src/components/student-progress/ProgressDailyEntryForm.jsx", import.meta.url), "utf8");

    assert.match(app, /path="student-progress" element=\{withSuspense\(<StudentProgressReportPage \/>\)\}/);
    assert.match(app, /path="student-progress\/:studentId"/);
    assert.doesNotMatch(sidebar, /Tiến bộ học viên"[^\n]+adminOnly/);
    assert.match(list, /open-student-progress-detail/);
    assert.match(charts, /student-progress-charts/);
    assert.match(detail, /student-progress\/pdf/);
    assert.match(detail, /Đang phân tích tiến bộ học viên/);
    assert.match(dailyForm, /Không thể sửa ngày này bằng lưới đơn/);
    assert.match(dailyForm, /edit_safety/);
    assert.match(dailyForm, /Bộ đề \/ cấp độ/);
    assert.match(dailyForm, /Dễ/);
    assert.doesNotMatch(list, /ProgressInputPanel/);
  });
});
