import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generatePdf, numberToWords } from "../lib/pdf.js";

const onePixelPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

describe("PDF generation", () => {
  it("renders Vietnamese amount words correctly", () => {
    assert.equal(numberToWords(0), "không đồng");
    assert.equal(numberToWords(1500000), "một triệu năm trăm nghìn đồng");
    assert.equal(numberToWords(205000), "hai trăm lẻ năm nghìn đồng");
  });

  it("embeds Unicode font maps for Vietnamese receipt PDFs", async () => {
    const buffer = await generatePdf(
      { type: "receipt", paper_size: "a4", orientation: "portrait" },
      {
        receipt_id: "RCPT_TEST",
        receipt_date: "17/05/2026",
        student_name: "Nguyễn Văn A",
        month: "2026-05",
        amount: 1500000,
        total_amount: 1500000,
        notes: "Học phí",
      }
    );

    const raw = buffer.toString("latin1");
    assert.equal(buffer.subarray(0, 4).toString("latin1"), "%PDF");
    assert.ok(buffer.length > 10000);
    assert.match(raw, /\/ToUnicode/);
    assert.match(raw, /Roboto/);
    assert.doesNotMatch(raw, /Helvetica/);
  });

  it("renders supported Fabric template shapes, images, and groups", async () => {
    const buffer = await generatePdf(
      {
        type: "receipt",
        paper_size: "a4",
        orientation: "portrait",
        json_config: JSON.stringify({
          version: "6.0.0",
          objects: [
            {
              type: "textbox",
              left: 24,
              top: 20,
              width: 240,
              text: "Receipt for {{student_name}}",
              fontSize: 14,
              fill: "#0f172a",
            },
            {
              type: "rect",
              left: 24,
              top: 52,
              width: 160,
              height: 36,
              fill: "rgba(219,234,254,0.55)",
              stroke: "#2563eb",
              strokeWidth: 1,
            },
            {
              type: "line",
              left: 24,
              top: 96,
              x1: 0,
              y1: 0,
              x2: 180,
              y2: 0,
              stroke: "#334155",
              strokeWidth: 1,
            },
            {
              type: "circle",
              left: 24,
              top: 112,
              radius: 18,
              fill: "rgba(34,197,94,0.35)",
              stroke: "#16a34a",
              strokeWidth: 1,
            },
            {
              type: "ellipse",
              left: 72,
              top: 112,
              rx: 28,
              ry: 14,
              fill: "#fee2e2",
              stroke: "#dc2626",
              strokeWidth: 1,
            },
            {
              type: "image",
              left: 128,
              top: 110,
              width: 16,
              height: 16,
              src: onePixelPng,
            },
            {
              type: "group",
              left: 24,
              top: 148,
              objects: [
                {
                  type: "rect",
                  left: 0,
                  top: 0,
                  width: 90,
                  height: 28,
                  stroke: "#111827",
                  strokeWidth: 1,
                },
                {
                  type: "text",
                  left: 8,
                  top: 6,
                  text: "${receipt_id}",
                  fontSize: 10,
                },
              ],
            },
            {
              type: "path",
              left: 0,
              top: 0,
              path: [],
            },
          ],
        }),
      },
      {
        receipt_id: "RCPT_FABRIC",
        student_name: "Nguyen Van B",
      }
    );

    const raw = buffer.toString("latin1");
    assert.equal(buffer.subarray(0, 4).toString("latin1"), "%PDF");
    assert.ok(buffer.length > 1000);
    assert.match(raw, /\/Subtype\s*\/Image/);
  });

  it("falls back to the default PDF layout for invalid Fabric JSON", async () => {
    const buffer = await generatePdf(
      {
        type: "receipt",
        paper_size: "a4",
        orientation: "portrait",
        json_config: "{",
      },
      {
        receipt_id: "RCPT_FALLBACK",
        student_name: "Nguyen Van C",
        amount: 100000,
      }
    );

    assert.equal(buffer.subarray(0, 4).toString("latin1"), "%PDF");
    assert.ok(buffer.length > 1000);
  });

  it("skips unsupported Fabric image sources without failing generation", async () => {
    const buffer = await generatePdf(
      {
        type: "receipt",
        paper_size: "a4",
        orientation: "portrait",
        json_config: JSON.stringify({
          objects: [
            {
              type: "image",
              left: 20,
              top: 20,
              width: 40,
              height: 40,
              src: "data:image/png;base64,not-a-real-png",
            },
          ],
        }),
      },
      {
        receipt_id: "RCPT_UNSUPPORTED_IMAGE",
        amount: 50000,
      }
    );

    assert.equal(buffer.subarray(0, 4).toString("latin1"), "%PDF");
    assert.ok(buffer.length > 1000);
  });

  it("uses custom paper metadata stored in template JSON", async () => {
    const buffer = await generatePdf(
      {
        type: "receipt",
        paper_size: "a4",
        orientation: "portrait",
        json_config: JSON.stringify({
          paper: {
            mode: "custom",
            preset: "custom",
            width_mm: 120,
            height_mm: 180,
          },
          canvas: {
            width: 454,
            height: 680,
            unit: "px",
          },
          objects: [],
        }),
      },
      {
        receipt_id: "RCPT_CUSTOM_PAPER",
        amount: 120000,
      }
    );

    const raw = buffer.toString("latin1");
    assert.equal(buffer.subarray(0, 4).toString("latin1"), "%PDF");
    assert.match(raw, /\/MediaBox \[0 0 340\.2 510\.3\]/);
  });
});
