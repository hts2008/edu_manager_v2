import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolvePermissions,
  updatePermissionOverride,
  type PermissionsDatabase,
} from "../lib/permissions.js";

type OverrideRow = {
  id: string;
  tenantId: string;
  role: "admin" | "receptionist";
  permissionKey: string;
  allowed: boolean;
  updatedById: string;
};

function createHarness(seed: OverrideRow[] = []) {
  const rows = seed.map((row) => ({ ...row }));
  const activity: any[] = [];
  let configVersion = 2;
  let findManyCount = 0;
  let transactionCount = 0;

  const tx: any = {
    tenant: {
      findUnique: async ({ where }: any) =>
        where.id === "missing" ? null : { configVersion },
      update: async () => ({ configVersion: ++configVersion }),
    },
    rolePermission: {
      findMany: async ({ where }: any) => {
        findManyCount += 1;
        return rows.filter(
          (row) => row.tenantId === where.tenantId && row.role === where.role,
        );
      },
      findUnique: async ({ where }: any) => {
        const key = where.tenantId_role_permissionKey;
        return rows.find(
          (row) =>
            row.tenantId === key.tenantId &&
            row.role === key.role &&
            row.permissionKey === key.permissionKey,
        ) ?? null;
      },
      upsert: async ({ where, create, update }: any) => {
        const key = where.tenantId_role_permissionKey;
        const existing = rows.find(
          (row) =>
            row.tenantId === key.tenantId &&
            row.role === key.role &&
            row.permissionKey === key.permissionKey,
        );
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const created = { id: `permission-${rows.length + 1}`, ...create };
        rows.push(created);
        return created;
      },
      delete: async ({ where }: any) => {
        const key = where.tenantId_role_permissionKey;
        const index = rows.findIndex(
          (row) =>
            row.tenantId === key.tenantId &&
            row.role === key.role &&
            row.permissionKey === key.permissionKey,
        );
        return rows.splice(index, 1)[0];
      },
    },
    activityLog: {
      create: async ({ data }: any) => {
        activity.push(data);
        return { id: activity.length, ...data };
      },
    },
  };

  const db: PermissionsDatabase = {
    ...tx,
    $transaction: async (operation: (client: any) => Promise<unknown>) => {
      transactionCount += 1;
      return operation(tx);
    },
  } as PermissionsDatabase;

  return {
    activity,
    db,
    rows,
    get configVersion() { return configVersion; },
    setConfigVersion(value: number) { configVersion = value; },
    get findManyCount() { return findManyCount; },
    get transactionCount() { return transactionCount; },
  };
}

describe("Admin Console permission service", () => {
  it("returns catalog defaults when no override exists", async () => {
    const harness = createHarness();

    const admin = await resolvePermissions(harness.db, "tenant-a", "admin");
    const receptionist = await resolvePermissions(harness.db, "tenant-a", "receptionist");

    assert.ok(admin.includes("console.access"));
    assert.ok(admin.includes("reports.view"));
    assert.ok(receptionist.includes("attendance.manage"));
    assert.equal(receptionist.includes("reports.view"), false);
  });

  it("overlays only the tenant and role override requested", async () => {
    const harness = createHarness([
      {
        id: "override-a",
        tenantId: "tenant-a",
        role: "receptionist",
        permissionKey: "reports.view",
        allowed: true,
        updatedById: "admin-a",
      },
      {
        id: "override-b",
        tenantId: "tenant-b",
        role: "receptionist",
        permissionKey: "templates.manage",
        allowed: true,
        updatedById: "admin-b",
      },
    ]);

    const permissions = await resolvePermissions(
      harness.db,
      "tenant-a",
      "receptionist",
    );

    assert.ok(permissions.includes("reports.view"));
    assert.equal(permissions.includes("templates.manage"), false);
    assert.ok(permissions.includes("attendance.manage"));
  });

  it("caches by tenant configVersion and refreshes after version changes", async () => {
    const harness = createHarness();

    await resolvePermissions(harness.db, "tenant-a", "receptionist");
    await resolvePermissions(harness.db, "tenant-a", "receptionist");
    assert.equal(harness.findManyCount, 1);

    harness.setConfigVersion(3);
    await resolvePermissions(harness.db, "tenant-a", "receptionist");
    assert.equal(harness.findManyCount, 2);
  });

  it("writes an override, bumps configVersion, and records an audit diff atomically", async () => {
    const harness = createHarness();

    const result = await updatePermissionOverride(harness.db, {
      tenantId: "tenant-a",
      role: "receptionist",
      permissionKey: "reports.view",
      allowed: true,
      actorId: "admin-a",
    });

    assert.equal(result.changed, true);
    assert.equal(result.allowed, true);
    assert.equal(result.isOverride, true);
    assert.equal(harness.transactionCount, 1);
    assert.equal(harness.configVersion, 3);
    assert.equal(harness.rows.length, 1);
    assert.equal(harness.activity.length, 1);
    assert.match(harness.activity[0].action, /"type":"permission.override"/);
    assert.match(harness.activity[0].action, /"oldAllowed":false/);
    assert.match(harness.activity[0].action, /"newAllowed":true/);
  });

  it("removes a redundant override when the value returns to the catalog default", async () => {
    const harness = createHarness([
      {
        id: "override-a",
        tenantId: "tenant-a",
        role: "receptionist",
        permissionKey: "reports.view",
        allowed: true,
        updatedById: "admin-a",
      },
    ]);

    const result = await updatePermissionOverride(harness.db, {
      tenantId: "tenant-a",
      role: "receptionist",
      permissionKey: "reports.view",
      allowed: false,
      actorId: "admin-a",
    });

    assert.equal(result.isOverride, false);
    assert.equal(harness.rows.length, 0);
    assert.equal(harness.configVersion, 3);
  });

  it("does not write or bump configVersion for an effective no-op", async () => {
    const harness = createHarness();

    const result = await updatePermissionOverride(harness.db, {
      tenantId: "tenant-a",
      role: "receptionist",
      permissionKey: "reports.view",
      allowed: false,
      actorId: "admin-a",
    });

    assert.equal(result.changed, false);
    assert.equal(harness.configVersion, 2);
    assert.equal(harness.activity.length, 0);
  });

  it("fails closed for unknown tenant, role, and permission key", async () => {
    const harness = createHarness();

    await assert.rejects(
      resolvePermissions(harness.db, "missing", "admin"),
      (error: any) => error.code === "TENANT_NOT_FOUND",
    );
    await assert.rejects(
      resolvePermissions(harness.db, "tenant-a", "owner" as never),
      (error: any) => error.code === "UNKNOWN_PERMISSION_ROLE",
    );
    await assert.rejects(
      updatePermissionOverride(harness.db, {
        tenantId: "tenant-a",
        role: "admin",
        permissionKey: "unknown.permission" as never,
        allowed: true,
        actorId: "admin-a",
      }),
      (error: any) => error.code === "UNKNOWN_PERMISSION_KEY",
    );
  });

  it("prevents disabling either critical console permission for admin", async () => {
    const harness = createHarness();

    for (const permissionKey of ["console.access", "console.access.edit"] as const) {
      await assert.rejects(
        updatePermissionOverride(harness.db, {
          tenantId: "tenant-a",
          role: "admin",
          permissionKey,
          allowed: false,
          actorId: "admin-a",
        }),
        (error: any) =>
          error.code === "LOCKOUT_PREVENTED" && error.status === 400,
      );
    }

    assert.equal(harness.transactionCount, 0);
    assert.equal(harness.rows.length, 0);
  });
});
