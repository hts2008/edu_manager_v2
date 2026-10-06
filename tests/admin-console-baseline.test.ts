import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildAdminConsoleBaseline,
  canonicalJson,
  createPrismaBaselineReader,
  monthWindow,
  type AdminConsoleBaseline,
  type BaselineReader,
} from "../scripts/capture-baseline.js";
import { compareAdminConsoleBaselines } from "../scripts/compare-admin-console-baseline.js";

const TENANT_ID = "tenant-a";
const AS_OF = "2026-08-14T00:00:00.000Z";

function reader(overrides: Partial<BaselineReader> = {}): BaselineReader {
  return {
    async tenantExists(tenantId) {
      assert.equal(tenantId, TENANT_ID);
      return true;
    },
    async readMonthlyFees(tenantId, months) {
      assert.equal(tenantId, TENANT_ID);
      assert.equal(months.length, 12);
      return [
        { month: "2026-08", totalAmount: 900_000, status: "paid" },
        { month: "2026-08", totalAmount: 600_000, status: "ready" },
      ];
    },
    async readReceipts() {
      return [{ month: "2026-08", amount: 900_000 }];
    },
    async readPayments() {
      return [{ createdAt: new Date("2026-08-10T12:00:00.000Z"), amount: 125_000 }];
    },
    async readProgressMonths() {
      return [
        {
          studentId: "student-b",
          classId: "class-b",
          month: "2026-08",
          progressScore: 75.25,
          attendanceScore: 80,
          consistencyScore: 70,
          learningEvidenceCoverage: 60,
          dailyAssessmentCount: 4,
          finalizedAt: null,
          academicInputStatus: "partial",
        },
        {
          studentId: "student-a",
          classId: "class-a",
          month: "2026-08",
          progressScore: 85.75,
          attendanceScore: 90,
          consistencyScore: 88,
          learningEvidenceCoverage: 100,
          dailyAssessmentCount: 8,
          finalizedAt: new Date("2026-08-31T00:00:00.000Z"),
          academicInputStatus: "complete",
        },
      ];
    },
    async readDefaultTemplates() {
      return [
        {
          type: "receipt",
          paperSize: "a5",
          orientation: "portrait",
          jsonConfig: { z: 1, nested: { b: 2, a: 1 } },
        },
      ];
    },
    ...overrides,
  };
}

function cloneBaseline(value: AdminConsoleBaseline): AdminConsoleBaseline {
  return JSON.parse(JSON.stringify(value)) as AdminConsoleBaseline;
}

describe("Admin Console zero-override baseline", () => {
  it("builds an inclusive 12-month window across year boundaries", () => {
    assert.deepEqual(monthWindow(12, new Date(AS_OF)), [
      "2025-09", "2025-10", "2025-11", "2025-12",
      "2026-01", "2026-02", "2026-03", "2026-04",
      "2026-05", "2026-06", "2026-07", "2026-08",
    ]);
  });

  it("captures deterministic tenant-scoped finance, academic, and PDF inputs", async () => {
    const baseline = await buildAdminConsoleBaseline(reader(), {
      tenantId: TENANT_ID,
      asOf: new Date(AS_OF),
      capturedAt: "2026-08-14T01:00:00.000Z",
    });

    assert.equal(baseline.schema, "edu-manager.admin-console-baseline");
    assert.equal(baseline.version, 1);
    assert.equal(baseline.tenantId, TENANT_ID);
    assert.equal(baseline.canonical.finance.months.length, 12);
    assert.deepEqual(baseline.canonical.finance.months.at(-1), {
      month: "2026-08",
      assessedTotal: "1500000.00",
      paidFeeTotal: "900000.00",
      receiptTotal: "900000.00",
      expenseTotal: "125000.00",
      outstandingTotal: "600000.00",
    });
    assert.equal(baseline.canonical.academic.month, "2026-08");
    assert.equal(baseline.canonical.academic.summary.records, 2);
    assert.equal(baseline.canonical.academic.summary.averageProgressScore, "80.50");
    assert.deepEqual(
      baseline.canonical.academic.students.map((row) => row.studentId),
      ["student-a", "student-b"],
    );
    assert.match(baseline.canonical.pdfTemplates[0]?.inputChecksum ?? "", /^[a-f0-9]{64}$/);

    const recaptured = await buildAdminConsoleBaseline(reader(), {
      tenantId: TENANT_ID,
      asOf: new Date(AS_OF),
      capturedAt: "2026-08-14T02:00:00.000Z",
    });
    assert.equal(canonicalJson(baseline.canonical), canonicalJson(recaptured.canonical));
  });

  it("applies tenant filters to every Prisma read and uses no mutation delegate", async () => {
    const calls: Array<{ model: string; args: any }> = [];
    const findMany = (model: string, result: unknown[]) => async (args: any) => {
      calls.push({ model, args });
      return result;
    };
    const db = {
      tenant: { findUnique: async (args: any) => (calls.push({ model: "tenant", args }), { id: TENANT_ID }) },
      monthlyFee: { findMany: findMany("monthlyFee", []) },
      receipt: { findMany: findMany("receipt", []) },
      payment: { findMany: findMany("payment", []) },
      studentProgressMonth: { findMany: findMany("studentProgressMonth", []) },
      template: { findMany: findMany("template", []) },
    };

    await buildAdminConsoleBaseline(createPrismaBaselineReader(db), {
      tenantId: TENANT_ID,
      asOf: new Date(AS_OF),
      capturedAt: AS_OF,
    });

    assert.equal(calls.length, 6);
    assert.equal(calls[0]?.args.where.id, TENANT_ID);
    for (const call of calls.slice(1)) {
      assert.equal(call.args.where.tenantId, TENANT_ID, `${call.model} must be tenant scoped`);
    }
    assert.deepEqual(Object.keys(db).sort(), [
      "monthlyFee", "payment", "receipt", "studentProgressMonth", "template", "tenant",
    ]);
  });

  it("returns an exact zero diff when only capture timestamps differ", async () => {
    const before = await buildAdminConsoleBaseline(reader(), {
      tenantId: TENANT_ID,
      asOf: new Date(AS_OF),
      capturedAt: "2026-08-14T01:00:00.000Z",
    });
    const after = cloneBaseline(before);
    after.capturedAt = "2026-08-14T05:00:00.000Z";

    assert.deepEqual(compareAdminConsoleBaselines(before, after), {
      schema: "edu-manager.admin-console-baseline-comparison",
      version: 1,
      tenantId: TENANT_ID,
      matches: true,
      driftCount: 0,
      drifts: [],
    });
  });

  it("fails closed with field-level drift for finance, academic, or PDF inputs", async () => {
    const before = await buildAdminConsoleBaseline(reader(), {
      tenantId: TENANT_ID,
      asOf: new Date(AS_OF),
      capturedAt: AS_OF,
    });
    const after = cloneBaseline(before);
    after.canonical.finance.months[11]!.receiptTotal = "900001.00";
    after.canonical.academic.students[0]!.progressScore = "85.76";
    after.canonical.pdfTemplates[0]!.inputChecksum = "0".repeat(64);

    const comparison = compareAdminConsoleBaselines(before, after);
    assert.equal(comparison.matches, false);
    assert.equal(comparison.driftCount, 3);
    assert.deepEqual(comparison.drifts.map((item) => item.path), [
      "canonical.academic.students[0].progressScore",
      "canonical.finance.months[11].receiptTotal",
      "canonical.pdfTemplates[0].inputChecksum",
    ]);
  });

  it("rejects tenant or schema mismatches instead of comparing unrelated snapshots", async () => {
    const before = await buildAdminConsoleBaseline(reader(), {
      tenantId: TENANT_ID,
      asOf: new Date(AS_OF),
      capturedAt: AS_OF,
    });
    const otherTenant = cloneBaseline(before);
    otherTenant.tenantId = "tenant-b";
    assert.throws(() => compareAdminConsoleBaselines(before, otherTenant), /tenant mismatch/i);
  });

  it("returns process exit 0 for an exact match and exit 2 for drift", async () => {
    const before = await buildAdminConsoleBaseline(reader(), {
      tenantId: TENANT_ID,
      asOf: new Date(AS_OF),
      capturedAt: AS_OF,
    });
    const changed = cloneBaseline(before);
    changed.capturedAt = "2026-08-14T03:00:00.000Z";
    changed.canonical.finance.months[0]!.assessedTotal = "1.00";

    const directory = mkdtempSync(path.join(tmpdir(), "edu-admin-baseline-"));
    try {
      const baselinePath = path.join(directory, "baseline.json");
      const matchingPath = path.join(directory, "matching.json");
      const changedPath = path.join(directory, "changed.json");
      writeFileSync(baselinePath, JSON.stringify(before));
      writeFileSync(matchingPath, JSON.stringify(before));
      writeFileSync(changedPath, JSON.stringify(changed));

      const tsxCli = fileURLToPath(new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url));
      const compareCli = fileURLToPath(new URL("../scripts/compare-admin-console-baseline.ts", import.meta.url));
      const run = (current: string) => spawnSync(
        process.execPath,
        [tsxCli, compareCli, "--baseline", baselinePath, "--current", current],
        { encoding: "utf8" },
      );

      const matching = run(matchingPath);
      assert.equal(matching.status, 0, matching.stderr);
      assert.equal(JSON.parse(matching.stdout).driftCount, 0);

      const drifted = run(changedPath);
      assert.equal(drifted.status, 2, drifted.stderr);
      assert.equal(JSON.parse(drifted.stdout).driftCount, 1);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
