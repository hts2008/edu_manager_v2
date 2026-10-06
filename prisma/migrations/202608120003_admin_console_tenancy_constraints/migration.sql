-- AC-04 / T1.4 tenancy contraction.
-- Preconditions: tenancy_expand and tenancy_backfill have completed and the
-- read-only verifier has reported no NULL, orphan, or cross-tenant relations.
BEGIN;

SELECT pg_advisory_xact_lock(hashtext('edu_manager:tenant-constraints:v1'));

-- Fail before DDL if any tenant-owned row cannot be constrained safely.
DO $$
DECLARE
  tenant_table TEXT;
  invalid_count BIGINT;
BEGIN
  FOREACH tenant_table IN ARRAY ARRAY[
    'users', 'parents', 'auth_sessions', 'students', 'teachers', 'classes',
    'class_sessions', 'class_month_plans', 'class_month_plan_revisions',
    'student_classes', 'enrollment_periods', 'attendance', 'attendance_periods',
    'monthly_fees', 'monthly_fee_lines', 'monthly_fee_line_revisions',
    'templates', 'receipts', 'receipt_lines', 'bulk_fee_payment_batches',
    'bulk_fee_payment_items', 'payments', 'activity_logs',
    'student_progress_months', 'student_progress_revisions',
    'student_progress_skills', 'student_progress_daily_entries', 'center_settings'
  ]
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM %I owned LEFT JOIN tenants t ON t.id = owned.tenant_id WHERE owned.tenant_id IS NULL OR t.id IS NULL',
      tenant_table
    ) INTO invalid_count;

    IF invalid_count > 0 THEN
      RAISE EXCEPTION
        'Tenancy contraction refused: table % has % NULL or orphan tenant_id row(s)',
        tenant_table,
        invalid_count;
    END IF;
  END LOOP;
END $$;

-- Tenant deletion must be explicit and cannot cascade through business data.
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "parents" ADD CONSTRAINT "parents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "students" ADD CONSTRAINT "students_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "classes" ADD CONSTRAINT "classes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "class_month_plans" ADD CONSTRAINT "class_month_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "class_month_plan_revisions" ADD CONSTRAINT "class_month_plan_revisions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "student_classes" ADD CONSTRAINT "student_classes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "enrollment_periods" ADD CONSTRAINT "enrollment_periods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "attendance_periods" ADD CONSTRAINT "attendance_periods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "monthly_fees" ADD CONSTRAINT "monthly_fees_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "monthly_fee_lines" ADD CONSTRAINT "monthly_fee_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "monthly_fee_line_revisions" ADD CONSTRAINT "monthly_fee_line_revisions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "templates" ADD CONSTRAINT "templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "receipt_lines" ADD CONSTRAINT "receipt_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "bulk_fee_payment_batches" ADD CONSTRAINT "bulk_fee_payment_batches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "bulk_fee_payment_items" ADD CONSTRAINT "bulk_fee_payment_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "student_progress_months" ADD CONSTRAINT "student_progress_months_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "student_progress_revisions" ADD CONSTRAINT "student_progress_revisions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "student_progress_skills" ADD CONSTRAINT "student_progress_skills_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "student_progress_daily_entries" ADD CONSTRAINT "student_progress_daily_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "center_settings" ADD CONSTRAINT "center_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

-- Validation is explicit so a failed relation check rolls back the transaction.
ALTER TABLE "users" VALIDATE CONSTRAINT "users_tenant_id_fkey";
ALTER TABLE "parents" VALIDATE CONSTRAINT "parents_tenant_id_fkey";
ALTER TABLE "auth_sessions" VALIDATE CONSTRAINT "auth_sessions_tenant_id_fkey";
ALTER TABLE "students" VALIDATE CONSTRAINT "students_tenant_id_fkey";
ALTER TABLE "teachers" VALIDATE CONSTRAINT "teachers_tenant_id_fkey";
ALTER TABLE "classes" VALIDATE CONSTRAINT "classes_tenant_id_fkey";
ALTER TABLE "class_sessions" VALIDATE CONSTRAINT "class_sessions_tenant_id_fkey";
ALTER TABLE "class_month_plans" VALIDATE CONSTRAINT "class_month_plans_tenant_id_fkey";
ALTER TABLE "class_month_plan_revisions" VALIDATE CONSTRAINT "class_month_plan_revisions_tenant_id_fkey";
ALTER TABLE "student_classes" VALIDATE CONSTRAINT "student_classes_tenant_id_fkey";
ALTER TABLE "enrollment_periods" VALIDATE CONSTRAINT "enrollment_periods_tenant_id_fkey";
ALTER TABLE "attendance" VALIDATE CONSTRAINT "attendance_tenant_id_fkey";
ALTER TABLE "attendance_periods" VALIDATE CONSTRAINT "attendance_periods_tenant_id_fkey";
ALTER TABLE "monthly_fees" VALIDATE CONSTRAINT "monthly_fees_tenant_id_fkey";
ALTER TABLE "monthly_fee_lines" VALIDATE CONSTRAINT "monthly_fee_lines_tenant_id_fkey";
ALTER TABLE "monthly_fee_line_revisions" VALIDATE CONSTRAINT "monthly_fee_line_revisions_tenant_id_fkey";
ALTER TABLE "templates" VALIDATE CONSTRAINT "templates_tenant_id_fkey";
ALTER TABLE "receipts" VALIDATE CONSTRAINT "receipts_tenant_id_fkey";
ALTER TABLE "receipt_lines" VALIDATE CONSTRAINT "receipt_lines_tenant_id_fkey";
ALTER TABLE "bulk_fee_payment_batches" VALIDATE CONSTRAINT "bulk_fee_payment_batches_tenant_id_fkey";
ALTER TABLE "bulk_fee_payment_items" VALIDATE CONSTRAINT "bulk_fee_payment_items_tenant_id_fkey";
ALTER TABLE "payments" VALIDATE CONSTRAINT "payments_tenant_id_fkey";
ALTER TABLE "activity_logs" VALIDATE CONSTRAINT "activity_logs_tenant_id_fkey";
ALTER TABLE "student_progress_months" VALIDATE CONSTRAINT "student_progress_months_tenant_id_fkey";
ALTER TABLE "student_progress_revisions" VALIDATE CONSTRAINT "student_progress_revisions_tenant_id_fkey";
ALTER TABLE "student_progress_skills" VALIDATE CONSTRAINT "student_progress_skills_tenant_id_fkey";
ALTER TABLE "student_progress_daily_entries" VALIDATE CONSTRAINT "student_progress_daily_entries_tenant_id_fkey";
ALTER TABLE "center_settings" VALIDATE CONSTRAINT "center_settings_tenant_id_fkey";

ALTER TABLE "users" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "parents" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "auth_sessions" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "students" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "teachers" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "classes" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "class_sessions" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "class_month_plans" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "class_month_plan_revisions" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "student_classes" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "enrollment_periods" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "attendance" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "attendance_periods" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "monthly_fees" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "monthly_fee_lines" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "monthly_fee_line_revisions" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "templates" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "receipts" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "receipt_lines" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "bulk_fee_payment_batches" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "bulk_fee_payment_items" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "payments" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "activity_logs" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "student_progress_months" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "student_progress_revisions" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "student_progress_skills" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "student_progress_daily_entries" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "center_settings" ALTER COLUMN "tenant_id" SET NOT NULL;

-- Create tenant-aware business uniqueness before removing global namespaces.
-- Primary keys and auth_sessions.token_id remain globally unique by design.
CREATE UNIQUE INDEX "users_tenant_id_username_key" ON "users"("tenant_id", "username");
CREATE UNIQUE INDEX "parents_tenant_id_phone_key" ON "parents"("tenant_id", "phone");
CREATE UNIQUE INDEX "parents_tenant_id_phone_normalized_key" ON "parents"("tenant_id", "phone_normalized");
CREATE UNIQUE INDEX "teachers_tenant_id_phone_key" ON "teachers"("tenant_id", "phone");
CREATE UNIQUE INDEX "class_sessions_tenant_id_class_id_session_date_key" ON "class_sessions"("tenant_id", "class_id", "session_date");
CREATE UNIQUE INDEX "class_month_plans_tenant_id_class_id_billing_month_key" ON "class_month_plans"("tenant_id", "class_id", "billing_month");
CREATE UNIQUE INDEX "class_month_plan_revisions_tenant_id_plan_id_revision_key" ON "class_month_plan_revisions"("tenant_id", "plan_id", "revision");
CREATE UNIQUE INDEX "student_classes_tenant_id_student_id_class_id_key" ON "student_classes"("tenant_id", "student_id", "class_id");
CREATE UNIQUE INDEX "attendance_tenant_id_student_id_class_id_attendance_date_key" ON "attendance"("tenant_id", "student_id", "class_id", "attendance_date");
CREATE UNIQUE INDEX "attendance_periods_tenant_id_class_id_period_month_key" ON "attendance_periods"("tenant_id", "class_id", "period_month");
CREATE UNIQUE INDEX "monthly_fees_tenant_id_student_id_month_key" ON "monthly_fees"("tenant_id", "student_id", "month");
CREATE UNIQUE INDEX "monthly_fee_lines_tenant_id_student_id_month_allocation_key_key" ON "monthly_fee_lines"("tenant_id", "student_id", "month", "allocation_key");
CREATE UNIQUE INDEX "monthly_fee_line_revisions_tenant_id_line_id_revision_key" ON "monthly_fee_line_revisions"("tenant_id", "monthly_fee_line_id", "revision_number");
CREATE UNIQUE INDEX "receipt_lines_tenant_id_monthly_fee_line_id_key" ON "receipt_lines"("tenant_id", "monthly_fee_line_id");
CREATE UNIQUE INDEX "bulk_fee_payment_batches_tenant_id_actor_id_idempotency_key" ON "bulk_fee_payment_batches"("tenant_id", "actor_id", "idempotency_key");
CREATE UNIQUE INDEX "bulk_fee_payment_items_tenant_id_batch_id_line_id_key" ON "bulk_fee_payment_items"("tenant_id", "batch_id", "line_id");
CREATE UNIQUE INDEX "bulk_fee_payment_items_tenant_id_batch_id_position_key" ON "bulk_fee_payment_items"("tenant_id", "batch_id", "position");
CREATE UNIQUE INDEX "student_progress_months_tenant_id_student_id_class_id_month_key" ON "student_progress_months"("tenant_id", "student_id", "class_id", "month");
CREATE UNIQUE INDEX "progress_revisions_tenant_month_revision_key" ON "student_progress_revisions"("tenant_id", "progress_month_id", "revision_number");
CREATE UNIQUE INDEX "student_progress_skills_tenant_id_progress_month_skill_key" ON "student_progress_skills"("tenant_id", "progress_month_id", "skill_key");

DROP INDEX "users_username_key";
DROP INDEX "parents_phone_key";
DROP INDEX "parents_phone_normalized_key";
DROP INDEX "teachers_phone_key";
DROP INDEX "class_sessions_class_id_session_date_key";
DROP INDEX "class_month_plans_class_id_billing_month_key";
DROP INDEX "class_month_plan_revisions_plan_id_revision_key";
DROP INDEX "student_classes_student_id_class_id_key";
DROP INDEX "attendance_student_id_class_id_attendance_date_key";
DROP INDEX "attendance_periods_class_id_period_month_key";
DROP INDEX "monthly_fees_student_id_month_key";
DROP INDEX "monthly_fee_lines_student_id_month_allocation_key_key";
-- PostgreSQL truncated the legacy Prisma identifier to 63 bytes when created.
DROP INDEX "monthly_fee_line_revisions_monthly_fee_line_id_revision_number_";
DROP INDEX "receipt_lines_monthly_fee_line_id_key";
DROP INDEX "bulk_fee_payment_batches_actor_id_idempotency_key_key";
DROP INDEX "bulk_fee_payment_items_batch_id_line_id_key";
DROP INDEX "bulk_fee_payment_items_batch_id_position_key";
DROP INDEX "student_progress_months_student_id_class_id_month_key";
DROP INDEX "student_progress_revisions_progress_month_id_revision_numbe_key";
DROP INDEX "student_progress_skills_progress_month_id_skill_key_key";

-- Tenant-prefixed operational indexes support the enforced scoped query path.
CREATE INDEX "users_tenant_id_role_idx" ON "users"("tenant_id", "role");
CREATE INDEX "students_tenant_id_status_idx" ON "students"("tenant_id", "status");
CREATE INDEX "teachers_tenant_id_status_idx" ON "teachers"("tenant_id", "status");
CREATE INDEX "classes_tenant_id_status_idx" ON "classes"("tenant_id", "status");
CREATE INDEX "attendance_tenant_id_class_id_date_idx" ON "attendance"("tenant_id", "class_id", "attendance_date");
CREATE INDEX "monthly_fees_tenant_id_month_status_idx" ON "monthly_fees"("tenant_id", "month", "status");
CREATE INDEX "monthly_fee_lines_tenant_id_class_id_month_status_idx" ON "monthly_fee_lines"("tenant_id", "class_id", "month", "status");
CREATE INDEX "receipts_tenant_id_created_at_idx" ON "receipts"("tenant_id", "created_at");
CREATE INDEX "payments_tenant_id_created_at_idx" ON "payments"("tenant_id", "created_at");
CREATE INDEX "activity_logs_tenant_id_created_at_idx" ON "activity_logs"("tenant_id", "created_at");
CREATE INDEX "student_progress_months_tenant_id_month_idx" ON "student_progress_months"("tenant_id", "month");

COMMIT;
