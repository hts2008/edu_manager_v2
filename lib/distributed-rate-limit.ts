import { Prisma } from "@prisma/client";
import prisma from "./prisma.js";
import type { RateLimitResult } from "./rate-limit.js";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  now?: Date;
};

type SqlClient = {
  $executeRaw(query: Prisma.Sql): Promise<unknown>;
  $queryRaw<T>(query: Prisma.Sql): Promise<T>;
};

type TransactionClient = {
  $transaction<T>(work: (client: SqlClient) => Promise<T>): Promise<T>;
};

type RateLimitRow = {
  count: number | bigint;
  reset_at: Date;
};

const CLEANUP_INTERVAL = 100;
const CLEANUP_BATCH_SIZE = 100;
let callsSinceCleanup = 0;

function positiveInteger(value: string | undefined, fallback: number, name: string) {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

export function getLoginRateLimitConfig(
  env: Record<string, string | undefined>,
  prefix: "LOGIN_RATE_LIMIT" | "PARENT_LOGIN_RATE_LIMIT"
) {
  return {
    windowMs: positiveInteger(env[`${prefix}_WINDOW_MS`], 900_000, `${prefix}_WINDOW_MS`),
    max: positiveInteger(env[`${prefix}_MAX`], 10, `${prefix}_MAX`),
  };
}

function validateOptions(options: RateLimitOptions) {
  if (!Number.isSafeInteger(options.windowMs) || options.windowMs <= 0) {
    throw new Error("Rate limit windowMs must be a positive integer");
  }
  if (!Number.isSafeInteger(options.max) || options.max <= 0) {
    throw new Error("Rate limit max must be a positive integer");
  }
}

export async function checkDistributedRateLimit(
  key: string,
  options: RateLimitOptions,
  db: TransactionClient = prisma
): Promise<RateLimitResult> {
  validateOptions(options);
  if (!key) throw new Error("Rate limit key is required");

  const now = options.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Rate limit now must be a valid date");
  const resetAt = new Date(now.getTime() + options.windowMs);
  callsSinceCleanup += 1;
  const shouldCleanup = callsSinceCleanup >= CLEANUP_INTERVAL;
  if (shouldCleanup) callsSinceCleanup = 0;

  const row = await db.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      CREATE TABLE IF NOT EXISTS auth_rate_limit (
        bucket_key TEXT PRIMARY KEY,
        attempt_count INTEGER NOT NULL CHECK (attempt_count > 0),
        reset_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);
    await tx.$queryRaw(Prisma.sql`
      SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text AS locked
    `);

    if (shouldCleanup) {
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM auth_rate_limit
        WHERE bucket_key IN (
          SELECT bucket_key
          FROM auth_rate_limit
          WHERE reset_at <= ${now}
          ORDER BY reset_at
          LIMIT ${CLEANUP_BATCH_SIZE}
        )
      `);
    }

    const rows = await tx.$queryRaw<RateLimitRow[]>(Prisma.sql`
      INSERT INTO auth_rate_limit (bucket_key, attempt_count, reset_at, updated_at)
      VALUES (${key}, 1, ${resetAt}, ${now})
      ON CONFLICT (bucket_key) DO UPDATE SET
        attempt_count = CASE
          WHEN auth_rate_limit.reset_at <= ${now} THEN 1
          ELSE auth_rate_limit.attempt_count + 1
        END,
        reset_at = CASE
          WHEN auth_rate_limit.reset_at <= ${now} THEN ${resetAt}
          ELSE auth_rate_limit.reset_at
        END,
        updated_at = ${now}
      RETURNING attempt_count AS count, reset_at
    `);
    if (rows.length !== 1) throw new Error("Rate limit counter update failed");
    return rows[0];
  });

  const count = Number(row.count);
  const resetAtMs = new Date(row.reset_at).getTime();
  if (!Number.isSafeInteger(count) || count <= 0 || !Number.isFinite(resetAtMs)) {
    throw new Error("Rate limit storage returned malformed data");
  }

  return {
    allowed: count <= options.max,
    limit: options.max,
    remaining: Math.max(options.max - count, 0),
    resetAt: resetAtMs,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAtMs - now.getTime()) / 1000)),
  };
}

export function resetDistributedRateLimitStateForTests() {
  callsSinceCleanup = 0;
}
