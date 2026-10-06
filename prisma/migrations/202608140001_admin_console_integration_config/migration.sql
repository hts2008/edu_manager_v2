-- Tenant-scoped integration configuration with encrypted provider credentials.
-- Secret material is an AES-256-GCM envelope produced by lib/integration-config.ts.
BEGIN;

SELECT pg_advisory_xact_lock(hashtext('edu_manager:integration-config:v1'));

CREATE TABLE "integration_configs" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "config" JSONB NOT NULL,
  "secret_encrypted" TEXT,
  "updated_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "integration_configs_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "integration_configs_updated_by_fkey"
    FOREIGN KEY ("updated_by") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "integration_configs_tenant_id_kind_key"
  ON "integration_configs"("tenant_id", "kind");
CREATE INDEX "integration_configs_tenant_id_idx"
  ON "integration_configs"("tenant_id");
CREATE INDEX "integration_configs_updated_by_idx"
  ON "integration_configs"("updated_by");

COMMIT;
