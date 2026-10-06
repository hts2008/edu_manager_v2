import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync(
  "prisma/migrations/202608140001_admin_console_integration_config/migration.sql",
  "utf8",
);

describe("IntegrationConfig schema and migration", () => {
  it("defines tenant ownership, encrypted secret storage, and actor attribution", () => {
    assert.match(schema, /model IntegrationConfig \{/);
    assert.match(schema, /tenantId\s+String\s+@map\("tenant_id"\)/);
    assert.match(
      schema,
      /secretEncrypted\s+String\?\s+@map\("secret_encrypted"\)/,
    );
    assert.match(schema, /@@unique\(\[tenantId, kind\]\)/);
    assert.match(
      schema,
      /@relation\("IntegrationConfigUpdatedBy", fields: \[updatedById\]/,
    );
  });

  it("uses an additive tenant-scoped migration without embedding secret values", () => {
    assert.match(migration, /CREATE TABLE "integration_configs"/);
    assert.match(migration, /"tenant_id" TEXT NOT NULL/);
    assert.match(migration, /"secret_encrypted" TEXT/);
    assert.match(
      migration,
      /CREATE UNIQUE INDEX "integration_configs_tenant_id_kind_key"/,
    );
    assert.match(migration, /REFERENCES "tenants"\("id"\)/);
    assert.match(migration, /REFERENCES "users"\("id"\)/);
    assert.doesNotMatch(migration, /REMINDER_WEBHOOK_TOKEN|SMS_WEBHOOK_TOKEN/);
  });
});
