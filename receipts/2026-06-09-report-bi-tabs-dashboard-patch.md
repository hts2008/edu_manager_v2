# Receipt - Report BI Tab-Mode + BA/PI Dashboard Patch

**Date**: 2026-06-09
**Workspace**: `C:\Users\haitr\OneDrive\0. GAU DATA\0.APP\EDU_MANAGER_V2`
**Production alias**: `https://edu-manager-gules.vercel.app`
**Vercel inspect URL**: `https://vercel.com/hts2008s-projects/edu-manager/3e6ZCdUNAQrEg7bTeDJ7tKV2raFE`
**Production URL**: `https://edu-manager-aphqqe489-hts2008s-projects.vercel.app`

## Scope

Fix the Report Intelligence Center issue where tabs appeared inert and expand the report page into a stronger BA/PI dashboard surface.

## RCA

- `ReportsPage.jsx` changed `activeTab`, but the BI API request did not include an analytical mode.
- Backend filtering did not apply `overview`, `attendance`, `tuition`, and `risk` modes before search/pagination.
- Frontend focused-tab fallback rows could keep the visible table/chart content too similar across tabs.
- Class filter options could be derived from narrowed response data instead of the full report cube.
- Some charts mixed VND, count, and risk values on one axis.

## Changes

- Added server-side `mode` parsing and report-mode filtering in `lib/report-cube.ts`.
- Updated `server/api/reports/bi.ts` to return `meta.filters.mode` and stable full-cube `meta.classes`.
- Updated `frontend/src/pages/ReportsPage.jsx` to:
  - send `mode=overview|attendance|tuition|risk`;
  - reset pagination on tab switch;
  - remove focused-tab fallback rows;
  - defer search input;
  - avoid duplicate initial error rendering;
  - add fee funnel, attendance distribution, risk mix, action list, and risk heatmap panels;
  - separate chart axes for money/count/risk metrics.
- Updated `frontend/e2e/report-bi.spec.js` to assert each tab drives the expected API mode and that the added chart panels render.
- Updated unit/contract coverage in `tests/report-bi.test.ts` and `tests/production-contracts.test.ts`.

## Local Verification

Passed:

- `npx tsx --test tests/report-bi.test.ts tests/production-contracts.test.ts` -> 18/18
- `npx tsc --noEmit`
- `npm --prefix frontend run lint -- --max-warnings=0`
- `npm run test:unit` -> 59/59
- `npm run build`
- `npm --prefix frontend run test:e2e -- report-bi.spec.js --project=chromium --reporter=list --output=..\receipts\e2e-report-bi-tabs-dashboard` -> 3/3

Local browser probe:

- Screenshot: `receipts/artifacts/report-bi-tabs-dashboard-local.png`
- Observed 5 chart panels.
- Observed no console errors.
- Observed no horizontal overflow.

## Production Verification

Deployment:

- `npx vercel deploy --prod --yes`
- Inspect: `https://vercel.com/hts2008s-projects/edu-manager/3e6ZCdUNAQrEg7bTeDJ7tKV2raFE`
- Production URL: `https://edu-manager-aphqqe489-hts2008s-projects.vercel.app`
- Alias: `https://edu-manager-gules.vercel.app`

Static/API smoke:

- `GET https://edu-manager-gules.vercel.app` -> 200.
- Built page asset includes `/assets/ReportsPage-CvAq1yby.js`.
- No-token `GET /api/reports/bi?...` -> 401 `UNAUTHORIZED`.
- Authenticated API mode smoke with approved admin smoke login:
  - `overview`: status 200, `meta.filters.mode=overview`, `total_items=118`.
  - `attendance`: status 200, `meta.filters.mode=attendance`, `total_items=111`.
  - `tuition`: status 200, `meta.filters.mode=tuition`, `total_items=118`.
  - `risk`: status 200, `meta.filters.mode=risk`, `total_items=114`.

Production browser probe:

- Screenshot: `receipts/artifacts/report-bi-tabs-dashboard-production.png`
- Browser tab-click probe captured:
  - `attendance`: response 200, `mode=attendance`, `total=111`, `rows=50`.
  - `tuition`: response 200, `mode=tuition`, `total=118`, `rows=50`.
  - `risk`: response 200, `mode=risk`, `total=114`, `rows=50`.
- Observed 5 chart panels.
- Observed no console errors.
- Observed no horizontal overflow.

## Safety

- No Prisma migration was run.
- No production seed was run.
- Production API and browser verification used read-only report endpoints after login.
- The login smoke did not log tokens or secrets.

## Residual Risk

- `tuition` currently returns the same row total as `overview` on production because current production data has all/most rows needing tuition action. This is a data condition, not a mode wiring failure.
- `/api/reports/bi` still materializes a bounded report cube in memory before pagination. For larger centers, plan DB-side aggregation or materialized reporting.

## Status

`IMPLEMENTED`
