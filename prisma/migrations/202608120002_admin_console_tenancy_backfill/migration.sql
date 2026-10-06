-- AC-04 data-only backfill. This migration intentionally adds no constraints.
-- It is deterministic and idempotent: only NULL tenant_id values are updated.
BEGIN;

SELECT pg_advisory_xact_lock(hashtext('edu_manager:tenant-backfill:tenant_default'));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "tenants" WHERE "id" = 'tenant_default') THEN
    RAISE EXCEPTION 'Default tenant tenant_default is missing; run tenancy expand first';
  END IF;
END $$;

-- ACCESS EXCLUSIVE locks prevent concurrent writers while tenant-only updates
-- pass immutable history guards. Both trigger states are restored before commit;
-- any failure rolls back the DDL together with all backfill writes.
ALTER TABLE "class_month_plan_revisions" DISABLE TRIGGER USER;
ALTER TABLE "monthly_fee_line_revisions" DISABLE TRIGGER USER;

UPDATE "users" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "parents" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "auth_sessions" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "students" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "teachers" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "classes" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "class_sessions" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "class_month_plans" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "class_month_plan_revisions" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "student_classes" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "enrollment_periods" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "attendance" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "attendance_periods" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "monthly_fees" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "monthly_fee_lines" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "monthly_fee_line_revisions" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "templates" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "receipts" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "receipt_lines" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "bulk_fee_payment_batches" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "bulk_fee_payment_items" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "payments" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "activity_logs" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "student_progress_months" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "student_progress_revisions" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "student_progress_skills" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "student_progress_daily_entries" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;
UPDATE "center_settings" SET "tenant_id" = 'tenant_default' WHERE "tenant_id" IS NULL;

ALTER TABLE "class_month_plan_revisions" ENABLE TRIGGER USER;
ALTER TABLE "monthly_fee_line_revisions" ENABLE TRIGGER USER;

COMMIT;
