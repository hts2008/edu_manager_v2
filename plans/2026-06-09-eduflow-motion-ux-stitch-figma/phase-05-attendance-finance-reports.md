---
phase: 5
title: "Attendance, Finance And Reports"
status: implemented
priority: P1
effort: "5-7 days"
dependencies: [4]
---

# Phase 5: Attendance, Finance And Reports

## Objective

Redesign high-risk operational workflows without changing approved business logic.

## Attendance

- Preserve multi-month navigation and cross-month weeks.
- Keep fixed schedule plus make-up day behavior.
- Clarify editable, submitted, approved and locked states.
- Use sticky student/summary columns where practical.
- Show save/submit progress and conflict/error recovery.
- On mobile, use week/date selection plus student detail instead of compressing the full grid.

## Finance

- Fee Workbench remains one row per student-class-month.
- Preserve class/month/status filters and bulk payment.
- Clearly separate ready, confirmed, paid, anomaly and blocked states.
- Print flow shows prepare/render/open status.
- Keep content visible while background refresh runs.

## Reports

- Preserve server-side `mode`, search and pagination contracts.
- Redesign chart grid with consistent axes, legends and tooltips.
- Add skeletons that match each chart.
- Never render fake zero analytics during failure.
- Drilldown drawer must preserve table context and filters.

## Tests

- Attendance state transitions.
- Class-line fee selection and payment.
- Print/PDF status and fallback.
- Report tabs cause mode-specific API requests.
- Chart/empty/error/loading states.

## Acceptance

- No financial or attendance contract changes without a separate ADR.
- All existing targeted E2E suites pass.
- Operators always see whether data is loading, refreshing, locked or failed.

## Implementation Evidence - 2026-06-10

- Attendance guards prevent editing/saving/select-all until the selected week has loaded successfully and is not locked.
- Fee Workbench no longer falls back to aggregate student/month rows when the class-line workbench API fails; it shows an error/retry state instead.
- Fee Workbench actions are disabled during refresh and validate the row month before collect/print actions.
- Receipt print queue now shows per-receipt and print-all progress states.
- Report BI now blocks stale data after failed tab/filter requests, adds table audit context, clamps backend pagination, and restores the visible student tuition matrix heading.
- Stitch concept generated with `GEMINI_3_1_PRO`: `projects/5084496326021058210/screens/fc4f6bb5841d4935bfc36f40a2ce3061`.
- Figma Desktop context inspected for node `3:36`; no writable Figma sync tool was available in this Codex run.
- Gates passed: frontend lint zero warnings, `npx tsc --noEmit`, unit 61/61, build, Playwright Phase 5 7/7, template/UX smoke 12/12, UX baseline desktop/mobile 16/16.
- Receipt: `receipts/2026-06-10-eduflow-motion-phase5-attendance-finance-reports.md`.
