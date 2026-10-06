CREATE TABLE "setting_values" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "effective_from_month" TEXT,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "updated_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "setting_values_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "setting_values_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "setting_values_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "setting_values_effective_month_format" CHECK (
    "effective_from_month" IS NULL OR "effective_from_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
  )
);

CREATE INDEX "setting_values_tenant_id_key_idx" ON "setting_values"("tenant_id", "key");
CREATE INDEX "setting_values_tenant_id_key_effective_from_month_idx" ON "setting_values"("tenant_id", "key", "effective_from_month");
CREATE UNIQUE INDEX "setting_values_tenant_key_month_unique"
  ON "setting_values"("tenant_id", "key", "effective_from_month")
  WHERE "effective_from_month" IS NOT NULL;
CREATE UNIQUE INDEX "setting_values_tenant_key_default_unique"
  ON "setting_values"("tenant_id", "key")
  WHERE "effective_from_month" IS NULL;

CREATE TABLE "setting_revisions" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "setting_value_id" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "old_value" JSONB,
  "new_value" JSONB NOT NULL,
  "change_note" VARCHAR(500),
  "changed_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "setting_revisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "setting_revisions_setting_revision_key" UNIQUE ("setting_value_id", "revision"),
  CONSTRAINT "setting_revisions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "setting_revisions_setting_value_id_fkey" FOREIGN KEY ("setting_value_id") REFERENCES "setting_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "setting_revisions_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "setting_revisions_tenant_id_setting_value_id_idx" ON "setting_revisions"("tenant_id", "setting_value_id");

CREATE OR REPLACE FUNCTION prevent_setting_revision_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'setting_revisions is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "setting_revisions_append_only"
BEFORE UPDATE OR DELETE ON "setting_revisions"
FOR EACH ROW EXECUTE FUNCTION prevent_setting_revision_mutation();
