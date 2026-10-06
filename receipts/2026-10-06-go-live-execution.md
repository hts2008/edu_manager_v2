# Go-Live Execution - 2026-10-06

Status: IN PROGRESS. Explicit user authorization covers GitHub sync, production deployment and new operating admin. No assertion of observation-window completion.

## Scope And Safety

- Full current application including Admin Console, tenant enforcement, tuition/progress remediation and approved receipt design.
- Historical operating center remains `tenant_default` / center code `default`; create `admin-live` without overwriting any existing credential or granting platform-owner privileges.
- Existing finance and academic history retained. Read-only inventory:74 fee lines,12 progress months;85 provenance-unknown and1 protected-financial record;116 findings,0 invalid configurations. Historical differences are not automatically repaired from present-day inputs.
- Dependency patch updates within existing semver constraints; root/frontend audits0 vulnerabilities. No force/major upgrade.
- Production-derived backups, encryption keys, raw inventories and credential handoff stay in `.release-private/`, Git/Vercel excluded and ACL restricted.

## Evidence

- Root unit536/536; AdminConsole228/228; frontend240/240; remediation64/64. Focused migration/maintenance/checksum regressions11/11.
- Clean isolated Prisma/frontend production build; TypeScript and frontend lint pass.
- Verified target production Neon EDUMANAGER project; production inventory30 tables. No baseline schema modifications before rehearsal.
- Dataful Neon child `edu-release-rehearsal-20261006`, with one-day expiry, exposed two defects: whole-row hashing collided with `source` column; immutable revision triggers rejected tenant-only backfill. Regression tests and fixes added.
- Final migration bytes rehearsed on independently restored PostgreSQL17 production clone; business checksums protected. Earlier Neon rehearsal alone is not proof of later revised owner migration.
- AES-GCM encrypted physical dump, checksum/decrypt verification and successful isolated PostgreSQL17 physical restore.
- v3/v4 encrypted application recovery:6/6 real PG17 checks plus17/17 focused unit checks, including sequence, rollback and immutable triggers.
- Follow-up recovery correction: all three serial IDs (student_classes, activity_logs, center_settings) restart transactionally after imported IDs. Seven focused/real PG17 checks pass; inserts after restore no longer collide. Rollback/immutable-trigger checks retained.
- Independent freeze findings remediated: authorization uses a separate database role, not discoverable application_name. Real PG17 regression rejects catalog-marker spoof and refresh protects newly created tables; three freeze/maintenance checks pass. Managed Neon child ownership transfer/operator CLI/unfreeze exercised, production untouched.
- Production migration now refuses any checksum mismatch with the verified physical-clone manifest or missing/enabled-state-invalid write-freeze trigger.
- GitHub PR2 published. Current CI verify/integration pass; visual/real E2E fixture failures are under correction. Canonical production has not been promoted; no admin credential has been provisioned yet.
- Local fresh build avoids Windows query-engine DLL locked by running review servers; no user server stopped.

## Cutover

Stage maintenance deployment without aliasing; verify503, promote, drain30s functions, fresh backup, guarded exact-target migration, provision separate admin, promote normal pinned release. If migration fails, retain maintenance while diagnosing; do not alias an old writer against contracted schema. Recovery requires validated DB restoration/compatible application, not blind alias rollback.

Production IDs, commit SHA, checks and final verdict will be appended after actual execution. Scheduled backup and24h observation are separate, not preclaimed.

Dual-Brain unavailable: NM0/C+0, health unavailable; markdown-only handoff.
