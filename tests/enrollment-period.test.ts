import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  enrollmentOverlapsRange,
  syncStudentEnrollmentPeriods,
} from "../lib/enrollment.js";

describe("time-bounded enrollment ledger", () => {
  it("uses half-open ranges so a withdrawal does not leak into the next period", () => {
    const period = {
      startedAt: new Date("2026-05-10T00:00:00.000Z"),
      endedAt: new Date("2026-06-01T00:00:00.000Z"),
    };

    assert.equal(
      enrollmentOverlapsRange(
        period,
        new Date("2026-05-01T00:00:00.000Z"),
        new Date("2026-06-01T00:00:00.000Z"),
      ),
      true,
    );
    assert.equal(
      enrollmentOverlapsRange(
        period,
        new Date("2026-06-01T00:00:00.000Z"),
        new Date("2026-07-01T00:00:00.000Z"),
      ),
      false,
    );
  });

  it("closes removed classes and opens a new period when a class is reactivated", async () => {
    const calls: Array<{ op: string; args: any }> = [];
    const tx: any = {
      studentClass: {
        findMany: async () => [
          {
            id: 1,
            studentId: "student-1",
            classId: "class-old",
            status: "active",
            enrollmentDate: new Date("2026-05-01T00:00:00.000Z"),
          },
          {
            id: 2,
            studentId: "student-1",
            classId: "class-return",
            status: "inactive",
            enrollmentDate: new Date("2026-04-01T00:00:00.000Z"),
          },
        ],
        update: async (args: any) => {
          calls.push({ op: "studentClass.update", args });
          return args;
        },
        create: async (args: any) => {
          calls.push({ op: "studentClass.create", args });
          return { id: 3, ...args.data };
        },
      },
      enrollmentPeriod: {
        findFirst: async ({ where }: any) =>
          where.classId === "class-old" ? { id: "period-old" } : null,
        update: async (args: any) => {
          calls.push({ op: "period.update", args });
          return args;
        },
        create: async (args: any) => {
          calls.push({ op: "period.create", args });
          return args;
        },
      },
    };
    const effectiveAt = new Date("2026-07-15T00:00:00.000Z");

    const result = await syncStudentEnrollmentPeriods(tx, {
      studentId: "student-1",
      desiredClassIds: ["class-return", "class-new"],
      effectiveAt,
      source: "student_update",
    });

    assert.deepEqual(result, { activated: 2, deactivated: 1, unchanged: 0 });
    assert.ok(
      calls.some(
        ({ op, args }) =>
          op === "period.update" &&
          args.where.id === "period-old" &&
          args.data.endedAt === effectiveAt,
      ),
    );
    assert.equal(
      calls.filter(({ op }) => op === "period.create").length,
      2,
    );
  });
});
