import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { generateMonthlyFees } from "../lib/monthly-fee-generator.js";
import { runMonthlyFeeCron } from "../server/api/cron/monthly-fees.js";

describe("monthly fee cron tenant orchestration", () => {
  it("runs once per active tenant with isolated clients and month-effective settings", async () => {
    const tenantQueries: any[] = [];
    const rootDb = {
      tenant: {
        findMany: async (query: any) => {
          tenantQueries.push(query);
          return [
            { id: "tenant-a", slug: "alpha" },
            { id: "tenant-b", slug: "beta" },
          ];
        },
      },
    };
    const tenantClients = new Map([
      ["tenant-a", { marker: "db-a" }],
      ["tenant-b", { marker: "db-b" }],
    ]);
    const resolvedClients: string[] = [];
    const settingsCalls: any[] = [];
    const generatorCalls: any[] = [];

    const result = await runMonthlyFeeCron({
      rootDb,
      month: "2026-09",
      dryRun: false,
      getTenantDb: (tenantId: string) => {
        resolvedClients.push(tenantId);
        return tenantClients.get(tenantId);
      },
      loadSettings: async (db: any, input: any) => {
        settingsCalls.push({ db, input });
        return { tenant: input.tenantId } as any;
      },
      generate: async (db: any, input: any) => {
        generatorCalls.push({ db, input });
        return {
          month: input.month,
          summary: {
            dry_run: input.dryRun,
            total_students: 1,
            created: 1,
            updated: 0,
            skipped: 0,
            would_create: 0,
            would_update: 0,
            total_amount: input.tenantId === "tenant-a" ? 900_000 : 750_000,
          },
          items: [{ student_id: `${input.tenantId}-student` }],
        };
      },
    });

    assert.deepEqual(tenantQueries, [{
      where: { status: "active" },
      select: { id: true, slug: true },
      orderBy: { id: "asc" },
    }]);
    assert.deepEqual(resolvedClients, ["tenant-a", "tenant-b"]);
    assert.deepEqual(settingsCalls, [
      {
        db: tenantClients.get("tenant-a"),
        input: { tenantId: "tenant-a", effectiveMonth: "2026-09" },
      },
      {
        db: tenantClients.get("tenant-b"),
        input: { tenantId: "tenant-b", effectiveMonth: "2026-09" },
      },
    ]);
    assert.equal(generatorCalls.length, 2);
    for (const call of generatorCalls) {
      assert.equal(call.db, tenantClients.get(call.input.tenantId));
      assert.equal(call.input.month, "2026-09");
      assert.equal(call.input.dryRun, false);
      assert.deepEqual(call.input.settings, { tenant: call.input.tenantId });
    }
    assert.equal(result.total_tenants, 2);
    assert.equal(result.total_students, 2);
    assert.equal(result.created, 2);
    assert.equal(result.total_amount, 1_650_000);
    assert.deepEqual(
      result.tenants.map((tenant: any) => tenant.tenant_id),
      ["tenant-a", "tenant-b"],
    );
    assert.deepEqual(
      result.items.map((item: any) => [item.tenant_id, item.student_id]),
      [
        ["tenant-a", "tenant-a-student"],
        ["tenant-b", "tenant-b-student"],
      ],
    );
  });

  it("preserves registry defaults when a tenant has no overrides", async () => {
    const defaultSettings = { source: "registry-default" } as any;
    let receivedSettings: any;

    await runMonthlyFeeCron({
      rootDb: {
        tenant: {
          findMany: async () => [{ id: "tenant-default", slug: "default" }],
        },
      },
      month: "2026-10",
      dryRun: true,
      getTenantDb: () => ({ marker: "default-db" }),
      loadSettings: async () => defaultSettings,
      generate: async (_db: any, input: any) => {
        receivedSettings = input.settings;
        return {
          summary: {
            dry_run: true,
            total_students: 0,
            created: 0,
            updated: 0,
            skipped: 0,
            would_create: 0,
            would_update: 0,
            total_amount: 0,
          },
          items: [],
        };
      },
    });

    assert.equal(receivedSettings, defaultSettings);
  });

  it("uses tenant composite identity and writes tenantId on every aggregate fee", async () => {
    const tenantId = "tenant-a";
    const month = "2026-09";
    const classRow = {
      id: "class-a",
      className: "Flyers A",
      billingPolicy: "monthly_prorated",
      feePerDay: 900_000,
      sessionsPerWeek: 1,
      scheduleDays: [3],
      teacher: { fullName: "Teacher A" },
    };
    const studentRow = {
      id: "student-a",
      fullName: "Student A",
      deletedAt: null,
      monthlyFees: [],
      enrollmentPeriods: [{
        classId: classRow.id,
        startedAt: new Date("2026-09-01T00:00:00.000Z"),
        endedAt: null,
        class: classRow,
      }],
      studentClasses: [],
    };
    const session = {
      id: "session-a",
      classId: classRow.id,
      sessionDate: new Date("2026-09-02T00:00:00.000Z"),
      billingMonth: month,
      kind: "regular",
      status: "held",
      extraFeeMode: "included",
      replacementForId: null,
    };
    const attendance = {
      studentId: studentRow.id,
      classId: classRow.id,
      classSessionId: session.id,
      attendanceDate: session.sessionDate,
      status: "present",
    };
    const feeIdentityQueries: any[] = [];
    const createdFees: any[] = [];
    const tx: any = {
      $queryRaw: async () => [],
      student: { findUnique: async () => studentRow },
      classSession: { findMany: async () => [session] },
      attendance: { findMany: async () => [attendance] },
      attendancePeriod: {
        findMany: async () => [{ classId: classRow.id, status: "locked" }],
      },
      classMonthPlan: {
        findMany: async () => [{ classId: classRow.id, state: "frozen" }],
      },
      monthlyFee: {
        findUnique: async ({ where }: any) => {
          feeIdentityQueries.push(where);
          return null;
        },
        create: async ({ data }: any) => {
          createdFees.push(data);
          return { id: "fee-a", ...data };
        },
      },
      monthlyFeeLine: {
        findUnique: async () => null,
        create: async ({ data }: any) => ({ id: "line-a", tenantId, ...data }),
        deleteMany: async () => ({ count: 0 }),
      },
    };
    const db: any = {
      student: { findMany: async () => [studentRow] },
      $transaction: async (work: (client: any) => unknown) => work(tx),
    };

    const result = await generateMonthlyFees(db, {
      tenantId,
      month,
      dryRun: false,
    });

    assert.equal(result.summary.created, 1);
    assert.deepEqual(createdFees, [{
      tenantId,
      studentId: studentRow.id,
      month,
      totalDays: 1,
      totalAmount: 900_000,
      status: "ready",
    }]);
    assert.deepEqual(feeIdentityQueries[0], {
      tenantId_studentId_month: { tenantId, studentId: studentRow.id, month },
    });
  });
});
