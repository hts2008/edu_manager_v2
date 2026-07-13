BEGIN;

CREATE OR REPLACE FUNCTION prevent_class_month_plan_revision_decrease() RETURNS trigger AS $$
BEGIN
  IF NEW."revision" < OLD."revision" THEN
    RAISE EXCEPTION 'class_month_plans.revision cannot decrease';
  END IF;
  IF NEW."state" IS DISTINCT FROM OLD."state" AND NEW."revision" <= OLD."revision" THEN
    RAISE EXCEPTION 'class_month_plans.state changes require a strict revision increment';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
