# Backup and restore runbook

The PostgreSQL backup format is an encrypted, versioned JSON envelope. Backup Version 4 contains the canonical 33-model manifest, including tenancy, permissions, settings/revisions, integration configuration and Tuition V3 planning/ledger histories. It includes per-table counts and plaintext/ciphertext checksums. The database export runs in one `RepeatableRead` transaction. The AES-GCM envelope remains crypto format Version 2; backup and crypto versions are independent contracts.

Legacy Version 3 backups are supported only with their exact legacy manifest and matching counts. Restore normalizes them to v4, creates `tenant_default`, assigns legacy rows to that tenant, and initializes new settings/permissions/integration tables empty. It does not approve a platform owner. Versions before v3 are rejected. Filenames do not determine payload versions; the operator's historical `.v3.json` default filename can contain a v4 payload.

## Required environment

- `DATABASE_URL`: PostgreSQL source or isolated restore target.
- `BACKUP_ENCRYPTION_KEY`: dedicated secret of at least 32 characters. It must not be the JWT secret.
- `BACKUP_ENCRYPTION_KEY_ID`: operator-managed identifier for the active key, for example `backup-2026-01`.
- `BLOB_READ_WRITE_TOKEN`: required only for API/cron uploads to Vercel Blob.

Keep old encryption keys available under controlled operator custody for the retention period. The envelope records `key_id` but never stores the key.

## Bootstrap and reset

Default bootstrap preserves existing credentials, privileges and template defaults, never deletes business data, and refuses a suspended default tenant. A fresh admin is tenant-only unless `BOOTSTRAP_FRESH_PLATFORM_OWNER=true` is explicitly set before any users exist. Existing owner approval requires `BOOTSTRAP_APPROVED_OWNER_ID` identifying an active admin in an active tenant; it never selects an account by age or username for promotion.

```powershell
$env:BOOTSTRAP_ADMIN_PASSWORD = '<strong initial password>'
npx tsx prisma/seed.ts
```

Supply credentials through controlled operator secret storage, not recorded shell commands. For a new business tenant, also set `BOOTSTRAP_TENANT_SLUG`, `BOOTSTRAP_TENANT_NAME` and `BOOTSTRAP_ADMIN_USERNAME`. Provisioning creates the tenant, tenant-only admin, center settings and template defaults in one Serializable transaction; collisions abort rather than overwrite. Business provisioning rejects platform-owner approval options.

Destructive reset is a separate command. It is accepted only for localhost or a test-named database and requires the exact flag. All deletes run in one transaction:

```powershell
$env:RESET_CONFIRMATION = 'RESET_EDU_MANAGER'
npx tsx scripts/reset-database.ts
```

## Create and verify a local backup

```powershell
npx tsx scripts/backup-operator.ts .\backups\edu-manager.v4.json
```

`backup.bat` is a Windows wrapper for the same command. Pass a unique output path to the TypeScript command for retained backups; files are never overwritten.

The output file is created with exclusive-create semantics and will not overwrite an existing backup. Verification through the admin API uses `POST /api/backups` with `{ "action": "verify", "url": "https://..." }`.

## Restore rehearsal

Restore must target a separately identified isolated database. Keep the existing guards: exact `RESTORE_CONFIRMATION=RESTORE_EDU_MANAGER`, plus localhost or a remote test/audit-named database with `NODE_ENV=test`. These are name/host guards, not proof of isolation; verify database identity and ownership independently. Never target a production database or the retained production-snapshot recovery database, even if a host/name guard would permit it. Set `DATABASE_URL` to the isolated target, then run:

```powershell
$env:NODE_ENV = 'test'
$env:RESTORE_CONFIRMATION = 'RESTORE_EDU_MANAGER'
npx tsx scripts/restore-operator.ts .\backups\edu-manager.v4.json
```

On Windows, `restore.bat .\backups\edu-manager.v3.json` invokes the same guarded restore and still requires all environment gates above.

The encrypted restore path verifies checksums/decryption and normalizes format, manifest and counts before opening one transaction. Restore deletes in reverse dependency order and inserts in dependency order. Transaction acquisition is bounded at 10 seconds and execution at 120 seconds; timeout or failure rolls back the transaction. Targets exceeding this bound need a separately reviewed recovery procedure, not an unbounded retry.

Immutable history handling uses transaction-local replica mode where permitted. Otherwise it temporarily disables USER triggers on `class_month_plan_revisions`, `monthly_fee_line_revisions` and `setting_revisions`, then re-enables them before commit. The fallback role must own those tables. Because replica mode suppresses FK triggers, independently check FK/tenant relations and domain readbacks after restore.

After inserts, restore locks `center_settings`, discovers its owned serial sequence, and transactionally runs `ALTER SEQUENCE ... RESTART WITH` at `MAX(id)+1` (one for an empty table). The restore role must own that sequence. Unlike `setval`, this restart rolls back if the transaction subsequently fails. Restored IDs remain unchanged; verify a new tenant's center-settings insert does not collide.

Compare restored contents, balances, immutable history and all model counts. Verify USER triggers are enabled, replica mode has returned to `origin`, and UPDATE/DELETE of history is rejected. Run authenticated application smoke separately; a database roundtrip is not production certification.

The admin API supports the same isolated rehearsal with `action=restore`, an `envelope` or HTTPS `url`, and `confirmation=RESTORE_EDU_MANAGER`. The same host/name guards apply; operator identity checks remain mandatory.

## Dedicated PG17 Regression

The bounded sidecar suite uses only container `edu-release-recovery-20261006` and user `release`. It reads the container password through Docker inspect in memory without logging it. Each invocation creates a new `edu_restore_sidecar_test_<random>` database and applies current migrations there; it never resets or connects to `edu_release_recovery`. Synthetic databases and NOLOGIN fallback roles are retained for inspection.

```powershell
$env:RUN_RELEASE_RECOVERY_TESTS = '1'
node_modules/.bin/tsx.cmd --test tests/backup-restore-release.integration.ts
node_modules/.bin/tsx.cmd --test tests/backup-restore-sequence.test.ts tests/seed-backup.test.ts tests/admin-console-backup-compat.test.ts tests/admin-console-backup-manifest.test.ts
```

The real suite covers encrypted v4 roundtrip, genuine legacy-shaped v3 normalization/restore, replica and non-superuser USER-trigger paths, restored-ID allocation, failed insert rollback, transactional sequence rollback and empty-target allocation. This synthetic local evidence is separate from production-derived restore/PITR and authenticated cutover evidence owned by the release operator.
