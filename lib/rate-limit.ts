import type { VercelRequest, VercelResponse } from "./vercel-types.js";

type Bucket = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

const buckets = new Map<string, Bucket>();
let callsSinceCleanup = 0;

export function getClientIp(req: VercelRequest) {
  const forwardedFor = req.headers["x-forwarded-for"];
  const rawIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  return String(rawIp || req.headers["x-real-ip"] || "unknown")
    .split(",")[0]
    .trim();
}

export function checkRateLimit(
  key: string,
  options: { windowMs: number; max: number; now?: number }
): RateLimitResult {
  const now = options.now ?? Date.now();
  if (!Number.isFinite(options.windowMs) || options.windowMs <= 0 || !Number.isInteger(options.max) || options.max <= 0) {
    throw new Error("Rate limit windowMs and max must be positive integers");
  }
  callsSinceCleanup += 1;
  if (callsSinceCleanup >= 100) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
    callsSinceCleanup = 0;
  }
  const existing = buckets.get(key);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + options.windowMs };

  bucket.count += 1;
  buckets.set(key, bucket);

  const remaining = Math.max(options.max - bucket.count, 0);
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((bucket.resetAt - now) / 1000)
  );

  return {
    allowed: bucket.count <= options.max,
    limit: options.max,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds,
  };
}

export function setRateLimitHeaders(
  res: VercelResponse,
  result: RateLimitResult
) {
  res.setHeader("RateLimit-Limit", String(result.limit));
  res.setHeader("RateLimit-Remaining", String(result.remaining));
  res.setHeader("RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
  if (!result.allowed) {
    res.setHeader("Retry-After", String(result.retryAfterSeconds));
  }
}

export function resetRateLimitBucketsForTests() {
  buckets.clear();
  callsSinceCleanup = 0;
}
