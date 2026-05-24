# Receipt - 2026-05-18 Production Readiness Hardening

## Scope
- Continued execution from `PLAN.md` after diff inspection.
- Targeted the next unchecked item: production UX/dataflow hardening, starting with dashboard and the P0 workflow gaps from the capability matrix.
- No production deploy, migration, seed, or destructive production mutation was run.

## Implemented
- Added additive dashboard API contract fields: `unpaid_students`, `today_attendance`, `attention_items`, `quick_metrics`.
- Redesigned `DashboardPage.jsx` as a data-linked operations console using real dashboard data.
- Converted core Vercel handlers from token-only `verifyAuth()` to DB-backed `requireAuth()`.
- Added `lib/attendance-lock.ts` and enforced locked attendance periods on single/bulk attendance writes.
- Made monthly-fee payment idempotent by conditionally claiming the fee row before receipt creation.
- Linked direct receipt creation to matching monthly-fee rows when present/eligible.
- Wired the header change-password action to the existing modal.
- Added shared UI primitives: `PageHeader`, `MetricCard`, `PageState`.
- Improved Modal/DataTable/EmptyState accessibility.
- Replaced Reports shell export/print buttons with CSV export and `window.print()`.
- Added `scripts/local-smoke-server.ts` and `npm run dev:smoke` for current-code smoke via `api/router.ts` plus built frontend.

## Design Evidence
- Stitch project inspected: `12785236930566023458`.
- Stitch screen inspected: `projects/12785236930566023458/screens/228034b2eb8a493da04a30c4f029372f`.
- Figma context inspected: file `ZYAaYcKXq9LAYFOgCPJLZq`, node `3:36`.

## Verification
- `npm run test:unit` passed: 24/24.
- `npx tsc --noEmit` passed.
- `cd frontend && npm run lint -- --max-warnings=0` passed.
- `npm run build` passed outside sandbox after sandbox-only esbuild access failure.
- `npm audit --audit-level=high` passed: 0 vulnerabilities.
- `cd frontend && npm audit --audit-level=high` passed: 0 vulnerabilities.
- `git diff --check` passed.
- Local unauthenticated API probes:
  - `GET /api/auth/me` returned 401 `UNAUTHORIZED`.
  - `GET /api/reports/dashboard` returned 401 `UNAUTHORIZED`.
- Chrome-channel Playwright smoke against `npm run dev:smoke` passed 4/4:
  - grouped desktop navigation
  - mobile navigation without horizontal overflow
  - dashboard contract + mobile overflow
  - receipt PDF endpoint returns `application/pdf`

## Notes
- Local `vercel dev --local` remained unreliable: it hit a path-to-regexp warning and tried to invoke missing `yarn`. The new local smoke server avoids that tooling blocker while exercising the actual production router code.
- Live SMS/Zalo delivery remains intentionally disabled until provider, opt-in policy, message templates, and rate controls are approved.
