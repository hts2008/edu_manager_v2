import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { setAuthConfigForTests } from "../lib/auth-config.js";
import {
  ClassSessionError,
  assertNoAttendanceForRemovedSessions,
  assertUniqueMakeupReplacements,
  assertMonthMutable,
  assertRowVersions,
  billingMonthForDate,
  buildMonthPlan,
  generateFixedWeekdayDates,
  validateMakeupDate,
} from "../lib/class-sessions.js";

function mockResponse() {
  return {
    statusCode: 200,
    body: undefined as any,
    headers: new Map<string, unknown>(),
    setHeader(name: string, value: unknown) {
      this.headers.set(name, value);
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    end(payload?: unknown) {
      this.body = payload;
      return this;
    },
  };
}

describe("class session month plans", () => {
  it("generates fixed weekdays deterministically inside the requested month", () => {
    assert.deepEqual(generateFixedWeekdayDates("2026-07", [1, 3]), [
      "2026-07-01", "2026-07-06", "2026-07-08", "2026-07-13",
      "2026-07-15", "2026-07-20", "2026-07-22", "2026-07-27",
      "2026-07-29",
    ]);
  });

  it("accepts explicit flexible dates and rejects dates outside the month", () => {
    const plan = buildMonthPlan({
      class_id: "class-1",
      month: "2026-07",
      schedule_mode: "flexible",
      dates: ["2026-07-20", "2026-07-03", "2026-07-03"],
    });
    assert.deepEqual(plan.dates, ["2026-07-03", "2026-07-20"]);
    assert.throws(
      () => buildMonthPlan({
        class_id: "class-1",
        month: "2026-07",
        schedule_mode: "flexible",
        dates: ["2026-08-01"],
      }),
      (error: unknown) => error instanceof ClassSessionError && error.code === "SESSION_DATE_OUTSIDE_MONTH",
    );
  });

  it("treats sessions_per_week as a warning and never as a generated denominator", () => {
    const plan = buildMonthPlan({
      class_id: "class-1",
      month: "2026-07",
      schedule_mode: "fixed_weekdays",
      weekdays: [1, 3],
      sessions_per_week: 3,
    });
    assert.equal(plan.dates.length, 9);
    assert.deepEqual(plan.warnings, [{
      code: "SESSIONS_PER_WEEK_MISMATCH",
      expected: 3,
      actual: 2,
    }]);
  });

  it("requires makeup sessions to remain in the original session month", () => {
    assert.doesNotThrow(() => validateMakeupDate("2026-07-05", "2026-07-27"));
    assert.throws(
      () => validateMakeupDate("2026-07-31", "2026-08-01"),
      (error: unknown) => error instanceof ClassSessionError && error.code === "MAKEUP_MUST_BE_SAME_MONTH",
    );
  });

  it("derives billing_month and rejects a conflicting supplied month", () => {
    assert.equal(billingMonthForDate("2026-07-03"), "2026-07");
    assert.throws(
      () => billingMonthForDate("2026-07-03", "2026-08"),
      (error: unknown) => error instanceof ClassSessionError && error.code === "BILLING_MONTH_MISMATCH",
    );
  });

  it("rejects protected periods through a test-first database mock", async () => {
    const db = {
      attendancePeriod: {
        findFirst: async () => ({ id: "period-1", status: "locked" }),
      },
    };
    await assert.rejects(
      () => assertMonthMutable(db, "class-1", "2026-07"),
      (error: unknown) => error instanceof ClassSessionError && error.code === "SESSION_PLAN_PROTECTED",
    );
  });

  it("treats submitted, approved, and locked attendance periods as immutable", async () => {
    for (const status of ["submitted", "approved", "locked"]) {
      const db = { attendancePeriod: { findFirst: async () => ({ id: "period-1", status }) } };
      await assert.rejects(
        () => assertMonthMutable(db, "class-1", "2026-07"),
        (error: unknown) => error instanceof ClassSessionError && error.code === "SESSION_PLAN_PROTECTED",
      );
    }
  });

  it("rejects deleting a class session that has attendance", async () => {
    const db = { attendance: { count: async () => 1 } };
    await assert.rejects(
      () => assertNoAttendanceForRemovedSessions(db, ["session-1"]),
      (error: unknown) => error instanceof ClassSessionError && error.code === "SESSION_HAS_ATTENDANCE",
    );
  });

  it("rejects duplicate makeup replacements within a month", () => {
    assert.throws(
      () => assertUniqueMakeupReplacements(
        [{ id: "makeup-1", kind: "makeup", replacementForId: "regular-1" }],
        [{ kind: "makeup", replacement_for_id: "regular-1" }],
      ),
      (error: unknown) => error instanceof ClassSessionError && error.code === "DUPLICATE_MAKEUP_REPLACEMENT",
    );
    assert.throws(
      () => assertUniqueMakeupReplacements([], [
        { kind: "makeup", replacement_for_id: "regular-1" },
        { kind: "makeup", replacement_for_id: "regular-1" },
      ]),
      (error: unknown) => error instanceof ClassSessionError && error.code === "DUPLICATE_MAKEUP_REPLACEMENT",
    );
  });

  it("rejects any stale supplied row version even when other rows are current", () => {
    assert.throws(
      () => assertRowVersions(
        [{ id: "a", version: 4 }, { id: "b", version: 4 }],
        { a: 4, b: 3 },
      ),
      (error: unknown) => error instanceof ClassSessionError && error.code === "VERSION_CONFLICT",
    );
  });
});

describe("class session API contract", () => {
  const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

  it("wires authenticated list, month-plan, and by-id routes", () => {
    const router = source("api/router.ts");
    const monthPlan = source("server/api/class-sessions/month-plan.ts");
    assert.match(router, /\["class-sessions", "month-plan"\], routes\.classSessionsMonthPlan/);
    assert.match(router, /\["class-sessions"\], routes\.classSessionsIndex/);
    assert.match(router, /routes\.classSessionById/);
    assert.match(monthPlan, /export default requireAuth\(handler\)/);
  });

  it("keeps the HTTP boundary snake_case and uses plan plus row versions", () => {
    const monthPlan = source("server/api/class-sessions/month-plan.ts");
    const byId = source("server/api/class-sessions/[id].ts");
    assert.match(monthPlan, /expected_version/);
    assert.match(byId, /expected_version/);
    assert.match(monthPlan, /row_versions/);
    assert.match(monthPlan, /billing_month/);
    assert.match(byId, /replacement_for_id/);
    assert.match(byId, /extra_fee_mode/);
  });

  it("sends both row and aggregate versions when deleting a session", () => {
    const api = source("frontend/src/services/api.js");
    assert.match(
      api,
      /delete:\s*\(id, version, expectedVersion\)[\s\S]*version=\$\{encodeURIComponent\(version\)\}[\s\S]*expected_version=\$\{encodeURIComponent\(expectedVersion\)\}/,
    );
  });

  it("uses the ClassMonthPlan aggregate revision for every session write", () => {
    const monthPlan = source("server/api/class-sessions/month-plan.ts");
    const byId = source("server/api/class-sessions/[id].ts");

    assert.match(monthPlan, /ensureClassMonthPlan/);
    assert.match(monthPlan, /claimClassMonthPlan/);
    assert.match(monthPlan, /eventType:\s*"month_plan_replace"/);
    assert.match(monthPlan, /eventType:\s*"month_plan_patch"/);
    assert.match(byId, /ensureClassMonthPlan/);
    assert.match(byId, /claimClassMonthPlan/);
    assert.match(byId, /eventType:\s*"class_session_patch"/);
    assert.match(byId, /eventType:\s*"class_session_delete"/);
    assert.equal((monthPlan.match(/expectedRevision:\s*aggregateVersion/g) || []).length, 2);
    assert.equal((byId.match(/expectedRevision:\s*aggregateVersion/g) || []).length, 2);
    assert.doesNotMatch(monthPlan, /prisma\.\$transaction/);
    assert.doesNotMatch(byId, /prisma\.\$transaction/);
  });

  it("returns aggregate state and revision instead of deriving version from session rows", () => {
    const monthPlan = source("server/api/class-sessions/month-plan.ts");

    assert.match(monthPlan, /state:\s*aggregate\.state/);
    assert.match(monthPlan, /version:\s*aggregate\.revision/);
    assert.doesNotMatch(monthPlan, /function planVersion/);
  });

  it("keeps session_date and billing_month aligned in bulk and by-id mutations", () => {
    const monthPlan = source("server/api/class-sessions/month-plan.ts");
    const byId = source("server/api/class-sessions/[id].ts");

    assert.match(monthPlan, /update:\s*\{[\s\S]*billingMonth/);
    assert.match(byId, /assertSessionMonthInvariant/);
    assert.match(byId, /billingMonthForDate\(nextDate/);
  });
});

describe("class session month-plan API behavior", () => {
  it("rejects PUT when a requested regular date is already makeup or extra", async () => {
    const { default: monthPlanHandler } = await import(
      "../server/api/class-sessions/month-plan.js"
    );
    const mockedPrisma = prisma as any;
    const originals = {
      transaction: mockedPrisma.$transaction,
      userFindUnique: mockedPrisma.user.findUnique,
      authSessionFindFirst: mockedPrisma.authSession.findFirst,
      classFindUnique: mockedPrisma.class.findUnique,
      attendancePeriodFindUnique: mockedPrisma.attendancePeriod.findUnique,
      attendancePeriodFindFirst: mockedPrisma.attendancePeriod.findFirst,
      classMonthPlanUpsert: mockedPrisma.classMonthPlan.upsert,
      classMonthPlanUpdateMany: mockedPrisma.classMonthPlan.updateMany,
      classMonthPlanFindUnique: mockedPrisma.classMonthPlan.findUnique,
      classMonthPlanRevisionCreate: mockedPrisma.classMonthPlanRevision.create,
      classSessionFindMany: mockedPrisma.classSession.findMany,
      classSessionDeleteMany: mockedPrisma.classSession.deleteMany,
      classSessionUpsert: mockedPrisma.classSession.upsert,
    };
    const previousNodeEnv = process.env.NODE_ENV;
    const authConfig = {
      secret: "class-session-test-secret-at-least-32-characters",
      issuer: "edu-manager-test",
      audience: "edu-manager-test-api",
      algorithm: "HS256" as const,
    };

    try {
      process.env.NODE_ENV = "test";
      setAuthConfigForTests(authConfig);
      mockedPrisma.$transaction = async (work: (tx: any) => Promise<unknown>) => work(mockedPrisma);
      mockedPrisma.user.findUnique = async () => ({
        id: "admin-1",
        username: "admin",
        fullName: "Admin",
        email: null,
        phone: null,
        role: "admin",
        status: "active",
        lastLogin: null,
        tokenVersion: 0,
      });
      mockedPrisma.authSession.findFirst = async () => ({ id: "session-1" });
      mockedPrisma.class.findUnique = async () => ({
        id: "class-1",
        scheduleDays: [],
        sessionsPerWeek: null,
      });
      mockedPrisma.attendancePeriod.findUnique = async () => null;
      mockedPrisma.attendancePeriod.findFirst = async () => null;
      mockedPrisma.classMonthPlan.upsert = async () => ({
        id: "plan-1",
        classId: "class-1",
        billingMonth: "2026-07",
        state: "open",
        revision: 1,
      });
      mockedPrisma.classMonthPlan.updateMany = async () => ({ count: 1 });
      mockedPrisma.classMonthPlan.findUnique = async () => ({
        id: "plan-1",
        classId: "class-1",
        billingMonth: "2026-07",
        state: "open",
        revision: 2,
      });
      mockedPrisma.classMonthPlanRevision.create = async () => ({ id: "revision-2" });
      mockedPrisma.classSession.deleteMany = async () => ({ count: 0 });

      const token = jwt.sign(
        { typ: "user", ver: 0, username: "admin", role: "admin" },
        authConfig.secret,
        {
          algorithm: authConfig.algorithm,
          issuer: authConfig.issuer,
          audience: authConfig.audience,
          subject: "admin-1",
          jwtid: "session-1",
          expiresIn: "5m",
        },
      );

      for (const kind of ["makeup", "extra"]) {
        let upsertCalls = 0;
        const existingSession = {
          id: `${kind}-session`,
          classId: "class-1",
          sessionDate: new Date("2026-07-15T00:00:00.000Z"),
          billingMonth: "2026-07",
          kind,
          status: "planned",
          extraFeeMode: "included",
          replacementForId: kind === "makeup" ? "regular-session" : null,
          source: "month_plan_patch",
          notes: null,
          version: 3,
          createdAt: new Date("2026-07-01T00:00:00.000Z"),
          updatedAt: new Date("2026-07-01T00:00:00.000Z"),
        };
        mockedPrisma.classSession.findMany = async () => [existingSession];
        mockedPrisma.classSession.upsert = async () => {
          upsertCalls += 1;
          return existingSession;
        };

        const response = mockResponse();
        await monthPlanHandler(
          {
            method: "PUT",
            headers: { authorization: `Bearer ${token}` },
            query: {},
            body: {
              class_id: "class-1",
              month: "2026-07",
              expected_version: 1,
              schedule_mode: "flexible",
              dates: ["2026-07-15"],
            },
          } as any,
          response as any,
        );

        assert.equal(response.statusCode, 409, `${kind} collision should reject PUT`);
        assert.equal(response.body.success, false);
        assert.equal(response.body.error.code, "SESSION_KIND_CONFLICT");
        assert.equal(upsertCalls, 0, `${kind} collision must not reach upsert`);
        assert.equal(existingSession.kind, kind, `${kind} session must not be converted`);
      }
    } finally {
      mockedPrisma.$transaction = originals.transaction;
      mockedPrisma.user.findUnique = originals.userFindUnique;
      mockedPrisma.authSession.findFirst = originals.authSessionFindFirst;
      mockedPrisma.class.findUnique = originals.classFindUnique;
      mockedPrisma.attendancePeriod.findUnique = originals.attendancePeriodFindUnique;
      mockedPrisma.attendancePeriod.findFirst = originals.attendancePeriodFindFirst;
      mockedPrisma.classMonthPlan.upsert = originals.classMonthPlanUpsert;
      mockedPrisma.classMonthPlan.updateMany = originals.classMonthPlanUpdateMany;
      mockedPrisma.classMonthPlan.findUnique = originals.classMonthPlanFindUnique;
      mockedPrisma.classMonthPlanRevision.create = originals.classMonthPlanRevisionCreate;
      mockedPrisma.classSession.findMany = originals.classSessionFindMany;
      mockedPrisma.classSession.deleteMany = originals.classSessionDeleteMany;
      mockedPrisma.classSession.upsert = originals.classSessionUpsert;
      setAuthConfigForTests(null);
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  });
});
