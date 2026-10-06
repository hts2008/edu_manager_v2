import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { readFileSync } from "node:fs";

import type { AuthedRequest } from "../lib/auth.js";
import {
  createTestRequest,
  createTestResponse,
} from "../lib/request-response-adapter.js";
import { handler as integrationsHandler } from "../server/api/admin/integrations.js";
import { handler as testSendHandler } from "../server/api/admin/integrations/[kind]/test.js";
import { resetRateLimitBucketsForTests } from "../lib/rate-limit.js";

const TEST_KEY = "integration-api-test-key-with-at-least-32-chars";

function database() {
  const integrations: any[] = [];
  const settings: any[] = [];
  const audits: any[] = [];
  let configVersion = 0;
  const db: any = {
    tenant: {
      findUnique: async () => ({ configVersion }),
      update: async () => ({ configVersion: ++configVersion }),
    },
    integrationConfig: {
      findUnique: async ({ where }: any) =>
        integrations.find(
          (row) =>
            row.tenantId === where.tenantId_kind.tenantId &&
            row.kind === where.tenantId_kind.kind,
        ) ?? null,
      upsert: async ({ where, create, update }: any) => {
        const existing = integrations.find(
          (row) =>
            row.tenantId === where.tenantId_kind.tenantId &&
            row.kind === where.tenantId_kind.kind,
        );
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return existing;
        }
        const row = {
          id: `integration-${integrations.length + 1}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...create,
        };
        integrations.push(row);
        return row;
      },
    },
    settingValue: {
      findMany: async () => settings,
      findFirst: async ({ where }: any) =>
        settings.find(
          (row) =>
            row.tenantId === where.tenantId &&
            row.key === where.key &&
            row.effectiveFromMonth === where.effectiveFromMonth,
        ) ?? null,
      create: async ({ data }: any) => {
        const row = {
          id: `setting-${settings.length + 1}`,
          updatedAt: new Date(),
          ...data,
        };
        settings.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const row = settings.find((candidate) => candidate.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
    },
    settingRevision: { create: async () => ({}) },
    activityLog: {
      create: async ({ data }: any) => {
        audits.push(data);
        return data;
      },
    },
  };
  db.$transaction = async (callback: (tx: any) => unknown) => callback(db);
  return { db, integrations, audits };
}

function request(
  db: any,
  method: string,
  body?: unknown,
  query: Record<string, string> = {},
) {
  return {
    ...createTestRequest({ method, body, query }),
    user: {
      id: "admin-a",
      userId: "admin-a",
      role: "admin",
      tenantId: "tenant-a",
      isPlatformOwner: false,
    },
    authToken: { sub: "admin-a" },
    db,
  } as AuthedRequest;
}

const originalKey = process.env.INTEGRATION_ENCRYPTION_KEY;
const originalNodeEnv = process.env.NODE_ENV;
const originalFetch = globalThis.fetch;

afterEach(() => {
  if (originalKey === undefined) delete process.env.INTEGRATION_ENCRYPTION_KEY;
  else process.env.INTEGRATION_ENCRYPTION_KEY = originalKey;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  globalThis.fetch = originalFetch;
  resetRateLimitBucketsForTests();
});

describe("Admin Console IntegrationConfig API", () => {
  it("registers the tenant integration test-send route in the catch-all router", () => {
    const routerSource = readFileSync(
      new URL("../api/router.ts", import.meta.url),
      "utf8",
    );
    assert.match(routerSource, /adminIntegrationTest/);
    assert.match(
      routerSource,
      /resource === "admin"[\s\S]*id === "integrations"[\s\S]*parts\.length === 4[\s\S]*parts\[3\] === "test"/,
    );
  });

  it("PUT persists a tenant config while returning only redacted secret metadata", async () => {
    process.env.INTEGRATION_ENCRYPTION_KEY = TEST_KEY;
    const { db, integrations } = database();
    const response = createTestResponse();
    await integrationsHandler(
      request(db, "PUT", {
        kind: "fee_reminder_webhook",
        config: {
          url: "https://provider.example.test/hook",
          enabled: true,
        },
        secret: "api-secret-token",
      }),
      response.res,
    );

    assert.equal(response.state.statusCode, 200);
    assert.equal(integrations[0].tenantId, "tenant-a");
    assert.equal(integrations[0].secretEncrypted.includes("api-secret-token"), false);
    const serialized = JSON.stringify(response.state.body);
    assert.equal(serialized.includes("api-secret-token"), false);
    const integration = (response.state.body as any).data.integration;
    assert.equal(integration.config.url, "https://provider.example.test/hook");
    assert.equal(integration.secret_configured, true);
    assert.equal(integration.secret_masked, "••••••••");
  });

  it("GET never exposes encrypted or plaintext secrets and cannot read another tenant", async () => {
    process.env.INTEGRATION_ENCRYPTION_KEY = TEST_KEY;
    const { db } = database();
    await integrationsHandler(
      request(db, "PUT", {
        kind: "sms_webhook",
        config: { url: "https://sms.example.test/send", enabled: true },
        secret: "tenant-a-token",
      }),
      createTestResponse().res,
    );

    const response = createTestResponse();
    await integrationsHandler(request(db, "GET"), response.res);
    const serialized = JSON.stringify(response.state.body);
    assert.equal(serialized.includes("tenant-a-token"), false);
    assert.equal(serialized.includes("secretEncrypted"), false);
    const sms = (response.state.body as any).data.integrations.find(
      (item: any) => item.kind === "sms_webhook",
    );
    assert.equal(sms.config.url, "https://sms.example.test/send");

    const tenantB = createTestResponse();
    const tenantBRequest = request(db, "GET");
    tenantBRequest.user.tenantId = "tenant-b";
    await integrationsHandler(tenantBRequest, tenantB.res);
    const tenantBSms = (tenantB.state.body as any).data.integrations.find(
      (item: any) => item.kind === "sms_webhook",
    );
    assert.equal(tenantBSms.config_source, "none");
    assert.equal(tenantBSms.secret_configured, false);
  });

  it("requires secret re-entry when changing a configured endpoint", async () => {
    process.env.INTEGRATION_ENCRYPTION_KEY = TEST_KEY;
    const { db, integrations } = database();
    await integrationsHandler(
      request(db, "PUT", {
        kind: "sms_webhook",
        config: { url: "https://1.1.1.1/send", enabled: true },
        secret: "tenant-secret",
      }),
      createTestResponse().res,
    );

    const response = createTestResponse();
    await integrationsHandler(
      request(db, "PUT", {
        kind: "sms_webhook",
        config: { url: "https://1.0.0.1/collect", enabled: true },
      }),
      response.res,
    );
    assert.equal(response.state.statusCode, 400);
    assert.equal(
      (response.state.body as any).error.code,
      "INTEGRATION_SECRET_REENTRY_REQUIRED",
    );
    assert.equal(integrations[0].config.url, "https://1.1.1.1/send");
  });

  it("test-send rejects an invalid endpoint with a clear sanitized error", async () => {
    process.env.INTEGRATION_ENCRYPTION_KEY = TEST_KEY;
    const { db } = database();
    await integrationsHandler(
      request(db, "PUT", {
        kind: "fee_reminder_webhook",
        config: { url: "invalid-url", enabled: true },
        secret: "must-not-leak",
      }),
      createTestResponse().res,
    );

    const response = createTestResponse();
    await testSendHandler(
      request(db, "POST", undefined, { kind: "fee_reminder_webhook" }),
      response.res,
    );
    assert.equal(response.state.statusCode, 400);
    assert.equal(
      (response.state.body as any).error.code,
      "INTEGRATION_URL_INVALID",
    );
    assert.equal(JSON.stringify(response.state.body).includes("must-not-leak"), false);

    const existingRoute = createTestResponse();
    await integrationsHandler(
      request(db, "POST", { kind: "fee_reminder_webhook" }),
      existingRoute.res,
    );
    assert.equal(existingRoute.state.statusCode, 400);
    assert.equal(
      (existingRoute.state.body as any).error.code,
      "INTEGRATION_URL_INVALID",
    );
    assert.equal(
      JSON.stringify(existingRoute.state.body).includes("must-not-leak"),
      false,
    );
  });

  it("test-send allows POST only and requires tenant context", async () => {
    const { db } = database();
    const method = createTestResponse();
    await testSendHandler(
      request(db, "GET", undefined, { kind: "fee_reminder_webhook" }),
      method.res,
    );
    assert.equal(method.state.statusCode, 405);

    const tenant = createTestResponse();
    const tenantless = request(
      db,
      "POST",
      undefined,
      { kind: "fee_reminder_webhook" },
    );
    tenantless.user.tenantId = null;
    await testSendHandler(tenantless, tenant.res);
    assert.equal((tenant.state.body as any).error.code, "TENANT_CONTEXT_REQUIRED");
  });

  it("test-send returns only sanitized provider metadata", async () => {
    process.env.INTEGRATION_ENCRYPTION_KEY = TEST_KEY;
    process.env.NODE_ENV = "test";
    const { db } = database();
    await integrationsHandler(
      request(db, "PUT", {
        kind: "fee_reminder_webhook",
        config: { url: "https://1.1.1.1/hook", enabled: true },
        secret: "provider-api-secret",
      }),
      createTestResponse().res,
    );
    globalThis.fetch = async () =>
      new Response("provider-api-secret", {
        status: 202,
        statusText: "provider-api-secret",
      });

    const response = createTestResponse();
    await testSendHandler(
      request(db, "POST", undefined, { kind: "fee_reminder_webhook" }),
      response.res,
    );
    assert.equal(response.state.statusCode, 200);
    assert.equal((response.state.body as any).data.status, 202);
    assert.equal(
      JSON.stringify(response.state.body).includes("provider-api-secret"),
      false,
    );
  });

  it("rate-limits and audits test-send before making an outbound request", async () => {
    process.env.INTEGRATION_ENCRYPTION_KEY = TEST_KEY;
    process.env.NODE_ENV = "test";
    const { db, audits } = database();
    await integrationsHandler(
      request(db, "PUT", {
        kind: "fee_reminder_webhook",
        config: { url: "https://1.1.1.1/hook", enabled: true },
        secret: "provider-api-secret",
      }),
      createTestResponse().res,
    );
    let sends = 0;
    globalThis.fetch = async (_input, init) => {
      sends += 1;
      assert.equal(init?.redirect, "error");
      return new Response(null, { status: 202 });
    };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = createTestResponse();
      await testSendHandler(
        request(db, "POST", undefined, { kind: "fee_reminder_webhook" }),
        response.res,
      );
      assert.equal(response.state.statusCode, 200);
    }
    const limited = createTestResponse();
    await testSendHandler(
      request(db, "POST", undefined, { kind: "fee_reminder_webhook" }),
      limited.res,
    );
    assert.equal(limited.state.statusCode, 429);
    assert.equal(
      (limited.state.body as any).error.code,
      "INTEGRATION_TEST_RATE_LIMITED",
    );
    assert.equal(sends, 5);
    assert.equal(
      audits.filter((item) => item.action === "integration.test_send.requested").length,
      5,
    );
    assert.equal(
      audits.filter((item) => item.action === "integration.test_send.rate_limited").length,
      1,
    );
  });
});
