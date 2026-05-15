import { randomUUID } from "node:crypto";
import type { VercelRequest, VercelResponse } from "./vercel-types.js";

type LogLevel = "info" | "warn" | "error";

const SENSITIVE_KEY_PATTERN = /authorization|cookie|password|token|secret|key/i;

function getHeader(req: VercelRequest, name: string): string | undefined {
  const direct = req.headers[name];
  const lower = req.headers[name.toLowerCase()];
  const value = direct ?? lower;
  if (Array.isArray(value)) return value[0];
  return value;
}

export function setSecurityHeaders(res: VercelResponse) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
}

export function getRequestId(req: VercelRequest): string {
  return (
    getHeader(req, "x-request-id") ||
    getHeader(req, "x-vercel-id") ||
    randomUUID()
  );
}

export function redactForLog(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[MaxDepth]";
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return sanitizeError(value);
  if (Array.isArray(value)) {
    return value.map((item) => redactForLog(item, depth + 1));
  }
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? "[REDACTED]"
        : redactForLog(entry, depth + 1);
    }
    return output;
  }
  return value;
}

export function sanitizeError(error: unknown) {
  if (error instanceof Error) {
    const maybeError = error as Error & {
      code?: unknown;
      status?: unknown;
      clientVersion?: unknown;
    };

    return redactForLog({
      name: error.name,
      message: error.message,
      code: maybeError.code,
      status: maybeError.status,
      clientVersion: maybeError.clientVersion,
    });
  }

  return redactForLog(error);
}

export function logApiEvent(
  level: LogLevel,
  event: string,
  meta: Record<string, unknown> = {}
) {
  const safeMeta = redactForLog(meta) as Record<string, unknown>;
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...safeMeta,
  };

  console[level](JSON.stringify(payload));
}

export function logApiError(
  error: unknown,
  meta: Record<string, unknown> = {},
  event = "api_error"
) {
  logApiEvent("error", event, {
    ...meta,
    error: sanitizeError(error),
  });
}
