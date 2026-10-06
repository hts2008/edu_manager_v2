import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const migration = readFileSync(
  new URL("../prisma/migrations/202608120003_admin_console_tenancy_constraints/migration.sql", import.meta.url),
  "utf8",
);

const tenantTables = [
  "users", "parents", "auth_sessions", "students", "teachers", "classes",
  "class_sessions", "class_month_plans", "class_month_plan_revisions",
  "student_classes", "enrollment_periods", "attendance", "attendance_periods",
  "monthly_fees", "monthly_fee_lines", "monthly_fee_line_revisions", "templates",
  "receipts", "receipt_lines", "bulk_fee_payment_batches", "bulk_fee_payment_items",
  "payments", "activity_logs", "student_progress_months", "student_progress_revisions",
  "student_progress_skills", "student_progress_daily_entries", "center_settings",
] as const;

describe("Admin Console tenancy constraint migration", () => {
  it("runs atomically under a migration-specific advisory lock", () => {
    assert.match(migration, /^--[\s\S]*?BEGIN;/);
    assert.match(migration, /pg_advisory_xact_lock\(hashtext\('edu_manager:tenant-constraints:v1'\)\)/);
    assert.match(migration, /COMMIT;\s*$/);
  });

  it("fails closed on null or orphan tenants before constraint DDL", () => {
    const preflight = migration.indexOf("FOREACH tenant_table");
    const firstConstraint = migration.indexOf("ADD CONSTRAINT");
    assert.ok(preflight >= 0 && preflight < firstConstraint);
    assert.match(migration, /owned\.tenant_id IS NULL OR t\.id IS NULL/);
    assert.match(migration, /RAISE EXCEPTION[\s\S]*Tenancy contraction refused/);
    for (const table of tenantTables) assert.match(migration, new RegExp(`'${table}'`), table);
  });

  it("sets all 28 tenant columns not null", () => {
    assert.equal((migration.match(/ALTER COLUMN "tenant_id" SET NOT NULL;/g) ?? []).length, 28);
    for (const table of tenantTables) {
      assert.match(
        migration,
        new RegExp(`ALTER TABLE "${table}" ALTER COLUMN "tenant_id" SET NOT NULL;`),
        table,
      );
    }
  });

  it("adds and validates restrictive tenant foreign keys for all 28 tables", () => {
    assert.equal((migration.match(/FOREIGN KEY \("tenant_id"\)/g) ?? []).length, 28);
    assert.equal((migration.match(/ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;/g) ?? []).length, 28);
    assert.equal((migration.match(/VALIDATE CONSTRAINT "[a-z_]+_tenant_id_fkey";/g) ?? []).length, 28);
    for (const table of tenantTables) {
      const name = `${table}_tenant_id_fkey`;
      assert.match(migration, new RegExp(`CONSTRAINT "${name}" FOREIGN KEY`), table);
      assert.match(migration, new RegExp(`VALIDATE CONSTRAINT "${name}"`), table);
    }
  });

  it("replaces global business namespaces with tenant-aware unique indexes", () => {
    const expected = [
      ["users", "tenant_id", "username"],
      ["parents", "tenant_id", "phone"],
      ["teachers", "tenant_id", "phone"],
      ["class_sessions", "tenant_id", "class_id", "session_date"],
      ["attendance", "tenant_id", "student_id", "class_id", "attendance_date"],
      ["monthly_fees", "tenant_id", "student_id", "month"],
      ["monthly_fee_lines", "tenant_id", "student_id", "month", "allocation_key"],
      ["student_progress_months", "tenant_id", "student_id", "class_id", "month"],
    ];
    for (const [table, ...columns] of expected) {
      const sqlColumns = columns.map((column) => `"${column}"`).join(", ");
      assert.match(migration, new RegExp(`CREATE UNIQUE INDEX [^;]+ ON "${table}"\\(${sqlColumns}\\);`));
    }
    assert.match(migration, /DROP INDEX "users_username_key";/);
    assert.match(migration, /DROP INDEX "parents_phone_key";/);
    assert.match(migration, /DROP INDEX "teachers_phone_key";/);
  });

  it("preserves globally unique identity and session-token indexes", () => {
    assert.doesNotMatch(migration, /DROP INDEX "auth_sessions_token_id_key"/);
    assert.doesNotMatch(migration, /DROP CONSTRAINT "[a-z_]+_pkey"/);
    assert.doesNotMatch(migration, /\bUPDATE\s+"?[a-z_]+"?\s+SET\b/i);
    assert.doesNotMatch(migration, /\bINSERT\s+INTO\b|\bDELETE\s+FROM\b|\bTRUNCATE\b/i);
  });

  it("adds tenant-prefixed indexes for high-traffic scoped reads", () => {
    for (const index of [
      "users_tenant_id_role_idx",
      "students_tenant_id_status_idx",
      "attendance_tenant_id_class_id_date_idx",
      "monthly_fees_tenant_id_month_status_idx",
      "activity_logs_tenant_id_created_at_idx",
      "student_progress_months_tenant_id_month_idx",
    ]) {
      assert.match(migration, new RegExp(`CREATE INDEX "${index}"`), index);
    }
  });

  it("keeps every newly-created PostgreSQL identifier within 63 bytes", () => {
    const createdNames = [...migration.matchAll(/CREATE (?:UNIQUE )?INDEX "([^"]+)"/g)]
      .map((match) => match[1]);
    assert.ok(createdNames.length > 20);
    for (const name of createdNames) {
      assert.ok(Buffer.byteLength(name, "utf8") <= 63, `${name} exceeds PostgreSQL's identifier limit`);
    }
    assert.match(
      migration,
      /DROP INDEX "monthly_fee_line_revisions_monthly_fee_line_id_revision_number_";/,
    );
  });
});
