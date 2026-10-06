import assert from "node:assert/strict";
import test from "node:test";

import {
  applyTenantOperationGuard,
  createTenantClient,
  TenantIsolationError,
  TENANT_OPERATION_MATRIX,
  TENANT_SCOPED_MODELS,
} from "../lib/prisma-tenant.js";

const TENANT_A = "tenant-a";

test("operation matrix covers the tenant-scoped schema surface", () => {
  assert.ok(TENANT_SCOPED_MODELS.includes("Student"));
  assert.ok(TENANT_SCOPED_MODELS.includes("SettingValue"));
  assert.ok(TENANT_SCOPED_MODELS.includes("AuthSession"));
  assert.ok(TENANT_SCOPED_MODELS.includes("RolePermission"));
  assert.ok(TENANT_SCOPED_MODELS.includes("IntegrationConfig"));
  assert.equal(TENANT_SCOPED_MODELS.includes("Tenant" as any), false);
  assert.ok(TENANT_OPERATION_MATRIX.scopedRead.includes("groupBy"));
  assert.ok(TENANT_OPERATION_MATRIX.scopedUpsert.includes("upsert"));
});

test("scopes list reads and ignores a caller-supplied cross-tenant predicate", () => {
  const guarded = applyTenantOperationGuard(
    "Student",
    "findMany",
    { where: { tenantId: "tenant-b", status: "active" }, orderBy: { fullName: "asc" } },
    TENANT_A,
  );

  assert.deepEqual(guarded, {
    where: { AND: [{ tenantId: TENANT_A }, { tenantId: "tenant-b", status: "active" }] },
    orderBy: { fullName: "asc" },
  });
});

test("scopes unique reads so an id from another tenant cannot be returned", () => {
  const guarded = applyTenantOperationGuard(
    "Student",
    "findUnique",
    { where: { id: "student-from-tenant-b" } },
    TENANT_A,
  );

  assert.deepEqual(guarded.where, { id: "student-from-tenant-b", tenantId: TENANT_A });
});

test("injects tenantId into create/createMany and rejects explicit cross-tenant data", () => {
  const single = applyTenantOperationGuard(
    "Student",
    "create",
    { data: { fullName: "Student A" } },
    TENANT_A,
  );
  assert.deepEqual(single.data, { fullName: "Student A", tenantId: TENANT_A });

  const many = applyTenantOperationGuard(
    "Student",
    "createMany",
    { data: [{ fullName: "A" }, { fullName: "B", tenantId: TENANT_A }] },
    TENANT_A,
  );
  assert.deepEqual(many.data, [
    { fullName: "A", tenantId: TENANT_A },
    { fullName: "B", tenantId: TENANT_A },
  ]);

  assert.throws(
    () =>
      applyTenantOperationGuard(
        "Student",
        "create",
        { data: { fullName: "Leak", tenantId: "tenant-b" } },
        TENANT_A,
      ),
    (error: unknown) => error instanceof TenantIsolationError && error.code === "CROSS_TENANT_WRITE",
  );
});

test("scopes update/delete/upsert and prevents tenant reassignment", () => {
  const update = applyTenantOperationGuard(
    "Student",
    "update",
    { where: { id: "student-b" }, data: { fullName: "No leak" } },
    TENANT_A,
  );
  assert.deepEqual(update.where, { id: "student-b", tenantId: TENANT_A });
  assert.deepEqual(update.data, { fullName: "No leak", tenantId: TENANT_A });

  const deletion = applyTenantOperationGuard(
    "Student",
    "deleteMany",
    { where: { status: "inactive" } },
    TENANT_A,
  );
  assert.deepEqual(deletion.where, {
    AND: [{ tenantId: TENANT_A }, { status: "inactive" }],
  });

  const upsert = applyTenantOperationGuard(
    "Student",
    "upsert",
    {
      where: { id: "student-b" },
      create: { id: "student-b", fullName: "Created" },
      update: { fullName: "Updated" },
    },
    TENANT_A,
  );
  assert.deepEqual(upsert.where, { id: "student-b", tenantId: TENANT_A });
  assert.deepEqual(upsert.create, { id: "student-b", fullName: "Created", tenantId: TENANT_A });
  assert.deepEqual(upsert.update, { fullName: "Updated", tenantId: TENANT_A });

  assert.throws(
    () =>
      applyTenantOperationGuard(
        "Student",
        "update",
        { where: { id: "student-a" }, data: { tenantId: "tenant-b" } },
        TENANT_A,
      ),
    (error: unknown) => error instanceof TenantIsolationError && error.code === "CROSS_TENANT_WRITE",
  );
});

test("scopes Admin Console compound unique selectors without weakening tenant isolation", () => {
  const integrationRead = applyTenantOperationGuard(
    "IntegrationConfig",
    "findUnique",
    { where: { tenantId_kind: { tenantId: TENANT_A, kind: "fee_reminder_webhook" } } },
    TENANT_A,
  );
  assert.deepEqual(integrationRead.where, {
    tenantId_kind: { tenantId: TENANT_A, kind: "fee_reminder_webhook" },
  });

  const rolePermissionUpsert = applyTenantOperationGuard(
    "RolePermission",
    "upsert",
    {
      where: {
        tenantId_role_permissionKey: {
          tenantId: TENANT_A,
          role: "receptionist",
          permissionKey: "reports.view",
        },
      },
      create: {
        role: "receptionist",
        permissionKey: "reports.view",
        allowed: true,
        updatedById: "admin-a",
      },
      update: {
        allowed: false,
        updatedById: "admin-a",
      },
    },
    TENANT_A,
  );
  assert.deepEqual(rolePermissionUpsert.where, {
    tenantId_role_permissionKey: {
      tenantId: TENANT_A,
      role: "receptionist",
      permissionKey: "reports.view",
    },
  });
  assert.deepEqual(rolePermissionUpsert.create, {
    role: "receptionist",
    permissionKey: "reports.view",
    allowed: true,
    updatedById: "admin-a",
    tenantId: TENANT_A,
  });
  assert.deepEqual(rolePermissionUpsert.update, {
    allowed: false,
    updatedById: "admin-a",
    tenantId: TENANT_A,
  });

  assert.throws(
    () =>
      applyTenantOperationGuard(
        "IntegrationConfig",
        "findUnique",
        { where: { tenantId_kind: { tenantId: "tenant-b", kind: "fee_reminder_webhook" } } },
        TENANT_A,
      ),
    (error: unknown) => error instanceof TenantIsolationError && error.code === "CROSS_TENANT_WHERE",
  );

  assert.throws(
    () =>
      applyTenantOperationGuard(
        "RolePermission",
        "delete",
        {
          where: {
            tenantId_role_permissionKey: {
              tenantId: "tenant-b",
              role: "admin",
              permissionKey: "console.access.view",
            },
          },
        },
        TENANT_A,
      ),
    (error: unknown) => error instanceof TenantIsolationError && error.code === "CROSS_TENANT_WHERE",
  );
});

test("rejects nested relation writes while preserving verified relational reads", () => {
  assert.throws(
    () =>
      applyTenantOperationGuard(
        "Student",
        "create",
        { data: { fullName: "A", studentClasses: { create: { classId: "class-b" } } } },
        TENANT_A,
      ),
    (error: unknown) => error instanceof TenantIsolationError && error.code === "UNSAFE_NESTED_WRITE",
  );

  assert.throws(
    () =>
      applyTenantOperationGuard(
        "Student",
        "update",
        {
          where: { id: "student-a" },
          data: { studentClasses: { connect: { id: "join-b" } } },
        },
        TENANT_A,
      ),
    (error: unknown) => error instanceof TenantIsolationError && error.code === "UNSAFE_NESTED_WRITE",
  );

  const relationalRead = applyTenantOperationGuard(
    "Student",
    "findMany",
    { include: { studentClasses: { include: { class: true } } } },
    TENANT_A,
  );
  assert.deepEqual(relationalRead, {
    where: { AND: [{ tenantId: TENANT_A }, {}] },
    include: { studentClasses: { include: { class: true } } },
  });
});

test("rejects nested relation writes for Admin Console tenant-owned models", () => {
  assert.throws(
    () =>
      applyTenantOperationGuard(
        "RolePermission",
        "create",
        {
          data: {
            role: "admin",
            permissionKey: "console.access.view",
            allowed: true,
            updatedBy: { connect: { id: "admin-b" } },
          },
        },
        TENANT_A,
      ),
    (error: unknown) => error instanceof TenantIsolationError && error.code === "UNSAFE_NESTED_WRITE",
  );

  assert.throws(
    () =>
      applyTenantOperationGuard(
        "IntegrationConfig",
        "update",
        {
          where: { tenantId_kind: { tenantId: TENANT_A, kind: "fee_reminder_webhook" } },
          data: {
            config: { enabled: true },
            updatedBy: { connect: { id: "admin-b" } },
          },
        },
        TENANT_A,
      ),
    (error: unknown) => error instanceof TenantIsolationError && error.code === "UNSAFE_NESTED_WRITE",
  );
});

test("facade rejects raw SQL and unsupported model operations", async () => {
  const db = createTenantClient(
    {
      student: {
        findRaw: async () => [],
      },
      $queryRaw: async () => [],
    },
    TENANT_A,
  );

  await assert.rejects(
    async () => db.student.findRaw({}),
    (error: unknown) => error instanceof TenantIsolationError && error.code === "UNSAFE_MODEL_OPERATION",
  );
  assert.throws(
    () => db.$queryRaw`SELECT 1`,
    (error: unknown) => error instanceof TenantIsolationError && error.code === "UNSAFE_RAW_QUERY",
  );
});

test("tenant raw transactions allow advisory locks while keeping delegates scoped", async () => {
  const rawCalls: unknown[] = [];
  const delegateCalls: unknown[] = [];
  const tx = {
    $queryRaw: async (args: unknown) => {
      rawCalls.push(args);
      return [];
    },
    student: {
      findMany: async (args: unknown) => {
        delegateCalls.push(args);
        return [];
      },
    },
  };
  const db = createTenantClient(
    {
      $transaction: async (callback: (client: typeof tx) => unknown, options?: unknown) => {
        assert.deepEqual(options, { isolationLevel: "Serializable" });
        return callback(tx);
      },
      $queryRaw: tx.$queryRaw,
      student: tx.student,
    },
    TENANT_A,
  );

  await (db as any).$tenantRawTransaction(
    async (client: typeof tx) => {
      await client.$queryRaw`SELECT 1`;
      await client.student.findMany({ where: { status: "active" } });
    },
    { isolationLevel: "Serializable" },
  );

  assert.equal(rawCalls.length, 1);
  assert.deepEqual(delegateCalls, [
    { where: { AND: [{ tenantId: TENANT_A }, { status: "active" }] } },
  ]);
  assert.throws(
    () => db.$queryRaw`SELECT 1`,
    (error: unknown) => error instanceof TenantIsolationError && error.code === "UNSAFE_RAW_QUERY",
  );
});

test("interactive transactions scope Admin Console delegates", async () => {
  const calls: Array<[string, unknown]> = [];
  const tx = {
    rolePermission: {
      upsert: async (args: unknown) => {
        calls.push(["rolePermission", args]);
        return { id: "permission-a" };
      },
    },
    integrationConfig: {
      update: async (args: unknown) => {
        calls.push(["integrationConfig", args]);
        return { id: "integration-a" };
      },
    },
  };
  const db = createTenantClient(
    {
      $transaction: async (callback: (client: typeof tx) => unknown) => callback(tx),
      rolePermission: tx.rolePermission,
      integrationConfig: tx.integrationConfig,
    },
    TENANT_A,
  );

  await db.$transaction(async (client: typeof tx) => {
    await client.rolePermission.upsert({
      where: {
        tenantId_role_permissionKey: {
          tenantId: TENANT_A,
          role: "receptionist",
          permissionKey: "console.access.view",
        },
      },
      create: {
        role: "receptionist",
        permissionKey: "console.access.view",
        allowed: true,
        updatedById: "admin-a",
      },
      update: {
        allowed: true,
        updatedById: "admin-a",
      },
    });
    await client.integrationConfig.update({
      where: { tenantId_kind: { tenantId: TENANT_A, kind: "fee_reminder_webhook" } },
      data: {
        config: { enabled: true },
        updatedById: "admin-a",
      },
    });
  });

  assert.deepEqual(calls, [
    [
      "rolePermission",
      {
        where: {
          tenantId_role_permissionKey: {
            tenantId: TENANT_A,
            role: "receptionist",
            permissionKey: "console.access.view",
          },
        },
        create: {
          role: "receptionist",
          permissionKey: "console.access.view",
          allowed: true,
          updatedById: "admin-a",
          tenantId: TENANT_A,
        },
        update: {
          allowed: true,
          updatedById: "admin-a",
          tenantId: TENANT_A,
        },
      },
    ],
    [
      "integrationConfig",
      {
        where: { tenantId_kind: { tenantId: TENANT_A, kind: "fee_reminder_webhook" } },
        data: {
          config: { enabled: true },
          updatedById: "admin-a",
          tenantId: TENANT_A,
        },
      },
    ],
  ]);
});

test("interactive transactions receive a tenant-scoped transaction client", async () => {
  const calls: unknown[] = [];
  const tx = {
    student: {
      updateMany: async (args: unknown) => {
        calls.push(args);
        return { count: 0 };
      },
    },
  };
  const db = createTenantClient(
    {
      $transaction: async (callback: (client: typeof tx) => unknown) => callback(tx),
      student: tx.student,
    },
    TENANT_A,
  );

  await db.$transaction((client: typeof tx) =>
    client.student.updateMany({ where: { id: "student-b" }, data: { status: "inactive" } }),
  );

  assert.deepEqual(calls, [
    {
      where: { AND: [{ tenantId: TENANT_A }, { id: "student-b" }] },
      data: { status: "inactive", tenantId: TENANT_A },
    },
  ]);

  assert.throws(
    () => db.$transaction([Promise.resolve(1)]),
    (error: unknown) => error instanceof TenantIsolationError && error.code === "UNSAFE_BATCH_TRANSACTION",
  );
});

test("unscoped control-plane models pass through unchanged", async () => {
  const calls: unknown[] = [];
  const db = createTenantClient(
    {
      tenant: {
        findMany: async (args: unknown) => {
          calls.push(args);
          return [];
        },
      },
    },
    TENANT_A,
  );

  await db.tenant.findMany({ where: { status: "active" } });
  assert.deepEqual(calls, [{ where: { status: "active" } }]);
});
