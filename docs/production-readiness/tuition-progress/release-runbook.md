# Release And Recovery Runbook

Status: NOT EXECUTED. Verdict: NO-GO until [gates](go-no-go.md) pass.
Roles must be assigned to real people in TPR-01: release owner, finance owner, academic owner, database operator, QA and independent reviewer. Planning does not grant deployment authorization.

## 1. Candidate And Environment Identity

- Inventory and preserve the dirty tree before creating a candidate. Record HEAD, complete intended diff, dependency lock hashes, migration hashes and formula version. No hard reset, force push or unrelated cleanup.
- Candidate must be an immutable reviewed commit with CI evidence tied to that exact commit. Current HEAD alone excludes local Admin Console changes and is not a releasable candidate manifest.
- Resolve actual production deployment/alias, app SHA, database endpoint identity (redacted), schema and enabled settings/flags through authorized access. Historical board URLs/SHAs differ and are not live discovery evidence.
- Record development, isolated local PostgreSQL, isolated Neon rehearsal, preview and production identities separately. Reject same-target mistakes before any fixture/migration/restore.
- Keep keys and URLs in operator secret storage. Evidence contains redacted identity fingerprints, never passwords, cookies, tokens or student payloads.

## 2. Two Distinct Rehearsals

### A. Dataful Neon Migration And Application Rehearsal

Use an authorized isolated production-derived branch with access controls and retention. Rehearse exact checked-in Admin Console migration order: expand -> tenant-aware dual-write -> deterministic backfill -> verify -> constraints/scoped reads -> special flows. Confirm the existing implementation actually supports each deployment boundary before adopting this order.

Run schema diff, row counts, null/orphan/cross-tenant checks, uniqueness/FKs, trigger invariants and historical protected-content hashes. Exercise login/revocation, tenant suspension, role changes, parent portal, cron, imports, finance, academics and exports on the resulting schema.

Run the remediation fixture matrix and approved historical correction dry-run/apply/verify cycle. Refresh/reload via real HTTP/browser. Record failures and fix before repeating; do not mutate production to obtain evidence.

### B. Encrypted Backup And Guarded Local Restore

The existing [backup/restore guide](../../operations/backup-restore.md) describes v3 and the local restore guard. Preserve the guard: do not enable remote restore just to fit a Neon rehearsal.

Restore into separately identified isolated local PostgreSQL. Verify new v4 manifest parity against all current Prisma models, v3-to-v4 compatibility, FK insertion order, tenant IDs, settings, auth/session data and all fee/progress revisions. Verify checksums, decryptability and wrong-key/corruption failure behavior. Encryption-envelope version is distinct from backup-format version.

Compare content and domain readbacks, not just table counts. Run authenticated workflows against the restored target. Update the operations guide to describe actual v4/v3 behavior and tested restrictions during TPR-05. Backups must be accessible to the recovery operator without exposing the key in the artifact.

## 3. Compatibility Matrix Required Before Cutover

| Combination | Required evidence | Initial state |
| --- | --- | --- |
| Current deployed app + expanded schema | Auth/write/read/tenant invariants during migration window | NOT RUN |
| Candidate + expanded/backfilled schema | Only valid in explicitly supported deployment stages | NOT RUN |
| Candidate + final constrained schema | Full matrix and real E2E | NOT RUN |
| Previous app + final schema | Test explicitly; mark UNSUPPORTED if incompatible | NOT RUN |
| v3 backup -> new v4 schema/runtime | Guarded restore plus default-tenant/provenance invariants | NOT RUN |
| v4 backup -> candidate runtime/schema | Full roundtrip including snapshots and settings | NOT RUN |

Unknown/incompatible prior-app compatibility prohibits an alias-only rollback. Prepare a tested compatible recovery build or a coordinated database recovery plan. Destructive down migrations and untested schema downgrades are forbidden.

## 4. Preflight Checklist

- [ ] R1-R5 implemented with red-to-green regression evidence; interrupted review coverage closed.
- [ ] No open release-blocking defects; all verification groups executed with zero required skips.
- [ ] Security/tenant/auth tests and complete current gates pass, including measured coverage.
- [ ] Historical anomalies reconciled; finance and academic owners signed redacted dispositions.
- [ ] Migration, restore, rollback and PITR rehearsed with actual timings and evidence.
- [ ] Restore operator access, key custody, on-call contact and incident escalation tested.
- [ ] Candidate identity, deployment choreography and setting/flag defaults frozen.
- [ ] Production observation/rollback thresholds and RTO/RPO accepted by owners.
- [ ] Release owner and independent reviewer authorize the named target/time window.

Proposed acceptance targets, to freeze in TPR-01: recovery RTO <=15 minutes; zero loss of accepted financial/academic writes (RPO=0 through freeze and explicit replay/reconciliation, not a claim that PITR alone gives zero loss). Rehearsal must prove these targets or obtain a revised approved target before GO; never claim an unmeasured objective.

## 5. Authorized Cutover

1. Announce maintenance window, assign incident commander, verify identities and candidate once more.
2. Freeze money-moving and academic writes, stop cron/bulk writers and drain in-flight work. Verify freeze server-side, not only by hiding UI controls.
3. Take a fresh encrypted backup; verify manifest/checksum/decryptability in the approved isolated procedure. Record the recoverable cutoff and delta reconciliation since rehearsal.
4. Apply only the rehearsed migration/app steps. At each stage verify schema/data invariants. Stop at first failure; do not continue to constraints with failed backfill.
5. Apply approved correction manifests only under their guards. Revoke old sessions at the rehearsed point and verify fresh login, roles and tenant scoping.
6. Deploy candidate; verify canonical alias/deployment SHA and health. Keep writes frozen until authorized business smoke passes.
7. Smoke admin/receptionist permissions, fee calculation/ledger, daily save/finalize/reload/PDF, tenant isolation and parent portal on an explicitly approved dedicated smoke tenant/fixture. No unlabeled demo rows or incidental billing of real students.
8. Obtain release-owner decision to resume writes/cron. Verify scheduling resumes once, not twice. Run independent reconciliation and retain rollback readiness.
9. Observe for at least 24 hours and one scheduled fee/cron cycle. If the normal cron cycle is longer, use an approved isolated/canary equivalent and keep that limitation explicit until the real cycle is observed.

Do not call migration or write commands from this document without the required authorization. Exact operator invocation/target fingerprints are to be recorded in the rehearsal receipt, never copied with production secrets into the repository.

## 6. Abort And Recovery

Immediate write freeze and incident escalation on any tenant leak, duplicate charge/receipt, unexplained money discrepancy, finalized-score mutation, data loss, auth bypass or failed invariant. These are zero-tolerance signals.

Proposed availability trigger: core authenticated reads/writes >1% server errors over 5 minutes or p95 latency >2x the measured pre-release baseline for 10 minutes. Pin sampling/load and exclude expected 4xx validation outcomes in TPR-01. A critical single integrity failure overrides time/rate thresholds.

Before writes resume: rollback app only if the tested matrix permits. Otherwise use the compatible recovery candidate or coordinated recovery procedure while frozen.

After writes resume: record every accepted post-cutoff write and pending external action; preserve audit/receipt records. Restore/PITR to an isolated target first, verify, reconcile/replay accepted operations idempotently, then switch traffic using the rehearsed procedure. Never overwrite production with a stale backup while accepting writes.

If recovery cannot meet the approved RTO/RPO, remain in maintenance, communicate the incident and escalate. A rollback attempt is not success until business readbacks, balances, snapshots, tenant isolation and login are independently verified.

## 7. Closeout Evidence

Capture candidate/deployment IDs, schema and migration status, redacted target identities, test summaries/traces/screenshots, protected hashes, correction summaries, backup references, recovery timings, smoke results and observation metrics. Record actual operator/reviewer names and timestamps.

Final statuses distinguish: predeploy GO, deployed UNDER OBSERVATION, VERIFIED LIVE, or ROLLED BACK. Update KANBAN/session/handoff only to the status the evidence supports. Preserve old release history rather than replacing it with an unqualified global "production ready" claim.
