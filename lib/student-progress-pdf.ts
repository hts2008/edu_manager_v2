import type { TDocumentDefinitions } from "pdfmake/interfaces.js";
import { PROGRESS_SKILL_LABELS } from "./student-progress-assessment.js";

type ProgressPdfInput = {
  center?: { name?: string | null; address?: string | null; phone?: string | null };
  student?: { name?: string | null; parent_name?: string | null; parent_phone?: string | null };
  class?: { name?: string | null; track_key?: string | null };
  from: string;
  to: string;
  granularity: string;
  summary: any;
  days: any[];
  series?: Record<string, Array<{ period: string; raw_score: number | null; weighted_score: number | null }>>;
  teacher_note?: string | null;
  parent_summary?: string | null;
  printed_by?: string | null;
};

const missing = "—";

function score(value: unknown) {
  return Number.isFinite(value) ? String(Math.round(Number(value) * 10) / 10) : missing;
}

function growth(value: unknown) {
  if (!Number.isFinite(value)) return missing;
  const numeric = Math.round(Number(value) * 10) / 10;
  return `${numeric > 0 ? "+" : ""}${numeric}`;
}

function mean(values: unknown[]) {
  const available = values.filter((value): value is number => Number.isFinite(value));
  return available.length
    ? Math.round((available.reduce((sum, value) => sum + value, 0) / available.length) * 10) / 10
    : null;
}

function sparkline(values: unknown[]) {
  const available = values.filter((value): value is number => Number.isFinite(value));
  if (!available.length) return missing;
  const bars = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
  return available.map((value) => bars[Math.min(7, Math.max(0, Math.round((value / 100) * 7)))]).join("");
}

export function buildStudentProgressPdfDefinition(input: ProgressPdfInput): TDocumentDefinitions {
  const skillRows = Object.entries(PROGRESS_SKILL_LABELS).map(([key, label]) => {
    const item = input.summary?.skills?.[key] || {};
    const weightedValues = input.days.map((day) => day.skills?.[key]?.weighted_score);
    const rawSeries = (input.series?.[key] || []).map((point) => point.raw_score);
    return [
      String(label),
      score(item.first_score),
      score(item.latest_score),
      growth(item.growth),
      score([...weightedValues].reverse().find((value) => value !== null && value !== undefined)),
      sparkline(rawSeries),
    ];
  });
  const periods = [...new Set(Object.values(input.series || {}).flatMap((points) => points.map((point) => point.period)))].sort();
  const detailRows = periods.map((period) => {
    const raw = Object.values(input.series || {}).map((points) => points.find((point) => point.period === period)?.raw_score);
    const weighted = Object.values(input.series || {}).map((points) => points.find((point) => point.period === period)?.weighted_score);
    return [period, score(mean(raw)), score(mean(weighted))];
  });

  return {
    pageSize: "A4",
    pageMargins: [36, 36, 36, 44],
    defaultStyle: { font: "Roboto", fontSize: 9, color: "#182033" },
    content: [
      { text: input.center?.name || "TRUNG TÂM GIÁO DỤC", bold: true, fontSize: 11, color: "#4f46e5" },
      { text: "BÁO CÁO TIẾN BỘ HỌC VIÊN", bold: true, fontSize: 20, margin: [0, 8, 0, 4] },
      { text: `Kỳ báo cáo: ${input.from} - ${input.to}`, color: "#64748b", margin: [0, 0, 0, 14] },
      {
        columns: [
          [
            { text: `Học viên: ${input.student?.name || missing}`, bold: true },
            { text: `Phụ huynh: ${input.student?.parent_name || missing}` },
          ],
          [
            { text: `Lớp: ${input.class?.name || missing}`, alignment: "right", bold: true },
            { text: `Track: ${input.class?.track_key || "unknown"}`, alignment: "right" },
          ],
        ],
        margin: [0, 0, 0, 14],
      },
      { text: "TỔNG QUAN", bold: true, fontSize: 12, margin: [0, 0, 0, 6] },
      {
        table: {
          widths: ["*", "*", "*", "*"],
          body: [
            ["Đầu kỳ", "Cuối kỳ", "Tăng trưởng", "Điểm cộng dồn"],
            [score(input.summary?.first_score), score(input.summary?.latest_score), growth(input.summary?.growth), score(input.summary?.cumulative_points)],
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 14],
      },
      { text: "TIẾN BỘ THEO KỸ NĂNG", bold: true, fontSize: 12, margin: [0, 0, 0, 6] },
      {
        table: {
          headerRows: 1,
          widths: ["*", 45, 45, 52, 52, 58],
          body: [["Kỹ năng", "Đầu", "Cuối", "Tăng", "Quy đổi", "Xu hướng"], ...skillRows],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 6],
      },
      {
        text: "Điểm quy đổi chỉ dùng để tham khảo: điểm thô × trọng số độ khó tương đối, giới hạn 0.7–1.3 và tối đa 100.",
        italics: true,
        color: "#64748b",
        margin: [0, 0, 0, 14],
      },
      { text: `CHI TIẾT THEO ${String(input.granularity).toUpperCase()}`, bold: true, fontSize: 12, margin: [0, 0, 0, 6] },
      {
        table: {
          headerRows: 1,
          widths: ["*", 80, 80],
          body: [["Kỳ", "Điểm thô TB", "Quy đổi TB"], ...(detailRows.length ? detailRows : [[missing, missing, missing]])],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 14],
      },
      { text: "KHUYẾN NGHỊ", bold: true, fontSize: 12, margin: [0, 0, 0, 5] },
      { text: input.parent_summary || input.teacher_note || `Tập trung cải thiện ${input.summary?.focus_skill_key || "các kỹ năng còn thiếu dữ liệu"}.` },
    ],
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: `In ngày ${new Date().toLocaleDateString("vi-VN")} · ${input.printed_by || "EduManager"}`, margin: [36, 0, 0, 0], color: "#64748b", fontSize: 8 },
        { text: `${currentPage}/${pageCount}`, alignment: "right", margin: [0, 0, 36, 0], color: "#64748b", fontSize: 8 },
      ],
    }),
  };
}
