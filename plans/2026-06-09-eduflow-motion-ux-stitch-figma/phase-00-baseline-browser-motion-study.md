---
phase: 0
title: "Baseline Browser And Motion Study"
status: implemented
priority: P1
effort: "0.5-1 day"
dependencies: []
---

# Phase 0: Baseline Browser And Motion Study

## Objective

Capture the real current UX, loading behavior and performance symptoms before generating new design concepts.

## Tasks

1. Open production in Chrome using the approved admin smoke account.
2. Capture desktop and mobile screenshots for:
   - Login.
   - Dashboard.
   - Students.
   - Classes/edit modal.
   - Attendance.
   - Fee Workbench.
   - Reports.
   - Templates and Template Designer.
3. Record:
   - Time from click to visible feedback.
   - Blank/white/loading intervals.
   - Skeleton/spinner type.
   - Content layout shift.
   - Console/page/API errors.
4. Open the Facebook reference video in the logged-in Chrome session.
5. Extract motion characteristics, not copyrighted frames:
   - Visual focus.
   - Loop rhythm.
   - Progress clarity.
   - Text/indicator relationship.
   - Entry/exit behavior.
   - Reduced-motion adaptation.
6. Inventory current UI states in code:
   - Route loading.
   - Page data loading.
   - Table loading.
   - Chart loading.
   - Button/submit loading.
   - PDF/print loading.
   - Template upload/save loading.
7. Produce a baseline matrix with issue severity and target pattern.

## Deliverables

- `docs/artifacts/ux-baseline/` screenshots.
- `docs/artifacts/ux-baseline/motion-reference-notes.md`.
- `docs/artifacts/ux-baseline/loading-state-inventory.md`.
- Browser timing/console evidence.

## Evidence

- Full production baseline: `docs/artifacts/ux-baseline/2026-06-09T11-27-25-725Z/`.
- Smoke baseline: `docs/artifacts/ux-baseline/smoke/2026-06-09T11-26-35-171Z/`.
- Receipt: `receipts/2026-06-09-eduflow-motion-baseline-stitch-execution.md`.
- Summary: 32 scenarios, 0 API failures, 0 page errors, 0 horizontal overflow, 0 blank pages, 24 Recharts console warnings.

## Acceptance

- Every primary route has desktop evidence.
- High-risk routes have mobile evidence.
- Video reference is either documented or marked inaccessible with fallback principles.
- No design generation starts before baseline issues are listed.
