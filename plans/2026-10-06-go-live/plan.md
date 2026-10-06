# Production Go-Live Execution

User authorizes all necessary release remediation, GitHub sync, Vercel production release and operational tenant/admin provisioning. Full current application scope; preserve existing production data. No reset, fake data or disabled security gates.

1. Inventory dirty state and verify exact GitHub/Vercel targets. Exclude temporary DB files and private recovery materials from Git.
2. Patch vulnerable dependencies within supported ranges, rerun audits/unit/type/lint/build and real isolated HTTP/PostgreSQL suites. Independent migration/bootstrap review.
3. Discover production identity and migration history without printing secrets. Encrypted backup and production-derived isolated rehearsal; verify schema/tenant/financial/progress invariants and restore readiness.
4. Freeze an immutable reviewed candidate on codex release branch; sync to GitHub without prematurely auto-deploying main. Verify CI.
5. Rehearsed production migrations only after backup/recovery checks, bootstrap operational admin without overwriting another account or granting cross-center owner rights unnecessarily.
6. Deploy pinned candidate to named Vercel project, verify canonical URL/auth/tenant/finance/progress/template routes. Promote only with evidence; retain compatible rollback.
7. Handoff credentials through a private local file, no secrets in commits/logs. Record actual deployment status separately from 24-hour/scheduled-cycle observation.

Cause-effect audit: final tenant constraints may reject old unscoped writers; schema rollback cannot be inferred from alias rollback. Therefore preserve original app/database and rehearse final schema before cutover. Production data is never fed into test-reset fixtures.
