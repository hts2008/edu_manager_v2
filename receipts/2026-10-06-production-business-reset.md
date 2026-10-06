# Authorized Production Business Reset - 2026-10-06

Task PROD-CLEAR-20261006 IMPLEMENTED. User explicitly clarified deletion of ALL production business data, including real students/classes/attendance/fees/receipts. This supersedes the prior data-preservation release decision for business records only. Preserve default center, all existing login accounts/credentials, role permissions, system settings, integrations, templates, auth rate-limit protections and migration history. Delete parent/student/teacher/class/attendance/enrollment/fee/receipt/payment/progress history, archived/deleted records, business logs and existing auth sessions. Keep encrypted recovery backups outside live business data.

## Preparation Evidence

- Exact verified production fingerprint e092011c04eb.35 public tables. Before:28 students,17 parents,5 teachers,15 classes,1006 attendance,81 monthly fees,74 fee lines,19 receipts,2 payments,12 progress months. Counts only; no raw PII/passwords in receipt.
- Canonical maintenance dpl_Ekx7L9XCgmfNRwKAyDdfY3eZoJMZ promoted; actual /api/auth/me503/RetryAfter verified.35 tables frozen; ordinary writer denied.
- Latest encrypted physical backup production-1791296200621.dump.enc.json authenticated/decrypted/hash/byte-verified; isolated PG17 restore inventories match. Untouched recovery retained; separate cloned rehearsal used.
- Explicit25-table TRUNCATE ONLY/RESTART IDENTITY/RESTRICT in one SERIALIZABLE transaction, full table locks, schema/structure/inbound-FK/trigger guards. No CASCADE/production test-reset bypass/schema drop.
- Rehearsal forced failure after TRUNCATE rolls back all inventory. Successful rehearsal25zero/10protected checksums unchanged. Proof bound to exact script digest, original backup and before/after inventories; freshness rejects future timestamps.
- Focused8/8 tests, TypeScript pass. Independent review initial findings remediated; final review no wipe-blocking defects with matching rehearsal. Rollback proof covers row content, not sequence-state certification.
- NM/C+ unavailable:0/0health unavailable; workspace markdown/evidence mode. Secrets/backups stay EFS/ACL private and Git/Vercel excluded. Existing deployment retained for resume; no dependency or app deployment needed.

## Final Execution

Actual production transaction committed successfully; separate DB verification BEFORE login confirmed all25 business/auth-session/log tables zero and all10 protected inventories/checksums unchanged. Three accounts, one tenant/center config, two print templates and19 migrations retained. Includes archived/recycled records; no soft-delete residue.

Ownership restored, zero temporary freeze triggers/operator roles/foreign table owners. Original application dpl_8Kh1uAGZL28HUyY1tieSbmga2f8a resumed on canonical https://edu-manager-gules.vercel.app. No new app deployment, dependency, schema or credential change.

Actual post-reset smoke2026-10-06T14:22:38Z (21:22 Bangkok): login admin-live/default200; students(include-deleted), parents(include-deleted), teachers, classes, receipts(include-deleted), payments(include-deleted), monthly fees, progress report all200/count0. Templates200. Browser fresh admin login/dashboard0learners/no transactions verified; screenshot private production-empty-dashboard.png. Login legitimately creates new auth sessions and updates last-login metadata AFTER strict reset proof; these are not leftover business records.

Retain authenticated encrypted pre-wipe backup and intact recovery clone, private proof business-reset-production.json/business-reset-verify.json/business-reset-rehearsal.json/business-reset-smoke.json. Recovery is manual/authorized, not normal recycle-bin restore. Do not run old go-live smoke assuming historical data after this authorized reset; use reset-state smoke. All required exec sessions completed. No GitHub push/application redeploy needed for this database-only request. NM0/C+0health unavailable.
