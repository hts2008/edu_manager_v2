import { Prisma } from "@prisma/client";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { correctReceiptInTransaction } from "../server/api/receipts/[id]/correct.js";

const correctionSource = readFileSync(
  new URL("../server/api/receipts/[id]/correct.ts", import.meta.url),
  "utf8",
);

const correctionContext = {
  actorId: "admin-1",
  ipAddress: "127.0.0.1",
  userAgent: "receipt-correction-test",
};

function createFixture({
  feeStatus = "paid",
  feeReceiptId = "receipt-1",
  existingLines = [],
  receiptLines = [],
}: {
  feeStatus?: string;
  feeReceiptId?: string | null;
  existingLines?: any[];
  receiptLines?: any[];
} = {}) {
  const calls: string[] = [];
  const activityLogs: any[] = [];
  const revisions: any[] = [];
  const receipt = {
    id: "receipt-1",
    studentId: "student-1",
    month: "2026-07",
    amount: 900_000,
    daysCount: 0,
    notes: null,
    deletedAt: null,
    receiptLines,
    monthlyFeeLines: [],
    monthlyFees: [] as any[],
  };
  const lines = existingLines.map((line) => ({
    monthlyFeeId: "fee-1",
    studentId: receipt.studentId,
    month: receipt.month,
    receiptLines: [],
    revisions: [],
    ...line,
  }));
  const protectionLines = lines.map((line) => ({
    ...line,
    receiptLines: [...line.receiptLines],
    revisions: [...line.revisions],
  }));
  const fee = {
    id: "fee-1",
    studentId: receipt.studentId,
    month: receipt.month,
    totalDays: 0,
    totalAmount: 900_000,
    status: feeStatus,
    receiptId: feeReceiptId,
    paidAt: feeStatus === "paid" ? new Date("2026-07-10T00:00:00.000Z") : null,
    notes: null,
    lines: protectionLines,
  };
  if (feeReceiptId === receipt.id) receipt.monthlyFees.push(fee);
  let identityReads = 0;

  const tx: any = {
    $queryRaw: async () => {
      calls.push("lock");
      return [];
    },
    receipt: {
      findFirst: async (args: any) => {
        if (args.select) {
          identityReads += 1;
          calls.push("identity");
          return identityReads === 1
            ? { studentId: receipt.studentId, month: receipt.month }
            : null;
        }
        calls.push("receipt.read");
        return receipt.deletedAt ? null : receipt;
      },
      update: async ({ data }: any) => {
        calls.push("receipt.update");
        Object.assign(receipt, data);
        return receipt;
      },
    },
    monthlyFee: {
      findUnique: async (args: any) => {
        calls.push("fee.read");
        if (args.where?.studentId_month) {
          return feeReceiptId === receipt.id
            ? null
            : { ...fee, lines: protectionLines };
        }
        return { ...fee, lines };
      },
      findUniqueOrThrow: async () => ({ ...fee, lines }),
      updateMany: async ({ where, data }: any) => {
        calls.push("fee.updateMany");
        const statusAllowed = typeof where.status === "string"
          ? fee.status === where.status
          : where.status?.in?.includes(fee.status);
        const receiptAllowed = where.receiptId === undefined || fee.receiptId === where.receiptId;
        const paidAtAllowed = where.paidAt === undefined || fee.paidAt === where.paidAt;
        if (!statusAllowed || !receiptAllowed || !paidAtAllowed) return { count: 0 };
        Object.assign(fee, data);
        return { count: 1 };
      },
      update: async ({ data }: any) => {
        calls.push("fee.update");
        Object.assign(fee, data);
        return { ...fee, lines };
      },
      create: async ({ data }: any) => {
        calls.push("fee.create");
        Object.assign(fee, data, { id: fee.id, lines: [] });
        return fee;
      },
    },
    monthlyFeeLine: {
      findUnique: async ({ where }: any) => {
        const key = where.studentId_month_allocationKey.allocationKey;
        return lines.find((line) => line.allocationKey === key) || null;
      },
      create: async ({ data }: any) => {
        calls.push("line.create");
        const line = { id: `line-${lines.length + 1}`, receiptLines: [], ...data };
        lines.push(line);
        return line;
      },
      update: async ({ where, data }: any) => {
        calls.push("line.update");
        const line = lines.find((item) => item.id === where.id);
        Object.assign(line, data);
        return line;
      },
      deleteMany: async ({ where }: any) => {
        calls.push("line.deleteMany");
        const activeKeys = new Set(where.allocationKey.notIn);
        for (let index = lines.length - 1; index >= 0; index -= 1) {
          if (!activeKeys.has(lines[index].allocationKey)) lines.splice(index, 1);
        }
        return { count: 0 };
      },
      findMany: async () => lines,
    },
    monthlyFeeLineRevision: {
      create: async ({ data }: any) => {
        calls.push("revision.create");
        revisions.push(data);
        return data;
      },
    },
    activityLog: {
      createMany: async ({ data }: any) => {
        calls.push("activity.createMany");
        activityLogs.push(...data);
        return { count: data.length };
      },
    },
  };

  return { activityLogs, calls, fee, lines, receipt, revisions, tx };
}

const calculated = {
  totalDays: 3,
  totalAmount: 900_000,
  breakdown: [
    {
      class_id: "class-a",
      class_name: "Class A",
      days_count: 2,
      expected_sessions: 4,
      fee_per_day: 300_000,
      amount: 600_000,
    },
    {
      class_id: "class-b",
      class_name: "Class B",
      days_count: 1,
      expected_sessions: 2,
      fee_per_day: 300_000,
      amount: 300_000,
    },
  ],
};

describe("receipt correction consistency", () => {
  it("rebuilds mutable fee lines and refreshes the aggregate in one locked transaction", async () => {
    const fixture = createFixture();

    const result = await correctReceiptInTransaction(
      fixture.tx,
      fixture.receipt.id,
      "Correct legacy zero-day receipt",
      { ...correctionContext, calculateFee: async () => calculated },
    );

    assert.ok(fixture.calls.indexOf("lock") < fixture.calls.indexOf("receipt.read"));
    assert.ok(fixture.calls.indexOf("receipt.read") < fixture.calls.indexOf("receipt.update"));
    assert.equal(fixture.receipt.deletedAt instanceof Date, true);
    assert.equal(fixture.lines.length, 2);
    assert.equal(
      fixture.lines.reduce((sum, line) => sum + line.chargedSessions, 0),
      result.fee.totalDays,
    );
    assert.equal(
      fixture.lines.reduce((sum, line) => sum + line.amount, 0),
      result.fee.totalAmount,
    );
    assert.equal(result.fee.status, "ready");
    assert.equal(result.fee.receiptId, null);
    assert.equal(result.fee.paidAt, null);
    assert.equal(fixture.revisions.length, 2);
    assert.equal(fixture.activityLogs.length, 2);
    assert.ok(fixture.calls.indexOf("revision.create") < fixture.calls.indexOf("activity.createMany"));
    assert.deepEqual(
      fixture.activityLogs.map((entry) => ({
        userId: entry.userId,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      })),
      [correctionContext, correctionContext].map(({ actorId, ...request }) => ({
        userId: actorId,
        ...request,
      })),
    );
  });

  it("records before and after snapshots for each materially changed fee line", async () => {
    const fixture = createFixture({
      feeStatus: "ready",
      feeReceiptId: null,
      existingLines: [{
        id: "line-existing",
        allocationKey: "class:class-a",
        classId: "class-a",
        classNameSnapshot: "Class A",
        chargedSessions: 1,
        expectedSessions: 4,
        feePerSession: 300_000,
        amount: 300_000,
        status: "ready",
        receiptId: null,
        paidAt: null,
        revisions: [{ revisionNumber: 3 }],
      }],
    });
    const reason = "Correct legacy zero-day receipt";

    await correctReceiptInTransaction(
      fixture.tx,
      fixture.receipt.id,
      reason,
      { ...correctionContext, calculateFee: async () => calculated },
    );

    const changed = fixture.revisions.find(
      (revision) => revision.monthlyFeeLineId === "line-existing",
    );
    assert.equal(changed.revisionNumber, 4);
    assert.equal(changed.eventType, "receipt_correction");
    assert.equal(changed.reason, reason);
    assert.equal(changed.actorId, correctionContext.actorId);
    assert.equal(changed.beforeSnapshot.amount, 300_000);
    assert.equal(changed.afterSnapshot.amount, 600_000);

    const created = fixture.revisions.find(
      (revision) => revision.monthlyFeeLineId !== "line-existing",
    );
    assert.equal(created.revisionNumber, 1);
    assert.equal(created.beforeSnapshot, Prisma.DbNull);
    assert.equal(created.afterSnapshot.amount, 300_000);
  });

  it("fails closed when the transactional activity audit cannot be written", async () => {
    const fixture = createFixture();
    fixture.tx.activityLog.createMany = async () => {
      throw new Error("audit unavailable");
    };

    await assert.rejects(
      correctReceiptInTransaction(
        fixture.tx,
        fixture.receipt.id,
        "Correct legacy zero-day receipt",
        { ...correctionContext, calculateFee: async () => calculated },
      ),
      /audit unavailable/,
    );
  });

  it("fails closed when rebuilding would delete an unauditable fee line", async () => {
    const fixture = createFixture({
      feeStatus: "ready",
      feeReceiptId: null,
      existingLines: [{
        id: "line-obsolete",
        allocationKey: "class:obsolete",
        classId: "obsolete",
        amount: 100_000,
        status: "ready",
        receiptId: null,
        paidAt: null,
      }],
    });

    await assert.rejects(
      correctReceiptInTransaction(
        fixture.tx,
        fixture.receipt.id,
        "Correct legacy zero-day receipt",
        { ...correctionContext, calculateFee: async () => calculated },
      ),
      (error: any) => error?.code === "MONTHLY_FEE_LINE_REVISION_REQUIRED",
    );
    assert.equal(fixture.revisions.length, 0);
    assert.equal(fixture.activityLogs.length, 0);
  });

  it("contains no out-of-transaction activity logger", () => {
    assert.doesNotMatch(correctionSource, /\blogActivity\b/);
  });

  for (const protectedStatus of ["confirmed", "paid", "cancelled"]) {
    it(`rejects a ${protectedStatus} fee line without voiding the receipt`, async () => {
      const fixture = createFixture({
        existingLines: [{
          id: "line-protected",
          allocationKey: "class:class-a",
          status: protectedStatus,
        }],
      });

      await assert.rejects(
        correctReceiptInTransaction(
          fixture.tx,
          fixture.receipt.id,
          "Correct legacy zero-day receipt",
          { ...correctionContext, calculateFee: async () => calculated },
        ),
        (error: any) => error?.code === "PROTECTED_FINANCE_STATE" && error?.status === 409,
      );
      assert.equal(fixture.receipt.deletedAt, null);
      assert.equal(fixture.calls.includes("fee.updateMany"), false);
    });
  }

  for (const protectedStatus of ["confirmed", "paid", "cancelled"]) {
    it(`rejects a ${protectedStatus} fallback aggregate not owned by the receipt`, async () => {
      const fixture = createFixture({ feeStatus: protectedStatus, feeReceiptId: null });

      await assert.rejects(
        correctReceiptInTransaction(
          fixture.tx,
          fixture.receipt.id,
          "Correct legacy zero-day receipt",
          { ...correctionContext, calculateFee: async () => calculated },
        ),
        (error: any) => error?.code === "PROTECTED_FINANCE_STATE" && error?.status === 409,
      );
      assert.equal(fixture.receipt.deletedAt, null);
      assert.equal(fixture.calls.includes("fee.updateMany"), false);
    });
  }

  it("rejects a receipt-line payment without mutating protected finance", async () => {
    const fixture = createFixture({ receiptLines: [{ id: "receipt-line-1" }] });

    await assert.rejects(
      correctReceiptInTransaction(
        fixture.tx,
        fixture.receipt.id,
        "Correct legacy zero-day receipt",
        { ...correctionContext, calculateFee: async () => calculated },
      ),
      (error: any) => error?.code === "PROTECTED_FINANCE_STATE" && error?.status === 409,
    );
    assert.equal(fixture.receipt.deletedAt, null);
    assert.equal(fixture.calls.includes("fee.updateMany"), false);
  });
});
