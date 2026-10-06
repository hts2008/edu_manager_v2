CREATE TABLE "role_permissions" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "permission_key" TEXT NOT NULL,
  "allowed" BOOLEAN NOT NULL,
  "updated_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "role_permissions_tenant_role_permission_key_key"
    UNIQUE ("tenant_id", "role", "permission_key"),
  CONSTRAINT "role_permissions_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "role_permissions_updated_by_fkey"
    FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "role_permissions_permission_key_check" CHECK ("permission_key" IN (
    'students.manage',
    'classes.manage',
    'attendance.manage',
    'fees.collect',
    'receipts.manage',
    'progress.view',
    'progress.grade',
    'users.manage',
    'backups.manage',
    'recycle_bin.manage',
    'audit_logs.view',
    'fee_reminders.send',
    'imports.run',
    'bulk_actions.run',
    'monthly_fees.generate',
    'reports.view',
    'templates.manage',
    'users.reset_password',
    'console.access',
    'console.organization.view',
    'console.finance.edit',
    'console.academic.edit',
    'console.access.edit',
    'console.integrations.edit'
  ))
);

CREATE INDEX "role_permissions_tenant_id_role_idx"
  ON "role_permissions"("tenant_id", "role");
CREATE INDEX "role_permissions_updated_by_idx"
  ON "role_permissions"("updated_by");
