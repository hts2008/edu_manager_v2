-- Extend the bounded catalog without changing any granted permission.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('edu_manager:experience-permissions:v1'));
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_permission_key_check";
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_key_check" CHECK ("permission_key" IN (
  'students.manage', 'classes.manage', 'attendance.manage', 'fees.collect',
  'receipts.manage', 'progress.view', 'progress.grade', 'users.manage',
  'backups.manage', 'recycle_bin.manage', 'audit_logs.view', 'fee_reminders.send',
  'imports.run', 'bulk_actions.run', 'monthly_fees.generate', 'reports.view',
  'templates.manage', 'users.reset_password', 'console.access',
  'console.organization.view', 'console.finance.edit', 'console.academic.edit',
  'console.access.edit', 'console.integrations.edit',
  'console.experience.view', 'console.experience.edit'
));
COMMIT;
