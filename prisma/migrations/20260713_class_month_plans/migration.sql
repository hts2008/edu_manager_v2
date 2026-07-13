BEGIN;

DO $$
BEGIN
  CREATE TYPE "ClassMonthPlanState" AS ENUM ('open', 'frozen');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "class_month_plans" (
  "id" TEXT NOT NULL,
  "class_id" TEXT NOT NULL,
  "billing_month" TEXT NOT NULL,
  "state" "ClassMonthPlanState" NOT NULL DEFAULT 'open',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "created_by" TEXT,
  "updated_by" TEXT,
  "frozen_by" TEXT,
  "frozen_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "class_month_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "class_month_plan_revisions" (
  "id" TEXT NOT NULL,
  "plan_id" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "state" "ClassMonthPlanState" NOT NULL,
  "event_type" TEXT NOT NULL,
  "reason" TEXT,
  "snapshot" JSONB NOT NULL,
  "actor_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "class_month_plan_revisions_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'class_month_plans'::regclass
      AND conname = 'class_month_plans_revision_check'
  ) THEN
    ALTER TABLE "class_month_plans"
      ADD CONSTRAINT "class_month_plans_revision_check" CHECK ("revision" >= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'class_month_plans'::regclass
      AND conname = 'class_month_plans_billing_month_format_check'
  ) THEN
    ALTER TABLE "class_month_plans"
      ADD CONSTRAINT "class_month_plans_billing_month_format_check"
      CHECK ("billing_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'class_month_plans'::regclass
      AND conname = 'class_month_plans_frozen_at_check'
  ) THEN
    ALTER TABLE "class_month_plans"
      ADD CONSTRAINT "class_month_plans_frozen_at_check"
      CHECK ("state" = 'open' OR "frozen_at" IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'class_month_plan_revisions'::regclass
      AND conname = 'class_month_plan_revisions_revision_check'
  ) THEN
    ALTER TABLE "class_month_plan_revisions"
      ADD CONSTRAINT "class_month_plan_revisions_revision_check" CHECK ("revision" >= 1);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "class_month_plans_class_id_billing_month_key"
ON "class_month_plans"("class_id", "billing_month");
CREATE INDEX IF NOT EXISTS "class_month_plans_billing_month_state_idx"
ON "class_month_plans"("billing_month", "state");
CREATE INDEX IF NOT EXISTS "class_month_plans_created_by_idx" ON "class_month_plans"("created_by");
CREATE INDEX IF NOT EXISTS "class_month_plans_updated_by_idx" ON "class_month_plans"("updated_by");
CREATE INDEX IF NOT EXISTS "class_month_plans_frozen_by_idx" ON "class_month_plans"("frozen_by");

CREATE UNIQUE INDEX IF NOT EXISTS "class_month_plan_revisions_plan_id_revision_key"
ON "class_month_plan_revisions"("plan_id", "revision");
CREATE INDEX IF NOT EXISTS "class_month_plan_revisions_plan_id_created_at_idx"
ON "class_month_plan_revisions"("plan_id", "created_at");
CREATE INDEX IF NOT EXISTS "class_month_plan_revisions_actor_id_idx"
ON "class_month_plan_revisions"("actor_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'class_month_plans'::regclass
      AND conname = 'class_month_plans_class_id_fkey'
  ) THEN
    ALTER TABLE "class_month_plans" ADD CONSTRAINT "class_month_plans_class_id_fkey"
    FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'class_month_plans'::regclass
      AND conname = 'class_month_plans_created_by_fkey'
  ) THEN
    ALTER TABLE "class_month_plans" ADD CONSTRAINT "class_month_plans_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'class_month_plans'::regclass
      AND conname = 'class_month_plans_updated_by_fkey'
  ) THEN
    ALTER TABLE "class_month_plans" ADD CONSTRAINT "class_month_plans_updated_by_fkey"
    FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'class_month_plans'::regclass
      AND conname = 'class_month_plans_frozen_by_fkey'
  ) THEN
    ALTER TABLE "class_month_plans" ADD CONSTRAINT "class_month_plans_frozen_by_fkey"
    FOREIGN KEY ("frozen_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'class_month_plan_revisions'::regclass
      AND conname = 'class_month_plan_revisions_plan_id_fkey'
  ) THEN
    ALTER TABLE "class_month_plan_revisions" ADD CONSTRAINT "class_month_plan_revisions_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "class_month_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'class_month_plan_revisions'::regclass
      AND conname = 'class_month_plan_revisions_actor_id_fkey'
  ) THEN
    ALTER TABLE "class_month_plan_revisions" ADD CONSTRAINT "class_month_plan_revisions_actor_id_fkey"
    FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION prevent_class_month_plan_revision_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'class_month_plan_revisions are immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_class_month_plan_revision_mutation ON "class_month_plan_revisions";
CREATE TRIGGER prevent_class_month_plan_revision_mutation
BEFORE UPDATE OR DELETE ON "class_month_plan_revisions"
FOR EACH ROW EXECUTE FUNCTION prevent_class_month_plan_revision_mutation();

CREATE OR REPLACE FUNCTION prevent_class_month_plan_revision_decrease() RETURNS trigger AS $$
BEGIN
  IF NEW."revision" < OLD."revision" THEN
    RAISE EXCEPTION 'class_month_plans.revision cannot decrease';
  END IF;
  IF OLD."state" = 'frozen' AND NEW."state" <> 'frozen' THEN
    RAISE EXCEPTION 'class_month_plans.state cannot transition from frozen to open';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_class_month_plan_revision_decrease ON "class_month_plans";
CREATE TRIGGER prevent_class_month_plan_revision_decrease
BEFORE UPDATE ON "class_month_plans"
FOR EACH ROW EXECUTE FUNCTION prevent_class_month_plan_revision_decrease();

-- Existing rows are checked without blocking the migration on legacy drift.
-- CASE prevents invalid legacy text from reaching integer casts. All functions
-- in the date/month expression are immutable-compatible for PostgreSQL checks.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'class_sessions'::regclass
      AND conname = 'class_sessions_billing_month_format_check'
  ) THEN
    ALTER TABLE "class_sessions"
    ADD CONSTRAINT "class_sessions_billing_month_format_check"
    CHECK ("billing_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$') NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'class_sessions'::regclass
      AND conname = 'class_sessions_session_month_check'
  ) THEN
    ALTER TABLE "class_sessions"
    ADD CONSTRAINT "class_sessions_session_month_check"
    CHECK (
      CASE
        WHEN "billing_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
          substring("billing_month" FROM 1 FOR 4)::INTEGER =
            EXTRACT(YEAR FROM "session_date")::INTEGER
          AND substring("billing_month" FROM 6 FOR 2)::INTEGER =
            EXTRACT(MONTH FROM "session_date")::INTEGER
        ELSE FALSE
      END
    ) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "class_sessions"
    WHERE NOT ("billing_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
  ) THEN
    ALTER TABLE "class_sessions"
      VALIDATE CONSTRAINT "class_sessions_billing_month_format_check";
  ELSE
    RAISE NOTICE 'class_sessions_billing_month_format_check left NOT VALID because legacy rows violate it';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "class_sessions"
    WHERE NOT (
      CASE
        WHEN "billing_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
          substring("billing_month" FROM 1 FOR 4)::INTEGER =
            EXTRACT(YEAR FROM "session_date")::INTEGER
          AND substring("billing_month" FROM 6 FOR 2)::INTEGER =
            EXTRACT(MONTH FROM "session_date")::INTEGER
        ELSE FALSE
      END
    )
  ) THEN
    ALTER TABLE "class_sessions"
      VALIDATE CONSTRAINT "class_sessions_session_month_check";
  ELSE
    RAISE NOTICE 'class_sessions_session_month_check left NOT VALID because legacy rows violate it';
  END IF;
END $$;

COMMIT;
