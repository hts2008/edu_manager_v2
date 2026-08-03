BEGIN;

CREATE OR REPLACE FUNCTION prevent_class_month_plan_revision_decrease() RETURNS trigger AS $$
BEGIN
  IF NEW."revision" < OLD."revision" THEN
    RAISE EXCEPTION 'class_month_plans.revision cannot decrease';
  END IF;
  IF NEW."state" IS DISTINCT FROM OLD."state" AND NEW."revision" <= OLD."revision" THEN
    RAISE EXCEPTION 'class_month_plans.state changes require a strict revision increment';
  END IF;
  IF OLD."state" = 'frozen'
     AND NEW."state" = 'open'
     AND current_setting('app.allow_class_month_plan_reopen', true) IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'class_month_plans frozen plans require the controlled reopen workflow';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION require_class_month_plan_reopen_revision() RETURNS trigger AS $$
BEGIN
  IF OLD."state" = 'frozen' AND NEW."state" = 'open' AND NOT EXISTS (
    SELECT 1
    FROM "class_month_plan_revisions" revision
    WHERE revision."plan_id" = NEW."id"
      AND revision."revision" = NEW."revision"
      AND revision."state" = 'open'
      AND revision."event_type" = 'reopen'
  ) THEN
    RAISE EXCEPTION 'controlled class month plan reopen requires a matching audit revision';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "class_month_plan_reopen_revision_guard" ON "class_month_plans";
CREATE CONSTRAINT TRIGGER "class_month_plan_reopen_revision_guard"
AFTER UPDATE ON "class_month_plans"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION require_class_month_plan_reopen_revision();

COMMIT;
