import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { assertAggregatePaymentAllowed } from "../server/api/monthly-fees/[id]/pay.js";
import { assertAggregateReceiptAllowed } from "../server/api/receipts/index.js";
import { generateMonthlyFees } from "../lib/monthly-fee-generator.js";
import { feeToDto } from "../server/api/parent-portal/me.js";
import { classLineToDto } from "../server/api/reports/student-fees.js";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("strict class-line ledger", () => {
  it("rejects aggregate collection paths when a class line exists", () => {
    for (const guard of [assertAggregatePaymentAllowed, assertAggregateReceiptAllowed]) {
      assert.throws(
        () => guard({ lines: [{ id: "line-1" }] }),
        (error: any) => error.code === "CLASS_LINE_PAYMENT_REQUIRED" && error.status === 409
      );
      assert.doesNotThrow(() => guard({ lines: [] }));
    }
    assert.doesNotThrow(() => assertAggregateReceiptAllowed(null));
    assert.match(source("server/api/monthly-fees/[id]/pay.ts"), /lines:\s*\{/);
    assert.match(source("server/api/receipts/index.ts"), /lines:\s*\{/);
  });

  it("creates the aggregate and all class lines inside one transaction", async () => {
    const calls: string[] = [];
    const tx: any = {
      monthlyFee: {
        create: async ({ data }: any) => {
          calls.push("fee.create");
          return { id: "fee-1", ...data };
        },
      },
      monthlyFeeLine: {
        findUnique: async () => null,
        create: async ({ data }: any) => {
          calls.push(`line.create:${data.classId}`);
          return { id: `line-${data.classId}`, ...data };
        },
        deleteMany: async () => {
          calls.push("line.deleteMany");
          return { count: 0 };
        },
      },
    };
    const prisma: any = {
      student: {
        findMany: async () => [{
          id: "student-1",
          fullName: "Student One",
          monthlyFees: [],
          studentClasses: [
            { classId: "math", class: { className: "Math", feePerDay: 500000, sessionsPerWeek: 2, teacher: { fullName: "Teacher M" } } },
            { classId: "english", class: { className: "English", feePerDay: 400000, sessionsPerWeek: 1, teacher: { fullName: "Teacher E" } } },
          ],
        }],
      },
      attendance: {
        groupBy: async () => [
          { studentId: "student-1", classId: "math", _count: { id: 2 } },
          { studentId: "student-1", classId: "english", _count: { id: 1 } },
        ],
      },
      $transaction: async (work: any) => {
        calls.push("transaction.begin");
        const result = await work(tx);
        calls.push("transaction.commit");
        return result;
      },
    };

    const result = await generateMonthlyFees(prisma, { month: "2026-07", dryRun: false });

    assert.deepEqual(calls, [
      "transaction.begin",
      "fee.create",
      "line.create:math",
      "line.create:english",
      "line.deleteMany",
      "transaction.commit",
    ]);
    assert.equal(result.items[0].action, "created");
    assert.equal(result.items[0].total_days, 3);
  });

  it("updates an existing unpaid class line in the aggregate transaction", async () => {
    const updates: any[] = [];
    const existingFee = { id: "fee-1", studentId: "student-1", month: "2026-07", status: "ready", totalDays: 1, totalAmount: 50000 };
    const tx: any = {
      monthlyFee: {
        updateMany: async () => ({ count: 1 }),
        findUniqueOrThrow: async () => existingFee,
      },
      monthlyFeeLine: {
        findUnique: async () => ({ id: "line-math", status: "ready", receiptId: null, paidAt: null }),
        update: async ({ data }: any) => {
          updates.push(data);
          return { id: "line-math", ...data };
        },
        deleteMany: async () => ({ count: 0 }),
      },
    };
    const prisma: any = {
      student: { findMany: async () => [{
        id: "student-1",
        fullName: "Student One",
        monthlyFees: [existingFee],
        studentClasses: [{ classId: "math", class: { className: "Math", feePerDay: 500000, sessionsPerWeek: 2, teacher: null } }],
      }] },
      attendance: { groupBy: async () => [{ studentId: "student-1", classId: "math", _count: { id: 3 } }] },
      $transaction: async (work: any) => work(tx),
    };

    const result = await generateMonthlyFees(prisma, { month: "2026-07", dryRun: false });

    assert.equal(result.items[0].action, "updated");
    assert.equal(updates.length, 1);
    assert.equal(updates[0].classId, "math");
    assert.equal(updates[0].chargedSessions, 3);
    assert.equal(updates[0].status, "ready");
  });

  it("exposes independent per-class payment status in parent and report DTOs", () => {
    const lines = [
      { id: "line-paid", classId: "math", classNameSnapshot: "Math", chargedSessions: 2, expectedSessions: 8, feePerSession: 50000, amount: 100000, status: "paid", receiptId: "receipt-1", paidAt: new Date("2026-07-10") },
      { id: "line-ready", classId: "english", classNameSnapshot: "English", chargedSessions: 1, expectedSessions: 4, feePerSession: 100000, amount: 100000, status: "ready", receiptId: null, paidAt: null },
    ];
    const parentFee = feeToDto({ id: "fee-1", studentId: "student-1", month: "2026-07", totalDays: 3, totalAmount: 200000, status: "ready", receiptId: null, paidAt: null, lines });

    assert.deepEqual(parentFee.lines.map((line: any) => line.status), ["paid", "ready"]);
    assert.equal(classLineToDto(lines[0]).paid_amount, 100000);
    assert.equal(classLineToDto(lines[0]).outstanding_amount, 0);
    assert.equal(classLineToDto(lines[1]).paid_amount, 0);
    assert.equal(classLineToDto(lines[1]).outstanding_amount, 100000);
  });
});
