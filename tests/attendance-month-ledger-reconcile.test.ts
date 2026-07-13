import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { runClassMonthPlanBackfill } from "../scripts/backfill-class-month-plans.js";
import {
  findEnrollmentStartCorrections,
  parseReconciliationArgs,
  runAttendanceMonthLedgerReconciliation,
} from "../scripts/reconcile-attendance-month-ledger.js";

const migrationSource = readFileSync(
  new URL("../prisma/migrations/20260713_class_month_plans/migration.sql", import.meta.url),
  "utf8",
);
const revisionGuardMigrationSource = readFileSync(
  new URL(
    "../prisma/migrations/20260713_zz_class_month_plan_revision_state_guard/migration.sql",
    import.meta.url,
  ),
  "utf8",
);
const backfillSource = readFileSync(
  new URL("../scripts/backfill-class-month-plans.ts", import.meta.url),
  "utf8",
);
const reconciliationSource = readFileSync(
  new URL("../scripts/reconcile-attendance-month-ledger.ts", import.meta.url),
  "utf8",
);

describe("ClassMonthPlan migration safety", () => {
  it("is rerunnable and avoids stable-only date formatting in CHECK constraints", () => {
    assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS "class_month_plans"/);
    assert.match(migrationSource, /CREATE (?:UNIQUE )?INDEX IF NOT EXISTS/);
    assert.match(migrationSource, /CREATE OR REPLACE FUNCTION/);
    assert.match(migrationSource, /class_sessions_session_month_check[\s\S]*CASE[\s\S]*EXTRACT\(YEAR FROM "session_date"\)/);
    assert.doesNotMatch(
      migrationSource,
      /class_sessions_session_month_check[\s\S]{0,600}to_char\(/,
    );
    assert.match(
      revisionGuardMigrationSource,
      /NEW\."state" IS DISTINCT FROM OLD\."state"[\s\S]*NEW\."revision" <= OLD\."revision"/,
    );
    assert.doesNotMatch(
      revisionGuardMigrationSource,
      /OLD\."state" = 'frozen'[\s\S]*cannot transition/,
    );
  });
});

describe("ClassMonthPlan backfill safety", () => {
  it("leaves entity IDs to Prisma CUID defaults and never mutates protected fee models", () => {
    assert.match(backfillSource, /classMonthPlan\.upsert/);
    assert.doesNotMatch(backfillSource, /\bid:\s*(?:randomUUID|randomBytes|runId)/);
    assert.match(reconciliationSource, /const runId = `attendance-month-ledger-/);
    assert.doesNotMatch(
      reconciliationSource,
      /(?:monthlyFee|monthlyFeeLine|receipt|receiptLine)\.(?:create|update|updateMany|delete|deleteMany|upsert)/,
    );
  });

  it("reports a protected-finance fingerprint in default dry-run mode", async () => {
    let transactions = 0;
    const db = {
      classSession: {
        findMany: async () => [{ classId: "class-1", billingMonth: "2026-07" }],
      },
      attendancePeriod: { findMany: async () => [] },
      classMonthPlan: { findMany: async () => [] },
      $queryRaw: async () => [{ fingerprint: "finance-before", row_count: "3" }],
      $transaction: async () => {
        transactions += 1;
      },
    };

    const result = await runClassMonthPlanBackfill(db as any, []);

    assert.equal(result.mode, "dry-run");
    assert.equal(result.protected_finance_fingerprint, "finance-before");
    assert.equal(result.protected_finance_rows, "3");
    assert.equal(transactions, 0);
  });
});

describe("attendance month-ledger reconciliation arguments", () => {
  it("requires an explicit class and valid month while keeping dry-run as default", () => {
    assert.deepEqual(
      parseReconciliationArgs(["--class-id=class-1", "--month=2026-07"]),
      {
        apply: false,
        actorId: null,
        classId: "class-1",
        month: "2026-07",
        reason: null,
      },
    );
    assert.throws(() => parseReconciliationArgs(["--month=2026-07"]), /--class-id/);
    assert.throws(
      () => parseReconciliationArgs(["--class-id=class-1", "--month=2026-13"]),
      /--month=YYYY-MM/,
    );
  });

  it("requires reason and actor identity before apply", () => {
    assert.throws(
      () => parseReconciliationArgs(["--class-id=class-1", "--month=2026-07", "--apply"]),
      /--reason/,
    );
    assert.throws(
      () => parseReconciliationArgs([
        "--class-id=class-1",
        "--month=2026-07",
        "--apply",
        "--reason=remove phantom sessions",
      ]),
      /--actor-id/,
    );
  });

  it("rejects unknown and duplicate arguments so operator typos cannot widen intent", () => {
    assert.throws(
      () => parseReconciliationArgs([
        "--class-id=class-1",
        "--month=2026-07",
        "--mont=2026-06",
      ]),
      /Unknown argument: --mont=2026-06/,
    );
    assert.throws(
      () => parseReconciliationArgs([
        "--class-id=class-1",
        "--class-id=class-2",
        "--month=2026-07",
      ]),
      /Duplicate argument: --class-id/,
    );
  });
});

describe("EnrollmentPeriod start reconciliation", () => {
  it("uses earliest non-holiday attendance and only shifts a later period backward", () => {
    const changes = findEnrollmentStartCorrections(
      [
        {
          id: "attendance-holiday",
          studentId: "student-1",
          classSessionId: "session-holiday",
          classSessionDate: new Date("2026-07-01T00:00:00.000Z"),
          attendanceDate: new Date("2026-07-01T00:00:00.000Z"),
          status: "holiday",
        },
        {
          id: "attendance-1",
          studentId: "student-1",
          classSessionId: "session-1",
          classSessionDate: new Date("2026-07-03T00:00:00.000Z"),
          attendanceDate: new Date("2026-07-03T00:00:00.000Z"),
          status: "present",
        },
        {
          id: "attendance-2",
          studentId: "student-2",
          classSessionId: "session-2",
          classSessionDate: new Date("2026-07-04T00:00:00.000Z"),
          attendanceDate: new Date("2026-07-04T00:00:00.000Z"),
          status: "absent_with_fee",
        },
      ],
      [
        {
          id: "period-1",
          studentId: "student-1",
          startedAt: new Date("2026-07-10T00:00:00.000Z"),
          endedAt: null,
          source: "student_create",
        },
        {
          id: "period-2",
          studentId: "student-2",
          startedAt: new Date("2026-07-01T00:00:00.000Z"),
          endedAt: null,
          source: "student_create",
        },
      ],
    );

    assert.deepEqual(changes, [{
      enrollment_period_id: "period-1",
      student_id: "student-1",
      current_started_at: "2026-07-10",
      proposed_started_at: "2026-07-03",
      source: "student_create",
      evidence_attendance_id: "attendance-1",
      evidence_attendance_status: "present",
    }]);
  });

  it("ignores orphan or unknown attendance evidence", () => {
    const changes = findEnrollmentStartCorrections(
      [
        {
          id: "orphan",
          studentId: "student-1",
          classSessionId: null,
          classSessionDate: null,
          attendanceDate: new Date("2026-07-01T00:00:00.000Z"),
          status: "present",
        },
        {
          id: "unknown-status",
          studentId: "student-1",
          classSessionId: "session-1",
          classSessionDate: new Date("2026-07-02T00:00:00.000Z"),
          attendanceDate: new Date("2026-07-02T00:00:00.000Z"),
          status: "imported",
        },
      ],
      [{
        id: "period-1",
        studentId: "student-1",
        startedAt: new Date("2026-07-10T00:00:00.000Z"),
        endedAt: null,
        source: "student_create",
      }],
    );

    assert.deepEqual(changes, []);
  });
});

function reconciliationDb(fingerprints = ["finance-stable", "finance-stable"]) {
  const writes: Array<{ operation: string; args: any }> = [];
  let fingerprintRead = 0;
  let rolledBack = false;
  const tx = {
    class: { findUnique: async () => ({ id: "class-1" }) },
    classSession: {
      findMany: async (args: any) => {
        writes.push({ operation: "classSession.findMany", args });
        return [{
          id: "session-phantom",
          sessionDate: new Date("2026-07-02T00:00:00.000Z"),
          source: "attendance_bulk",
        }];
      },
      deleteMany: async (args: any) => {
        writes.push({ operation: "classSession.deleteMany", args });
        return { count: 1 };
      },
    },
    attendance: {
      findMany: async (args: any) => {
        writes.push({ operation: "attendance.findMany", args });
        return [{
        id: "attendance-1",
        studentId: "student-1",
        classSessionId: "session-1",
        classSession: { sessionDate: new Date("2026-07-03T00:00:00.000Z") },
        attendanceDate: new Date("2026-07-03T00:00:00.000Z"),
        status: "present",
      }];
      },
    },
    enrollmentPeriod: {
      findMany: async (args: any) => {
        writes.push({ operation: "enrollmentPeriod.findMany", args });
        return [{
          id: "period-1",
          studentId: "student-1",
          startedAt: new Date("2026-07-10T00:00:00.000Z"),
          endedAt: null,
          source: "student_create",
        }];
      },
      updateMany: async (args: any) => {
        writes.push({ operation: "enrollmentPeriod.updateMany", args });
        return { count: 1 };
      },
    },
    user: { findUnique: async () => ({ id: "admin-1" }) },
    activityLog: {
      create: async (args: any) => {
        writes.push({ operation: "activityLog.create", args });
        return args.data;
      },
    },
    $queryRaw: async (query: any) => {
      const sqlText = query?.strings?.join("") || String(query || "");
      if (sqlText.includes("pg_advisory_xact_lock")) {
        return [{ lock_result: "locked" }];
      }
      return [{
        fingerprint: fingerprints[Math.min(fingerprintRead++, fingerprints.length - 1)],
        row_count: "4",
      }];
    },
  };
  const db = {
    ...tx,
    $transaction: async (callback: (client: typeof tx) => unknown) => {
      try {
        return await callback(tx);
      } catch (error) {
        rolledBack = true;
        throw error;
      }
    },
  };
  return { db, writes, rolledBack: () => rolledBack };
}

describe("attendance month-ledger reconciliation execution", () => {
  it("detects only fully unreferenced planned attendance-generated sessions in dry-run", async () => {
    const fixture = reconciliationDb();

    const result = await runAttendanceMonthLedgerReconciliation(
      fixture.db as any,
      ["--class-id=class-1", "--month=2026-07"],
    );

    assert.equal(result.mode, "dry-run");
    assert.equal(result.phantom_sessions_to_delete, 1);
    assert.equal(result.enrollment_periods_to_update, 1);
    assert.equal(result.protected_finance_fingerprint, "finance-stable");
    assert.equal(fixture.writes.filter((entry) => entry.operation.includes("delete")).length, 0);
    assert.equal(fixture.writes.filter((entry) => entry.operation.includes("update")).length, 0);

    const read = fixture.writes.find((entry) => entry.operation === "classSession.findMany");
    assert.deepEqual(read?.args.where.source.in, ["attendance_bulk", "attendance_single"]);
    assert.equal(read?.args.where.status, "planned");
    assert.equal(read?.args.where.kind, "regular");
    assert.deepEqual(read?.args.where.sessionDate, {
      gte: new Date("2026-07-01T00:00:00.000Z"),
      lt: new Date("2026-08-01T00:00:00.000Z"),
    });
    assert.deepEqual(read?.args.where.attendance, { none: {} });
    assert.equal(read?.args.where.replacementForId, null);
    assert.deepEqual(read?.args.where.replacementSessions, { none: {} });

    const attendanceRead = fixture.writes.find(
      (entry) => entry.operation === "attendance.findMany",
    );
    assert.deepEqual(attendanceRead?.args.where.classSession, {
      is: {
        classId: "class-1",
        billingMonth: "2026-07",
        kind: "regular",
        status: "held",
        sessionDate: {
          gte: new Date("2026-07-01T00:00:00.000Z"),
          lt: new Date("2026-08-01T00:00:00.000Z"),
        },
      },
    });
    const periodRead = fixture.writes.find(
      (entry) => entry.operation === "enrollmentPeriod.findMany",
    );
    assert.deepEqual(periodRead?.args.where, {
      classId: "class-1",
      studentId: { in: ["student-1"] },
    });
  });

  it("discovers a later enrollment period that starts after the billing month", async () => {
    const fixture = reconciliationDb();
    fixture.db.attendance.findMany = async (args: any) => {
      fixture.writes.push({ operation: "attendance.findMany", args });
      return [{
        id: "attendance-june-1",
        studentId: "student-1",
        classSessionId: "session-june-1",
        classSession: { sessionDate: new Date("2026-06-03T00:00:00.000Z") },
        attendanceDate: new Date("2026-06-03T00:00:00.000Z"),
        status: "present",
      }];
    };
    fixture.db.enrollmentPeriod.findMany = async (args: any) => {
      fixture.writes.push({ operation: "enrollmentPeriod.findMany", args });
      return [{
        id: "period-created-in-july",
        studentId: "student-1",
        startedAt: new Date("2026-07-13T00:00:00.000Z"),
        endedAt: null,
        source: "student_create",
      }];
    };

    const result = await runAttendanceMonthLedgerReconciliation(
      fixture.db as any,
      ["--class-id=class-1", "--month=2026-06"],
    );

    assert.equal(result.enrollment_periods_to_update, 1);
    assert.deepEqual(result.students_without_enrollment_period, []);
    assert.deepEqual(result.enrollment_period_changes[0], {
      enrollment_period_id: "period-created-in-july",
      student_id: "student-1",
      current_started_at: "2026-07-13",
      proposed_started_at: "2026-06-03",
      source: "student_create",
      evidence_attendance_id: "attendance-june-1",
      evidence_attendance_status: "present",
    });
    const periodRead = fixture.writes.find(
      (entry) => entry.operation === "enrollmentPeriod.findMany",
    );
    assert.deepEqual(periodRead?.args.where, {
      classId: "class-1",
      studentId: { in: ["student-1"] },
    });
  });

  it("applies in one transaction, records audit rows, and preserves finance fingerprint", async () => {
    const fixture = reconciliationDb();

    const result = await runAttendanceMonthLedgerReconciliation(
      fixture.db as any,
      [
        "--class-id=class-1",
        "--month=2026-07",
        "--apply",
        "--actor-id=admin-1",
        "--reason=remove phantom attendance ledger rows",
      ],
    );

    assert.equal(result.mode, "apply");
    assert.equal(result.phantom_sessions_deleted, 1);
    assert.equal(result.enrollment_periods_updated, 1);
    assert.equal(result.audit_rows_created, 2);
    assert.equal(
      fixture.writes.filter((entry) => entry.operation === "activityLog.create").length,
      2,
    );
    const enrollmentAudit = fixture.writes.find(
      (entry) => entry.operation === "activityLog.create" &&
        entry.args.data.entityType === "enrollment_period",
    );
    assert.match(enrollmentAudit?.args.data.action, /evidence=attendance-1:present/);
    assert.match(enrollmentAudit?.args.data.action, /finance=finance-stable\/4/);
    const enrollmentWrite = fixture.writes.find(
      (entry) => entry.operation === "enrollmentPeriod.updateMany",
    );
    assert.equal(
      enrollmentWrite?.args.where.startedAt.toISOString(),
      "2026-07-10T00:00:00.000Z",
    );
    assert.equal(enrollmentWrite?.args.where.endedAt, null);
  });

  it("aborts the apply transaction when protected finance fingerprint drifts", async () => {
    const fixture = reconciliationDb(["finance-before", "finance-after"]);

    await assert.rejects(
      runAttendanceMonthLedgerReconciliation(
        fixture.db as any,
        [
          "--class-id=class-1",
          "--month=2026-07",
          "--apply",
          "--actor-id=admin-1",
          "--reason=remove phantom attendance ledger rows",
        ],
      ),
      /Protected finance fingerprint changed during reconciliation/,
    );
    assert.equal(fixture.rolledBack(), true);
  });

  it("aborts atomically when the phantom-session candidate set changes", async () => {
    const fixture = reconciliationDb();
    fixture.db.classSession.deleteMany = async (args: any) => {
      fixture.writes.push({ operation: "classSession.deleteMany", args });
      return { count: 0 };
    };

    await assert.rejects(
      runAttendanceMonthLedgerReconciliation(
        fixture.db as any,
        [
          "--class-id=class-1",
          "--month=2026-07",
          "--apply",
          "--actor-id=admin-1",
          "--reason=repair exact attendance month ledger",
        ],
      ),
      /Phantom session set changed during reconciliation/,
    );
    assert.equal(fixture.rolledBack(), true);
    assert.equal(
      fixture.writes.some((entry) => entry.operation === "enrollmentPeriod.updateMany"),
      false,
    );
  });

  it("refuses a partial apply when real attendance has no enrollment period", async () => {
    const fixture = reconciliationDb();
    fixture.db.enrollmentPeriod.findMany = async () => [];

    await assert.rejects(
      runAttendanceMonthLedgerReconciliation(
        fixture.db as any,
        [
          "--class-id=class-1",
          "--month=2026-07",
          "--apply",
          "--actor-id=admin-1",
          "--reason=repair exact attendance month ledger",
        ],
      ),
      /Unresolved enrollment periods: student-1/,
    );
    assert.equal(
      fixture.writes.some((entry) =>
        ["classSession.deleteMany", "enrollmentPeriod.updateMany"].includes(entry.operation)),
      false,
    );
  });

  it("is idempotent when a second run finds no remaining candidates", async () => {
    const fixture = reconciliationDb();
    let applied = false;
    fixture.db.classSession.findMany = async (args: any) => {
      fixture.writes.push({ operation: "classSession.findMany", args });
      return applied
        ? []
        : [{
            id: "session-phantom",
            sessionDate: new Date("2026-07-02T00:00:00.000Z"),
            source: "attendance_bulk",
          }];
    };
    fixture.db.classSession.deleteMany = async (args: any) => {
      fixture.writes.push({ operation: "classSession.deleteMany", args });
      applied = true;
      return { count: 1 };
    };
    fixture.db.enrollmentPeriod.findMany = async () => [{
      id: "period-1",
      studentId: "student-1",
      startedAt: applied
        ? new Date("2026-07-03T00:00:00.000Z")
        : new Date("2026-07-10T00:00:00.000Z"),
      endedAt: null,
      source: "student_create",
    }];

    await runAttendanceMonthLedgerReconciliation(
      fixture.db as any,
      [
        "--class-id=class-1",
        "--month=2026-07",
        "--apply",
        "--actor-id=admin-1",
        "--reason=repair exact attendance month ledger",
      ],
    );
    const writeCountAfterFirstRun = fixture.writes.filter((entry) =>
      ["classSession.deleteMany", "enrollmentPeriod.updateMany", "activityLog.create"].includes(
        entry.operation,
      )).length;

    const second = await runAttendanceMonthLedgerReconciliation(
      fixture.db as any,
      [
        "--class-id=class-1",
        "--month=2026-07",
        "--apply",
        "--actor-id=admin-1",
        "--reason=repair exact attendance month ledger",
      ],
    );
    const writeCountAfterSecondRun = fixture.writes.filter((entry) =>
      ["classSession.deleteMany", "enrollmentPeriod.updateMany", "activityLog.create"].includes(
        entry.operation,
      )).length;

    assert.equal(second.phantom_sessions_deleted, 0);
    assert.equal(second.enrollment_periods_updated, 0);
    assert.equal(second.audit_rows_created, 0);
    assert.equal(writeCountAfterSecondRun, writeCountAfterFirstRun);
  });
});
