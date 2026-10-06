import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BACKUP_FORMAT,
  BACKUP_MANIFEST,
  BACKUP_VERSION,
  DEFAULT_TENANT_ID,
  normalizeBackup,
} from "../lib/backup.js";

function legacyBackup() {
  const legacyManifest = BACKUP_MANIFEST
    .filter(({ model }) => ![
      "Tenant",
      "RolePermission",
      "SettingValue",
      "SettingRevision",
      "IntegrationConfig",
    ].includes(model))
    .map(({ model, key }) => ({ model, key }));
  const tables = Object.fromEntries(legacyManifest.map(({ key }) => [key, []]));
  tables.users = [{ id: "user-1", username: "admin" }];
  return {
    format: BACKUP_FORMAT,
    version: 3,
    created_at: "2026-08-12T00:00:00.000Z",
    source: "edu-manager-v2",
    manifest: legacyManifest,
    tables,
    counts: Object.fromEntries(legacyManifest.map(({ key }) => [key, tables[key].length])),
  };
}

describe("backup v3 to v4 compatibility", () => {
  it("adds the deterministic tenant and scopes every legacy business row", () => {
    const normalized = normalizeBackup(legacyBackup());
    assert.equal(normalized.version, BACKUP_VERSION);
    assert.equal(normalized.tables.tenants[0].id, DEFAULT_TENANT_ID);
    assert.equal(normalized.tables.users[0].tenantId, DEFAULT_TENANT_ID);
    assert.equal(normalized.counts.tenants, 1);
    assert.equal(normalized.counts.rolePermissions, 0);
    assert.equal(normalized.counts.settingValues, 0);
    assert.equal(normalized.counts.settingRevisions, 0);
    assert.deepEqual(normalized.manifest, BACKUP_MANIFEST.map(({ model, key }) => ({ model, key })));
  });

  it("rejects a legacy backup with count drift before mapping", () => {
    const backup = legacyBackup();
    backup.counts.users = 0;
    assert.throws(() => normalizeBackup(backup), /Legacy backup table count is invalid: users/);
  });

  it("rejects unsupported versions rather than guessing", () => {
    assert.throws(() => normalizeBackup({ ...legacyBackup(), version: 2 }), /not supported/);
  });
});
