import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const migration = readFileSync(
  new URL("../prisma/migrations/202608120004_admin_console_settings/migration.sql", import.meta.url),
  "utf8",
);

describe("Admin Console settings persistence", () => {
  it("models tenant-scoped values and append-only revisions", () => {
    assert.match(schema, /model SettingValue \{/);
    assert.match(schema, /model SettingRevision \{/);
    assert.match(schema, /effectiveFromMonth\s+String\?\s+@map\("effective_from_month"\)/);
    assert.match(schema, /@@unique\(\[settingValueId, revision\]\)/);
    assert.match(migration, /setting_revisions_append_only/);
    assert.match(migration, /BEFORE UPDATE OR DELETE ON "setting_revisions"/);
  });

  it("uses separate uniqueness rules for dated and undated overrides", () => {
    assert.match(migration, /setting_values_tenant_key_month_unique[\s\S]+WHERE "effective_from_month" IS NOT NULL/);
    assert.match(migration, /setting_values_tenant_key_default_unique[\s\S]+WHERE "effective_from_month" IS NULL/);
  });

  it("protects tenant, actor and setting references with restrictive foreign keys", () => {
    assert.equal((migration.match(/ON DELETE RESTRICT/g) ?? []).length, 5);
    assert.match(migration, /REFERENCES "tenants"\("id"\)/);
    assert.match(migration, /REFERENCES "users"\("id"\)/);
    assert.match(migration, /REFERENCES "setting_values"\("id"\)/);
  });
});
