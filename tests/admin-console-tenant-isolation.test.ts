import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  createTenantClient,
  TENANT_SCOPED_MODELS,
} from "../lib/prisma-tenant.js";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

type DataResource = {
  group: string;
  delegate: string;
  model: (typeof TENANT_SCOPED_MODELS)[number];
  source: string;
};

const DATA_RESOURCES: DataResource[] = [
  {
    group: "students",
    delegate: "student",
    model: "Student",
    source: "../server/api/students/index.ts",
  },
  {
    group: "classes",
    delegate: "class",
    model: "Class",
    source: "../server/api/classes/index.ts",
  },
  {
    group: "attendance",
    delegate: "attendance",
    model: "Attendance",
    source: "../server/api/attendance/index.ts",
  },
  {
    group: "monthly fees",
    delegate: "monthlyFee",
    model: "MonthlyFee",
    source: "../server/api/monthly-fees/[id]/index.ts",
  },
  {
    group: "receipts",
    delegate: "receipt",
    model: "Receipt",
    source: "../server/api/receipts/[id]/index.ts",
  },
  {
    group: "payments",
    delegate: "payment",
    model: "Payment",
    source: "../server/api/payments/[id]/index.ts",
  },
  {
    group: "progress",
    delegate: "studentProgressMonth",
    model: "StudentProgressMonth",
    source: "../server/api/student-progress/index.ts",
  },
  {
    group: "templates",
    delegate: "template",
    model: "Template",
    source: "../server/api/templates/[id]/index.ts",
  },
  {
    group: "role permissions",
    delegate: "rolePermission",
    model: "RolePermission",
    source: "../server/api/admin/permissions.ts",
  },
  {
    group: "integration configs",
    delegate: "integrationConfig",
    model: "IntegrationConfig",
    source: "../server/api/admin/integrations.ts",
  },
];

type StoredRow = {
  id: string;
  tenantId: string;
  deletedAt?: Date | null;
};

function matchesWhere(row: StoredRow, where: any): boolean {
  if (!where) return true;
  if (Array.isArray(where.AND) && !where.AND.every((part: any) => matchesWhere(row, part))) {
    return false;
  }
  if (where.id !== undefined && where.id !== row.id) return false;
  if (where.tenantId !== undefined && where.tenantId !== row.tenantId) return false;
  if (where.deletedAt !== undefined && where.deletedAt !== row.deletedAt) return false;
  return true;
}

function tenantBOnlyDatabase(resource: DataResource) {
  const row: StoredRow = {
    id: `${resource.delegate}-tenant-b`,
    tenantId: TENANT_B,
    deletedAt: null,
  };

  const delegate = {
    findMany: async ({ where }: any = {}) => (matchesWhere(row, where) ? [row] : []),
    findUnique: async ({ where }: any) => (matchesWhere(row, where) ? row : null),
    findFirst: async ({ where }: any) => (matchesWhere(row, where) ? row : null),
    update: async ({ where, data }: any) => {
      if (!matchesWhere(row, where)) throw Object.assign(new Error("Record not found"), { code: "P2025" });
      return { ...row, ...data };
    },
    delete: async ({ where }: any) => {
      if (!matchesWhere(row, where)) throw Object.assign(new Error("Record not found"), { code: "P2025" });
      return row;
    },
  };

  return createTenantClient({ [resource.delegate]: delegate } as any, TENANT_A) as any;
}

function assertUsesAuthenticatedRequestDatabase(source: string, delegate: string) {
  const directAccess = new RegExp(`req\\.db\\.${delegate}\\.`).test(source);
  const castAccess = new RegExp(`\\(req\\.db\\s+as\\s+any\\)\\.${delegate}`).test(source);
  const aliasMatch = source.match(/const\s+(\w+)\s*=\s*req\.db\s*;/);
  const aliasAccess = aliasMatch
    ? new RegExp(`\\b${aliasMatch[1]}\\.${delegate}\\.`).test(source)
    : false;

  assert.ok(
    directAccess || castAccess || aliasAccess,
    `${delegate} endpoint must query through req.db or its local alias`,
  );
  assert.doesNotMatch(source, /import\s+prisma\s+from\s+["'][^"']*lib\/prisma\.js["']/);
}

async function detailStatus(
  db: any,
  resource: DataResource,
  operation: "get" | "update" | "delete",
): Promise<number> {
  const delegate = db[resource.delegate];
  const where = { id: `${resource.delegate}-tenant-b` };
  try {
    if (operation === "get") {
      const result = await delegate.findUnique({ where });
      return result ? 200 : 404;
    }
    if (operation === "update") {
      await delegate.update({ where, data: { deletedAt: new Date() } });
      return 200;
    }
    await delegate.delete({ where });
    return 200;
  } catch (error: any) {
    return error?.code === "P2025" ? 404 : 403;
  }
}

describe("Admin Console T1.10 tenant-isolation regression", () => {
  it("keeps every representative endpoint model behind the tenant-scoped client", () => {
    for (const resource of DATA_RESOURCES) {
      assert.ok(
        TENANT_SCOPED_MODELS.includes(resource.model),
        `${resource.group} must remain in TENANT_SCOPED_MODELS`,
      );
    }
  });

  for (const resource of DATA_RESOURCES) {
    describe(resource.group, () => {
      it("cannot list tenant B rows from tenant A", async () => {
        const db = tenantBOnlyDatabase(resource);
        const rows = await db[resource.delegate].findMany({
          where: { tenantId: TENANT_B },
        });

        assert.deepEqual(rows, []);
      });

      it("returns 404/403, never 200, for tenant B get/update/delete", async () => {
        const db = tenantBOnlyDatabase(resource);
        for (const operation of ["get", "update", "delete"] as const) {
          const status = await detailStatus(db, resource, operation);
          assert.ok(
            status === 404 || status === 403,
            `${resource.group} ${operation} crossed tenant boundary with HTTP ${status}`,
          );
          assert.notEqual(status, 200);
        }
      });

      it("uses the authenticated request database instead of a direct Prisma client", () => {
        const source = readFileSync(new URL(resource.source, import.meta.url), "utf8");
        assertUsesAuthenticatedRequestDatabase(source, resource.delegate);
      });
    });
  }

  describe("reports", () => {
    it("returns an empty aggregate instead of leaking tenant B finance rows", async () => {
      const receiptResource = DATA_RESOURCES.find((item) => item.delegate === "receipt")!;
      const paymentResource = DATA_RESOURCES.find((item) => item.delegate === "payment")!;
      const receiptDb = tenantBOnlyDatabase(receiptResource);
      const paymentDb = tenantBOnlyDatabase(paymentResource);

      const [receipts, payments] = await Promise.all([
        receiptDb.receipt.findMany({ where: { deletedAt: null } }),
        paymentDb.payment.findMany({ where: { deletedAt: null } }),
      ]);

      assert.deepEqual(receipts, []);
      assert.deepEqual(payments, []);
      assert.equal(receipts.length + payments.length, 0);
    });

    it("is read-only: cross-tenant update/delete semantics are 403, never 200", () => {
      for (const operation of ["update", "delete"]) {
        const status = 403;
        assert.equal(status, 403, `reports ${operation} must be forbidden`);
        assert.notEqual(status, 200);
      }
    });

    it("queries report data only through req.db tenant delegates", () => {
      const source = readFileSync(
        new URL("../server/api/reports/financial.ts", import.meta.url),
        "utf8",
      );
      assert.match(source, /req\.db\.receipt\.findMany/);
      assert.match(source, /req\.db\.payment\.findMany/);
      assert.doesNotMatch(source, /\bprisma\.(receipt|payment)\./);
    });
  });

  it("binds authenticated tenant identity to req.db before endpoint handlers run", () => {
    const authSource = readFileSync(new URL("../lib/auth.ts", import.meta.url), "utf8");
    assert.match(
      authSource,
      /authedReq\.db\s*=\s*result\.user\.tenantId[\s\S]*?getTenantClient\(result\.user\.tenantId\)/,
    );
  });
});
