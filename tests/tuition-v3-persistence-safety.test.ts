import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isProtectedMonthlyFee,
  isProtectedMonthlyFeeLine,
  refreshMonthlyFeeAggregateFromLines,
  syncMonthlyFeeLines,
} from "../lib/monthly-fee-lines.js";

describe("Tuition V3 persistence safety", () => {
  it("protects confirmed, paid, receipt-linked, and receipt-line-linked fee lines", () => {
    assert.equal(isProtectedMonthlyFeeLine({ status: "confirmed" }), true);
    assert.equal(isProtectedMonthlyFeeLine({ status: "paid" }), true);
    assert.equal(isProtectedMonthlyFeeLine({ status: "ready", receiptId: "receipt-1" }), true);
    assert.equal(isProtectedMonthlyFeeLine({ status: "ready", receiptLines: [{ id: "line-1" }] }), true);
    assert.equal(isProtectedMonthlyFeeLine({ status: "ready" }), false);
  });

  it("protects confirmed, paid, and receipt-linked aggregates", () => {
    assert.equal(isProtectedMonthlyFee({ status: "confirmed" }), true);
    assert.equal(isProtectedMonthlyFee({ status: "paid" }), true);
    assert.equal(isProtectedMonthlyFee({ status: "ready", receiptId: "receipt-1" }), true);
    assert.equal(isProtectedMonthlyFee({
      status: "ready",
      lines: [{ status: "ready", receiptLines: [{ id: "receipt-line-1" }] }],
    }), true);
    assert.equal(isProtectedMonthlyFee({ status: "ready" }), false);
  });

  it("does not update a protected line and excludes protected lines from cleanup", async () => {
    const calls: any[] = [];
    const protectedLine = { id: "line-1", status: "confirmed", receiptLines: [] };
    const client = {
      monthlyFeeLine: {
        findUnique: async () => protectedLine,
        update: async () => { throw new Error("must not update"); },
        create: async () => { throw new Error("must not create"); },
        deleteMany: async (args: any) => { calls.push(args); return { count: 0 }; },
      },
    };
    const result = await syncMonthlyFeeLines(client, { id: "fee-1", studentId: "student-1", month: "2026-07" }, [
      { class_id: "class-1", amount: 500000 },
    ]);
    assert.deepEqual(result, [protectedLine]);
    assert.deepEqual(calls[0].where.status, { notIn: ["confirmed", "paid"] });
    assert.deepEqual(calls[0].where.receiptLines, { none: {} });
  });

  it("does not refresh a protected aggregate", async () => {
    let updated = false;
    const fee = { id: "fee-1", status: "confirmed" };
    const client = {
      monthlyFee: {
        findUnique: async () => fee,
        update: async () => { updated = true; },
      },
      monthlyFeeLine: { findMany: async () => [{ status: "ready", amount: 1 }] },
    };
    assert.equal(await refreshMonthlyFeeAggregateFromLines(client, fee.id), fee);
    assert.equal(updated, false);
  });
});
