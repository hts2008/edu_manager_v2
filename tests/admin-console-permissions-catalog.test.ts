import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PERMISSION_CATALOG,
  PERMISSION_KEYS,
  PERMISSION_ROLES,
  assertPermissionKey,
  assertPermissionRole,
  getDefaultPermission,
  getPermissionDefinition,
  isPermissionKey,
  isPermissionRole,
  listDefaultPermissions,
  type PermissionKey,
} from "../lib/permissions-catalog.js";

const compileTimePermissionKey: PermissionKey = "attendance.manage";

const CURRENT_SHARED_PERMISSIONS = [
  "students.manage",
  "classes.manage",
  "attendance.manage",
  "fees.collect",
  "receipts.manage",
  "progress.view",
  "progress.grade",
] as const;

const CURRENT_ADMIN_ONLY_PERMISSIONS = [
  "users.manage",
  "backups.manage",
  "recycle_bin.manage",
  "audit_logs.view",
  "fee_reminders.send",
  "imports.run",
  "bulk_actions.run",
  "monthly_fees.generate",
  "reports.view",
  "templates.manage",
  "users.reset_password",
  "console.access",
  "console.organization.view",
  "console.finance.edit",
  "console.academic.edit",
  "console.access.edit",
  "console.integrations.edit",
  "console.experience.view",
  "console.experience.edit",
] as const;

describe("admin console permission catalog", () => {
  it("contains unique, explicit permission keys with complete role defaults", () => {
    assert.equal(compileTimePermissionKey, "attendance.manage");
    assert.equal(PERMISSION_KEYS.length, 26);
    assert.equal(new Set(PERMISSION_KEYS).size, PERMISSION_KEYS.length);

    for (const permission of PERMISSION_CATALOG) {
      assert.equal(getPermissionDefinition(permission.key), permission);
      assert.ok(permission.labelVi.length > 0);
      assert.ok(permission.descriptionVi.length > 0);
      assert.ok(permission.surfaces.length > 0);
      assert.equal(typeof permission.defaults.admin, "boolean");
      assert.equal(typeof permission.defaults.receptionist, "boolean");
    }
  });

  it("preserves all current shared admin and receptionist behavior", () => {
    assert.deepEqual(
      listDefaultPermissions("receptionist").sort(),
      [...CURRENT_SHARED_PERMISSIONS].sort(),
    );

    for (const key of CURRENT_SHARED_PERMISSIONS) {
      assert.equal(getDefaultPermission("admin", key), true, key);
      assert.equal(getDefaultPermission("receptionist", key), true, key);
    }
  });

  it("preserves current admin-only behavior including every console section", () => {
    assert.equal(listDefaultPermissions("admin").length, PERMISSION_KEYS.length);

    for (const key of CURRENT_ADMIN_ONLY_PERMISSIONS) {
      assert.equal(getDefaultPermission("admin", key), true, key);
      assert.equal(getDefaultPermission("receptionist", key), false, key);
    }
  });

  it("keeps catalog metadata aligned with the operational and console surfaces", () => {
    assert.ok(getPermissionDefinition("fees.collect").surfaces.includes("/api/monthly-fees/*"));
    assert.ok(getPermissionDefinition("reports.view").surfaces.includes("/api/reports/*"));
    assert.ok(getPermissionDefinition("console.access").surfaces.includes("/admin"));
    assert.ok(
      getPermissionDefinition("console.organization.view").surfaces.includes(
        "/admin/organization",
      ),
    );
  });

  it("validates roles and keys without accepting unknown input", () => {
    assert.deepEqual(PERMISSION_ROLES, ["admin", "receptionist"]);
    assert.equal(isPermissionRole("admin"), true);
    assert.equal(isPermissionRole("owner"), false);
    assert.equal(isPermissionKey("attendance.manage"), true);
    assert.equal(isPermissionKey("attendance.delete_everything"), false);

    assert.equal(assertPermissionRole("receptionist"), "receptionist");
    assert.equal(assertPermissionKey("students.manage"), "students.manage");
    assert.throws(() => assertPermissionRole("owner"), /Unknown permission role/);
    assert.throws(() => assertPermissionRole(null), /Unknown permission role/);
    assert.throws(() => assertPermissionKey("users.*"), /Unknown permission key/);
    assert.throws(() => getPermissionDefinition("users.*"), /Unknown permission key/);
  });

  it("fails closed when callers bypass compile-time types", () => {
    assert.throws(
      () => getDefaultPermission("owner" as never, "students.manage"),
      /Unknown permission role/,
    );
    assert.throws(
      () => getDefaultPermission("admin", "students.*" as never),
      /Unknown permission key/,
    );
  });
});
