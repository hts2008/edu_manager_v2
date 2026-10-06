# Phase 03: Canonical Academic Evidence And Comparison

Task: TPR-03. Findings: R2, R3, R4. Priority: P1. Status: PENDING.
Depends on: TPR-01. Owner: backend owner; reviewer: academic owner.
Gate: G03. Tests: TP-ACA-01..16 and relevant TP-SEC cases.

## Objective And Design

Use one evidence resolver and one comparable-metric helper for real read/write paths. Preserve daily_raw versus manual_monthly semantics under the approved [contract](../../docs/production-readiness/tuition-progress/business-contract.md); do not introduce a new universal score without approval.

## Intended Change Surface

- `lib/student-progress-assessment.ts`: canonical per-skill evidence, overall source/contributors/coverage and daily comparability.
- `lib/student-progress-report.ts`: resolved previous-month metric cache, baseline outside filter and comparable trend.
- `lib/student-progress-timeline.ts`: per-date/skill aggregation, shared comparison/alert semantics.
- `server/api/student-progress/daily.ts`: recompute after replacement/deletion without overwriting manual data.
- `server/api/student-progress/index.ts`: shared upsert/finalize resolver, transaction/revision conflict handling and reopen.
- Existing progress API/daily/rollup/report/finalization/timeline tests; real PostgreSQL concurrency tests.
- Existing snapshot JSON preferred. Change `prisma/schema.prisma` only if required metadata cannot safely fit current snapshot contracts; then update migration/backup/recovery scope.

## Atomic Work Items

- [ ] TPR-03A / R3: RED tests for daily Listening80 missing from skills and finalize-shaped80->100. Implement manual non-null > daily > missing per skill, and explicit overall source/contributors.
- [ ] TPR-03B / R3: Wire daily replace/delete, open-month recalculation, monthly upsert and finalize to the resolver. Snapshot formula/settings/evidence provenance atomically; read finalized revisions without current-setting recompute.
- [ ] TPR-03C / R3: Concurrent daily mutation vs finalize, repeated finalize, authorized reopen and rollback-on-error tests on real PG. Verify existing grader/permission/tenant checks survive.
- [ ] TPR-03D / R2: RED60->80 test with proxy100 baseline; store resolved metric and source, fetch previous calendar month outside filter, compare IDs and matching signatures.
- [ ] TPR-03E / R4: RED Listening90/Speaking50 and same-date-order cases. Implement per-skill comparable observations, coverage-aware aggregate nulls and stable date aggregation.
- [ ] TPR-03F / R4: Unify score-drop baseline/threshold across list/detail/timeline; test exact15%, zero baseline, missing period and custom-window dates.
- [ ] TPR-03G: Add additive DTO provenance/comparison fields; preserve cached-client compatibility and inventory each UI/export/PDF consumer for TPR-04.

Complete R3 evidence resolution before R2/R4 consume its metrics. Avoid independently implemented formulas in endpoints or UI. Different metrics may remain intentionally different; metadata must make that difference explicit.

## Verification

- [ ] Domain RED/GREEN for each finding; genuine0 preserved and missing stays null.
- [ ] Save -> API read -> fresh DB read -> finalize -> reload yields same daily_raw80/source and visible Listening80.
- [ ] Finalization produces exactly one consistent revision; conflict/retry never loses a concurrent input or leaks partial state.
- [ ] 60->80 gives+20; changed source/coverage/calibration returns null with reason; same-day order invariant.
- [ ] Frozen snapshot remains identical after current config changes; legacy unknown provenance is disclosed.
- [ ] Existing root/admin/safety/API authorization tests and full phase gates pass; critical tests actually included.

## Exit And Risks

R2-R4 code closure requires G03 evidence; UI/settings/history closure follows in TPR-04/05. Main risks are stale persisted score precedence, accidentally blending daily data into manual formula, inconsistent transaction snapshots and misleading null-to-zero serialization. Attach source/contributor fixtures to the academic review, not only total scores.

## Execution Checkpoint - 2026-10-05

Current execution status: REVIEW. R2-R4 code is implemented locally, including the shared [operational row loader](../../lib/student-progress-operational-row.ts); original acceptance and G03 sign-off remain pending.

- [Academic remediation](../../tests/student-progress-remediation.test.ts) and [timeline remediation](../../tests/student-progress-timeline-remediation.test.ts) cover canonical daily80/manual0, monthly source/baseline changes, coverage/calibration, same-day order, strict alerts and legacy uncertainty; these are subsets of the main-reported focused58/58.
- [Real HTTP tests](../../tests/tuition-progress-http.integration.ts) exercise receptionist daily80, admin finalize/reload with one revision, finalized mutation denial, authorized reopen preserving the prior revision, tenant denial and concurrent daily replacement/finalize, plus stale monthly/daily GET canonical80, wrong/inactive grader denial, effective track/revision parity and committed replace/delete activity. Main reports aggregate HTTP14/14, zero skips. [Browser remediation](../../frontend/e2e/tuition-progress-remediation.spec.js) reports daily80/reload3/3 across desktop/mobile/tablet.
- Still pending: academic owner approval, every TP-ACA boundary/layer, broader replace/delete/rollback/concurrency evidence, PDF semantic/content parity and protected historical provenance/disposition. PDF binary/header assertions and browser reload do not establish the entire academic matrix. Main captured root533/533 and admin216/216; remaining candidate gates/receipts stay with main. Frontend125/125 is builder-reported, pending main runner confirmation.
