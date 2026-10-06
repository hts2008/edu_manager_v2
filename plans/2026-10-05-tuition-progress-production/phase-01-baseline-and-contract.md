# Phase 01: Baseline And Contract Freeze

Task: TPR-01. Priority: P1. Status: PENDING. Depends on: none.
Owner: technical lead; reviewers: finance/academic owners and QA.
Gate: G01. Unlocks: TPR-02 and TPR-03.

## Objective

Finish interrupted review coverage and remove business/runtime ambiguity before changing money or scores. Reference [contract](../../docs/production-readiness/tuition-progress/business-contract.md).

## Work Items

- [ ] TPR-01A: Inventory HEAD, dirty/untracked files, generated artifacts and exact migration/lockfile state. Preserve existing changes; never clean/reset the tree to simplify the audit.
- [ ] TPR-01B: Recheck readable source/docs/dependencies. Audit_V2 and key UI/harness/backup files were readable during planning; do not carry forward the old OneDrive blocker without rechecking.
- [ ] TPR-01C: Read the remaining PRDs, docs, handoff and historical release receipts; produce a path-level coverage register (read/verified/unread, reason and owner). Close REV-20261005-01 only when breadth is actually covered.
- [ ] TPR-01D: Establish baseline typecheck, full root/frontend/admin/safety tests, lint and build. If a file read fails, stop the affected command safely, record exact failure and repair local availability before claiming a baseline.
- [ ] TPR-01E: Inventory current production identity read-only through authorized access; distinguish deployed code from local Admin Console. Decide joint release versus explicitly separated candidate.
- [ ] TPR-01F: Get accountable approval for the five decisions below; add exact expected-output fixtures and contract version.
- [ ] TPR-01G: Assign actual implementation/review/release owners and confirm test target isolation, recovery objectives and evidence storage.

## Decisions To Freeze

| Decision | Proposed default | Evidence needed |
| --- | --- | --- |
| Per-session extra surcharge | Always use class session rate when extra=surcharge | Finance approval; current settings/config usage inventory |
| Monthly + per_session_fee | Reject ambiguous rate; add separate rate only if required | Existing tenant usage; finance sign-off; exact rounding outputs |
| Daily-only vs manual monthly | Preserve daily_raw80; existing manual blend; display fallback with contributors | Academic approval; current missing-skill normalization tests |
| Trend and alerts | Same-source/contributors/calibration; monthly baseline or disclosed custom baseline | Academic approval; worked edge cases from matrix |
| Release/recovery | Joint Admin Console candidate; proposed RTO15m/RPO0 and observation thresholds | Operator feasibility/rehearsal plan, named release owner |

Finalized legacy history is not rewritten to make these choices easier. If decisions change, update contract, scenarios, data impact and release gates together before implementation.

## Files To Inspect

`lib/tuition-v3-service.ts`, `lib/tuition-settings.ts`, `lib/tuition-v3.ts`, `lib/student-progress-assessment.ts`, `lib/student-progress-report.ts`, `lib/student-progress-timeline.ts`, `lib/academic-settings.ts`, `lib/progress-difficulty.ts`, `prisma/schema.prisma`, `server/api/student-progress/*`, report/PDF handlers, frontend progress pages/components, relevant tests and all Admin Console migrations.

Inspect `tests/postgres-router-harness.test.ts`, `frontend/playwright.real.config.js` and package scripts for actual test inclusion/DB identity. Inventory every endpoint/consumer of progress_score, daily_delta, score_drop and performance fields.

## Verification And Exit

- [ ] Coverage register and baseline receipt link actual read/check results, not historical green counts.
- [ ] No unknown pricing/scoring policy remains for implementation; owner approvals are recorded honestly.
- [ ] Review and Admin Console status conflicts reconciled without promoting unverified tasks.
- [ ] Isolated DB/browser configuration documented without secrets; critical absent test settings fail closed.
- [ ] New release-critical findings have task IDs, dependencies and required tests.

Risk: incomplete source hydration or inaccessible production baseline. These block the relevant gate, not authorization to manufacture success. No app changes are required by this phase except separately scoped test-harness groundwork after its safety review.

## Execution Checkpoint - 2026-10-05

Current execution status: PARTIAL. This checkpoint supplements the planning baseline; original work items and acceptance remain open until their own evidence is reviewed.

- Main reports focused remediation58/58, real HTTP14/14 with zero skips, local PostgreSQL18 migration rehearsal, browser daily80/reload3/3 across desktop/mobile/tablet, and inventory two stable dry-runs with0 writes. These are bounded local results, not whole-repository or production acceptance.
- Guarded targets and executable regression fixtures now exist: [target tests](../../tests/tuition-progress-target-guard.test.ts), [HTTP tests](../../tests/tuition-progress-http.integration.ts), [browser spec](../../frontend/e2e/tuition-progress-remediation.spec.js). Detailed scenario/layer limits are in the [matrix checkpoint](../../docs/production-readiness/tuition-progress/verification-matrix.md#execution-checkpoint---2026-10-05).
- Still pending: accountable finance/academic contract approvals, whole-system review coverage and baseline reconciliation, candidate identity and named sign-offs. Main captured root533/533 and admin216/216. Frontend125/125 is builder-reported, pending main runner confirmation; receipt links remain with main. G01 is not closed.
