import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertHistoricalEnrollmentAllowed,
  enrollStudentsInClass,
} from "../server/api/classes/index.js";

const historicalDate = new Date("2026-06-01T00:00:00.000Z");
const policyNow = new Date("2026-07-14T12:00:00.000Z");

function assertErrorCode(error: unknown, code: string) {
  assert.equal((error as { code?: string }).code, code);
  return true;
}

function enrollmentTx(existingLinks: any[] = [], openPeriods: any[] = []) {
  const calls: Array<{ op: string; args: any }> = [];
  let createdPeriods: any[] = [];
  const tx: any = {
    class: { findUnique: async () => ({ id: "class-1", maxStudents: 20 }) },
    student: {
      findMany: async ({ where }: any) => where.id.in.map((id: string) => ({ id })),
    },
    studentClass: {
      findMany: async () => existingLinks,
      count: async () => existingLinks.filter((link) => link.status === "active").length,
      createMany: async (args: any) => {
        calls.push({ op: "studentClass.createMany", args });
        return { count: args.data.length };
      },
      updateMany: async (args: any) => {
        calls.push({ op: "studentClass.updateMany", args });
        return { count: 1 };
      },
    },
    enrollmentPeriod: {
      findMany: async ({ where }: any) => where.endedAt === null
        ? openPeriods
        : [...openPeriods, ...createdPeriods],
      findFirst: async () => null,
      createMany: async (args: any) => {
        calls.push({ op: "enrollmentPeriod.createMany", args });
        createdPeriods = args.data.map((row: any) => ({
          ...row,
          id: `period-${row.studentId}`,
          endedAt: null,
        }));
        return { count: args.data.length };
      },
      updateMany: async (args: any) => {
        calls.push({ op: "enrollmentPeriod.updateMany", args });
        return { count: 1 };
      },
    },
    activityLog: {
      createMany: async (args: any) => {
        calls.push({ op: "activityLog.createMany", args });
        return { count: args.data.length };
      },
    },
  };
  return { calls, tx };
}

describe("historical enrollment audit", () => {
  it("allows only admins and requires a reason for every historical enrollment", () => {
    assert.throws(
      () => assertHistoricalEnrollmentAllowed(
        "receptionist",
        historicalDate,
        false,
        "Imported signed register",
        policyNow,
      ),
      (error) => assertErrorCode(error, "FORBIDDEN"),
    );
    assert.throws(
      () => assertHistoricalEnrollmentAllowed(
        "admin",
        historicalDate,
        false,
        null,
        policyNow,
      ),
      (error) => assertErrorCode(error, "BACKDATE_REASON_REQUIRED"),
    );
    assert.doesNotThrow(() => assertHistoricalEnrollmentAllowed(
      "admin",
      historicalDate,
      false,
      "Imported signed register",
      policyNow,
    ));
  });

  it("audits historical new and reactivated enrollments with complete context", async () => {
    const reason = "Imported signed June register";
    const { calls, tx } = enrollmentTx([{
      id: "link-reactivated",
      studentId: "student-reactivated",
      status: "inactive",
      enrollmentDate: new Date("2026-05-01T00:00:00.000Z"),
    }]);

    await enrollStudentsInClass(
      tx,
      "class-1",
      ["student-new", "student-reactivated"],
      historicalDate,
      {
        actorId: "admin-1",
        actorRole: "admin",
        backdateReason: reason,
        now: policyNow,
      },
    );

    const writes = calls.map((call) => call.op);
    assert.ok(
      writes.indexOf("activityLog.createMany") > writes.indexOf("enrollmentPeriod.createMany"),
      "audit must use the same transaction object after enrollment writes",
    );
    const auditRows = calls.find((call) => call.op === "activityLog.createMany")?.args.data;
    assert.equal(auditRows.length, 2);

    const payloads = auditRows.map((row: any) => ({
      row,
      payload: JSON.parse(row.action),
    }));
    assert.deepEqual(
      payloads.map(({ payload }: any) => payload.action).sort(),
      ["HISTORICAL_ENROLLMENT_CREATED", "HISTORICAL_ENROLLMENT_REACTIVATED"],
    );
    for (const { row, payload } of payloads) {
      assert.equal(row.userId, "admin-1");
      assert.equal(payload.actor_id, "admin-1");
      assert.equal(payload.reason, reason);
      assert.equal(payload.class_id, "class-1");
      assert.ok(["student-new", "student-reactivated"].includes(payload.student_id));
      assert.ok(Object.hasOwn(payload, "before"));
      assert.equal(payload.after, historicalDate.toISOString());
      assert.equal(row.entityType, "EnrollmentPeriod");
      assert.equal(row.entityId, `period-${payload.student_id}`);
    }
  });

  it("audits historical start adjustments with actor, reason, student, class, before, and after", async () => {
    const reason = "Corrected from signed attendance evidence";
    const originalDate = new Date("2026-07-14T00:00:00.000Z");
    const { calls, tx } = enrollmentTx(
      [{
        id: "link-1",
        studentId: "student-1",
        status: "active",
        enrollmentDate: originalDate,
      }],
      [{
        id: "period-1",
        studentId: "student-1",
        startedAt: originalDate,
      }],
    );

    await enrollStudentsInClass(tx, "class-1", ["student-1"], historicalDate, {
      actorId: "admin-1",
      actorRole: "admin",
      backdateReason: reason,
      adjustExistingEnrollmentStart: true,
      now: policyNow,
    });

    const auditRow = calls.find((call) => call.op === "activityLog.createMany")?.args.data[0];
    const payload = JSON.parse(auditRow.action);
    assert.equal(auditRow.userId, "admin-1");
    assert.equal(auditRow.entityType, "EnrollmentPeriod");
    assert.equal(auditRow.entityId, "period-1");
    assert.deepEqual(payload, {
      action: "ENROLLMENT_START_CORRECTED",
      actor_id: "admin-1",
      reason,
      student_id: "student-1",
      class_id: "class-1",
      before: originalDate.toISOString(),
      after: historicalDate.toISOString(),
    });
  });

  it("fails closed before enrollment or audit writes when a future attendance month is protected", async () => {
    const { calls, tx } = enrollmentTx();
    tx.$queryRaw = async () => undefined;
    tx.attendancePeriod = {
      findFirst: async ({ where }: any) => {
        const protectedMonth = "2026-09";
        return where.periodMonth.lte && protectedMonth > where.periodMonth.lte
          ? null
          : { classId: "class-1", periodMonth: protectedMonth, status: "submitted" };
      },
    };
    tx.classMonthPlan = { findFirst: async () => null };

    await assert.rejects(
      enrollStudentsInClass(
        tx,
        "class-1",
        ["student-1"],
        historicalDate,
        {
          actorId: "admin-1",
          actorRole: "admin",
          backdateReason: "Imported signed June register",
          now: policyNow,
        },
      ),
      (error) => assertErrorCode(error, "ENROLLMENT_PERIOD_LOCKED"),
    );

    assert.deepEqual(calls, []);
  });
});
