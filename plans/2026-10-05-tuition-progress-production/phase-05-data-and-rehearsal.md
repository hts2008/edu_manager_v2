# Phase 05: Data Reconciliation And Release Rehearsal

Task: TPR-05. Priority: P0 release gate. Status: PENDING.
Depends on: TPR-02, TPR-04. External completion requirement: Admin Console foundations and isolated migration rehearsal.
Owners: database operator + QA; reviewers: finance, academic and security owners.
Gates: G05-G10. Tests: TP-DATA, TP-SEC, TP-OPS-01..04 plus full matrix.

## Objective

Prove corrected behavior survives real persistence, existing data, tenancy, migrations, backup and recovery. This phase runs in isolated environments; production apply is a separately approved TPR-06 action.

## Work Items

- [ ] TPR-05A: Build/extend guarded real HTTP/PostgreSQL harness. Bind router and assertion clients to the same isolated DB before imports; require exact target/schema identity; fail missing test config in release mode.
- [ ] TPR-05B: Expand real E2E discovery and fixture ownership/cleanup. Authenticate genuine admin/receptionist/parent sessions and test tenant denial on fee/progress/PDF/cron/bulk routes.
- [ ] TPR-05C: Implement read-only anomaly inventory and approved manifest format from [reconciliation](../../docs/production-readiness/tuition-progress/data-reconciliation.md). Include all affected tenants/months, protected states and unknown provenance.
- [ ] TPR-05D: Implement only necessary guarded repair/compensation paths; test CAS, idempotency, rollback, crash recovery and repeated apply. Never bypass class-line receipt or finalized-revision guards.
- [ ] TPR-05E: Run isolated dry-run -> approved apply -> independent verify -> repeat. Account for every anomaly and preserve protected originals. Finance/academic owners review every disposition category.
- [ ] TPR-05F: Rehearse exact Admin Console chain on an authorized isolated dataful Neon branch. Verify schema diff, null/orphan/leak counts, sessions/permissions, settings/snapshots and business readbacks.
- [ ] TPR-05G: Rehearse v4 roundtrip and v3-to-v4 restore on guarded isolated local PG; prove manifest parity and full content/relationship restoration. Update `docs/operations/backup-restore.md` to match tested behavior.
- [ ] TPR-05H: Exercise application compatibility matrix and recovery/PITR with post-cutoff writes. Measure RTO/RPO, validate audit/financial replay and maintain freeze during recovery.
- [ ] TPR-05I: Freeze immutable candidate; run all static/unit/integration/browser/security/coverage gates and independent risk review. Attach actual output/traces and gate register.

## Files And Artifacts

Potential edits after inspection: real PostgreSQL harness/specs, explicit test scripts in `package.json`, frontend Playwright config, guarded reconciliation script under `scripts/`, backup compatibility tests and operations docs. Do not reuse `db:reconcile-tuition-v3` without reviewing its actual scope/protection rules.

Execution evidence index: `docs/artifacts/tuition-progress-release/<candidate>/`. Store detailed sensitive manifests/backups in approved operator storage; commit only redacted references, checksums and summaries.

## Hard Acceptance

- [ ] Every [matrix](../../docs/production-readiness/tuition-progress/verification-matrix.md) group relevant before production executed; zero required skipped tests and no mock substitute for business persistence.
- [ ] Historical balances/scores correct or explicitly, auditably dispositioned; no known incorrect protected row silently preserved as "done".
- [ ] Protected original hashes match; compensating revisions/receipts reconcile independently.
- [ ] Migration schema/tenant/trigger invariants pass and backup contains every current model.
- [ ] Recovery meets approved measured objectives; incompatible old-app rollback explicitly prohibited.
- [ ] Coverage thresholds met, lint zero warnings, full tests/build/typecheck/security gates pass on the same candidate.
- [ ] G05-G10 evidence signed; any unknown access/target/coverage keeps phase PARTIAL/BLOCKED, not PASS.

Risk: green tests that never hit real business handlers, skipped DB suites, sensitive data copied to artifacts, or restore guard bypass. Review harness and operator safety before running dataful tests.

## Execution Checkpoint - 2026-10-05

Current execution status: PARTIAL, local-only. Original hard acceptance and G05-G10 remain open.

- Guarded [router harness](../../tests/postgres-router-harness.test.ts), [business HTTP tests](../../tests/tuition-progress-http.integration.ts) and [target tests](../../tests/tuition-progress-target-guard.test.ts) bind exact loopback test database/schema before runtime imports and fail missing release config. Main reports real HTTP14/14, zero skips, with PostgreSQL18 migrations applied locally; latest scenarios include stale monthly/daily GET, grader denial, effective track/revision parity and committed activity. This is not a dataful Neon/production-derived rehearsal.
- [Audit library](../../lib/tuition-progress-audit.ts), [dry-run CLI](../../scripts/audit-tuition-progress.ts) and [audit tests](../../tests/tuition-progress-audit.test.ts) provide hashed refs/fingerprints, R1-R5 inventory, protected categories, explicit unknown provenance/invalid settings and verified counts. Two local dry-runs were stable with0 writes. Apply is unsupported; no repair was authorized or performed. Main's current real dry-run evidence remains separately owned by main.
- [Browser remediation](../../frontend/e2e/tuition-progress-remediation.spec.js) reports3/3 desktop/mobile/tablet daily80 reload; focused unit aggregate is58/58. These cover bounded local scenarios, not all50 matrix groups.
- Still pending: production-derived historical inventory and owner dispositions, protected-history verification at realistic breadth, authorized compensation/CAS/crash rehearsal, exact dataful migration chain, backup v3/v4 restore, compatibility/PITR and measured recovery, full isolation surface, immutable candidate/static/security/coverage gates and sign-offs. Main captured root533/533 and admin216/216. Frontend125/125 is builder-reported, pending main runner confirmation; no production readiness is declared. Receipt links remain with main.
