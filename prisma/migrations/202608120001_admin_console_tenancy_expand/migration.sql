DO $$ BEGIN
  CREATE TYPE "TenantStatus" AS ENUM ('active', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "tenants" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "TenantStatus" NOT NULL DEFAULT 'active',
  "config_version" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_slug_key" ON "tenants"("slug");
CREATE INDEX IF NOT EXISTS "tenants_status_idx" ON "tenants"("status");

INSERT INTO "tenants" ("id", "slug", "name", "status", "config_version")
VALUES ('tenant_default', 'default', 'EduManager Default Tenant', 'active', 0)
ON CONFLICT ("slug") DO NOTHING;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_platform_owner" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "parents" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "auth_sessions" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "teachers" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "classes" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "class_sessions" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "class_month_plans" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "class_month_plan_revisions" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "student_classes" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "enrollment_periods" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "attendance_periods" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "monthly_fees" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "monthly_fee_lines" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "monthly_fee_line_revisions" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "receipt_lines" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "bulk_fee_payment_batches" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "bulk_fee_payment_items" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "activity_logs" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "student_progress_months" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "student_progress_revisions" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "student_progress_skills" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "student_progress_daily_entries" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "center_settings" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;

CREATE INDEX IF NOT EXISTS "users_tenant_id_idx" ON "users"("tenant_id");
CREATE INDEX IF NOT EXISTS "users_platform_owner_idx" ON "users"("is_platform_owner") WHERE "is_platform_owner" = true;
CREATE INDEX IF NOT EXISTS "parents_tenant_id_idx" ON "parents"("tenant_id");
CREATE INDEX IF NOT EXISTS "auth_sessions_tenant_id_idx" ON "auth_sessions"("tenant_id");
CREATE INDEX IF NOT EXISTS "students_tenant_id_idx" ON "students"("tenant_id");
CREATE INDEX IF NOT EXISTS "teachers_tenant_id_idx" ON "teachers"("tenant_id");
CREATE INDEX IF NOT EXISTS "classes_tenant_id_idx" ON "classes"("tenant_id");
CREATE INDEX IF NOT EXISTS "class_sessions_tenant_id_idx" ON "class_sessions"("tenant_id");
CREATE INDEX IF NOT EXISTS "class_month_plans_tenant_id_idx" ON "class_month_plans"("tenant_id");
CREATE INDEX IF NOT EXISTS "class_month_plan_revisions_tenant_id_idx" ON "class_month_plan_revisions"("tenant_id");
CREATE INDEX IF NOT EXISTS "student_classes_tenant_id_idx" ON "student_classes"("tenant_id");
CREATE INDEX IF NOT EXISTS "enrollment_periods_tenant_id_idx" ON "enrollment_periods"("tenant_id");
CREATE INDEX IF NOT EXISTS "attendance_tenant_id_idx" ON "attendance"("tenant_id");
CREATE INDEX IF NOT EXISTS "attendance_periods_tenant_id_idx" ON "attendance_periods"("tenant_id");
CREATE INDEX IF NOT EXISTS "monthly_fees_tenant_id_idx" ON "monthly_fees"("tenant_id");
CREATE INDEX IF NOT EXISTS "monthly_fee_lines_tenant_id_idx" ON "monthly_fee_lines"("tenant_id");
CREATE INDEX IF NOT EXISTS "monthly_fee_line_revisions_tenant_id_idx" ON "monthly_fee_line_revisions"("tenant_id");
CREATE INDEX IF NOT EXISTS "templates_tenant_id_idx" ON "templates"("tenant_id");
CREATE INDEX IF NOT EXISTS "receipts_tenant_id_idx" ON "receipts"("tenant_id");
CREATE INDEX IF NOT EXISTS "receipt_lines_tenant_id_idx" ON "receipt_lines"("tenant_id");
CREATE INDEX IF NOT EXISTS "bulk_fee_payment_batches_tenant_id_idx" ON "bulk_fee_payment_batches"("tenant_id");
CREATE INDEX IF NOT EXISTS "bulk_fee_payment_items_tenant_id_idx" ON "bulk_fee_payment_items"("tenant_id");
CREATE INDEX IF NOT EXISTS "payments_tenant_id_idx" ON "payments"("tenant_id");
CREATE INDEX IF NOT EXISTS "activity_logs_tenant_id_idx" ON "activity_logs"("tenant_id");
CREATE INDEX IF NOT EXISTS "student_progress_months_tenant_id_idx" ON "student_progress_months"("tenant_id");
CREATE INDEX IF NOT EXISTS "student_progress_revisions_tenant_id_idx" ON "student_progress_revisions"("tenant_id");
CREATE INDEX IF NOT EXISTS "student_progress_skills_tenant_id_idx" ON "student_progress_skills"("tenant_id");
CREATE INDEX IF NOT EXISTS "student_progress_daily_entries_tenant_id_idx" ON "student_progress_daily_entries"("tenant_id");
CREATE INDEX IF NOT EXISTS "center_settings_tenant_id_idx" ON "center_settings"("tenant_id");
