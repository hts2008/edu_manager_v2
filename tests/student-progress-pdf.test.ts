import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderPdfDefinition } from "../lib/pdf.js";
import { buildStudentProgressPdfDefinition } from "../lib/student-progress-pdf.js";

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
