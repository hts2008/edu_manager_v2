# Backup and restore runbook

The PostgreSQL backup format is an encrypted, versioned JSON envelope. Version 2 contains a canonical manifest for all 20 Prisma models, per-table counts, a plaintext checksum, and a ciphertext checksum. The database export runs in one `RepeatableRead` transaction.

## Required environment

- `DATABASE_URL`: PostgreSQL source or isolated restore target.
- `BACKUP_ENCRYPTION_KEY`: dedicated secret of at least 32 characters. It must not be the JWT secret.
- `BACKUP_ENCRYPTION_KEY_ID`: operator-managed identifier for the active key, for example `backup-2026-01`.
- `BLOB_READ_WRITE_TOKEN`: required only for API/cron uploads to Vercel Blob.

Keep old encryption keys available under controlled operator custody for the retention period. The envelope records `key_id` but never stores the key.

## Bootstrap and reset

Production-safe bootstrap is idempotent and never deletes business data:

```powershell
$env:BOOTSTRAP_ADMIN_PASSWORD = '<strong initial password>'
npx tsx prisma/seed.ts
```

Destructive reset is a separate command. It is accepted only for localhost or a test-named database and requires the exact flag. All deletes run in one transaction:

```powershell
$env:RESET_CONFIRMATION = 'RESET_EDU_MANAGER'
npx tsx scripts/reset-database.ts
```

## Create and verify a local backup

```powershell
npx tsx scripts/backup-operator.ts .\backups\edu-manager.v2.json
```

`backup.bat` is a Windows wrapper for the same command. Pass a unique output path to the TypeScript command for retained backups; files are never overwritten.

The output file is created with exclusive-create semantics and will not overwrite an existing backup. Verification through the admin API uses `POST /api/backups` with `{ "action": "verify", "url": "https://..." }`.

## Restore rehearsal

Restore is intentionally unavailable to production targets. Set `DATABASE_URL` to an isolated localhost database, verify it manually, then run:

```powershell
$env:NODE_ENV = 'test'
$env:RESTORE_CONFIRMATION = 'RESTORE_EDU_MANAGER'
npx tsx scripts/restore-operator.ts .\backups\edu-manager.v2.json
```

On Windows, `restore.bat .\backups\edu-manager.v2.json` invokes the same guarded restore and still requires all environment gates above.

The restore validates format, manifest, checksums, and counts before opening one transaction. It deletes in reverse dependency order, inserts in dependency order, and rolls back the entire target on any failure. After restore, run application smoke tests against the isolated target and compare returned counts to the envelope.

The admin API supports the same isolated rehearsal with `action=restore`, an `envelope` or HTTPS `url`, and `confirmation=RESTORE_EDU_MANAGER`. Runtime target checks still reject non-local production databases.
