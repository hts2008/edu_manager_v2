import type { VercelRequest, VercelResponse } from "./vercel-types.js";

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

const buckets = new Map<string, Bucket>();

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
}
