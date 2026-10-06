-- Admin Console schema/client parity after tenancy contraction.
-- The tenancy constraints were already applied by 202608120003. This migration
-- only removes the remaining center_settings singleton limitation.
BEGIN;

SELECT pg_advisory_xact_lock(hashtext('edu_manager:schema-parity:v1'));

CREATE SEQUENCE IF NOT EXISTS "center_settings_id_seq";
SELECT setval(
  'center_settings_id_seq',
  COALESCE((SELECT MAX("id") FROM "center_settings"), 1),
  EXISTS (SELECT 1 FROM "center_settings")
);
ALTER SEQUENCE "center_settings_id_seq" OWNED BY "center_settings"."id";
ALTER TABLE "center_settings"
  ALTER COLUMN "id" SET DEFAULT nextval('center_settings_id_seq');

CREATE UNIQUE INDEX "center_settings_tenant_id_key"
  ON "center_settings"("tenant_id");

COMMIT;
