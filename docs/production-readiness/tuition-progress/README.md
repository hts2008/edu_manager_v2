# Tuition and Student Progress Production Readiness

Date: 2026-10-05. Documentation task: PLAN-20261005-01.
Execution status: LOCAL IMPLEMENTATION UNDER REVIEW. Release verdict: NO-GO.

## Current Execution

The user subsequently authorized team implementation of this plan. R1-R5 now have local runtime corrections and desired-behavior regressions; this does not authorize production operations or certify historical data. See the [execution receipt](../../../receipts/2026-10-05-tuition-progress-execution.md) and [evidence index](../../artifacts/tuition-progress-execution-2026-10-05/README.md).

Local evidence includes authenticated HTTP/PostgreSQL persistence, concurrent save/finalize, PDF delivery and daily80 dashboard reload at three viewport sizes. Historical reconciliation, all 50 scenario groups, required coverage, security and dataful Neon recovery remain separate gates. Security audits currently fail; no dependency upgrade or waiver was performed.

This package turns the [system review](../../../reports/2026-10-05-system-review/review.md) into implementation contracts and release gates. It does not assert that defects are fixed or that production currently exhibits every local finding.

## Read In Order

1. [Execution plan](../../../plans/2026-10-05-tuition-progress-production/plan.md): sequencing, ownership, dependencies and task acceptance.
2. [Business contract](business-contract.md): desired tuition, evidence, score and trend behavior.
3. [Verification matrix](verification-matrix.md): executable scenarios and expected outcomes.
4. [Data reconciliation](data-reconciliation.md): detection and audited correction of historical anomalies.
5. [Release runbook](release-runbook.md): isolated rehearsal, cutover, smoke and recovery.
6. [Go/No-Go](go-no-go.md): evidence register and sign-off requirements.

## Evidence Boundary

- Baseline is dirty local `main`, HEAD `712cc6662b88ed20b747d52ee9598ce5553ac3e9`, including unfinished Admin Console changes. A SHA alone does not identify this reviewed working tree.
- Previous review: 21 focused tests passed; two probes reproduce defects. Those probes assert wrong behavior and are not acceptance tests.
- Full suite/typecheck were incomplete during review. Historical 530/530 and past production screenshots do not certify this release candidate.
- Audit_V2, StudentProgressDetailPage, the PostgreSQL router harness and backup/restore documentation became readable during planning. Whole-repository review and fresh runtime verification remain pending.
- Context+/Neural Memory tools are unavailable in this session. Manual code review and workspace Markdown are the fallback; no global memory is written.

## Scope And Non-Goals

Close R1-R5, complete interrupted review coverage, correct affected history safely, and integrate with Admin Console release safety. Preserve attendance, enrollment, finance ledger, tenant/auth, snapshot, and parent-portal boundaries.

No product code, migrations, data repairs, dependency upgrades, deployment or production writes are authorized by this documentation deliverable. Execution phases must obtain the normal operator authorization for production actions.

Do not reimplement the reference SQLite backend, add a teacher/parent academic portal, redesign the whole UI, or convert all monetary storage to Decimal under this scope. A newly discovered release-critical defect must become a tracked blocker, not a silent scope expansion or waiver.

## Interpretation Of Decisions

Existing invariants are preserved. New metric semantics and unsupported pricing combinations below are proposed implementation defaults, not previously approved business policy. TPR-01 must record accountable finance/academic owner acceptance or a revised contract before coding those choices. Tests must then encode that version explicitly.

Documentation completeness is separate from implementation completeness and production readiness. Only the final gate register can change the release verdict.
