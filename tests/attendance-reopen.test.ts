import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  assertAttendancePeriodReopenSafe,
  reopenAttendancePeriod,
} from "../lib/attendance-lock.js";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("attendance period reopen", () => {
  it("refuses reopen with a typed conflict when protected class fee lines exist", async () => {
    const db = {
      monthlyFeeLine: {
        findFirst: async () => ({ id: "line-paid" }),
      },
    };

    await assert.rejects(
      assertAttendancePeriodReopenSafe("class-1", "2026-06", db as any),
      (error: any) => {
        assert.equal(error.code, "ATTENDANCE_REOPEN_FINANCIAL_CONFLICT");
        assert.equal(error.status, 409);
        return true;
      },
    );
  });

  it("reopens to genuinely editable open and writes the reason to the existing activity log", async () => {
    const calls: Array<{ kind: string; data: any }> = [];
    const db = {
      attendance: { findMany: async () => [{ studentId: "student-1" }] },
      $queryRaw: async () => [],
      monthlyFeeLine: { findFirst: async () => null },
      attendancePeriod: {
        updateMany: async ({ data }: any) => {
          calls.push({ kind: "period", data });
          return { count: 1 };
        },
        findUniqueOrThrow: async () => ({ id: "period-1", status: "open" }),
      },
      activityLog: {
        create: async ({ data }: any) => {
          calls.push({ kind: "audit", data });
          return data;
        },
      },
    };

    const period = await reopenAttendancePeriod(db as any, {
      periodId: "period-1",
      classId: "class-1",
      month: "2026-06",
      userId: "admin-1",
      reason: "Correct teacher entry",
      ipAddress: "127.0.0.1",
      userAgent: "test",
    });

    assert.equal(period.status, "open");
    assert.deepEqual(calls[0].data, {
      status: "open",
      submittedById: null,
      submittedAt: null,
      approvedById: null,
      approvedAt: null,
      lockedById: null,
      lockedAt: null,
    });
    assert.match(calls[1].data.action, /Correct teacher entry/);
    assert.equal(calls[1].data.entityType, "attendance_period");
    assert.equal(calls[1].data.entityId, "period-1");
  });

  it("keeps API and UI reason, authorization, conflict, disabled, and toast contracts aligned", () => {
    const api = source("server/api/attendance-periods/[id]/index.ts");
    const ui = source("frontend/src/pages/AttendancePage.jsx");

    assert.match(api, /case "unlock"/);
    assert.match(api, /req\.user\.role !== "admin"/);
    assert.match(api, /REOPEN_REASON_REQUIRED/);
    assert.match(api, /reopenAttendancePeriod/);
    assert.match(source("lib/attendance-lock.ts"), /acquireAttendanceFeeAdvisoryLocks/);
    assert.match(ui, /window\.prompt/);
    assert.match(ui, /reason\.trim\(\)/);
    assert.match(ui, /reopeningMonth/);
    assert.match(ui, /disabled=\{reopeningMonth === key\}/);
    assert.match(ui, /res\.error\?\.message/);
    assert.match(ui, /datePeriodStatus !== "open"/);
  });
});
