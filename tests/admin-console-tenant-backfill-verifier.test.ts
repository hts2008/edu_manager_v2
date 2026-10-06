import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  createPostgresVerificationReader,
  captureTenantBackfillBaseline,
  DEFAULT_TENANT_ID,
  TENANT_RELATIONS,
  TENANT_TABLES,
  verifyTenantBackfill,
  type TenantBackfillBaseline,
  type TenantVerificationReader,
} from "../scripts/verify-tenant-backfill.js";

const migration = readFileSync(
  new URL("../prisma/migrations/202608120002_admin_console_tenancy_backfill/migration.sql", import.meta.url),
  "utf8",
);

function createReader(overrides: {
  defaultTenantExists?: boolean;
  nullCount?: number;
  orphanCount?: number;
  mismatchCount?: number;
  rowCount?: number;
  checksum?: string;
} = {}): TenantVerificationReader {
  return {
    async defaultTenantExists(tenantId) {
      assert.equal(tenantId, DEFAULT_TENANT_ID);
      return overrides.defaultTenantExists ?? true;
    },
    async readTableMetric() {
      return {
        rowCount: overrides.rowCount ?? 3,
        nullTenantCount: overrides.nullCount ?? 0,
        orphanTenantCount: overrides.orphanCount ?? 0,
        businessChecksum: overrides.checksum ?? "stable",
      };
    },
    async readRelationMismatch() {
      return overrides.mismatchCount ?? 0;
    },
  };
}

function baseline(rowCount = 3, checksum = "stable"): TenantBackfillBaseline {
  return {
    version: 1,
    expectedTenantId: DEFAULT_TENANT_ID,
    generatedAt: "2026-08-12T00:00:00.000Z",
    tables: Object.fromEntries(
      TENANT_TABLES.map((table) => [table, { rowCount, businessChecksum: checksum }]),
    ),
  };
}

describe("Admin Console tenant backfill verifier", () => {
  it("hashes a whole row even when the table contains a source column", async () => {
    const queries: string[] = [];
    const reader = createPostgresVerificationReader({
      async $queryRawUnsafe<T>(query: string) {
        queries.push(query);
        return [{row_count: 1, null_tenant_count: 0, orphan_tenant_count: 0, business_checksum: 'stable'}] as T;
      },
    });
    await reader.readTableMetric('enrollment_periods');
    assert.match(queries[0], /to_jsonb\(source\.\*\)/);
  });
  it("covers all 28 tenant-owned tables and their cross-tenant relations", () => {
    assert.equal(TENANT_TABLES.length, 28);
    assert.ok(TENANT_RELATIONS.length >= 30);
    assert.equal(new Set(TENANT_TABLES).size, TENANT_TABLES.length);
  });

  it("requires a baseline before declaring the constrain gate ready", async () => {
    const report = await verifyTenantBackfill(createReader());
    assert.equal(report.readyForConstrain, false);
    assert.ok(report.failures.some((failure) => failure.code === "BASELINE_REQUIRED"));
  });

  it("refuses to capture a baseline before the deterministic tenant exists", async () => {
    await assert.rejects(
      () => captureTenantBackfillBaseline(createReader({ defaultTenantExists: false })),
      /tenant_default is missing/,
    );
  });

  it("uses SELECT-only SQL and a fixed identifier allowlist", async () => {
    const queries: string[] = [];
    const reader = createPostgresVerificationReader({
      async $queryRawUnsafe<T>(query: string): Promise<T> {
        queries.push(query);
        if (query.includes("SELECT EXISTS")) return [{ exists: true }] as T;
        if (query.includes("mismatch_count")) return [{ mismatch_count: 0 }] as T;
        return [{ row_count: 0, null_tenant_count: 0, orphan_tenant_count: 0, business_checksum: "empty" }] as T;
      },
    });
    await verifyTenantBackfill(reader, baseline(0, "empty"));
    assert.ok(queries.length > TENANT_TABLES.length);
    for (const query of queries) {
      assert.match(query.trim(), /^SELECT/i);
      assert.doesNotMatch(query, /\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE)\b/i);
    }
  });

  it("passes only when counts and business checksums match and tenancy is clean", async () => {
    const report = await verifyTenantBackfill(createReader(), baseline());
    assert.equal(report.readyForConstrain, true);
    assert.deepEqual(report.failures, []);
    assert.equal(report.summary.tablesChecked, 28);
    assert.equal(report.summary.relationsChecked, TENANT_RELATIONS.length);
  });

  it("fails closed for null, orphan, cross-tenant, count, and checksum drift", async () => {
    const report = await verifyTenantBackfill(
      createReader({ nullCount: 1, orphanCount: 2, mismatchCount: 3, rowCount: 4, checksum: "changed" }),
      baseline(),
    );
    const codes = new Set(report.failures.map((failure) => failure.code));
    assert.deepEqual(codes, new Set([
      "NULL_TENANT_ID",
      "ORPHAN_TENANT_ID",
      "CROSS_TENANT_RELATION",
      "ROW_COUNT_CHANGED",
      "BUSINESS_CHECKSUM_CHANGED",
    ]));
    assert.equal(report.readyForConstrain, false);
  });

  it("backfills only null tenant columns to the deterministic default tenant", () => {
    assert.match(migration, /BEGIN;/);
    assert.match(migration, /pg_advisory_xact_lock/);
    assert.match(migration, /'tenant_default'/);
    assert.equal((migration.match(/SET "tenant_id" = 'tenant_default'/g) ?? []).length, 28);
    assert.equal((migration.match(/WHERE "tenant_id" IS NULL/g) ?? []).length, 28);
    assert.doesNotMatch(migration, /SET\s+(?!"tenant_id")/i);
    assert.doesNotMatch(migration, /DELETE|TRUNCATE|DROP|NOT NULL|FOREIGN KEY/i);
  });
});
