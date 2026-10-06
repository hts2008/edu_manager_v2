import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createTestRequest, createTestResponse } from "../lib/request-response-adapter.js";
import type { AuthedRequest } from "../lib/auth.js";
import {
  buildSystemStatus,
  default as systemStatusEndpoint,
  handler,
  parseDeploymentConfig,
} from "../server/api/admin/system-status/index.js";

describe("Admin Console system status", () => {
  it("parses cron declarations without trusting unrelated JSON fields", () => {
    assert.deepEqual(
      parseDeploymentConfig(JSON.stringify({
        crons: [
          { path: "/api/cron/backup", schedule: "0 18 * * 0" },
          { path: 42, schedule: null },
        ],
        secret: "must-not-leak",
      })),
      {
        readable: true,
        crons: [{ path: "/api/cron/backup", schedule: "0 18 * * 0" }],
      },
    );
    assert.deepEqual(parseDeploymentConfig("{broken"), { readable: false, crons: [] });
  });

  it("returns only configured booleans for named environment variables", async () => {
    const status = await buildSystemStatus({
      env: {
        DATABASE_URL: "postgres://secret@example/db",
        JWT_SECRET: "super-secret",
        CRON_SECRET: " ",
      },
      deploymentConfigText: JSON.stringify({
        crons: [{ path: "/api/cron/backup", schedule: "0 18 * * 0" }],
      }),
      packageText: JSON.stringify({ version: "2.7.1" }),
      activityLogs: [{ action: "cron.backup.completed", entityId: "/api/cron/backup", createdAt: new Date("2026-08-12T02:00:00.000Z") }],
    });

    assert.equal(status.appVersion, "2.7.1");
    assert.equal(status.environment.find((item) => item.name === "DATABASE_URL")?.configured, true);
    assert.equal(status.environment.find((item) => item.name === "CRON_SECRET")?.configured, false);
    assert.equal(status.crons[0]?.lastRunAt, "2026-08-12T02:00:00.000Z");
    assert.equal(status.legacyLinks.length, 8);
    const serialized = JSON.stringify(status);
    assert.doesNotMatch(serialized, /postgres:\/\//);
    assert.doesNotMatch(serialized, /super-secret/);
  });

  it("enforces GET and tenant-scoped admin context in the raw handler", async () => {
    const methodResponse = createTestResponse();
    await handler({ ...createTestRequest({ method: "POST" }) } as AuthedRequest, methodResponse.res);
    assert.equal(methodResponse.state.statusCode, 405);

    const response = createTestResponse();
    const req = {
      ...createTestRequest({ method: "GET" }),
      user: { id: "admin-a", userId: "admin-a", role: "admin", tenantId: "tenant-a" },
      authToken: { sub: "admin-a" },
      db: {
        activityLog: {
          findMany: async () => [],
        },
      },
    } as unknown as AuthedRequest;
    await handler(req, response.res);
    assert.equal(response.state.statusCode, 200);
    assert.equal((response.state.body as any).success, true);
    assert.equal(Object.hasOwn((response.state.body as any).data.environment[0], "value"), false);
  });

  it("rejects unauthenticated requests through the exported endpoint", async () => {
    const response = createTestResponse();
    await systemStatusEndpoint(createTestRequest({ method: "GET" }), response.res);
    assert.equal(response.state.statusCode, 401);
    assert.equal((response.state.body as any).error.code, "UNAUTHORIZED");
  });
});
