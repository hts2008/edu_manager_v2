-- Add indexes for relation lookups and entity-scoped audit queries.
-- IF NOT EXISTS keeps the migration safe if an index was created manually.
CREATE INDEX IF NOT EXISTS "attendance_created_by_idx"
  ON "attendance"("created_by");

CREATE INDEX IF NOT EXISTS "monthly_fees_receipt_id_idx"
  ON "monthly_fees"("receipt_id");

CREATE INDEX IF NOT EXISTS "templates_created_by_idx"
  ON "templates"("created_by");

CREATE INDEX IF NOT EXISTS "activity_logs_entity_type_entity_id_idx"
  ON "activity_logs"("entity_type", "entity_id");
