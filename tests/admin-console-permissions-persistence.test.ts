import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync(
  "prisma/migrations/202608120005_admin_console_role_permissions/migration.sql",
  "utf8",
);

describe("Admin Console permission persistence", () => {
  it("defines tenant-scoped role override persistence in Prisma", () => {
    assert.match(schema, /model RolePermission \{/);
    assert.match(schema, /tenantId\s+String\s+@map\("tenant_id"\)/);
    assert.match(schema, /role\s+UserRole/);
    assert.match(schema, /permissionKey\s+String\s+@map\("permission_key"\)/);
    assert.match(schema, /allowed\s+Boolean/);
    assert.match(schema, /@@unique\(\[tenantId, role, permissionKey\]\)/);
    assert.match(schema, /@@map\("role_permissions"\)/);
  });

  it("creates constrained override storage without broadening tenant deletion", () => {
    assert.match(migration, /CREATE TABLE "role_permissions"/);
    assert.match(migration, /FOREIGN KEY \("tenant_id"\).*ON DELETE RESTRICT/is);
    assert.match(migration, /FOREIGN KEY \("updated_by"\).*ON DELETE RESTRICT/is);
    assert.match(migration, /UNIQUE \("tenant_id", "role", "permission_key"\)/);
    assert.match(migration, /CHECK \("permission_key" IN \(/);
    assert.doesNotMatch(migration, /ON DELETE CASCADE/i);
  });
});
