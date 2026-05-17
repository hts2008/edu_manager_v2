import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generatePdf, numberToWords } from "../lib/pdf.js";

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
});
