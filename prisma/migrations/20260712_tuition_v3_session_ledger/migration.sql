-- Tuition V3 is additive. Existing monthly fee rows are intentionally never updated.
BEGIN;
CREATE TYPE "BillingPolicy" AS ENUM ('monthly_prorated', 'per_session');
CREATE TYPE "ClassSessionKind" AS ENUM ('regular', 'makeup', 'extra');
CREATE TYPE "ClassSessionStatus" AS ENUM ('planned', 'held', 'cancelled', 'holiday');
CREATE TYPE "ExtraFeeMode" AS ENUM ('included', 'surcharge');

ALTER TABLE "classes"
ADD COLUMN "billing_policy" "BillingPolicy" NOT NULL DEFAULT 'per_session';

UPDATE "classes"
SET "billing_policy" = CASE
  WHEN (
    jsonb_typeof("schedule_days") = 'array'
    AND jsonb_array_length("schedule_days") > 0
  ) OR COALESCE("sessions_per_week", 0) > 0
  THEN 'monthly_prorated'::"BillingPolicy"
  ELSE 'per_session'::"BillingPolicy"
END;

CREATE TABLE "class_sessions" (
  "id" TEXT NOT NULL,
  "class_id" TEXT NOT NULL,
  "session_date" DATE NOT NULL,
  "billing_month" TEXT NOT NULL,
  "kind" "ClassSessionKind" NOT NULL DEFAULT 'regular',
  "status" "ClassSessionStatus" NOT NULL DEFAULT 'planned',
  "extra_fee_mode" "ExtraFeeMode" NOT NULL DEFAULT 'included',
  "replacement_for_id" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "source" TEXT NOT NULL DEFAULT 'application',
  "notes" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "class_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "class_sessions_class_id_session_date_key"
ON "class_sessions"("class_id", "session_date");
CREATE INDEX "class_sessions_class_id_billing_month_status_idx"
ON "class_sessions"("class_id", "billing_month", "status");
CREATE INDEX "class_sessions_session_date_status_idx"
ON "class_sessions"("session_date", "status");
CREATE INDEX "class_sessions_replacement_for_id_idx"
ON "class_sessions"("replacement_for_id");
CREATE INDEX "class_sessions_created_by_idx" ON "class_sessions"("created_by");
CREATE INDEX "class_sessions_updated_by_idx" ON "class_sessions"("updated_by");

ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_class_id_fkey"
FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_replacement_for_id_fkey"
FOREIGN KEY ("replacement_for_id") REFERENCES "class_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_updated_by_fkey"
FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "class_sessions" (
  "id", "class_id", "session_date", "billing_month", "kind", "status", "extra_fee_mode", "source"
)
SELECT
  'tuition-v3-' || md5(a."class_id" || ':' || a."attendance_date"::date::text),
  a."class_id",
  a."attendance_date"::date,
  to_char(a."attendance_date"::date, 'YYYY-MM'),
  CASE
    WHEN bool_and(a."is_make_up") THEN 'makeup'::"ClassSessionKind"
    ELSE 'regular'::"ClassSessionKind"
  END,
  CASE
    WHEN bool_and(a."status" = 'holiday') THEN 'holiday'::"ClassSessionStatus"
    ELSE 'held'::"ClassSessionStatus"
  END,
  'included'::"ExtraFeeMode",
  'attendance_history_migration'
FROM "attendance" a
GROUP BY a."class_id", a."attendance_date"::date
ON CONFLICT ("class_id", "session_date") DO NOTHING;

ALTER TABLE "attendance" ADD COLUMN "class_session_id" TEXT;
UPDATE "attendance" a
SET "class_session_id" = s."id"
FROM "class_sessions" s
WHERE s."class_id" = a."class_id"
  AND s."session_date" = a."attendance_date"::date
  AND a."class_session_id" IS NULL;
CREATE INDEX "attendance_class_session_id_idx" ON "attendance"("class_session_id");
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_class_session_id_fkey"
FOREIGN KEY ("class_session_id") REFERENCES "class_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "monthly_fee_lines"
ADD COLUMN "contract_sessions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "eligible_sessions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "delivered_sessions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "center_credit_sessions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "student_waived_sessions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "calculation_version" TEXT NOT NULL DEFAULT 'tuition-v2-legacy',
ADD COLUMN "calculation_snapshot" JSONB;

CREATE TABLE "monthly_fee_line_revisions" (
  "id" TEXT NOT NULL,
  "monthly_fee_line_id" TEXT NOT NULL,
  "revision_number" INTEGER NOT NULL,
  "run_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "reason" TEXT,
  "before_snapshot" JSONB,
  "after_snapshot" JSONB NOT NULL,
  "actor_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "monthly_fee_line_revisions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "monthly_fee_line_revisions_monthly_fee_line_id_revision_number_key"
ON "monthly_fee_line_revisions"("monthly_fee_line_id", "revision_number");
CREATE INDEX "monthly_fee_line_revisions_monthly_fee_line_id_created_at_idx"
ON "monthly_fee_line_revisions"("monthly_fee_line_id", "created_at");
CREATE INDEX "monthly_fee_line_revisions_actor_id_idx"
ON "monthly_fee_line_revisions"("actor_id");
ALTER TABLE "monthly_fee_line_revisions" ADD CONSTRAINT "monthly_fee_line_revisions_monthly_fee_line_id_fkey"
FOREIGN KEY ("monthly_fee_line_id") REFERENCES "monthly_fee_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "monthly_fee_line_revisions" ADD CONSTRAINT "monthly_fee_line_revisions_actor_id_fkey"
FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE FUNCTION prevent_monthly_fee_line_revision_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'monthly_fee_line_revisions are immutable';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER prevent_monthly_fee_line_revision_mutation
BEFORE UPDATE OR DELETE ON "monthly_fee_line_revisions"
FOR EACH ROW EXECUTE FUNCTION prevent_monthly_fee_line_revision_mutation();

COMMIT;
