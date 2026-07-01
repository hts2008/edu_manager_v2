# Attendance Lock, Selector UX, And Daily Progress Closeout

Status: IMPLEMENTED (2026-07-01)

## Goal

Close three production blockers: attendance lock transaction timeouts, ambiguous selector loading states, and month-wide student-progress overwrites.

## Workstreams

1. Attendance lock: conditionally claim the approved period, reconcile mutable class fee lines in bounded database operations, preserve immutable paid/receipt-linked records, and return actionable timeout/conflict errors.
2. Selector UX: introduce shared ready/loading/refreshing/empty/error states with accessible labels, retry behavior, reduced-motion support, and critical-route migration.
3. Daily progress: persist one selected date at a time, derive monthly rollups from daily observations, preserve `missing_input`, and expose a timeline editor.
4. Integration: register the daily route, configure serverless duration, run static/integration/browser gates, deploy, observe production logs, and record evidence.

## Acceptance

- No Prisma `P2028` or HTTP 500 in attendance lock smoke.
- Attendance fee synchronization remains class-grained and transactional.
- Critical selectors clearly expose loading, empty, error, retry, and refresh states.
- Saving or deleting one progress date cannot alter another date.
- Monthly report derives average/latest/delta/observation count from daily records.
- Unit, typecheck, Prisma validation, frontend lint/build, Playwright, preview and production smoke pass.
