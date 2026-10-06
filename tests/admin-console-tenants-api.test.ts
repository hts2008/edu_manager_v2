import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AuthedRequest } from "../lib/auth.js";
import { createTestRequest, createTestResponse } from "../lib/request-response-adapter.js";
import { createTenantManagementHandler } from "../server/api/admin/tenants.js";

const NOW = new Date("2026-08-12T00:00:00.000Z");

function tenant(overrides: Record<string, unknown> = {}) {
  return {
    id: "tenant-a",
    slug: "center-a",
    name: "Center A",
    status: "active",
    configVersion: 0,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function request(
  method: string,
  body?: unknown,
  isPlatformOwner: unknown = true,
) {
  return {
    ...createTestRequest({ method, body }),
    user: {
      id: "owner-a",
      userId: "owner-a",
      username: "owner",
      fullName: "Platform Owner",
      role: "admin",
      tenantId: "tenant-a",
      isPlatformOwner,
    },
    authToken: { sub: "owner-a" },
    db: {},
  } as unknown as AuthedRequest;
}

function mockDb(options: {
  activeCount?: number;
  createError?: unknown;
  existing?: ReturnType<typeof tenant> | null;
  list?: ReturnType<typeof tenant>[];
  updateError?: unknown;
} = {}) {
  const calls = {
    audits: [] as unknown[],
    creates: [] as unknown[],
    updates: [] as unknown[],
  };
  const db: any = {
    tenant: {
      count: async () => options.activeCount ?? 2,
      create: async (args: any) => {
        calls.creates.push(args);
        if (options.createError) throw options.createError;
        return tenant({ id: "tenant-new", ...args.data });
      },
      findMany: async () => options.list ?? [tenant()],
      findUnique: async () => options.existing === undefined ? tenant() : options.existing,
      update: async (args: any) => {
        calls.updates.push(args);
        if (options.updateError) throw options.updateError;
        return tenant({ ...args.data });
      },
    },
    activityLog: {
      create: async (args: any) => {
        calls.audits.push(args);
        return args.data;
      },
    },
  };
  db.$transaction = async (callback: (tx: any) => Promise<unknown>) => callback(db);
  return { calls, db };
}

describe("Admin Console tenant-management API", () => {
  it("fails closed for an admin without an explicit platform-owner flag", async () => {
    const { db } = mockDb();
    const response = createTestResponse();
    await createTenantManagementHandler(db)(request("GET", undefined, false) as any, response.res);

    assert.equal(response.state.statusCode, 403);
    assert.equal((response.state.body as any).error.code, "PLATFORM_OWNER_REQUIRED");
  });

  it("fails closed when the platform-owner flag is absent", async () => {
    const { db } = mockDb();
    const response = createTestResponse();
    const req = request("GET") as any;
    delete req.user.isPlatformOwner;
    await createTenantManagementHandler(db)(req, response.res);
    assert.equal(response.state.statusCode, 403);
  });

  it("lists tenants without exposing implementation-only field names", async () => {
    const { db } = mockDb({ list: [tenant()] });
    const response = createTestResponse();
    await createTenantManagementHandler(db)(request("GET") as any, response.res);

    assert.equal(response.state.statusCode, 200);
    assert.equal((response.state.body as any).data.total, 1);
    assert.equal((response.state.body as any).data.tenants[0].config_version, 0);
    assert.equal((response.state.body as any).data.tenants[0].configVersion, undefined);
  });

  it("creates a normalized tenant and records an audit event", async () => {
    const { calls, db } = mockDb();
    const response = createTestResponse();
    await createTenantManagementHandler(db)(
      request("POST", { name: "  Center New  ", slug: "Center-New" }) as any,
      response.res,
    );

    assert.equal(response.state.statusCode, 201);
    assert.deepEqual(calls.creates[0], {
      data: { name: "Center New", slug: "center-new" },
    });
    assert.equal((calls.audits[0] as any).data.action, "tenant.created");
  });

  it("maps duplicate slug conflicts to a stable 409 contract", async () => {
    const { db } = mockDb({ createError: { code: "P2002", meta: { target: ["slug"] } } });
    const response = createTestResponse();
    await createTenantManagementHandler(db)(
      request("POST", { name: "Duplicate", slug: "center-a" }) as any,
      response.res,
    );

    assert.equal(response.state.statusCode, 409);
    assert.equal((response.state.body as any).error.code, "TENANT_SLUG_EXISTS");
  });

  it("rejects invalid slugs before touching persistence", async () => {
    const { calls, db } = mockDb();
    const response = createTestResponse();
    await createTenantManagementHandler(db)(
      request("POST", { name: "Bad", slug: "bad slug!" }) as any,
      response.res,
    );

    assert.equal(response.state.statusCode, 400);
    assert.equal((response.state.body as any).error.code, "INVALID_SLUG");
    assert.equal(calls.creates.length, 0);
  });

  it("updates name, slug and status atomically", async () => {
    const { calls, db } = mockDb({ activeCount: 2 });
    const response = createTestResponse();
    await createTenantManagementHandler(db)(
      request("PATCH", {
        id: "tenant-a",
        name: "Renamed",
        slug: "renamed-center",
        status: "suspended",
      }) as any,
      response.res,
    );

    assert.equal(response.state.statusCode, 200);
    assert.deepEqual(calls.updates[0], {
      where: { id: "tenant-a" },
      data: { name: "Renamed", slug: "renamed-center", status: "suspended" },
    });
    assert.equal((calls.audits[0] as any).data.action, "tenant.updated");
  });

  it("prevents suspension of the last active tenant", async () => {
    const { calls, db } = mockDb({ activeCount: 1 });
    const response = createTestResponse();
    await createTenantManagementHandler(db)(
      request("PATCH", { id: "tenant-a", status: "suspended" }) as any,
      response.res,
    );

    assert.equal(response.state.statusCode, 409);
    assert.equal((response.state.body as any).error.code, "LAST_ACTIVE_TENANT");
    assert.equal(calls.updates.length, 0);
    assert.equal(calls.audits.length, 0);
  });

  it("returns 404 for an unknown tenant and rejects unsupported methods", async () => {
    const { db } = mockDb({ existing: null });
    const missing = createTestResponse();
    await createTenantManagementHandler(db)(
      request("PATCH", { id: "missing", name: "Missing" }) as any,
      missing.res,
    );
    assert.equal(missing.state.statusCode, 404);
    assert.equal((missing.state.body as any).error.code, "TENANT_NOT_FOUND");

    const unsupported = createTestResponse();
    await createTenantManagementHandler(db)(request("DELETE") as any, unsupported.res);
    assert.equal(unsupported.state.statusCode, 405);
  });
});
