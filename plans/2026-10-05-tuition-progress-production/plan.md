---
title: Tuition and Student Progress Production Remediation
description: Close R1-R5 with auditable historical reconciliation and production release gates.
status: in-progress
priority: P1
created: 2026-10-05
branch: main
tags: [tuition, student-progress, production-readiness]
---

# Execution Plan

Related UX proposal: [teacher spreadsheet / Soft Clay plan](../2026-10-05-teacher-workspace-clay/plan.md). User selected always-visible roster score cells. This is a pending UX contract, not a scoring-rule change or release waiver. Coordinate TPR-03/04 daily/report/DTO ownership; new grid must preserve TP-1 and add safe partial-write/version semantics before enablement. No whole-plan dependency cycle; joint production release still requires original gates.

Planning task: PLAN-20261005-01. Execution program: TPR-20261005.
Implementation: LOCAL CORRECTIONS UNDER REVIEW. Production: NO-GO.

Execution authorization: user invoked team/cook for this plan on 2026-10-05. TP-1 defaults are implemented for local verification, not recorded as named finance/academic owner sign-off. [Execution evidence](../../receipts/2026-10-05-tuition-progress-execution.md) supersedes the earlier NOT STARTED checkpoint; all original exit criteria remain binding.

## Inputs And Boundaries

- [System review](../../reports/2026-10-05-system-review/review.md), including its incomplete whole-repository coverage.
- [Business contract](../../docs/production-readiness/tuition-progress/business-contract.md), [verification matrix](../../docs/production-readiness/tuition-progress/verification-matrix.md), [data reconciliation](../../docs/production-readiness/tuition-progress/data-reconciliation.md).
- [Runbook](../../docs/production-readiness/tuition-progress/release-runbook.md) and [gate register](../../docs/production-readiness/tuition-progress/go-no-go.md).
- [Admin Console plan](../2026-08-12-admin-console/execution-plan.md), [Student Progress plan](../../Student_Progress_Dashboard_Plan.md), [Audit_V2](../../Audit_V2.md).

Baseline HEAD: `712cc6662b88ed20b747d52ee9598ce5553ac3e9` plus substantial uncommitted Admin Console work. Preserve and inventory it. No production operation or code repair was performed by creating this plan.

## Reasoning And Chosen Approach

Cause-effect chain: incorrect pricing/evidence resolution -> incorrect ledger or report -> misleading collections/academic decisions -> unsafe historical recalculation -> release risk. Fix the originating resolver, all consumers and historical consequences, then prove recoverability.

Alternatives considered: UI-only patches would leave write/PDF paths inconsistent; a whole scoring/finance rewrite would enlarge migration risk and change unapproved semantics. Chosen approach: scoped resolver corrections, explicit source/comparability contracts, additive snapshot/DTO metadata, guarded reconciliation and existing infrastructure.

Assumptions to verify in TPR-01: surcharge means an additional session charge; daily-only raw scoring must survive finalize unchanged; local Admin Console is intended for this release. None is treated as prior business approval. If release scope excludes Admin Console, derive and review a separate candidate and re-run all gates; do not silently discard local work.

## Phase Graph

| Task | Phase | Accountable role | Depends on | Status |
| --- | --- | --- | --- | --- |
| TPR-01 | [Baseline and contract freeze](phase-01-baseline-and-contract.md) | Technical lead + finance/academic owners | None | PARTIAL |
| TPR-02 | [Tuition R1 and ledger regressions](phase-02-tuition.md) | Backend owner + finance reviewer | TPR-01 | REVIEW |
| TPR-03 | [Academic R2/R3/R4](phase-03-academic-consistency.md) | Backend owner + academic reviewer | TPR-01 | REVIEW |
| TPR-04 | [Settings, UI and PDF R5](phase-04-settings-and-consumers.md) | Backend/frontend owners | TPR-03 | REVIEW |
| TPR-05 | [Historical data and release rehearsal](phase-05-data-and-rehearsal.md) | Database operator + QA | TPR-02, TPR-04 | PARTIAL |
| TPR-06 | [Authorized go-live and observation](phase-06-release.md) | Release owner + independent reviewer | TPR-05, Admin Console release prerequisites | BLOCKED |

TPR-02 and TPR-03 have disjoint implementation ownership. Concurrent Codex agents were explicitly authorized by the subsequent user request; Claude TeamCreate was unavailable. Runtime integration and shared transaction changes remain owned by the main agent.

## External Dependency, Without A Cycle

Admin Console schema/tenant/settings/backup foundation and its isolated rehearsal are prerequisites to completing TPR-05/G09. Remediation TPR-02..04 does not depend on Admin Console production deployment. Admin Console's final release step waits for TPR-05 evidence. TPR-06 is the joint release decision, not a prerequisite to its own foundations.

The board's AC-07 is release; the older detailed plan uses AC-12 for release and AC-07 for settings. Use board ID plus named work package in receipts. Do not infer implementation status from stale PLANNED headings in the old plan; reconcile its evidence in TPR-01.

## Task Execution Rules

1. Assign named owner/reviewer and open one atomic task on KANBAN. Do not mix R1 pricing with unrelated tenancy refactors.
2. Capture a failing desired-behavior test first. Keep prior review probes labeled as negative observations; do not count them as acceptance tests.
3. Change the smallest responsible resolver and its actual consumers. Preserve finalized/paid history and tenant authorization at every boundary.
4. Run focused tests per change and full required gates for each phase candidate. Record commands, counts, skips and actual evidence, not only checkboxes.
5. Update board, current-session, progress, receipt and handoff. No phase is IMPLEMENTED without its exit criteria.
6. An unexpected money/auth/schema issue stops the affected path and gets a tracked test-first task. After three repeated failed attempts, record the blocker and escalate rather than weakening guards.

## Definition Of Ready To Release

All five findings closed, whole-review gaps addressed, all matrix groups executed, historical discrepancies resolved, real HTTP/DB/browser evidence, measured coverage, security review, and dataful migration/restore/rollback rehearsal. Final readiness is exclusively [G01-G13](../../docs/production-readiness/tuition-progress/go-no-go.md), not documentation completion.

Expected implementation artifacts: `docs/artifacts/tuition-progress-release/<candidate>/` with redacted evidence index, plus phase receipts. The path is a future output contract, not evidence that a candidate exists.

## First Action

Execute TPR-01: verify available files/dependencies, finish interrupted review, establish fresh static/test baseline and freeze pricing/score/release-scope decisions. Do not start with production migration or bulk historical recomputation.
