import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const migration = readFileSync(
  new URL("../prisma/migrations/202608130001_admin_console_schema_parity/migration.sql", import.meta.url),
  "utf8",
);

const tenantModels = [
  "User", "Parent", "AuthSession", "Student", "Teacher", "Class",
  "ClassSession", "ClassMonthPlan", "ClassMonthPlanRevision", "StudentClass",
  "EnrollmentPeriod", "Attendance", "AttendancePeriod", "MonthlyFee",
  "MonthlyFeeLine", "MonthlyFeeLineRevision", "Template", "Receipt",
  "ReceiptLine", "BulkFeePaymentBatch", "BulkFeePaymentItem", "Payment",
  "ActivityLog", "StudentProgressMonth", "StudentProgressRevision",
  "StudentProgressSkill", "StudentProgressDailyEntry", "CenterSettings",
] as const;

const tenantUniques = [
  ["User", "@@unique([tenantId, username]"],
  ["Parent", "@@unique([tenantId, phone]"],
  ["Parent", "@@unique([tenantId, phoneNormalized]"],
  ["Teacher", "@@unique([tenantId, phone]"],
  ["ClassSession", "@@unique([tenantId, classId, sessionDate]"],
  ["ClassMonthPlan", "@@unique([tenantId, classId, billingMonth]"],
  ["ClassMonthPlanRevision", "@@unique([tenantId, planId, revision]"],
  ["StudentClass", "@@unique([tenantId, studentId, classId]"],
  ["Attendance", "@@unique([tenantId, studentId, classId, attendanceDate]"],
  ["AttendancePeriod", "@@unique([tenantId, classId, periodMonth]"],
  ["MonthlyFee", "@@unique([tenantId, studentId, month]"],
  ["MonthlyFeeLine", "@@unique([tenantId, studentId, month, allocationKey]"],
  ["MonthlyFeeLineRevision", "@@unique([tenantId, monthlyFeeLineId, revisionNumber]"],
  ["ReceiptLine", "@@unique([tenantId, monthlyFeeLineId]"],
  ["BulkFeePaymentBatch", "@@unique([tenantId, actorId, idempotencyKey]"],
  ["BulkFeePaymentItem", "@@unique([tenantId, batchId, lineId]"],
  ["BulkFeePaymentItem", "@@unique([tenantId, batchId, position]"],
  ["StudentProgressMonth", "@@unique([tenantId, studentId, classId, month]"],
  ["StudentProgressRevision", "@@unique([tenantId, progressMonthId, revisionNumber]"],
  ["StudentProgressSkill", "@@unique([tenantId, progressMonthId, skillKey]"],
] as const;

function modelBlock(name: string): string {
  const match = schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`));
  assert.ok(match, `missing Prisma model ${name}`);
  return match[1];
}

test("all tenant-owned models require tenantId and expose a Tenant relation", () => {
  assert.equal(tenantModels.length, 28);
  for (const model of tenantModels) {
    const block = modelBlock(model);
    assert.match(block, /tenantId\s+String\s+@map\("tenant_id"\)/, `${model}.tenantId must be required`);
    assert.match(block, /tenant\s+Tenant\s+@relation\(fields: \[tenantId\], references: \[id\], onDelete: Restrict\)/, `${model} must relate to Tenant`);
  }
});

test("tenant-owned business identities use tenant-aware compound uniques", () => {
  assert.equal(tenantUniques.length, 20);
  for (const [model, signature] of tenantUniques) {
    assert.ok(modelBlock(model).includes(signature), `${model} is missing ${signature}`);
  }
  assert.doesNotMatch(modelBlock("User"), /username\s+String\s+@unique/);
  assert.doesNotMatch(modelBlock("Parent"), /phone\s+String\s+@unique/);
  assert.doesNotMatch(modelBlock("Teacher"), /phone\s+String\s+@unique/);
});

test("center settings migration preserves the legacy row and enables one row per tenant", () => {
  const center = modelBlock("CenterSettings");
  assert.match(center, /id\s+Int\s+@id\s+@default\(autoincrement\(\)\)/);
  assert.match(center, /@@unique\(\[tenantId\]/);
  assert.match(migration, /CREATE SEQUENCE IF NOT EXISTS "center_settings_id_seq"/);
  assert.match(migration, /setval\(/);
  assert.match(migration, /CREATE UNIQUE INDEX "center_settings_tenant_id_key"/);
  assert.doesNotMatch(migration, /DELETE FROM "center_settings"/);
  assert.doesNotMatch(migration, /DROP TABLE "center_settings"/);
});
