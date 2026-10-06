import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AuthedRequest } from "../lib/auth.js";
import { createTestRequest, createTestResponse } from "../lib/request-response-adapter.js";
import { handler } from "../server/api/admin/permissions.js";

type OverrideRow = {
  tenantId: string;
  role: "admin" | "receptionist";
  permissionKey: string;
  allowed: boolean;
  updatedById: string;
};

function createHarness(seed: OverrideRow[] = []) {
  const rows = seed.map((row, index) => ({ id: `override-${index + 1}`, ...row }));
  const activity: any[] = [];
  const reads: any[] = [];
  let configVersion = 4;

  const tx: any = {
    tenant: {
      findUnique: async ({ where }: any) =>
        where.id.startsWith("tenant-") ? { configVersion } : null,
      update: async () => ({ configVersion: ++configVersion }),
    },
    rolePermission: {
      findMany: async ({ where }: any) => {
        reads.push(where);
        return rows.filter(
          (row) =>
            row.tenantId === where.tenantId &&
            (where.role === undefined || row.role === where.role),
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
        const current = rows.find(
          (row) =>
            row.tenantId === key.tenantId &&
            row.role === key.role &&
            row.permissionKey === key.permissionKey,
        );
        if (current) {
          Object.assign(current, update);
          return current;
        }
        const created = { id: `override-${rows.length + 1}`, ...create };
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
        return { id: `activity-${activity.length}`, ...data };
      },
    },
  };

  const db: any = {
    ...tx,
    $transaction: async (operation: (client: any) => Promise<unknown>) =>
      operation(tx),
  };
  return { activity, db, reads, rows };
}

function request(
  db: any,
  method: string,
  tenantId: string | null = "tenant-a",
  body?: unknown,
) {
  return {
    ...createTestRequest({ method, body }),
    user: {
      id: "admin-a",
      userId: "admin-a",
      role: "admin",
      tenantId,
      isPlatformOwner: false,
    },
    authToken: { sub: "admin-a" },
    db,
  } as AuthedRequest;
}

describe("Admin Console permissions API", () => {
  it("returns catalog and a tenant-scoped effective matrix", async () => {
    const harness = createHarness([
      {
        tenantId: "tenant-a",
        role: "receptionist",
        permissionKey: "reports.view",
        allowed: true,
        updatedById: "admin-a",
      },
      {
        tenantId: "tenant-b",
        role: "receptionist",
        permissionKey: "templates.manage",
        allowed: true,
        updatedById: "admin-b",
      },
    ]);
    const response = createTestResponse();

    await handler(request(harness.db, "GET"), response.res);

    assert.equal(response.state.statusCode, 200);
    const data = (response.state.body as any).data;
    assert.deepEqual(data.roles, ["admin", "receptionist"]);
    assert.ok(data.catalog.length >= 20);
    assert.equal(data.effective_matrix.receptionist["reports.view"].allowed, true);
    assert.equal(data.effective_matrix.receptionist["reports.view"].is_override, true);
    assert.equal(data.effective_matrix.receptionist["templates.manage"].allowed, false);
    assert.equal(data.effective_matrix.receptionist["templates.manage"].is_override, false);
    assert.ok(harness.reads.every((where) => where.tenantId === "tenant-a"));
  });

  it("updates one override through the audited tenant service", async () => {
    const harness = createHarness();
    const response = createTestResponse();

    await handler(
      request(harness.db, "PUT", "tenant-a", {
        role: "receptionist",
        permission_key: "reports.view",
        allowed: true,
      }),
      response.res,
    );

    assert.equal(response.state.statusCode, 200);
    const data = (response.state.body as any).data;
    assert.equal(data.changed, true);
    assert.equal(data.permission_key, "reports.view");
    assert.equal(harness.rows.length, 1);
    assert.equal(harness.rows[0].tenantId, "tenant-a");
    assert.equal(harness.rows[0].updatedById, "admin-a");
    assert.equal(harness.activity.length, 1);
    assert.equal(harness.activity[0].tenantId, "tenant-a");
    assert.match(harness.activity[0].action, /permission\.override/);
  });

  it("rejects missing tenant, invalid input, lockout, and unsupported methods", async () => {
    const harness = createHarness();

    const missingTenant = createTestResponse();
    await handler(request(harness.db, "GET", null), missingTenant.res);
    assert.equal(missingTenant.state.statusCode, 409);
    assert.equal((missingTenant.state.body as any).error.code, "TENANT_CONTEXT_REQUIRED");

    const invalid = createTestResponse();
    await handler(
      request(harness.db, "PUT", "tenant-a", {
        role: "receptionist",
        permission_key: "reports.view",
        allowed: "yes",
      }),
      invalid.res,
    );
    assert.equal(invalid.state.statusCode, 400);
    assert.equal((invalid.state.body as any).error.code, "INVALID_PERMISSION_VALUE");

    const lockout = createTestResponse();
    await handler(
      request(harness.db, "PUT", "tenant-a", {
        role: "admin",
        permissionKey: "console.access",
        allowed: false,
      }),
      lockout.res,
    );
    assert.equal(lockout.state.statusCode, 400);
    assert.equal((lockout.state.body as any).error.code, "LOCKOUT_PREVENTED");

    const unsupported = createTestResponse();
    await handler(request(harness.db, "DELETE"), unsupported.res);
    assert.equal(unsupported.state.statusCode, 405);
  });
});
