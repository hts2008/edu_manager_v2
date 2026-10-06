import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AuthedRequest } from "../lib/auth.js";
import { createTestRequest, createTestResponse } from "../lib/request-response-adapter.js";
import { handler as featuresHandler } from "../server/api/admin/features.js";
import { handler as integrationsHandler } from "../server/api/admin/integrations.js";

function database() {
  const rows: any[] = [];
  let configVersion = 0;
  const db: any = {
    tenant: {
      findUnique: async () => ({ configVersion }),
      update: async () => ({ configVersion: ++configVersion }),
    },
    settingValue: {
      findMany: async () => rows,
      findFirst: async ({ where }: any) =>
        rows.find((row) =>
          row.tenantId === where.tenantId &&
          row.key === where.key &&
          row.effectiveFromMonth === where.effectiveFromMonth),
      create: async ({ data }: any) => {
        const row = { id: `setting-${rows.length + 1}`, updatedAt: new Date(), ...data };
        rows.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const row = rows.find((candidate) => candidate.id === where.id);
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
    },
    settingRevision: { create: async () => ({}) },
    activityLog: { create: async () => ({}) },
  };
  db.$transaction = async (callback: (tx: any) => unknown) => callback(db);
  return db;
}

function request(db: any, method: string, body?: unknown) {
  return {
    ...createTestRequest({ method, body }),
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

describe("Admin Console feature flags API", () => {
  it("lists only flags with a stable snake_case contract", async () => {
    const response = createTestResponse();
    await featuresHandler(request(database(), "GET"), response.res);

    assert.equal(response.state.statusCode, 200);
    const data = (response.state.body as any).data;
    assert.equal(data.features.length, 2);
    assert.deepEqual(
      data.features.map((feature: any) => feature.key),
      ["flags.fee_reminders_enabled", "flags.parent_portal_enabled"],
    );
    assert.equal(data.features[0].enabled, false);
    assert.equal(data.features[0].updated_by_id, null);
    assert.equal("updatedById" in data.features[0], false);
  });

  it("validates keys and boolean values before writing", async () => {
    const db = database();
    const unknown = createTestResponse();
    await featuresHandler(
      request(db, "PUT", { key: "finance.bulk_actions_max", enabled: true }),
      unknown.res,
    );
    assert.equal((unknown.state.body as any).error.code, "UNKNOWN_FEATURE_FLAG");

    const invalid = createTestResponse();
    await featuresHandler(
      request(db, "PUT", { key: "flags.parent_portal_enabled", enabled: "yes" }),
      invalid.res,
    );
    assert.equal((invalid.state.body as any).error.code, "INVALID_FEATURE_FLAG_VALUE");
  });

  it("updates a tenant flag through the settings service", async () => {
    const response = createTestResponse();
    await featuresHandler(
      request(database(), "PUT", {
        key: "flags.fee_reminders_enabled",
        enabled: true,
        change_note: "Enable for tenant rollout",
      }),
      response.res,
    );
    assert.equal(response.state.statusCode, 200);
    assert.equal((response.state.body as any).data.feature.enabled, true);
    assert.equal((response.state.body as any).data.feature.key, "flags.fee_reminders_enabled");
  });
});

describe("Admin Console integrations API", () => {
  it("reports readiness without exposing endpoint or token values", async () => {
    const previous = {
      enabled: process.env.REMINDER_SEND_ENABLED,
      url: process.env.REMINDER_WEBHOOK_URL,
      token: process.env.REMINDER_WEBHOOK_TOKEN,
    };
    process.env.REMINDER_SEND_ENABLED = "true";
    process.env.REMINDER_WEBHOOK_URL = "https://secret.example.test/hook";
    process.env.REMINDER_WEBHOOK_TOKEN = "top-secret";
    try {
      const response = createTestResponse();
      const legacyRequest = request(database(), "GET");
      legacyRequest.user.tenantId = "tenant_default";
      await integrationsHandler(legacyRequest, response.res);
      const serialized = JSON.stringify(response.state.body);
      const integration = (response.state.body as any).data.integrations[0];
      assert.equal(integration.kind, "fee_reminder_webhook");
      assert.equal(integration.endpoint_configured, true);
      assert.equal(integration.credential_configured, true);
      assert.equal(integration.status, "disabled");
      assert.equal(serialized.includes("secret.example.test"), false);
      assert.equal(serialized.includes("top-secret"), false);
    } finally {
      for (const [key, value] of Object.entries({
        REMINDER_SEND_ENABLED: previous.enabled,
        REMINDER_WEBHOOK_URL: previous.url,
        REMINDER_WEBHOOK_TOKEN: previous.token,
      })) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it("requires a supported kind and exactly one supported field", async () => {
    const db = database();
    const kind = createTestResponse();
    await integrationsHandler(
      request(db, "PUT", { kind: "zalo_native", field: "enabled", value: true }),
      kind.res,
    );
    assert.equal((kind.state.body as any).error.code, "UNKNOWN_INTEGRATION");

    const field = createTestResponse();
    await integrationsHandler(
      request(db, "PUT", { kind: "fee_reminder_webhook", field: "token", value: "secret" }),
      field.res,
    );
    assert.equal((field.state.body as any).error.code, "UNKNOWN_INTEGRATION_FIELD");
  });

  it("updates enabled and message template as tenant settings", async () => {
    const db = database();
    const enabled = createTestResponse();
    await integrationsHandler(
      request(db, "PUT", {
        kind: "fee_reminder_webhook",
        field: "enabled",
        value: true,
      }),
      enabled.res,
    );
    assert.equal((enabled.state.body as any).data.integration.enabled, true);

    const message = createTestResponse();
    await integrationsHandler(
      request(db, "PUT", {
        kind: "fee_reminder_webhook",
        field: "message_template",
        value: "Hoc phi {{thang}} cua {{ten}} la {{sotien}}.",
      }),
      message.res,
    );
    assert.equal(
      (message.state.body as any).data.integration.message_template,
      "Hoc phi {{thang}} cua {{ten}} la {{sotien}}.",
    );
  });
});
