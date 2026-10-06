import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import prisma from "../lib/prisma.js";
import { createTestRequest, createTestResponse } from "../lib/request-response-adapter.js";
import { bootstrapDatabase } from "../prisma/seed-bootstrap.js";
import staffLogin from "../server/api/auth/login.js";
import parentLogin from "../server/api/parent-portal/login.js";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function stub(t: any, target: any, method: string, implementation: any) {
  const original = target[method];
  target[method] = implementation;
  t.after(() => {
    target[method] = original;
  });
}

function mockRateLimit(t: any) {
  stub(t, prisma as any, "$transaction", async (work: any) =>
    work({
      $executeRaw: async () => 1,
      $queryRaw: async () => [{ count: 1, reset_at: new Date(Date.now() + 60_000) }],
    }),
  );
}

describe("Admin Console tenant identity contracts", () => {
  it("scopes staff and parent identity lookups without global unique selectors", () => {
    const staffLogin = source("server/api/auth/login.ts");
    const parentLogin = source("server/api/parent-portal/login.ts");
    const users = source("server/api/users/index.ts");

    assert.doesNotMatch(staffLogin, /user\.findUnique\(\{\s*where:\s*\{\s*username/s);
    assert.match(staffLogin, /tenantId:\s*tenant\.id/);
    assert.match(staffLogin, /findMany/);
    assert.match(staffLogin, /matches\.length\s*!==\s*1/);

    assert.doesNotMatch(parentLogin, /parent\.findUnique\(\{\s*where:\s*\{\s*phoneNormalized/s);
    assert.match(parentLogin, /tenantId:\s*tenant\.id/);
    assert.match(parentLogin, /tenantId_phoneNormalized/);

    assert.doesNotMatch(users, /user\.findUnique\(\{\s*where:\s*\{\s*username/s);
    assert.match(users, /user\.findFirst/);
  });

  it("does not access center settings through the global id=1 singleton", () => {
    for (const path of [
      "server/api/center-settings/index.ts",
      "server/api/student-progress/pdf.ts",
    ]) {
      const endpoint = source(path);
      assert.doesNotMatch(endpoint, /centerSettings\.(?:findUnique|upsert|update)\(\{\s*where:\s*\{\s*id:\s*1/s);
      assert.match(endpoint, /centerSettings\.findFirst/);
    }
  });

  it("rejects an ambiguous staff username when no tenant was selected", async (t) => {
    const previousMode = process.env.TENANCY_MODE;
    process.env.TENANCY_MODE = "legacy";
    t.after(() => {
      if (previousMode === undefined) delete process.env.TENANCY_MODE;
      else process.env.TENANCY_MODE = previousMode;
    });
    mockRateLimit(t);
    stub(t, prisma.user as any, "findMany", async () => [
      { id: "user-a", tenantId: "tenant-a" },
      { id: "user-b", tenantId: "tenant-b" },
    ]);
    const response = createTestResponse();

    await staffLogin(
      createTestRequest({
        method: "POST",
        body: { username: "admin", password: "secret" },
      }),
      response.res,
    );

    assert.equal(response.state.statusCode, 401);
    assert.equal((response.state.body as any).error.code, "INVALID_CREDENTIALS");
  });

  it("requires a parent tenant before credential lookup", async (t) => {
    const previousMode = process.env.TENANCY_MODE;
    process.env.TENANCY_MODE = "legacy";
    t.after(() => {
      if (previousMode === undefined) delete process.env.TENANCY_MODE;
      else process.env.TENANCY_MODE = previousMode;
    });
    mockRateLimit(t);
    let credentialLookups = 0;
    stub(t, prisma.parent as any, "findMany", async () => {
      credentialLookups += 1;
      return [];
    });
    const missingLegacyTenantResponse = createTestResponse();
    await parentLogin(
      createTestRequest({
        method: "POST",
        body: { phone: "0901234567", date_of_birth: "2015-04-12" },
      }),
      missingLegacyTenantResponse.res,
    );
    assert.equal(missingLegacyTenantResponse.state.statusCode, 400);
    assert.equal((missingLegacyTenantResponse.state.body as any).error.code, "TENANT_REQUIRED");
    assert.equal(credentialLookups, 0);

    process.env.TENANCY_MODE = "enforced";
    const missingTenantResponse = createTestResponse();
    await parentLogin(
      createTestRequest({
        method: "POST",
        body: { phone: "0901234567", date_of_birth: "2015-04-12" },
      }),
      missingTenantResponse.res,
    );
    assert.equal(missingTenantResponse.state.statusCode, 400);
    assert.equal((missingTenantResponse.state.body as any).error.code, "TENANT_REQUIRED");
    assert.equal(credentialLookups, 0);
  });

  it("checks the tenant parent-portal flag before credential verification", async (t) => {
    const previousMode = process.env.TENANCY_MODE;
    process.env.TENANCY_MODE = "enforced";
    t.after(() => {
      if (previousMode === undefined) delete process.env.TENANCY_MODE;
      else process.env.TENANCY_MODE = previousMode;
    });
    mockRateLimit(t);
    stub(t, prisma.tenant as any, "findUnique", async () => ({
      id: "tenant-disabled",
      slug: "disabled",
      status: "active",
      configVersion: 814,
    }));
    stub(t, prisma.settingValue as any, "findMany", async () => [{
      id: "setting-parent-portal",
      tenantId: "tenant-disabled",
      key: "flags.parent_portal_enabled",
      value: false,
      effectiveFromMonth: null,
      revision: 1,
      updatedById: "admin-disabled",
      updatedAt: new Date("2026-08-13T00:00:00.000Z"),
    }]);
    let credentialLookups = 0;
    stub(t, prisma.parent as any, "findMany", async () => {
      credentialLookups += 1;
      return [];
    });

    const response = createTestResponse();
    await parentLogin(
      createTestRequest({
        method: "POST",
        body: {
          tenant_slug: "disabled",
          phone: "0901234567",
          date_of_birth: "2015-04-12",
        },
      }),
      response.res,
    );

    assert.equal(response.state.statusCode, 403);
    assert.equal((response.state.body as any).error.code, "PARENT_PORTAL_DISABLED");
    assert.equal(credentialLookups, 0);
  });

  it("bootstraps tenant-owned identity and center settings idempotently", async () => {
    const calls: Array<{ model: string; operation: string; args: any }> = [];
    let admin: any = null;
    let center: any = null;
    const tx = {
      tenant: {
        findUnique: async (args: any) => {
          calls.push({ model: "tenant", operation: "findUnique", args });
          return { id: "tenant_default", slug: "default", status: "active" };
        },
      },
      user: {
        findFirst: async (args: any) => {
          calls.push({ model: "user", operation: "findFirst", args });
          return admin;
        },
        create: async ({ data }: any) => {
          admin = { id: "bootstrap-admin", ...data };
          return admin;
        },
        update: async ({ data }: any) => {
          admin = { ...admin, ...data };
          return admin;
        },
      },
      centerSettings: {
        findFirst: async (args: any) => {
          calls.push({ model: "centerSettings", operation: "findFirst", args });
          return center;
        },
        create: async ({ data }: any) => {
          center = { id: 9, ...data };
          return center;
        },
        update: async ({ data }: any) => {
          center = { ...center, ...data };
          return center;
        },
      },
      template: { findMany: async () => [{ id: "existing-default" }] },
    };
    const prisma = { $transaction: async (work: (client: typeof tx) => unknown) => work(tx) };

    const adminPasswordHash = "$2b$12$" + "a".repeat(53);
    await bootstrapDatabase(prisma as never, { adminPasswordHash });
    await bootstrapDatabase(prisma as never, { adminPasswordHash });

    const userLookups = calls.filter((call) => call.model === "user");
    const centerLookups = calls.filter((call) => call.model === "centerSettings");
    assert.equal(userLookups.length, 2);
    assert.equal(centerLookups.length, 2);
    assert.deepEqual(userLookups[0].args.where, {
      tenantId: "tenant_default",
      username: "admin",
    });
    assert.deepEqual(centerLookups[0].args.where, { tenantId: "tenant_default" });
    assert.equal(admin.tenantId, "tenant_default");
    assert.equal(center.tenantId, "tenant_default");
  });
});
