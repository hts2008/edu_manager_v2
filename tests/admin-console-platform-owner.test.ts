import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const migration = readFileSync(
  new URL("../prisma/migrations/202608120006_admin_console_platform_owner/migration.sql", import.meta.url),
  "utf8",
);

describe("Admin Console platform owner identity", () => {
  it("persists an explicit fail-closed identity flag", () => {
    assert.match(schema, /isPlatformOwner\s+Boolean\s+@default\(false\)\s+@map\("is_platform_owner"\)/);
  });

  it("does not select or promote any existing identity", () => {
    const sql = migration.replace(/--[^\n]*/g, "");
    assert.doesNotMatch(sql, /UPDATE|INSERT|DELETE|TRUNCATE|DROP|FROM\s+"users"/i);
    assert.match(sql, /BEGIN;/);
    assert.match(sql, /COMMIT;/);
  });
});
