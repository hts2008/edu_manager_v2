import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
  getIntegrationConfig,
  resolveIntegrationDeliveryConfig,
  testIntegrationDelivery,
  upsertIntegrationConfig,
} from "../lib/integration-config.js";

const TEST_KEY = "integration-test-key-with-at-least-32-characters";

function database() {
  const rows: any[] = [];
  const db: any = {
    integrationConfig: {
      findUnique: async ({ where }: any) =>
        rows.find(
          (row) =>
            row.tenantId === where.tenantId_kind.tenantId &&
            row.kind === where.tenantId_kind.kind,
        ) ?? null,
      upsert: async ({ where, create, update }: any) => {
        const existing = rows.find(
          (row) =>
            row.tenantId === where.tenantId_kind.tenantId &&
            row.kind === where.tenantId_kind.kind,
        );
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return existing;
        }
        const row = {
          id: `integration-${rows.length + 1}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...create,
        };
        rows.push(row);
        return row;
      },
    },
  };
  return { db, rows };
}

const originalEnv = {
  key: process.env.INTEGRATION_ENCRYPTION_KEY,
  legacyTenantId: process.env.INTEGRATION_LEGACY_ENV_TENANT_ID,
  reminderUrl: process.env.REMINDER_WEBHOOK_URL,
  reminderToken: process.env.REMINDER_WEBHOOK_TOKEN,
  smsUrl: process.env.SMS_WEBHOOK_URL,
  vercelEnv: process.env.VERCEL_ENV,
};

afterEach(() => {
  const values = {
    INTEGRATION_ENCRYPTION_KEY: originalEnv.key,
    INTEGRATION_LEGACY_ENV_TENANT_ID: originalEnv.legacyTenantId,
    REMINDER_WEBHOOK_URL: originalEnv.reminderUrl,
    REMINDER_WEBHOOK_TOKEN: originalEnv.reminderToken,
    SMS_WEBHOOK_URL: originalEnv.smsUrl,
    VERCEL_ENV: originalEnv.vercelEnv,
  };
  for (const [name, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe("IntegrationConfig encryption", () => {
  it("uses an authenticated AES-256-GCM envelope and never stores plaintext", () => {
    const plaintext = "provider-token-super-secret";
    const encrypted = encryptIntegrationSecret(plaintext, TEST_KEY);

    assert.equal(encrypted.includes(plaintext), false);
    const envelope = JSON.parse(encrypted);
    assert.equal(envelope.algorithm, "aes-256-gcm");
    assert.equal(envelope.version, 1);
    assert.equal(typeof envelope.iv, "string");
    assert.equal(typeof envelope.tag, "string");
    assert.equal(decryptIntegrationSecret(encrypted, TEST_KEY), plaintext);
  });

  it("fails closed when the key is missing, short, or incorrect", () => {
    assert.throws(
      () => encryptIntegrationSecret("secret", "short"),
      (error: any) => error.code === "INTEGRATION_KEY_NOT_CONFIGURED",
    );
    const encrypted = encryptIntegrationSecret("secret", TEST_KEY);
    assert.throws(
      () => decryptIntegrationSecret(encrypted, `${TEST_KEY}-different`),
      (error: any) => error.code === "INTEGRATION_DECRYPT_FAILED",
    );
  });
});

describe("tenant-scoped IntegrationConfig persistence", () => {
  it("isolates tenants, encrypts secrets, and returns only redacted metadata", async () => {
    process.env.INTEGRATION_ENCRYPTION_KEY = TEST_KEY;
    const { db, rows } = database();

    await upsertIntegrationConfig(db, {
      tenantId: "tenant-a",
      kind: "fee_reminder_webhook",
      config: { url: "https://a.example.test/hook", enabled: true },
      secret: "token-a",
      updatedById: "admin-a",
    });
    await upsertIntegrationConfig(db, {
      tenantId: "tenant-b",
      kind: "fee_reminder_webhook",
      config: { url: "https://b.example.test/hook", enabled: false },
      secret: "token-b",
      updatedById: "admin-b",
    });

    assert.equal(rows.length, 2);
    assert.equal(rows[0].secretEncrypted.includes("token-a"), false);
    const tenantA = await getIntegrationConfig(db, "tenant-a", "fee_reminder_webhook");
    assert.deepEqual(tenantA?.config, {
      url: "https://a.example.test/hook",
      enabled: true,
    });
    assert.equal(tenantA?.secret_configured, true);
    assert.equal("secret" in (tenantA as any), false);
    assert.equal("secretEncrypted" in (tenantA as any), false);
    assert.equal(JSON.stringify(tenantA).includes("token-a"), false);
    assert.equal(JSON.stringify(tenantA).includes("token-b"), false);
  });

  it("preserves an existing secret only when the endpoint is unchanged", async () => {
    process.env.INTEGRATION_ENCRYPTION_KEY = TEST_KEY;
    const { db, rows } = database();
    await upsertIntegrationConfig(db, {
      tenantId: "tenant-a",
      kind: "sms_webhook",
      config: { url: "https://sms.example.test/send", enabled: true },
      secret: "keep-me",
      updatedById: "admin-a",
    });
    const encrypted = rows[0].secretEncrypted;

    await upsertIntegrationConfig(db, {
      tenantId: "tenant-a",
      kind: "sms_webhook",
      config: { url: "https://sms.example.test/send", enabled: false },
      updatedById: "admin-a",
    });
    assert.equal(rows[0].secretEncrypted, encrypted);

    await assert.rejects(
      () =>
        upsertIntegrationConfig(db, {
          tenantId: "tenant-a",
          kind: "sms_webhook",
          config: { url: "https://attacker.example.test/collect", enabled: true },
          updatedById: "admin-a",
        }),
      (error: any) => error.code === "INTEGRATION_SECRET_REENTRY_REQUIRED",
    );
    assert.equal(rows[0].config.url, "https://sms.example.test/send");

    await upsertIntegrationConfig(db, {
      tenantId: "tenant-a",
      kind: "sms_webhook",
      config: { url: "https://sms.example.test/v2/send", enabled: false },
      secret: "replacement-secret",
      updatedById: "admin-a",
    });
    assert.equal(
      decryptIntegrationSecret(rows[0].secretEncrypted, TEST_KEY),
      "replacement-secret",
    );
  });
});

describe("IntegrationConfig transition fallback and test-send", () => {
  it("fails closed for normal tenants and permits env fallback only for the explicit legacy tenant", async () => {
    process.env.INTEGRATION_ENCRYPTION_KEY = TEST_KEY;
    process.env.INTEGRATION_LEGACY_ENV_TENANT_ID = "tenant_default";
    process.env.REMINDER_WEBHOOK_URL = "https://env.example.test/hook";
    process.env.REMINDER_WEBHOOK_TOKEN = "env-token";
    const { db } = database();

    const isolated = await resolveIntegrationDeliveryConfig(
      db,
      "tenant-a",
      "fee_reminder_webhook",
    );
    assert.equal(isolated.source, "none");
    assert.equal(isolated.url, "");
    assert.equal(isolated.secret, null);

    const fallback = await resolveIntegrationDeliveryConfig(
      db,
      "tenant_default",
      "fee_reminder_webhook",
    );
    assert.equal(fallback.source, "env");
    assert.equal(fallback.url, "https://env.example.test/hook");
    assert.equal(fallback.secret, "env-token");

    await upsertIntegrationConfig(db, {
      tenantId: "tenant-a",
      kind: "fee_reminder_webhook",
      config: { url: "https://db.example.test/hook", enabled: true },
      secret: "db-token",
      updatedById: "admin-a",
    });
    const resolved = await resolveIntegrationDeliveryConfig(
      db,
      "tenant-a",
      "fee_reminder_webhook",
    );
    assert.equal(resolved.source, "database");
    assert.equal(resolved.url, "https://db.example.test/hook");
    assert.equal(resolved.secret, "db-token");
  });

  it("sends a safe sample payload without returning or leaking the secret", async () => {
    process.env.INTEGRATION_ENCRYPTION_KEY = TEST_KEY;
    const { db } = database();
    await upsertIntegrationConfig(db, {
      tenantId: "tenant-a",
      kind: "fee_reminder_webhook",
      config: { url: "https://1.1.1.1/hook", enabled: true },
      secret: "bearer-secret",
      updatedById: "admin-a",
    });

    let authorization = "";
    const result = await testIntegrationDelivery(db, {
      tenantId: "tenant-a",
      kind: "fee_reminder_webhook",
      fetchImpl: async (_url, init) => {
        authorization = String((init?.headers as Record<string, string>).authorization);
        assert.equal(init?.redirect, "error");
        return new Response("provider echoed bearer-secret", {
          status: 202,
          statusText: "Accepted",
        });
      },
    });

    assert.equal(authorization, "Bearer bearer-secret");
    assert.equal(result.ok, true);
    assert.equal(result.status, 202);
    assert.equal(JSON.stringify(result).includes("bearer-secret"), false);
  });

  it("rejects private, loopback, metadata, and DNS-resolved private endpoints", async () => {
    process.env.INTEGRATION_ENCRYPTION_KEY = TEST_KEY;
    for (const url of [
      "https://127.0.0.1/hook",
      "https://10.0.0.2/hook",
      "https://169.254.169.254/latest/meta-data",
      "https://[::1]/hook",
      "https://[fe80::1]/hook",
    ]) {
      const { db } = database();
      await upsertIntegrationConfig(db, {
        tenantId: "tenant-a",
        kind: "fee_reminder_webhook",
        config: { url, enabled: true },
        secret: "never-send",
        updatedById: "admin-a",
      });
      await assert.rejects(
        () =>
          testIntegrationDelivery(db, {
            tenantId: "tenant-a",
            kind: "fee_reminder_webhook",
            fetchImpl: async () => assert.fail("blocked endpoint must not be fetched"),
          }),
        (error: any) => error.code === "INTEGRATION_ENDPOINT_FORBIDDEN",
      );
    }

    const { db } = database();
    await upsertIntegrationConfig(db, {
      tenantId: "tenant-a",
      kind: "sms_webhook",
      config: { url: "https://provider.example.test/send", enabled: true },
      secret: "never-send",
      updatedById: "admin-a",
    });
    await assert.rejects(
      () =>
        testIntegrationDelivery(db, {
          tenantId: "tenant-a",
          kind: "sms_webhook",
          lookupImpl: async () => [{ address: "192.168.1.10", family: 4 }],
          fetchImpl: async () => assert.fail("DNS-private endpoint must not be fetched"),
        }),
      (error: any) => error.code === "INTEGRATION_ENDPOINT_FORBIDDEN",
    );
  });

  it("requires HTTPS in production", async () => {
    process.env.INTEGRATION_ENCRYPTION_KEY = TEST_KEY;
    process.env.VERCEL_ENV = "production";
    const { db } = database();
    await upsertIntegrationConfig(db, {
      tenantId: "tenant-a",
      kind: "sms_webhook",
      config: { url: "http://1.1.1.1/send", enabled: true },
      secret: "never-send",
      updatedById: "admin-a",
    });
    await assert.rejects(
      () =>
        testIntegrationDelivery(db, {
          tenantId: "tenant-a",
          kind: "sms_webhook",
          fetchImpl: async () => assert.fail("HTTP endpoint must not be fetched"),
        }),
      (error: any) => error.code === "INTEGRATION_HTTPS_REQUIRED",
    );
  });

  it("returns a clear sanitized error for an invalid or failing endpoint", async () => {
    process.env.INTEGRATION_ENCRYPTION_KEY = TEST_KEY;
    const { db } = database();
    await upsertIntegrationConfig(db, {
      tenantId: "tenant-a",
      kind: "sms_webhook",
      config: { url: "not-a-url", enabled: true },
      secret: "do-not-leak",
      updatedById: "admin-a",
    });

    await assert.rejects(
      () =>
        testIntegrationDelivery(db, {
          tenantId: "tenant-a",
          kind: "sms_webhook",
          fetchImpl: async () => new Response(null, { status: 500 }),
        }),
      (error: any) =>
        error.code === "INTEGRATION_URL_INVALID" &&
        !String(error.message).includes("do-not-leak"),
    );
  });
});
