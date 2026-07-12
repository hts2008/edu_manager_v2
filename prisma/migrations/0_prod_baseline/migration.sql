-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'absent_with_fee', 'absent_no_fee', 'holiday');

-- CreateEnum
CREATE TYPE "FeeStatus" AS ENUM ('pending', 'ready', 'confirmed', 'paid');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "Orientation" AS ENUM ('portrait', 'landscape');

-- CreateEnum
CREATE TYPE "PaperSize" AS ENUM ('a4', 'a5', 'letter', 'thermal_80mm');

-- CreateEnum
CREATE TYPE "PaymentCategory" AS ENUM ('salary', 'utility', 'office', 'other');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'transfer');

-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('open', 'submitted', 'approved', 'locked');

-- CreateEnum
CREATE TYPE "ProgressEntryType" AS ENUM ('homework', 'daily_practice', 'mock_test', 'shield', 'note', 'skill_assessment');

-- CreateEnum
CREATE TYPE "Relationship" AS ENUM ('father', 'mother', 'guardian');

-- CreateEnum
CREATE TYPE "SalaryType" AS ENUM ('hourly', 'fixed');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('active', 'inactive', 'graduated');

-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('receipt', 'payment');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'receptionist');

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "attendance_date" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "reason" TEXT,
    "is_make_up" BOOLEAN NOT NULL DEFAULT false,
    "make_up_reason" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_periods" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "period_month" TEXT NOT NULL,
    "status" "PeriodStatus" NOT NULL DEFAULT 'open',
    "total_sessions" INTEGER NOT NULL DEFAULT 0,
    "total_present" INTEGER NOT NULL DEFAULT 0,
    "total_absent_fee" INTEGER NOT NULL DEFAULT 0,
    "total_absent_no_fee" INTEGER NOT NULL DEFAULT 0,
    "total_holiday" INTEGER NOT NULL DEFAULT 0,
    "submitted_by" TEXT,
    "submitted_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "locked_by" TEXT,
    "locked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "center_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "center_name" TEXT NOT NULL DEFAULT 'Trung Tâm Dạy Thêm',
    "center_address" TEXT,
    "center_phone" TEXT,
    "center_email" TEXT,
    "center_logo" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "center_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "class_name" TEXT NOT NULL,
    "schedule_days" JSONB,
    "schedule_required" BOOLEAN NOT NULL DEFAULT false,
    "sessions_per_week" INTEGER,
    "session_required" BOOLEAN NOT NULL DEFAULT false,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "fee_per_day" DOUBLE PRECISION NOT NULL,
    "max_students" INTEGER NOT NULL DEFAULT 50,
    "teacher_id" TEXT,
    "status" "Status" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollment_periods" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollment_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_fee_lines" (
    "id" TEXT NOT NULL,
    "monthly_fee_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "class_id" TEXT,
    "allocation_key" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "class_name_snapshot" TEXT,
    "teacher_name_snapshot" TEXT,
    "expected_sessions" INTEGER NOT NULL DEFAULT 0,
    "charged_sessions" INTEGER NOT NULL DEFAULT 0,
    "make_up_sessions" INTEGER NOT NULL DEFAULT 0,
    "extra_sessions" INTEGER NOT NULL DEFAULT 0,
    "fee_per_session" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthly_tuition" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "billing_mode" TEXT,
    "schedule_mode" TEXT,
    "status" "FeeStatus" NOT NULL DEFAULT 'pending',
    "receipt_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "allocation_confidence" TEXT NOT NULL DEFAULT 'calculated',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_fee_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_fees" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "total_days" INTEGER NOT NULL DEFAULT 0,
    "total_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "FeeStatus" NOT NULL DEFAULT 'pending',
    "receipt_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parents" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "relationship" "Relationship" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "parents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "category" "PaymentCategory" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "recipient_phone" TEXT,
    "template_id" TEXT NOT NULL,
    "notes" TEXT,
    "pdf_path" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_lines" (
    "id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "monthly_fee_line_id" TEXT,
    "class_id" TEXT,
    "class_name_snapshot" TEXT,
    "teacher_name_snapshot" TEXT,
    "days_count" INTEGER NOT NULL DEFAULT 0,
    "expected_sessions" INTEGER,
    "fee_per_day" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipt_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "days_count" INTEGER NOT NULL,
    "fee_per_day" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "template_id" TEXT NOT NULL,
    "notes" TEXT,
    "pdf_path" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_classes" (
    "id" SERIAL NOT NULL,
    "student_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "enrollment_date" TIMESTAMP(3) NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_progress_daily_entries" (
    "id" TEXT NOT NULL,
    "progress_month_id" TEXT NOT NULL,
    "entry_date" TIMESTAMP(3) NOT NULL,
    "entry_type" "ProgressEntryType" NOT NULL,
    "skill_key" TEXT,
    "score" DOUBLE PRECISION,
    "shield_count" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_progress_daily_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_progress_months" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "track_key" TEXT,
    "class_type" TEXT,
    "progress_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "attendance_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "consistency_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "learning_evidence_coverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "track_readiness" TEXT,
    "focus_skill_key" TEXT,
    "focus_skill_label" TEXT,
    "teacher_note" TEXT,
    "parent_summary" TEXT,
    "next_actions" JSONB,
    "evidence_notes" JSONB,
    "rubric_snapshot" JSONB,
    "academic_input_status" TEXT,
    "shield_total" INTEGER NOT NULL DEFAULT 0,
    "points_total" INTEGER NOT NULL DEFAULT 0,
    "mock_test_score" DOUBLE PRECISION,
    "finalized_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "daily_assessment_count" INTEGER NOT NULL DEFAULT 0,
    "daily_average_score" DOUBLE PRECISION,
    "daily_latest_score" DOUBLE PRECISION,
    "daily_score_delta" DOUBLE PRECISION,

    CONSTRAINT "student_progress_months_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_progress_skills" (
    "id" TEXT NOT NULL,
    "progress_month_id" TEXT NOT NULL,
    "skill_key" TEXT NOT NULL,
    "skill_label" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "max_score" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'missing_input',
    "note" TEXT,
    "source" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_progress_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "parent_id" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "enrollment_date" TIMESTAMP(3) NOT NULL,
    "graduation_date" TIMESTAMP(3),
    "status" "StudentStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teachers" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "salary_type" "SalaryType" NOT NULL,
    "salary_amount" DOUBLE PRECISION NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "template_name" TEXT NOT NULL,
    "type" "TemplateType" NOT NULL,
    "paper_size" "PaperSize" NOT NULL,
    "orientation" "Orientation" NOT NULL,
    "json_config" JSONB NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'receptionist',
    "full_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "status" "Status" NOT NULL DEFAULT 'active',
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action" ASC);

-- CreateIndex
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at" ASC);

-- CreateIndex
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("user_id" ASC);

-- CreateIndex
CREATE INDEX "attendance_attendance_date_idx" ON "attendance"("attendance_date" ASC);

-- CreateIndex
CREATE INDEX "attendance_attendance_date_status_idx" ON "attendance"("attendance_date" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "attendance_class_id_attendance_date_idx" ON "attendance"("class_id" ASC, "attendance_date" ASC);

-- CreateIndex
CREATE INDEX "attendance_class_id_idx" ON "attendance"("class_id" ASC);

-- CreateIndex
CREATE INDEX "attendance_is_make_up_idx" ON "attendance"("is_make_up" ASC);

-- CreateIndex
CREATE INDEX "attendance_student_id_attendance_date_idx" ON "attendance"("student_id" ASC, "attendance_date" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_student_id_class_id_attendance_date_key" ON "attendance"("student_id" ASC, "class_id" ASC, "attendance_date" ASC);

-- CreateIndex
CREATE INDEX "attendance_student_id_idx" ON "attendance"("student_id" ASC);

-- CreateIndex
CREATE INDEX "attendance_periods_class_id_idx" ON "attendance_periods"("class_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_periods_class_id_period_month_key" ON "attendance_periods"("class_id" ASC, "period_month" ASC);

-- CreateIndex
CREATE INDEX "attendance_periods_class_id_period_month_status_idx" ON "attendance_periods"("class_id" ASC, "period_month" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "attendance_periods_period_month_idx" ON "attendance_periods"("period_month" ASC);

-- CreateIndex
CREATE INDEX "attendance_periods_status_idx" ON "attendance_periods"("status" ASC);

-- CreateIndex
CREATE INDEX "classes_status_idx" ON "classes"("status" ASC);

-- CreateIndex
CREATE INDEX "classes_teacher_id_idx" ON "classes"("teacher_id" ASC);

-- CreateIndex
CREATE INDEX "enrollment_periods_class_id_started_at_ended_at_idx" ON "enrollment_periods"("class_id" ASC, "started_at" ASC, "ended_at" ASC);

-- CreateIndex
CREATE INDEX "enrollment_periods_student_id_class_id_ended_at_idx" ON "enrollment_periods"("student_id" ASC, "class_id" ASC, "ended_at" ASC);

-- CreateIndex
CREATE INDEX "enrollment_periods_student_id_started_at_ended_at_idx" ON "enrollment_periods"("student_id" ASC, "started_at" ASC, "ended_at" ASC);

-- CreateIndex
CREATE INDEX "monthly_fee_lines_class_id_month_status_idx" ON "monthly_fee_lines"("class_id" ASC, "month" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "monthly_fee_lines_monthly_fee_id_idx" ON "monthly_fee_lines"("monthly_fee_id" ASC);

-- CreateIndex
CREATE INDEX "monthly_fee_lines_receipt_id_idx" ON "monthly_fee_lines"("receipt_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "monthly_fee_lines_student_id_month_allocation_key_key" ON "monthly_fee_lines"("student_id" ASC, "month" ASC, "allocation_key" ASC);

-- CreateIndex
CREATE INDEX "monthly_fee_lines_student_id_month_idx" ON "monthly_fee_lines"("student_id" ASC, "month" ASC);

-- CreateIndex
CREATE INDEX "monthly_fees_month_idx" ON "monthly_fees"("month" ASC);

-- CreateIndex
CREATE INDEX "monthly_fees_month_status_idx" ON "monthly_fees"("month" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "monthly_fees_status_idx" ON "monthly_fees"("status" ASC);

-- CreateIndex
CREATE INDEX "monthly_fees_student_id_idx" ON "monthly_fees"("student_id" ASC);

-- CreateIndex
CREATE INDEX "monthly_fees_student_id_month_idx" ON "monthly_fees"("student_id" ASC, "month" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "monthly_fees_student_id_month_key" ON "monthly_fees"("student_id" ASC, "month" ASC);

-- CreateIndex
CREATE INDEX "parents_deleted_at_idx" ON "parents"("deleted_at" ASC);

-- CreateIndex
CREATE INDEX "parents_full_name_idx" ON "parents"("full_name" ASC);

-- CreateIndex
CREATE INDEX "parents_phone_idx" ON "parents"("phone" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "parents_phone_key" ON "parents"("phone" ASC);

-- CreateIndex
CREATE INDEX "payments_category_created_at_idx" ON "payments"("category" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "payments_category_idx" ON "payments"("category" ASC);

-- CreateIndex
CREATE INDEX "payments_created_at_idx" ON "payments"("created_at" ASC);

-- CreateIndex
CREATE INDEX "payments_deleted_at_created_at_idx" ON "payments"("deleted_at" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "payments_deleted_at_idx" ON "payments"("deleted_at" ASC);

-- CreateIndex
CREATE INDEX "receipt_lines_class_id_idx" ON "receipt_lines"("class_id" ASC);

-- CreateIndex
CREATE INDEX "receipt_lines_monthly_fee_line_id_idx" ON "receipt_lines"("monthly_fee_line_id" ASC);

-- CreateIndex
CREATE INDEX "receipt_lines_receipt_id_idx" ON "receipt_lines"("receipt_id" ASC);

-- CreateIndex
CREATE INDEX "receipts_created_at_idx" ON "receipts"("created_at" ASC);

-- CreateIndex
CREATE INDEX "receipts_deleted_at_created_at_idx" ON "receipts"("deleted_at" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "receipts_deleted_at_idx" ON "receipts"("deleted_at" ASC);

-- CreateIndex
CREATE INDEX "receipts_month_idx" ON "receipts"("month" ASC);

-- CreateIndex
CREATE INDEX "receipts_student_id_idx" ON "receipts"("student_id" ASC);

-- CreateIndex
CREATE INDEX "receipts_student_id_month_idx" ON "receipts"("student_id" ASC, "month" ASC);

-- CreateIndex
CREATE INDEX "student_classes_class_id_idx" ON "student_classes"("class_id" ASC);

-- CreateIndex
CREATE INDEX "student_classes_class_id_status_idx" ON "student_classes"("class_id" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "student_classes_student_id_class_id_key" ON "student_classes"("student_id" ASC, "class_id" ASC);

-- CreateIndex
CREATE INDEX "student_classes_student_id_idx" ON "student_classes"("student_id" ASC);

-- CreateIndex
CREATE INDEX "student_classes_student_id_status_idx" ON "student_classes"("student_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "student_progress_daily_entries_entry_date_idx" ON "student_progress_daily_entries"("entry_date" ASC);

-- CreateIndex
CREATE INDEX "student_progress_daily_entries_entry_type_idx" ON "student_progress_daily_entries"("entry_type" ASC);

-- CreateIndex
CREATE INDEX "student_progress_daily_entries_progress_month_id_entry_date_idx" ON "student_progress_daily_entries"("progress_month_id" ASC, "entry_date" ASC);

-- CreateIndex
CREATE INDEX "student_progress_daily_entries_progress_month_id_idx" ON "student_progress_daily_entries"("progress_month_id" ASC);

-- CreateIndex
CREATE INDEX "student_progress_daily_entries_skill_key_idx" ON "student_progress_daily_entries"("skill_key" ASC);

-- CreateIndex
CREATE INDEX "student_progress_months_class_id_idx" ON "student_progress_months"("class_id" ASC);

-- CreateIndex
CREATE INDEX "student_progress_months_class_type_idx" ON "student_progress_months"("class_type" ASC);

-- CreateIndex
CREATE INDEX "student_progress_months_finalized_at_idx" ON "student_progress_months"("finalized_at" ASC);

-- CreateIndex
CREATE INDEX "student_progress_months_month_idx" ON "student_progress_months"("month" ASC);

-- CreateIndex
CREATE INDEX "student_progress_months_student_id_class_id_month_idx" ON "student_progress_months"("student_id" ASC, "class_id" ASC, "month" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "student_progress_months_student_id_class_id_month_key" ON "student_progress_months"("student_id" ASC, "class_id" ASC, "month" ASC);

-- CreateIndex
CREATE INDEX "student_progress_months_student_id_idx" ON "student_progress_months"("student_id" ASC);

-- CreateIndex
CREATE INDEX "student_progress_months_track_key_idx" ON "student_progress_months"("track_key" ASC);

-- CreateIndex
CREATE INDEX "student_progress_skills_progress_month_id_idx" ON "student_progress_skills"("progress_month_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "student_progress_skills_progress_month_id_skill_key_key" ON "student_progress_skills"("progress_month_id" ASC, "skill_key" ASC);

-- CreateIndex
CREATE INDEX "student_progress_skills_skill_key_idx" ON "student_progress_skills"("skill_key" ASC);

-- CreateIndex
CREATE INDEX "students_deleted_at_idx" ON "students"("deleted_at" ASC);

-- CreateIndex
CREATE INDEX "students_full_name_idx" ON "students"("full_name" ASC);

-- CreateIndex
CREATE INDEX "students_parent_id_idx" ON "students"("parent_id" ASC);

-- CreateIndex
CREATE INDEX "students_status_idx" ON "students"("status" ASC);

-- CreateIndex
CREATE INDEX "teachers_phone_idx" ON "teachers"("phone" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "teachers_phone_key" ON "teachers"("phone" ASC);

-- CreateIndex
CREATE INDEX "teachers_status_idx" ON "teachers"("status" ASC);

-- CreateIndex
CREATE INDEX "templates_is_default_idx" ON "templates"("is_default" ASC);

-- CreateIndex
CREATE INDEX "templates_type_idx" ON "templates"("type" ASC);

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role" ASC);

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username" ASC);

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_periods" ADD CONSTRAINT "attendance_periods_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_periods" ADD CONSTRAINT "attendance_periods_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_periods" ADD CONSTRAINT "attendance_periods_locked_by_fkey" FOREIGN KEY ("locked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_periods" ADD CONSTRAINT "attendance_periods_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_periods" ADD CONSTRAINT "enrollment_periods_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_periods" ADD CONSTRAINT "enrollment_periods_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_fee_lines" ADD CONSTRAINT "monthly_fee_lines_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_fee_lines" ADD CONSTRAINT "monthly_fee_lines_monthly_fee_id_fkey" FOREIGN KEY ("monthly_fee_id") REFERENCES "monthly_fees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_fee_lines" ADD CONSTRAINT "monthly_fee_lines_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_fee_lines" ADD CONSTRAINT "monthly_fee_lines_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_fees" ADD CONSTRAINT "monthly_fees_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_fees" ADD CONSTRAINT "monthly_fees_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_lines" ADD CONSTRAINT "receipt_lines_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_lines" ADD CONSTRAINT "receipt_lines_monthly_fee_line_id_fkey" FOREIGN KEY ("monthly_fee_line_id") REFERENCES "monthly_fee_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_lines" ADD CONSTRAINT "receipt_lines_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_classes" ADD CONSTRAINT "student_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_classes" ADD CONSTRAINT "student_classes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progress_daily_entries" ADD CONSTRAINT "student_progress_daily_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progress_daily_entries" ADD CONSTRAINT "student_progress_daily_entries_progress_month_id_fkey" FOREIGN KEY ("progress_month_id") REFERENCES "student_progress_months"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progress_months" ADD CONSTRAINT "student_progress_months_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progress_months" ADD CONSTRAINT "student_progress_months_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progress_months" ADD CONSTRAINT "student_progress_months_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progress_months" ADD CONSTRAINT "student_progress_months_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progress_skills" ADD CONSTRAINT "student_progress_skills_progress_month_id_fkey" FOREIGN KEY ("progress_month_id") REFERENCES "student_progress_months"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
