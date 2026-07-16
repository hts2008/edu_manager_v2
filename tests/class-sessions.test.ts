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
import {
  parsePatchSessionAdditions,
  readOnlyPlanState,
  requiredChangeReason,
  resolveFixedMonthPlanWeekdays,
  resolveMutationExpectedRevision,
  synchronizeFlexiblePlanSnapshot,
} from "../server/api/class-sessions/month-plan.js";

describe("read-only month-plan state", () => {
  it("fails closed for legacy attendance periods without a plan aggregate", () => {
    assert.equal(readOnlyPlanState(null, "locked"), "frozen");
    assert.equal(readOnlyPlanState(null, "approved"), "frozen");
    assert.equal(readOnlyPlanState(null, "submitted"), "frozen");
    assert.equal(readOnlyPlanState(null, "open"), "open");
    assert.equal(readOnlyPlanState(null, null), "open");
    assert.equal(readOnlyPlanState("frozen", "open"), "frozen");
  });
});

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
  it("normalizes audit reasons and rejects whitespace-only values", () => {
    assert.equal(requiredChangeReason("  publish June plan  "), "publish June plan");
    assert.throws(
      () => requiredChangeReason("   "),
      (error: any) => error?.code === "MISSING_FIELD" && error?.status === 400,
    );
  });

  it("rejects malformed PATCH additions before session field access", () => {
    assert.deepEqual(parsePatchSessionAdditions(undefined), []);
    assert.deepEqual(
      parsePatchSessionAdditions([{ session_date: "2026-07-01" }]),
      [{ session_date: "2026-07-01" }],
    );
    for (const value of [null, {}, [null], ["2026-07-01"]]) {
      assert.throws(
        () => parsePatchSessionAdditions(value),
        (error: any) => error?.code === "INVALID_ADD_SESSIONS" && error?.status === 400,
      );
    }

    const endpoint = readFileSync(
      new URL("../server/api/class-sessions/month-plan.ts", import.meta.url),
      "utf8",
    );
    assert.match(endpoint, /const additions = parsePatchSessionAdditions\(body\.add_sessions\)/);
  });

  it("returns a revision conflict when a version-zero client loses the first-writer race", () => {
    assert.equal(
      resolveMutationExpectedRevision(0, { created: true, aggregate: { revision: 1 } }),
      1,
    );
    assert.throws(
      () => resolveMutationExpectedRevision(0, { created: false, aggregate: { revision: 2 } }),
      (error: any) =>
        error?.code === "CLASS_MONTH_PLAN_REVISION_CONFLICT"
        && error?.status === 409
        && error?.details?.current_revision === 2,
    );
  });

  it("preserves JavaScript weekdays from the fixed month-plan API contract", () => {
    assert.deepEqual(
      resolveFixedMonthPlanWeekdays([1, 3], ["T3", "T5"]),
      [1, 3],
      "API weekdays already use 0=Sunday and must not be shifted as legacy class data",
    );
    assert.deepEqual(
      resolveFixedMonthPlanWeekdays(undefined, ["T2", "T4"]),
      [1, 3],
      "missing API weekdays should still normalize the persisted class schedule",
    );

    for (const month of ["2026-02", "2026-04", "2026-07", "2026-08", "2026-12", "2027-01"]) {
      const dates = generateFixedWeekdayDates(
        month,
        resolveFixedMonthPlanWeekdays([1, 3], null),
      );
      assert.ok(dates.length > 0);
      assert.ok(
        dates.every((date) => [1, 3].includes(new Date(`${date}T00:00:00.000Z`).getUTCDay())),
        `${month} must contain only Monday and Wednesday sessions`,
      );
    }

    const endpoint = readFileSync(
      new URL("../server/api/class-sessions/month-plan.ts", import.meta.url),
      "utf8",
    );
    assert.match(endpoint, /weekdays:\s*fixedWeekdays/);
    assert.match(endpoint, /replacementScheduleSnapshot\.schedule_days = fixedWeekdays/);
  });

  it("writes the final flexible denominator into the immutable revision snapshot", () => {
    const snapshot: Record<string, unknown> = {
      expected_regular_sessions: 10,
      sessions_per_week: 2,
      schedule_days: [],
    };
    const scheduleSnapshot = {
      expected_regular_sessions: 10,
      sessions_per_week: 2,
      schedule_days: [],
    };
    const dates = synchronizeFlexiblePlanSnapshot(snapshot, scheduleSnapshot, [
      { kind: "regular", sessionDate: new Date("2026-06-03T00:00:00.000Z") },
      { kind: "regular", sessionDate: new Date("2026-06-05T00:00:00.000Z") },
      { kind: "makeup", sessionDate: new Date("2026-06-06T00:00:00.000Z") },
    ]);

    assert.deepEqual(dates, ["2026-06-03", "2026-06-05"]);
    assert.equal(scheduleSnapshot.expected_regular_sessions, 2);
    assert.equal(snapshot.expected_regular_sessions, 2);
    assert.deepEqual(snapshot.requested_dates, dates);
  });

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
    assert.match(monthPlan, /requiredChangeReason\(body\.reason\)/);
    assert.equal((monthPlan.match(/reason:\s*changeReason/g) || []).length, 2);
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
    assert.match(monthPlan, /withClassMonthPlanRosterWrite/);
    assert.match(byId, /withClassMonthPlanRosterWrite/);
    assert.equal((monthPlan.match(/expectedRevision:\s*resolveMutationExpectedRevision\(aggregateVersion, ensured\)/g) || []).length, 2);
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
  it("requires an audit reason before PUT or PATCH opens a write transaction", async () => {
    const { default: monthPlanHandler } = await import(
      "../server/api/class-sessions/month-plan.js"
    );
    const mockedPrisma = prisma as any;
    const originals = {
      transaction: mockedPrisma.$transaction,
      userFindUnique: mockedPrisma.user.findUnique,
      authSessionFindFirst: mockedPrisma.authSession.findFirst,
    };
    const previousNodeEnv = process.env.NODE_ENV;
    const authConfig = {
      secret: "class-session-reason-test-secret-at-least-32-characters",
      issuer: "edu-manager-test",
      audience: "edu-manager-test-api",
      algorithm: "HS256" as const,
    };
    let transactionCalls = 0;

    try {
      process.env.NODE_ENV = "test";
      setAuthConfigForTests(authConfig);
      mockedPrisma.$transaction = async () => {
        transactionCalls += 1;
        throw new Error("reason validation must happen before the transaction");
      };
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
      mockedPrisma.authSession.findFirst = async () => ({ id: "session-reason" });
      const token = jwt.sign(
        { typ: "user", ver: 0, username: "admin", role: "admin" },
        authConfig.secret,
        {
          algorithm: authConfig.algorithm,
          issuer: authConfig.issuer,
          audience: authConfig.audience,
          subject: "admin-1",
          jwtid: "session-reason",
          expiresIn: "5m",
        },
      );

      for (const request of [
        {
          method: "PUT",
          body: {
            class_id: "class-1",
            month: "2026-07",
            expected_version: 1,
            schedule_mode: "flexible",
            dates: ["2026-07-01"],
          },
        },
        {
          method: "PATCH",
          body: {
            class_id: "class-1",
            month: "2026-07",
            expected_version: 1,
            add_sessions: [{ session_date: "2026-07-01" }],
          },
        },
      ]) {
        const response = mockResponse();
        await monthPlanHandler(
          {
            ...request,
            headers: { authorization: `Bearer ${token}` },
            query: {},
          } as any,
          response as any,
        );
        assert.equal(response.statusCode, 400);
        assert.equal(response.body.success, false);
        assert.equal(response.body.error.code, "MISSING_FIELD");
        assert.equal(response.body.error.message, "reason is required");
      }
      assert.equal(transactionCalls, 0);
    } finally {
      mockedPrisma.$transaction = originals.transaction;
      mockedPrisma.user.findUnique = originals.userFindUnique;
      mockedPrisma.authSession.findFirst = originals.authSessionFindFirst;
      setAuthConfigForTests(null);
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  });

  it("rejects receptionist month-plan mutations before opening a transaction", async () => {
    const { default: monthPlanHandler } = await import(
      "../server/api/class-sessions/month-plan.js"
    );
    const mockedPrisma = prisma as any;
    const originals = {
      transaction: mockedPrisma.$transaction,
      userFindUnique: mockedPrisma.user.findUnique,
      authSessionFindFirst: mockedPrisma.authSession.findFirst,
    };
    const previousNodeEnv = process.env.NODE_ENV;
    const authConfig = {
      secret: "class-session-rbac-test-secret-at-least-32-characters",
      issuer: "edu-manager-test",
      audience: "edu-manager-test-api",
      algorithm: "HS256" as const,
    };
    let transactionCalls = 0;

    try {
      process.env.NODE_ENV = "test";
      setAuthConfigForTests(authConfig);
      mockedPrisma.$transaction = async () => {
        transactionCalls += 1;
        throw new Error("RBAC must reject before the transaction");
      };
      mockedPrisma.user.findUnique = async () => ({
        id: "receptionist-1",
        username: "receptionist",
        fullName: "Receptionist",
        email: null,
        phone: null,
        role: "receptionist",
        status: "active",
        lastLogin: null,
        tokenVersion: 0,
      });
      mockedPrisma.authSession.findFirst = async () => ({ id: "session-rbac" });
      const token = jwt.sign(
        { typ: "user", ver: 0, username: "receptionist", role: "receptionist" },
        authConfig.secret,
        {
          algorithm: authConfig.algorithm,
          issuer: authConfig.issuer,
          audience: authConfig.audience,
          subject: "receptionist-1",
          jwtid: "session-rbac",
          expiresIn: "5m",
        },
      );
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
            reason: "receptionist should not mutate",
            schedule_mode: "flexible",
            dates: ["2026-07-01"],
          },
        } as any,
        response as any,
      );

      assert.equal(response.statusCode, 403);
      assert.equal(response.body.success, false);
      assert.equal(response.body.error.code, "FORBIDDEN");
      assert.equal(transactionCalls, 0);
    } finally {
      mockedPrisma.$transaction = originals.transaction;
      mockedPrisma.user.findUnique = originals.userFindUnique;
      mockedPrisma.authSession.findFirst = originals.authSessionFindFirst;
      setAuthConfigForTests(null);
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  });

  it("keeps GET read-only and returns explicit plan coverage diagnostics", async () => {
    const { default: monthPlanHandler } = await import(
      "../server/api/class-sessions/month-plan.js"
    );
    const mockedPrisma = prisma as any;
    const originals = {
      transaction: mockedPrisma.$transaction,
      userFindUnique: mockedPrisma.user.findUnique,
      authSessionFindFirst: mockedPrisma.authSession.findFirst,
      classFindUnique: mockedPrisma.class.findUnique,
      classMonthPlanFindUnique: mockedPrisma.classMonthPlan.findUnique,
      classMonthPlanUpsert: mockedPrisma.classMonthPlan.upsert,
      classMonthPlanUpdateMany: mockedPrisma.classMonthPlan.updateMany,
      classMonthPlanRevisionFindUnique: mockedPrisma.classMonthPlanRevision.findUnique,
      classMonthPlanRevisionFindMany: mockedPrisma.classMonthPlanRevision.findMany,
      classMonthPlanRevisionCreate: mockedPrisma.classMonthPlanRevision.create,
      classSessionFindMany: mockedPrisma.classSession.findMany,
    };
    const previousNodeEnv = process.env.NODE_ENV;
    const authConfig = {
      secret: "class-session-read-test-secret-at-least-32-characters",
      issuer: "edu-manager-test",
      audience: "edu-manager-test-api",
      algorithm: "HS256" as const,
    };
    let transactionCalls = 0;
    let mutationCalls = 0;
    const mutationAttempt = async () => {
      mutationCalls += 1;
      throw new Error("GET month-plan attempted a database mutation");
    };

    try {
      process.env.NODE_ENV = "test";
      setAuthConfigForTests(authConfig);
      mockedPrisma.$transaction = async () => {
        transactionCalls += 1;
        throw new Error("GET month-plan attempted to open a write transaction");
      };
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
      mockedPrisma.authSession.findFirst = async () => ({ id: "session-read" });
      mockedPrisma.class.findUnique = async () => ({ id: "class-1" });
      mockedPrisma.classMonthPlan.findUnique = async () => ({
        id: "plan-1",
        classId: "class-1",
        billingMonth: "2026-07",
        state: "open",
        revision: 4,
      });
      mockedPrisma.classMonthPlanRevision.findUnique = async () => ({
        snapshot: {
          payload: {
            operation: "replace",
            requested_dates: ["2026-07-01", "2026-07-08"],
            schedule_days: [],
            sessions_per_week: 2,
            expected_regular_sessions: 2,
          },
        },
      });
      mockedPrisma.classMonthPlanRevision.findMany = async () => [];
      mockedPrisma.classSession.findMany = async () => [
        {
          id: "regular-1",
          classId: "class-1",
          sessionDate: new Date("2026-07-01T00:00:00.000Z"),
          billingMonth: "2026-07",
          kind: "regular",
          status: "planned",
          version: 4,
        },
        {
          id: "regular-2",
          classId: "class-1",
          sessionDate: new Date("2026-07-08T00:00:00.000Z"),
          billingMonth: "2026-07",
          kind: "regular",
          status: "planned",
          version: 4,
        },
      ];
      mockedPrisma.classMonthPlan.upsert = mutationAttempt;
      mockedPrisma.classMonthPlan.updateMany = mutationAttempt;
      mockedPrisma.classMonthPlanRevision.create = mutationAttempt;

      const token = jwt.sign(
        { typ: "user", ver: 0, username: "admin", role: "admin" },
        authConfig.secret,
        {
          algorithm: authConfig.algorithm,
          issuer: authConfig.issuer,
          audience: authConfig.audience,
          subject: "admin-1",
          jwtid: "session-read",
          expiresIn: "5m",
        },
      );
      const response = mockResponse();

      await monthPlanHandler(
        {
          method: "GET",
          headers: { authorization: `Bearer ${token}` },
          query: { class_id: "class-1", month: "2026-07" },
          body: {},
        } as any,
        response as any,
      );

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.success, true);
      assert.equal(response.body.data.expected_source, "published_plan_snapshot");
      assert.equal(response.body.data.actual, 2);
      assert.equal(response.body.data.expected, 2);
      assert.equal(response.body.data.missing_count, 0);
      assert.deepEqual(response.body.data.missing_dates, []);
      assert.deepEqual(response.body.data.weekly_deficits, []);
      assert.equal(response.body.data.recommended_action, null);
      assert.equal(response.body.data.version, 4);
      assert.equal(transactionCalls, 0);
      assert.equal(mutationCalls, 0);
    } finally {
      mockedPrisma.$transaction = originals.transaction;
      mockedPrisma.user.findUnique = originals.userFindUnique;
      mockedPrisma.authSession.findFirst = originals.authSessionFindFirst;
      mockedPrisma.class.findUnique = originals.classFindUnique;
      mockedPrisma.classMonthPlan.findUnique = originals.classMonthPlanFindUnique;
      mockedPrisma.classMonthPlan.upsert = originals.classMonthPlanUpsert;
      mockedPrisma.classMonthPlan.updateMany = originals.classMonthPlanUpdateMany;
      mockedPrisma.classMonthPlanRevision.findUnique = originals.classMonthPlanRevisionFindUnique;
      mockedPrisma.classMonthPlanRevision.findMany = originals.classMonthPlanRevisionFindMany;
      mockedPrisma.classMonthPlanRevision.create = originals.classMonthPlanRevisionCreate;
      mockedPrisma.classSession.findMany = originals.classSessionFindMany;
      setAuthConfigForTests(null);
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  });

  it("retries a torn GET and returns only a stable aggregate revision", async () => {
    const { default: monthPlanHandler } = await import(
      "../server/api/class-sessions/month-plan.js"
    );
    const mockedPrisma = prisma as any;
    const originals = {
      userFindUnique: mockedPrisma.user.findUnique,
      authSessionFindFirst: mockedPrisma.authSession.findFirst,
      classFindUnique: mockedPrisma.class.findUnique,
      classMonthPlanFindUnique: mockedPrisma.classMonthPlan.findUnique,
      classMonthPlanRevisionFindUnique: mockedPrisma.classMonthPlanRevision.findUnique,
      classMonthPlanRevisionFindMany: mockedPrisma.classMonthPlanRevision.findMany,
      classSessionFindMany: mockedPrisma.classSession.findMany,
    };
    const previousNodeEnv = process.env.NODE_ENV;
    const authConfig = {
      secret: "class-session-stable-read-secret-at-least-32-characters",
      issuer: "edu-manager-test",
      audience: "edu-manager-test-api",
      algorithm: "HS256" as const,
    };
    const revisions = [1, 2, 2, 2];
    let aggregateReads = 0;

    try {
      process.env.NODE_ENV = "test";
      setAuthConfigForTests(authConfig);
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
      mockedPrisma.authSession.findFirst = async () => ({ id: "session-stable-read" });
      mockedPrisma.class.findUnique = async () => ({ id: "class-1" });
      mockedPrisma.classMonthPlan.findUnique = async () => {
        const revision = revisions[aggregateReads++] ?? 2;
        return { id: "plan-1", state: "open", revision };
      };
      mockedPrisma.classMonthPlanRevision.findUnique = async ({ where }: any) => ({
        snapshot: {
          payload: {
            operation: "replace",
            requested_dates: where.planId_revision.revision === 1
              ? ["2026-07-01"]
              : ["2026-07-01", "2026-07-08"],
            expected_regular_sessions: where.planId_revision.revision === 1 ? 1 : 2,
          },
        },
      });
      mockedPrisma.classMonthPlanRevision.findMany = async () => [];
      mockedPrisma.classSession.findMany = async () => [
        {
          id: "regular-1",
          classId: "class-1",
          sessionDate: new Date("2026-07-01T00:00:00.000Z"),
          billingMonth: "2026-07",
          kind: "regular",
          status: "planned",
          version: 2,
        },
        {
          id: "regular-2",
          classId: "class-1",
          sessionDate: new Date("2026-07-08T00:00:00.000Z"),
          billingMonth: "2026-07",
          kind: "regular",
          status: "planned",
          version: 2,
        },
      ];
      const token = jwt.sign(
        { typ: "user", ver: 0, username: "admin", role: "admin" },
        authConfig.secret,
        {
          algorithm: authConfig.algorithm,
          issuer: authConfig.issuer,
          audience: authConfig.audience,
          subject: "admin-1",
          jwtid: "session-stable-read",
          expiresIn: "5m",
        },
      );
      const response = mockResponse();

      await monthPlanHandler(
        {
          method: "GET",
          headers: { authorization: `Bearer ${token}` },
          query: { class_id: "class-1", month: "2026-07" },
          body: {},
        } as any,
        response as any,
      );

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.data.version, 2);
      assert.equal(response.body.data.expected, 2);
      assert.equal(response.body.data.actual, 2);
      assert.equal(aggregateReads, 4);
    } finally {
      mockedPrisma.user.findUnique = originals.userFindUnique;
      mockedPrisma.authSession.findFirst = originals.authSessionFindFirst;
      mockedPrisma.class.findUnique = originals.classFindUnique;
      mockedPrisma.classMonthPlan.findUnique = originals.classMonthPlanFindUnique;
      mockedPrisma.classMonthPlanRevision.findUnique = originals.classMonthPlanRevisionFindUnique;
      mockedPrisma.classMonthPlanRevision.findMany = originals.classMonthPlanRevisionFindMany;
      mockedPrisma.classSession.findMany = originals.classSessionFindMany;
      setAuthConfigForTests(null);
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  });

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
      queryRaw: mockedPrisma.$queryRaw,
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
      mockedPrisma.$queryRaw = async () => [];
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
              reason: "publish the explicit July plan",
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
      mockedPrisma.$queryRaw = originals.queryRaw;
      setAuthConfigForTests(null);
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  });
});
