DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "receipt_lines"
    WHERE "monthly_fee_line_id" IS NOT NULL
    GROUP BY "monthly_fee_line_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate receipt_lines.monthly_fee_line_id values must be reconciled before migration';
  END IF;
END $$;

-- DropIndex
DROP INDEX "receipt_lines_monthly_fee_line_id_idx";

-- AlterTable
ALTER TABLE "parents" ADD COLUMN     "phone_normalized" TEXT,
ADD COLUMN     "token_version" INTEGER NOT NULL DEFAULT 0;

UPDATE "parents"
SET "phone_normalized" = regexp_replace("phone", '[^0-9+]', '', 'g')
WHERE "phone_normalized" IS NULL;

-- AlterTable
ALTER TABLE "student_progress_months" ADD COLUMN     "revision_number" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "token_version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "token_id" TEXT NOT NULL,
    "subject_type" TEXT NOT NULL,
    "user_id" TEXT,
    "parent_id" TEXT,
    "token_version" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_fee_payment_batches" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "template_id" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total_items" INTEGER NOT NULL,
    "processed_items" INTEGER NOT NULL DEFAULT 0,
    "response" JSONB,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_fee_payment_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_fee_payment_items" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "line_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "receipt_id" TEXT,
    "result" JSONB,
    "error_code" TEXT,
    "error_message" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_fee_payment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_progress_revisions" (
    "id" TEXT NOT NULL,
    "progress_month_id" TEXT NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "event_type" TEXT NOT NULL,
    "reason" TEXT,
    "snapshot" JSONB NOT NULL,
    "actor_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_progress_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_id_key" ON "auth_sessions"("token_id");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_revoked_at_idx" ON "auth_sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "auth_sessions_parent_id_revoked_at_idx" ON "auth_sessions"("parent_id", "revoked_at");

-- CreateIndex
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "bulk_fee_payment_batches_actor_id_created_at_idx" ON "bulk_fee_payment_batches"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "bulk_fee_payment_batches_status_updated_at_idx" ON "bulk_fee_payment_batches"("status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "bulk_fee_payment_batches_actor_id_idempotency_key_key" ON "bulk_fee_payment_batches"("actor_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "bulk_fee_payment_items_batch_id_status_position_idx" ON "bulk_fee_payment_items"("batch_id", "status", "position");

-- CreateIndex
CREATE INDEX "bulk_fee_payment_items_receipt_id_idx" ON "bulk_fee_payment_items"("receipt_id");

-- CreateIndex
CREATE UNIQUE INDEX "bulk_fee_payment_items_batch_id_line_id_key" ON "bulk_fee_payment_items"("batch_id", "line_id");

-- CreateIndex
CREATE UNIQUE INDEX "bulk_fee_payment_items_batch_id_position_key" ON "bulk_fee_payment_items"("batch_id", "position");

-- CreateIndex
CREATE INDEX "student_progress_revisions_progress_month_id_created_at_idx" ON "student_progress_revisions"("progress_month_id", "created_at");

-- CreateIndex
CREATE INDEX "student_progress_revisions_actor_id_idx" ON "student_progress_revisions"("actor_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_progress_revisions_progress_month_id_revision_numbe_key" ON "student_progress_revisions"("progress_month_id", "revision_number");

-- CreateIndex
CREATE UNIQUE INDEX "parents_phone_normalized_key" ON "parents"("phone_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_lines_monthly_fee_line_id_key" ON "receipt_lines"("monthly_fee_line_id");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_fee_payment_batches" ADD CONSTRAINT "bulk_fee_payment_batches_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_fee_payment_items" ADD CONSTRAINT "bulk_fee_payment_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "bulk_fee_payment_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_fee_payment_items" ADD CONSTRAINT "bulk_fee_payment_items_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "monthly_fee_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progress_revisions" ADD CONSTRAINT "student_progress_revisions_progress_month_id_fkey" FOREIGN KEY ("progress_month_id") REFERENCES "student_progress_months"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progress_revisions" ADD CONSTRAINT "student_progress_revisions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Distributed login protection is intentionally stored outside the Prisma client model.
CREATE TABLE IF NOT EXISTS "auth_rate_limit" (
  "bucket_key" TEXT PRIMARY KEY,
  "attempt_count" INTEGER NOT NULL CHECK ("attempt_count" > 0),
  "reset_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS "auth_rate_limit_reset_at_idx" ON "auth_rate_limit"("reset_at");
