import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { simulateSettingsDryRun } from "../server/api/admin/settings/simulate.js";

test("settings simulation is registered, permission guarded, and dry-run only", async () => {
  const router = readFileSync("api/router.ts", "utf8");
  const endpoint = readFileSync("server/api/admin/settings/simulate.ts", "utf8");

  assert.match(router, /adminSettingsSimulate/);
  assert.match(router, /\["admin", "settings", "simulate"\]/);
  assert.match(endpoint, /requirePermission\("console\.access"/);
  assert.doesNotMatch(endpoint, /\.(?:create|update|upsert|delete|deleteMany|updateMany)\s*\(/);

  const reads: string[] = [];
  const db = {
    class: {
      findFirst: async () => {
        reads.push("class.findFirst");
        return {
          id: "class-a",
          className: "Flyers",
          feePerDay: 900_000,
          billingPolicy: "monthly_prorated",
          scheduleDays: [3, 5],
          sessionsPerWeek: 2,
        };
      },
    },
    enrollmentPeriod: { findMany: async () => (reads.push("enrollmentPeriod.findMany"), []) },
    studentClass: { findMany: async () => (reads.push("studentClass.findMany"), []) },
    classSession: { findMany: async () => (reads.push("classSession.findMany"), []) },
    attendance: { findMany: async () => (reads.push("attendance.findMany"), []) },
    classMonthPlan: { findFirst: async () => (reads.push("classMonthPlan.findFirst"), null) },
    studentProgressMonth: { findMany: async () => (reads.push("studentProgressMonth.findMany"), []) },
  };

  const result = await simulateSettingsDryRun(db as any, {
    tenantId: "tenant-a",
    classId: "class-a",
    month: "2026-08",
    currentSettings: [],
    draftSettings: [],
  });

  assert.deepEqual(result.rows, []);
  assert.equal(result.dry_run, true);
  assert.ok(reads.length >= 7);
});

test("settings simulation scopes every read and reports finance deltas without writes", async () => {
  const scopedReads: Array<{ model: string; where: Record<string, unknown> }> = [];
  const scoped = (model: string, value: unknown) => async (args: any) => {
    scopedReads.push({ model, where: args.where });
    return value;
  };
  const session = {
    id: "session-a",
    classId: "class-a",
    billingMonth: "2026-08",
    sessionDate: new Date("2026-08-05T00:00:00.000Z"),
    kind: "regular",
    status: "held",
    extraFeeMode: "included",
    replacementForId: null,
  };
  const db = {
    class: {
      findFirst: scoped("class", {
        id: "class-a",
        className: "Flyers",
        feePerDay: 900_000,
        billingPolicy: "monthly_prorated",
        scheduleDays: [3, 5],
        sessionsPerWeek: 2,
      }),
    },
    enrollmentPeriod: {
      findMany: scoped("enrollmentPeriod", [{
        studentId: "student-a",
        student: { id: "student-a", fullName: "Student A" },
        startedAt: new Date("2026-01-01T00:00:00.000Z"),
        endedAt: null,
      }]),
    },
    studentClass: { findMany: scoped("studentClass", []) },
    classSession: { findMany: scoped("classSession", [session]) },
    attendance: {
      findMany: scoped("attendance", [{
        studentId: "student-a",
        classId: "class-a",
        classSessionId: "session-a",
        attendanceDate: session.sessionDate,
        status: "absent_with_fee",
        isMakeUp: false,
      }]),
    },
    classMonthPlan: {
      findFirst: scoped("classMonthPlan", {
        expectedSessions: 1,
        snapshot: null,
      }),
    },
    studentProgressMonth: { findMany: scoped("studentProgressMonth", []) },
  };

  const result = await simulateSettingsDryRun(db as any, {
    tenantId: "tenant-a",
    classId: "class-a",
    month: "2026-08",
    currentSettings: [{
      key: "finance.chargeable_statuses",
      value: ["present", "absent_with_fee"],
    }],
    draftSettings: [{ key: "finance.chargeable_statuses", value: ["present"] }],
  });

  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].finance.old.amount, 900_000);
  assert.equal(result.rows[0].finance.new.amount, 0);
  assert.equal(result.rows[0].finance.delta.amount, -900_000);
  assert.ok(scopedReads.every((read) => read.where.tenantId === "tenant-a"));
});
