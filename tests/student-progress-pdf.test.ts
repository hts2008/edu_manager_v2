import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderPdfDefinition } from "../lib/pdf.js";
import { buildStudentProgressPdfDefinition } from "../lib/student-progress-pdf.js";
import { buildStudentProgressTimeline } from "../lib/student-progress-timeline.js";

function input() {
  return {
    from: "2026-06-01",
    to: "2026-06-30",
    granularity: "day",
    center: { name: "Trung tâm Anh ngữ" },
    student: { name: "Nguyễn Minh Anh", parent_name: "Nguyễn Văn An" },
    class: { name: "Flyers B2", track_key: "flyers" },
    summary: {
      first_score: 60,
      latest_score: 80,
      growth: 20,
      cumulative_points: 140,
      focus_skill_key: "speaking",
      skills: { listening: { first_score: 60, latest_score: 80, growth: 20 } },
    },
    days: [{ date: "2026-06-03", raw_score: 80, weighted_score: 92, delta: 20, skills: { listening: { weighted_score: 92 } }, entries: [{ entry_label: "Đề luyện KET" }] }],
    series: { listening: [{ period: "2026-06-03", raw_score: 80, weighted_score: 92 }] },
  };
}

describe("student progress parent PDF", () => {
  it("uses effective timeline scores and nullable growth in the PDF", () => {
    const timeline = buildStudentProgressTimeline([{ month: "2026-06", trackKey: "movers", dailyEntries: [{ entryDate: "2026-06-01", entryType: "skill_assessment", skillKey: "listening", score: 80, examSetLevel: "flyers" }] }], "2026-06-01", "2026-06-30", { "2026-06": { "academic.difficulty_weights": { delta: 0.3, min: 0.7, max: 1.3 } } });
    assert.equal(timeline.days[0].weighted_score, 100);
    assert.equal(timeline.summary.growth, null);
    const definition = JSON.stringify(buildStudentProgressPdfDefinition({ ...input(), ...timeline }));
    assert.match(definition, /100/);
    assert.match(definition, /—/);
  });
  it("uses an explicit dash for missing skills instead of zero", () => {
    const definition = buildStudentProgressPdfDefinition(input());
    assert.match(JSON.stringify(definition), /—/);
    assert.doesNotMatch(JSON.stringify(definition), /Speaking[^]*\["0"/);
  });

  it("renders aggregate periods, weighted scores, and skill sparklines", () => {
    const serialized = JSON.stringify(buildStudentProgressPdfDefinition(input()));
    assert.match(serialized, /Điểm thô TB/);
    assert.match(serialized, /Quy đổi/);
    assert.match(serialized, /▇/);
  });

  it("renders a Unicode PDF with embedded font mapping", async () => {
    const buffer = await renderPdfDefinition(buildStudentProgressPdfDefinition(input()));
    assert.equal(buffer.subarray(0, 4).toString(), "%PDF");
    assert.match(buffer.toString("latin1"), /\/ToUnicode/);
    assert.ok(buffer.length > 4_000);
  });
});
