import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createTestRequest, createTestResponse } from "../lib/request-response-adapter.js";
import type { AuthedRequest } from "../lib/auth.js";
import prisma from "../lib/prisma.js";
import { handler as listHandler } from "../server/api/admin/settings/index.js";
import { handler as settingHandler } from "../server/api/admin/settings/[key].js";
import { handler as historyHandler } from "../server/api/admin/settings/[key]/revisions.js";
import { handler as rollbackHandler } from "../server/api/admin/settings/[key]/rollback.js";

function request(method: string, query: Record<string, string> = {}, body?: unknown) {
  return {
    ...createTestRequest({ method, query, body }),
    user: { id: "admin-a", userId: "admin-a", role: "admin", tenantId: "tenant-a" },
    authToken: { sub: "admin-a" },
    db: prisma,
  } as AuthedRequest;
}

describe("Admin Console settings API contract", () => {
  it("rejects unsupported methods and missing tenant context", async () => {
    const unsupported = createTestResponse();
    await listHandler(request("POST"), unsupported.res);
    assert.equal(unsupported.state.statusCode, 405);

    const missingTenant = createTestResponse();
    const req = request("GET");
    req.user.tenantId = null;
    await listHandler(req, missingTenant.res);
    assert.equal(missingTenant.state.statusCode, 409);
    assert.equal((missingTenant.state.body as any).error.code, "TENANT_CONTEXT_REQUIRED");
  });

  it("returns structured 400 errors for unknown keys and invalid values before DB access", async () => {
    const unknown = createTestResponse();
    await settingHandler(request("PUT", { key: "missing.key" }, { value: true }), unknown.res);
    assert.equal(unknown.state.statusCode, 400);
    assert.equal((unknown.state.body as any).error.code, "UNKNOWN_SETTING");

    const invalid = createTestResponse();
    await settingHandler(
      request("PUT", { key: "finance.bulk_actions_max" }, { value: 0 }),
      invalid.res,
    );
    assert.equal(invalid.state.statusCode, 400);
    assert.equal((invalid.state.body as any).error.code, "INVALID_SETTING_VALUE");
    assert.equal((invalid.state.body as any).error.details.issues[0].path, "value");

    const missingMonth = createTestResponse();
    await settingHandler(
      request("PUT", { key: "finance.chargeable_statuses" }, { value: ["present"] }),
      missingMonth.res,
    );
    assert.equal(missingMonth.state.statusCode, 400);
    assert.equal((missingMonth.state.body as any).error.code, "EFFECTIVE_MONTH_REQUIRED");
  });

  it("validates history pagination and rollback input", async () => {
    const invalidMonth = createTestResponse();
    await listHandler(request("GET", { effective_month: "2026-13" }), invalidMonth.res);
    assert.equal(invalidMonth.state.statusCode, 400);
    assert.equal((invalidMonth.state.body as any).error.code, "INVALID_EFFECTIVE_MONTH");

    const history = createTestResponse();
    await historyHandler(
      request("GET", { key: "finance.bulk_actions_max", page: "0", page_size: "500" }),
      history.res,
    );
    assert.equal(history.state.statusCode, 400);
    assert.equal((history.state.body as any).error.code, "INVALID_PAGINATION");

    const rollback = createTestResponse();
    await rollbackHandler(
      request("POST", { key: "finance.bulk_actions_max" }, {}),
      rollback.res,
    );
    assert.equal(rollback.state.statusCode, 400);
    assert.equal((rollback.state.body as any).error.code, "REVISION_REQUIRED");
  });

  it("maps organization reads to view permission instead of a nonexistent edit permission", async () => {
    const source = await import("node:fs/promises").then(({ readFile }) =>
      readFile(new URL("../server/api/admin/settings/index.ts", import.meta.url), "utf8"),
    );
    assert.match(source, /organization: "console\.organization\.view"/);
    assert.doesNotMatch(source, /`console\.\$\{group\}\.edit`/);
  });
});
