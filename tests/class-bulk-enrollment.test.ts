import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLASS_WRITE_TRANSACTION_OPTIONS,
  enrollStudentsInClass,
  isClassWriteTimeout,
} from "../server/api/classes/index.js";

describe("class bulk enrollment", () => {
  it("enrolls multiple students with bounded set-based writes", async () => {
    const calls: Array<{ op: string; args?: any }> = [];
    const tx: any = {
      class: { findUnique: async () => ({ id: "class-1", maxStudents: 20 }) },
      student: {
        findMany: async () => ["s1", "s2", "s3"].map((id) => ({ id })),
      },
      studentClass: {
        findMany: async () => [
          { id: 1, studentId: "s1", status: "active", enrollmentDate: new Date("2026-06-01") },
          { id: 2, studentId: "s2", status: "inactive", enrollmentDate: new Date("2026-05-01") },
        ],
        count: async () => 1,
        createMany: async (args: any) => { calls.push({ op: "studentClass.createMany", args }); return { count: 1 }; },
        updateMany: async (args: any) => { calls.push({ op: "studentClass.updateMany", args }); return { count: 1 }; },
      },
      enrollmentPeriod: {
        findMany: async () => [{ studentId: "s1" }],
        createMany: async (args: any) => { calls.push({ op: "enrollmentPeriod.createMany", args }); return { count: 2 }; },
      },
    };

    const result = await enrollStudentsInClass(tx, "class-1", ["s1", "s2", "s3"]);

    assert.deepEqual(result, { requested: 3, enrolled: 1, reactivated: 1, skipped: 1 });
    assert.equal(calls.filter((call) => call.op === "studentClass.createMany").length, 1);
    assert.equal(calls.filter((call) => call.op === "studentClass.updateMany").length, 1);
    assert.equal(calls.filter((call) => call.op === "enrollmentPeriod.createMany").length, 1);
  });

  it("uses bounded transactions and maps Prisma timeout errors", () => {
    assert.equal(CLASS_WRITE_TRANSACTION_OPTIONS.timeout, 15_000);
    assert.equal(CLASS_WRITE_TRANSACTION_OPTIONS.maxWait, 5_000);
    assert.equal(isClassWriteTimeout({ code: "P2028" }), true);
    assert.equal(isClassWriteTimeout({ code: "P2002" }), false);
  });
});
