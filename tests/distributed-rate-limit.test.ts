import assert from "node:assert/strict";
import test from "node:test";
import {
  checkDistributedRateLimit,
  getLoginRateLimitConfig,
  resetDistributedRateLimitStateForTests,
} from "../lib/distributed-rate-limit.js";

type SqlCall = { strings: readonly string[]; values: readonly unknown[] };

function createDb(result: Array<Record<string, unknown>>) {
  const calls: SqlCall[] = [];
  const tx = {
    async $executeRaw(query: SqlCall) {
      calls.push(query);
      return 0;
    },
    async $queryRaw(query: SqlCall) {
      calls.push(query);
      return result;
    },
  };
  return {
    calls,
    db: { async $transaction<T>(work: (client: typeof tx) => Promise<T>) { return work(tx); } },
  };
}

test("distributed limiter initializes storage, locks, and returns a typed result", async () => {
  resetDistributedRateLimitStateForTests();
  const resetAt = new Date("2026-07-12T10:01:00.000Z");
  const { db, calls } = createDb([{ count: 3, reset_at: resetAt }]);

  const result = await checkDistributedRateLimit(
    "login:ip:user",
    { windowMs: 60_000, max: 3, now: new Date("2026-07-12T10:00:00.000Z") },
    db
  );

  assert.deepEqual(result, {
    allowed: true,
    limit: 3,
    remaining: 0,
    resetAt: resetAt.getTime(),
    retryAfterSeconds: 60,
  });
  const sql = calls.map((call) => call.strings.join("?")).join("\n");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS auth_rate_limit/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /INSERT INTO auth_rate_limit/);
});

test("distributed limiter cleanup is bounded", async () => {
  resetDistributedRateLimitStateForTests();
  const { db, calls } = createDb([{ count: 1, reset_at: new Date("2026-07-12T10:01:00.000Z") }]);

  for (let index = 0; index < 100; index += 1) {
    await checkDistributedRateLimit(
      `login:${index}`,
      { windowMs: 60_000, max: 3, now: new Date("2026-07-12T10:00:00.000Z") },
      db
    );
  }

  const cleanup = calls.find((call) => call.strings.join("?").includes("DELETE FROM auth_rate_limit"));
  assert.ok(cleanup);
  assert.match(cleanup.strings.join("?"), /LIMIT \?/);
  assert.ok(cleanup.values.includes(100));
});

test("login rate limit config rejects malformed environment values", () => {
  assert.deepEqual(getLoginRateLimitConfig({}, "LOGIN_RATE_LIMIT"), {
    windowMs: 900_000,
    max: 10,
  });
  assert.throws(
    () => getLoginRateLimitConfig({ LOGIN_RATE_LIMIT_MAX: "NaN" }, "LOGIN_RATE_LIMIT"),
    /positive integer/
  );
  assert.throws(
    () => getLoginRateLimitConfig({ LOGIN_RATE_LIMIT_WINDOW_MS: "0" }, "LOGIN_RATE_LIMIT"),
    /positive integer/
  );
});
