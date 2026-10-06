import assert from "node:assert/strict";
import { test } from "node:test";
import { bootstrapDatabase, provisionBusinessTenant } from "../prisma/seed-bootstrap.js";
import { runSeed } from "../prisma/seed.js";

const hash = "$2b$12$" + "a".repeat(53);
function database(initial: any = {}) {
  let state: any = { tenants: [], users: [], centers: [], templates: [], ...initial };
  const db = {
    get state() { return state; },
    async $transaction(callback: any, options: any) {
      assert.equal(options.isolationLevel, "Serializable");
      const draft = structuredClone(state);
      const delegate = (key: string) => ({
        findFirst: async ({ where }: any) => draft[key].find((row: any) => Object.entries(where).every(([k, v]) => row[k] === v)) ?? null,
        findUnique: async ({ where }: any) => draft[key].find((row: any) => Object.entries(where).every(([k, v]) => row[k] === v)) ?? null,
        findMany: async ({ where }: any) => draft[key].filter((row: any) => Object.entries(where).every(([k, v]) => row[k] === v)),
        count: async () => draft[key].length,
        create: async ({ data }: any) => {
          if (key === "tenants" && draft[key].some((r: any) => r.slug === data.slug || (data.id && r.id === data.id))) throw new Error("collision");
          if (key === "users" && draft[key].some((r: any) => r.tenantId === data.tenantId && r.username === data.username)) throw new Error("collision");
          if (initial.failUsers && key === "users") throw new Error("user collision");
          if (initial.failTemplates && key === "templates") throw new Error("template failure");
          const row = { id: `${key}-${draft[key].length}`, ...data }; draft[key].push(row); return row;
        },
        update: async ({ where, data }: any) => { const row = draft[key].find((r: any) => r.id === where.id); Object.assign(row, data); return row; },
      });
      const result = await callback({ tenant: delegate("tenants"), user: delegate("users"), centerSettings: delegate("centers"), template: delegate("templates") });
      state = draft; return result;
    },
  };
  return db;
}
const tenant = { id: "tenant_default", slug: "default", status: "active" };
const admin = { id: "existing-admin", tenantId: tenant.id, username: "admin", role: "admin", status: "active", passwordHash: "old", isPlatformOwner: false };

test("fresh bootstrap defaults to tenant admin; owner requires explicit fresh option", async () => {
  for (const freshPlatformOwner of [false, true]) {
    const db = database();
    await bootstrapDatabase(db, { adminPasswordHash: hash, freshPlatformOwner });
    assert.equal(db.state.users[0].isPlatformOwner, freshPlatformOwner);
    assert.equal(db.state.templates.length, 2);
    await bootstrapDatabase(db, { adminPasswordHash: hash });
    assert.equal(db.state.users.length, 1);
    assert.equal(db.state.templates.length, 2);
  }
});
test("existing account privileges and credential remain unchanged", async () => {
  const db = database({ tenants: [tenant], users: [admin] });
  await bootstrapDatabase(db, { adminPasswordHash: hash });
  assert.deepEqual(db.state.users[0], admin);
  await assert.rejects(bootstrapDatabase(db, { adminPasswordHash: hash, freshPlatformOwner: true }));
  assert.deepEqual(db.state.users[0], admin);
});
test("suspended tenant is never reactivated", async () => {
  const db = database({ tenants: [{ ...tenant, status: "suspended" }], users: [admin] });
  await assert.rejects(bootstrapDatabase(db, { adminPasswordHash: hash }));
  assert.equal(db.state.tenants[0].status, "suspended");
});
test("immutable approved owner id promotes only eligible selected account", async () => {
  const selected = { ...admin, id: "approved", username: "operator" };
  const db = database({ tenants: [tenant], users: [admin, selected] });
  await bootstrapDatabase(db, { adminPasswordHash: hash, approvedOwnerId: selected.id });
  assert.equal(db.state.users[0].isPlatformOwner, false);
  assert.equal(db.state.users[1].isPlatformOwner, true);
  for (const override of [{ id: "missing" }, { role: "receptionist" }, { status: "inactive" }, { tenantId: "missing-tenant" }]) {
    const bad = database({ tenants: [tenant], users: [admin, { ...selected, ...override }] });
    await assert.rejects(bootstrapDatabase(bad, { adminPasswordHash: hash, approvedOwnerId: "approved" }));
    assert.equal(bad.state.users[0].isPlatformOwner, false);
  }
});
test("existing defaults are preserved; competing defaults fail without mutation", async () => {
  const template = { id: "custom", tenantId: tenant.id, type: "receipt", isDefault: true, jsonConfig: { custom: true } };
  const db = database({ tenants: [tenant], users: [admin], templates: [template] });
  await bootstrapDatabase(db, { adminPasswordHash: hash });
  assert.deepEqual(db.state.templates[0], template);
  assert.equal(db.state.templates.filter((r: any) => r.type === "receipt" && r.isDefault).length, 1);
  const bad = database({ tenants: [tenant], users: [admin], templates: [template, { ...template, id: "other" }] });
  await assert.rejects(bootstrapDatabase(bad, { adminPasswordHash: hash }));
  assert.equal(bad.state.centers.length, 0);
});
test("business provision is atomic, tenant-only and rejects slug collision", async () => {
  const db = database();
  const options = { slug: "business", name: "Business Center", adminUsername: "manager", adminPasswordHash: hash };
  const result = await provisionBusinessTenant(db, options);
  assert.equal(db.state.users[0].tenantId, result.tenantId);
  assert.equal(db.state.users[0].isPlatformOwner, false);
  assert.equal(db.state.users[0].role, "admin");
  assert.equal(db.state.centers[0].centerName, options.name);
  const before = structuredClone(db.state);
  await assert.rejects(provisionBusinessTenant(db, options));
  assert.deepEqual(db.state, before);
  const broken = database({ failTemplates: true });
  await assert.rejects(provisionBusinessTenant(broken, options));
  assert.equal(broken.state.tenants.length, 0);
  assert.equal(broken.state.users.length, 0);
});
test("invalid provisioning inputs fail before writes", async () => {
  for (const invalid of [{ slug: "Bad Slug" }, { slug: "default" }, { name: "" }, { adminUsername: "" }, { adminPasswordHash: "plaintext" }]) {
    const db = database();
    await assert.rejects(provisionBusinessTenant(db, { slug: "business", name: "Center", adminUsername: "admin", adminPasswordHash: hash, ...invalid }));
    assert.equal(db.state.tenants.length, 0);
  }
});
test("user collision rolls back business tenant creation", async () => {
  const db = database({ failUsers: true });
  await assert.rejects(provisionBusinessTenant(db, { slug: "business", name: "Center", adminUsername: "admin", adminPasswordHash: hash }));
  assert.equal(db.state.tenants.length, 0);
});
test("owner grant rolls back when bootstrap later fails", async () => {
  const db = database({ tenants: [tenant], users: [admin], failTemplates: true });
  await assert.rejects(bootstrapDatabase(db, { adminPasswordHash: hash, approvedOwnerId: admin.id }));
  assert.equal(db.state.users[0].isPlatformOwner, false);
});
test("suspended approved owner tenant is refused", async () => {
  const db = database({ tenants: [{ ...tenant, status: "suspended" }], users: [admin] });
  await assert.rejects(bootstrapDatabase(db, { adminPasswordHash: hash, approvedOwnerId: admin.id }));
  assert.equal(db.state.users[0].isPlatformOwner, false);
});
test("seed operator route validates options and creates tenant-only admin", async () => {
  const password = "synthetic-test-password-only";
  const db = database();
  await runSeed(db, { BOOTSTRAP_ADMIN_PASSWORD: password, BOOTSTRAP_TENANT_SLUG: "operator-center", BOOTSTRAP_TENANT_NAME: "Center", BOOTSTRAP_ADMIN_USERNAME: "manager" });
  assert.equal(db.state.tenants[0].slug, "operator-center");
  assert.equal(db.state.users[0].isPlatformOwner, false);
  assert.match(db.state.users[0].passwordHash, /^\$2[aby]\$12\$/);
  for (const invalid of [
    { BOOTSTRAP_FRESH_PLATFORM_OWNER: "yes" },
    { BOOTSTRAP_TENANT_NAME: "orphan-name" },
    { BOOTSTRAP_TENANT_SLUG: "business", BOOTSTRAP_FRESH_PLATFORM_OWNER: "true" },
    { BOOTSTRAP_TENANT_SLUG: "business", BOOTSTRAP_APPROVED_OWNER_ID: "approved" },
    { BOOTSTRAP_ADMIN_PASSWORD: "short" },
  ]) {
    const bad = database();
    await assert.rejects(runSeed(bad, { BOOTSTRAP_ADMIN_PASSWORD: password, ...invalid }));
    assert.equal(bad.state.tenants.length, 0);
  }
});
