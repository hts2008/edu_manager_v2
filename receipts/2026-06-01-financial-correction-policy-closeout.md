# Financial Correction Policy Closeout - 2026-06-01

## Scope
- Closed the next unchecked production item: historical paid receipts/monthly fees with positive amount and zero chargeable sessions must be corrected explicitly, not rewritten silently.
- Implemented an admin-only correction workflow that voids the anomalous receipt via soft delete, marks the record with a correction note, recalculates the linked monthly fee from current attendance/classes, and returns it to a collectable `ready` state.
- No Prisma schema migration, seed, or destructive production data mutation was run.

## Code Changes
- `lib/finance-corrections.ts`
  - Shared anomaly detection for `RECEIPT_WITH_ZERO_DAYS` and `PAID_WITH_ZERO_DAYS`.
  - Shared correction note marker and monthly fee recalculation helper.
- `server/api/receipts/[id]/correct.ts`
  - New `POST /api/receipts/:id/correct` admin-only endpoint.
  - Requires an operator reason and only applies to supported anomaly cases.
  - Uses a Prisma transaction and logs correction/recalculation activity.
- `api/router.ts`
  - Routes `/api/receipts/:id/correct` before the dynamic receipt detail route.
- `server/api/receipts/index.ts`, `server/api/receipts/[id]/index.ts`
  - Expose anomaly metadata and correction eligibility to the UI.
- `server/api/reports/student-fees.ts`
  - Exposes detailed anomaly payloads for the report matrix.
- `server/api/monthly-fees/workbench.ts`
  - Exposes receipt mismatch/anomaly metadata and `needs_admin_review`.
- `lib/recycle-bin.ts`
  - Blocks restoring corrected receipts so voided revenue cannot be resurrected silently.
- `frontend/src/services/api.js`
  - Adds `receiptsService.correct(id, payload)`.
- `frontend/src/pages/ReportsPage.jsx`
  - Adds anomaly filter and admin correction action from the student-fees report.
- `frontend/src/pages/ReceiptsPage.jsx`
  - Adds admin correction action for anomalous receipts.
- `frontend/src/pages/FeeCollectionPage.jsx`
  - Locks unsafe rows with `needs_admin_review` so operators cannot collect them through the normal flow.
- `tests/finance-corrections.test.ts`, `tests/production-contracts.test.ts`, `package.json`
  - Adds regression coverage for anomaly detection, correction routing, report contract, and restore guard.

## Local Verification
- `npx tsc --noEmit` passed.
- `npm run test:unit` passed: 43/43.
- `npm --prefix frontend run lint -- --max-warnings=0` passed.
- `npm run build` passed.
- `git diff --check` passed with LF/CRLF warnings only.
- Local smoke server `npm run dev:smoke` on `http://127.0.0.1:3105`.
- Local Chrome/Playwright `ux-redesign-smoke.spec.js` passed: 11/11.
- Local Chrome/Playwright `phase-b-smoke.spec.js` passed: 17/17.
- Local `npm run perf:lab -- --base http://127.0.0.1:3105 --month 2026-05 --skip-browser` passed.
  - Report: `receipts/perf/perf-lab-2026-06-01T13-55-44-834Z.md`.

## Production Deployment
- Command: `npx vercel deploy --prod --yes`.
- Vercel inspect: `https://vercel.com/hts2008s-projects/edu-manager/BK4QDffa4v66M2MyuRsYXZ8Tk4eZ`.
- Production URL: `https://edu-manager-gules.vercel.app`.
- Build completed successfully on Vercel.

## Production Verification
- `npm run perf:lab -- --base https://edu-manager-gules.vercel.app --month 2026-05 --skip-browser` passed.
  - Cold/first pass report: `receipts/perf/perf-lab-2026-06-01T13-58-02-410Z.md`.
  - Warm follow-up report: `receipts/perf/perf-lab-2026-06-01T14-08-01-723Z.md`.
- Production Chrome/Playwright `phase-b-smoke.spec.js` passed: 17/17.
- Production targeted UX smoke passed:
  - `long edit modals stay viewport-bounded and scroll to action buttons`: 1/1.
  - Attendance previous/future month navigation, template designer, receipt PDF: 4/4.
- Production correction route no-mutation probes:
  - No-token `POST /api/receipts/nonexistent/correct`: 401.
  - Authenticated nonexistent receipt correction: 404.

## Team / Tooling Notes
- `ck:team` subagents reviewed backend/dataflow, frontend UX, and verification/test surface.
- Context+/Neural Memory MCP tools were not exposed in this Codex tool palette, so workspace write-back was completed through markdown files and receipts.

## Residual Risk
- Production API latency remains visible on serverless/DB-backed dashboard/report/workbench endpoints.
- Latest production perf samples still show some endpoints around 2.8-4.6s despite UI smoke passing.
- This is now separated from UI jank and should be handled as a dedicated backend latency task, likely involving deeper query profiling, region/cold-start strategy, and possibly runtime/cache architecture.

## Operator Rule
- Do not bulk rewrite historical paid receipts.
- Use Reports/Receipts anomaly actions one record at a time, with a correction reason, then recollect/print through the normal monthly fee flow.
