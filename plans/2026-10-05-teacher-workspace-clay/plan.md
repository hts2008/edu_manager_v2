---
title: "EDU Manager teacher spreadsheet, fixed shell and editable Soft Clay experience"
status: in-progress
priority: P1
created: 2026-10-05
scope: project
relatedPlans: [2026-10-05-tuition-progress-production, 2026-08-12-admin-console, 2026-06-09-eduflow-motion-ux-stitch-figma]
---

# Teacher Workspace UX Implementation Plan

## Objective

Make academic input usable directly in the displayed roster, with always-visible spreadsheet cells (user selected), immediate server-confirmed updates and no right-hand panel. Fix/collapse navigation and introduce validated tenant-editable copy/theme console with restrained clay-inspired styling.

Execution authorized by user on 2026-10-05 using Codex multi-agent. Implement always-visible dated evidence cells, fixed shell and bounded experience console locally. No schema migration, dependency upgrade or deployment is authorized. Monthly manual-score input remains in the existing student detail workflow; visual source certification remains pending.

## Phases

| ID | Phase | Depends on | Status | Deliverable |
| --- | --- | --- | --- | --- |
| UXW-01 | Contract and design freeze | None | PARTIAL | Local dated contract implemented; visual source and teacher mapping pending |
| UXW-02 | Safe roster persistence | UXW-01 | REVIEW | Real PostgreSQL CAS, replay, ownership, concurrency and load tests |
| UXW-03 | Fixed collapsible shell | UXW-01 | REVIEW | Responsive browser evidence and navigation tests |
| UXW-04 | Always-visible score grid | UXW-02, UXW-03 | REVIEW | Canonical row save, retry/conflict retention; monthly manual workflow unchanged |
| UXW-05 | Copy/theme console and tokens | UXW-01 | PARTIAL | Admin publish/history works; read-only grant DB constraint pending approval |
| UXW-06 | Integration, teacher trials and staged rollout | UXW-04, UXW-05 | PARTIAL | Local browser/load evidence complete; full matrix, teacher trial and release pending |

## Phase Files

- [01 Contract/design](phase-01-contract-design.md)
- [02 Persistence](phase-02-persistence.md)
- [03 Shell](phase-03-shell.md)
- [04 Grid](phase-04-grid.md)
- [05 Experience console](phase-05-experience-console.md)
- [06 Verification/rollout](phase-06-verification-rollout.md)

## Dependencies And Ownership

TPR-03 canonical academic semantics and TPR-04 consumers are under local review, not approved release truth. Reuse them after verified baseline; coordinate shared report/daily/DTO files before edits. Admin Console registry/settings/CAS/auth foundations must be reviewed before experience publishing. No whole-plan dependency cycle: UX can be researched/local-tested while finance/history gates remain open; release requires both sets of gates.

Teacher identity is NOT available as a UserRole. Initial authorized actors use current permissions; teacher self-service needs owner-approved persisted mapping/class scope in phase01/02. Do not expand privileges automatically.

Stitch mandatory3.1Pro model is not in exposed enum: preserve required prompt as pending rather than silently downgrade. Figma auth works but target file key needs selection/confirmation. Missing CLI/orchestrator skill handled manually without install. Implementation is authorized locally; these visual-source limitations remain release evidence gaps.

## Sequence And Non-Goals

Test before code in every phase. Land atomic changes: data/CAS, shell, grid, content publishing, token rollout. Do not rewrite finance/scoring, introduce landing heroes, add arbitrary custom CSS/HTML CMS, bulk-copy past scores, auto-save every keypress or deploy implicitly. Tenant flags and schema migration are separate approval-bearing changes.

## Review Package

2026-10-06 consistency follow-up: shared compact headings, one metrics strip, cross-route tenant tokens and redundant-value removal implemented under UX-CONSISTENCY-01 REVIEW. [Presentation contract](../../docs/ux/teacher-workspace-2026-10-05/operational-consistency.md), [review](../../docs/artifacts/teacher-workspace-execution-2026-10-05/consistency-review.md).193 frontend tests,23 desktop/23 mobile route geometry checks; browser-native confirm handoff remains pending, not a passed keyboard runtime trial.

[Design docs](../../docs/ux/teacher-workspace-2026-10-05/README.md), [verification matrix](../../docs/ux/teacher-workspace-2026-10-05/verification-matrix.md), existing [TP-1 contract](../../docs/production-readiness/tuition-progress/business-contract.md). Current local execution evidence: [review package](../../docs/artifacts/teacher-workspace-execution-2026-10-05/README.md) and [receipt](../../receipts/2026-10-05-teacher-workspace-execution.md). These supersede documentation-only status, not production gates.
