import test from "node:test";
import assert from "node:assert/strict";
import {
  getRequestId,
  logApiEvent,
  redactForLog,
  sanitizeError,
  setSecurityHeaders,
} from "../lib/observability.js";
import type { VercelRequest, VercelResponse } from "../lib/vercel-types.js";

function createResponse() {
  const headers: Record<string, string> = {};
  const res: VercelResponse = {
    status: () => res,
    json: () => res,
    send: () => res,
    setHeader: (name, value) => {
      headers[name] = value;
    },
    end: () => undefined,
  };

  return { headers, res };
}

test("setSecurityHeaders applies browser hardening headers", () => {
  const { headers, res } = createResponse();

  setSecurityHeaders(res);

  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.equal(headers["Referrer-Policy"], "no-referrer");
  assert.match(headers["Permissions-Policy"], /camera=\(\)/);
});

test("getRequestId reuses request header before generating a fallback", () => {
  const req = {
    headers: { "x-request-id": "request-123" },
    query: {},
  } as VercelRequest;

  assert.equal(getRequestId(req), "request-123");
  assert.match(getRequestId({ headers: {}, query: {} } as VercelRequest), /^[a-f0-9-]{36}$/);
});

test("redactForLog masks sensitive fields recursively", () => {
  const result = redactForLog({
    authorization: "Bearer token",
    nested: {
      password: "secret",
      safe: "value",
    },
  }) as Record<string, any>;

  assert.equal(result.authorization, "[REDACTED]");
  assert.equal(result.nested.password, "[REDACTED]");
  assert.equal(result.nested.safe, "value");
});

test("sanitizeError emits safe error metadata", () => {
  const error = Object.assign(new Error("database failed"), {
    code: "P1001",
    password: "should-not-leak",
  });

  const result = sanitizeError(error) as Record<string, unknown>;

  assert.equal(result.name, "Error");
  assert.equal(result.message, "database failed");
  assert.equal(result.code, "P1001");
  assert.equal(result.password, undefined);
});

test("logApiEvent writes structured JSON and redacts secrets", () => {
  const writes: string[] = [];
  const originalInfo = console.info;
  console.info = (message?: unknown) => {
    writes.push(String(message));
  };

  try {
    logApiEvent("info", "test_event", {
      requestId: "req-1",
      headers: { authorization: "Bearer token" },
    });
  } finally {
    console.info = originalInfo;
  }

  assert.equal(writes.length, 1);
  const payload = JSON.parse(writes[0]);
  assert.equal(payload.level, "info");
  assert.equal(payload.event, "test_event");
  assert.equal(payload.requestId, "req-1");
  assert.equal(payload.headers.authorization, "[REDACTED]");
});
