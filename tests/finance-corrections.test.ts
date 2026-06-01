import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCorrectionNote,
  detectMonthlyFeeAnomaly,
  detectReceiptAnomaly,
  isCorrectionNote,
} from "../lib/finance-corrections.js";

describe("finance correction policy", () => {
  it("flags positive receipts with zero chargeable sessions", () => {
    assert.equal(
      detectReceiptAnomaly({ amount: 6000000, daysCount: 0 }),
      "RECEIPT_WITH_ZERO_DAYS"
    );
    assert.equal(detectReceiptAnomaly({ amount: 0, daysCount: 0 }), null);
    assert.equal(detectReceiptAnomaly({ amount: 600000, daysCount: 6 }), null);
  });

  it("flags paid monthly fees with positive amount and zero days", () => {
    assert.equal(
      detectMonthlyFeeAnomaly({
        status: "paid",
        totalAmount: 6000000,
        totalDays: 0,
      }),
      "PAID_WITH_ZERO_DAYS"
    );
    assert.equal(
      detectMonthlyFeeAnomaly({
        status: "ready",
        totalAmount: 6000000,
        totalDays: 0,
      }),
      null
    );
  });

  it("marks correction notes so receipts cannot be restored silently", () => {
    const note = buildCorrectionNote("Old note", {
      originalReceiptId: "receipt-1",
      reason: "operator audit",
    });

    assert.match(note, /Old note/);
    assert.match(note, /\[CORRECTION\] Voided receipt receipt-1/);
    assert.equal(isCorrectionNote(note), true);
    assert.equal(isCorrectionNote("manual delete"), false);
  });
});
