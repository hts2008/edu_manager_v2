# Go-Live Execution - 2026-10-06

## Final Operational Verdict

IMPLEMENTED / LIVE, under initial observation. PR2 merged2026-10-06T10:15:55Z, main71d8ececbe7f9dc9247a64fb96d487f393ac6b61, tree identical to reviewed b95b45e. Main CI [37448630117](https://github.com/hts2008/edu_manager_v2/actions/runs/37448630117) all four jobs pass. Production deployment dpl_CErGruqkFm4WuzVQEVD5hvS9xmP2 READY, https://edu-manager-25kwb1z35-hts2008s-projects.vercel.app, canonical https://edu-manager-gules.vercel.app alias confirmed. Final canonical smoke2026-10-06T10:17:31Z: exact target fingerprint e092011c04eb, ownership cleanup/original credentials true, admin auth true/platform403, seven APIs200, negative auth401/400/401, encrypted cloud V4 backup uploaded/verified with matching counts. Browser reload retained authenticated admin-live, production Templates presets present. Private proof and credential handoff EFS/ACL/Git-Vercel excluded.

Runtime grading/financial writes were tested on isolated PG17/HTTP/E2E fixtures, not by fabricating production learner records. No original data or account was reset. Historical unknown provenance remains preserved; no speculative recalculation.24h observation/scheduled cron cycle, physical-printer acceptance and owner provenance sign-off are not preclaimed. Provider/CI platform deprecation notices are not frontend lint warnings. NM0/C+0health unavailable; markdown-only session records.

## Verified Operational Checkpoint

2026-10-06T10:04:23Z: canonical https://edu-manager-gules.vercel.app operational on811fb4b/dpl_EgFWmAYP6c41mXbktcUFvEoWM46s. Seven authenticated operational APIs200; incorrect password401, missing center400, unknown center401, tenant admin denied platform management403. Encrypted cloud backup V4 upload/verify/counts pass. Zero freeze triggers/operator roles, ownership correct, original account hashes/status/roles unchanged against frozen physical recovery. Center default/admin-live tenant-only; EFS/ACL private credential handoff. Browser dashboard/report/A4/A5 preview verified without grading/financial writes. CI811fb4b run37446705838 all four jobs pass. Final PR merge/main deployment smoke pending. Historical paragraphs below are checkpoints, not current state.24h observation and owner provenance reconciliation are separate.

Review follow-up: missing-score narrative red/green12tests; release helpers8tests cover sensitive error redaction, exact production target, account field-only mismatch, explicit uniquely marked CLI/PID/start-time lock release. No automatic idle-session termination remains. No production operations in this remediation.

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
- Independent managed-Neon child proof: frozen owner could read35/35 tables and pg_dump succeeded294338 bytes; final cleanup left0 freeze triggers,0 operator roles and restored35/35 table ownership. The provider owner retains ADMIN OPTION: this is an ordinary-application-write cutover guard, NOT an adversarial database-owner security boundary. No manual/provider ownership or membership changes are allowed during the maintenance window. Existing app/API writers do not issue role-administration SQL.
- GitHub PR2 published. Current CI verify/integration pass; visual/real E2E fixture failures are under correction. Canonical production has not been promoted; no admin credential has been provisioned yet.
- Local fresh build avoids Windows query-engine DLL locked by running review servers; no user server stopped.

## Cutover

Actual cutover2026-10-06: maintenance canonical503 verified; production30 tables frozen, ordinary writer denied. Final encrypted physical backup production-1791280231672.dump.enc.json restored, full content checksums/row counts matched and local recovery writable. Migration19-chain complete; backfill28 tables/59 relations/0 failures and protected data unchanged. First CLI resolve timeout was an exited private operator session holding advisory lock72707369, idle/no transaction; only that session terminated. Original baseline retained on retry. New admin-live created in default center, owner=false; ownership/unfreeze cleanup performed. Normal candidate promoted, authenticated smoke found extensionless settings-registry ESM import causing500. Domain immediately returned to maintenance; emitted-Node ESM regression reproduces red and passes .js fix. Replacement candidate and CI underway. Production not yet certified operational LIVE.

Stage maintenance deployment without aliasing; verify503, promote, drain30s functions, fresh backup, guarded exact-target migration, provision separate admin, promote normal pinned release. If migration fails, retain maintenance while diagnosing; do not alias an old writer against contracted schema. Recovery requires validated DB restoration/compatible application, not blind alias rollback.

Production IDs, commit SHA, checks and final verdict will be appended after actual execution. Scheduled backup and24h observation are separate, not preclaimed.

Dual-Brain unavailable: NM0/C+0, health unavailable; markdown-only handoff.
