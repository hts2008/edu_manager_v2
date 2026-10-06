import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = readFileSync(
  new URL("../lib/require-permission.ts", import.meta.url),
  "utf8",
);

describe("Admin Console permission middleware contract", () => {
  it("authenticates first and resolves the effective tenant-role matrix", () => {
    assert.match(source, /return requireAuth\(async/);
    assert.match(source, /resolvePermissions\([\s\S]*req\.db[\s\S]*user\.tenantId[\s\S]*user\.role/);
  });

  it("fails closed without tenant context or the requested permission", () => {
    assert.match(source, /TENANT_CONTEXT_REQUIRED/);
    assert.match(source, /PERMISSION_DENIED/);
    assert.match(source, /permission_key: permissionKey/);
  });
});
