import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const migration = readFileSync(new URL("../prisma/migrations/202608120001_admin_console_tenancy_expand/migration.sql", import.meta.url), "utf8");
const tenantOwnedModels = [
  "User", "Parent", "AuthSession", "Student", "Teacher", "Class", "ClassSession",
  "ClassMonthPlan", "ClassMonthPlanRevision", "StudentClass", "EnrollmentPeriod",
  "Attendance", "AttendancePeriod", "MonthlyFee", "MonthlyFeeLine",
  "MonthlyFeeLineRevision", "Template", "Receipt", "ReceiptLine", "BulkFeePaymentBatch",
  "BulkFeePaymentItem", "Payment", "ActivityLog", "StudentProgressMonth",
  "StudentProgressRevision", "StudentProgressSkill", "StudentProgressDailyEntry", "CenterSettings",
];

describe("Admin Console tenancy expand migration", () => {
  it("keeps tenant ownership and indexes after the constrain phase", () => {
    for (const model of tenantOwnedModels) {
      const body = schema.match(new RegExp(`model ${model} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? "";
      assert.match(body, /tenantId\s+String\s+@map\("tenant_id"\)/, model);
      assert.match(body, /@@(?:index|unique)\(\[tenantId\]/, model);
    }
  });

  it("seeds one explicit deterministic default tenant without backfilling business rows", () => {
    assert.match(migration, /'tenant_default', 'default', 'EduManager Default Tenant'/);
    assert.match(migration, /ON CONFLICT \("slug"\) DO NOTHING/);
    assert.doesNotMatch(migration, /UPDATE\s+"(?:users|students|classes)"/i);
  });

  it("keeps expand columns nullable and defers foreign keys and constraints", () => {
    assert.equal((migration.match(/ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;/g) ?? []).length, 28);
    assert.doesNotMatch(migration, /tenant_id" TEXT NOT NULL/);
    assert.doesNotMatch(migration, /FOREIGN KEY \("tenant_id"\)/);
  });
});
