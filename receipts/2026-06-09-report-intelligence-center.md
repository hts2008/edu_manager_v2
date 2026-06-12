# Report Intelligence Center Closeout - 2026-06-09

## Scope
- Implement and close the Report Intelligence Center production slice.
- Provide PowerBI-style overview/detail reporting for revenue, attendance quality, unpaid tuition, and student-class-month risk rows.
- Fix reviewer-discovered data contract issues before marking the task complete.
- Deploy the corrected build to Vercel production and verify it through API, E2E, browser, and performance evidence.

## Deployment
- Production URL: `https://edu-manager-gules.vercel.app`
- Vercel deployment: `dpl_FiyiYAoozRGsZgdhk2PwCmNP6DPV`
- Deployment command: `npx vercel deploy --prod --yes`
- Alias command: `npx vercel alias set https://edu-manager-j3ik9nsnq-hts2008s-projects.vercel.app https://edu-manager-gules.vercel.app`

## Key Changes
- Added `server/api/reports/bi.ts` and registered it in `api/router.ts`.
- Added `lib/report-cube.ts` for month-bounded student-class-month analytics.
- Updated `frontend/src/pages/ReportsPage.jsx` with BI tabs, summary cards, charts, tab-specific details, loading/error states, server-side search, and production-ready report layout.
- Added `frontend/e2e/report-bi.spec.js` for Report BI UI behavior and API contract checks.
- Extended `tests/report-bi.test.ts` and `tests/production-contracts.test.ts` with RCA regression coverage.
- Added CI/perf coverage hooks in `.github/workflows/ci.yml`, `package.json`, and `scripts/perf-lab.mjs`.
- Updated docs, KANBAN, memory, and session state for closeout traceability.

## RCA Fixes Applied
- Class filtering is applied after report cube construction, not inside the raw enrollment query.
- Legacy aggregate monthly fees are not promoted into a selected class when fee-line evidence is missing.
- Inactive historical enrollments are included only if attendance or `MonthlyFeeLine` evidence exists in the requested report range.
- Expected sessions in a student's first enrollment month start from that student's enrollment date.
- Report search `q` is sent to the API and returned in `meta.filters.q`.
- Initial BI API failures show an explicit error state instead of fake zero-value analytics.

## Verification
- `npx tsc --noEmit` - passed.
- `npm run test:unit` - passed, 58/58.
- `npm --prefix frontend run lint -- --max-warnings=0` - passed.
- `npm --prefix frontend run test:e2e -- report-bi.spec.js --project=chromium --reporter=list --output=../receipts/e2e-report-bi-corrected` - passed, 3/3.
- `npm run build` - passed.
- `git diff --check` - passed with LF-to-CRLF warnings only.
- Production API smoke:
  - Login `admin/admin123` succeeded.
  - `/api/reports/bi?from=2026-01&to=2026-06&page=1&page_size=50&q=Mover` returned `success=true`, `rows=4`, `total_items=4`, `classes=2`, `risks=4`, `q=mover`.
- Production Playwright:
  - `E2E_BASE_URL=https://edu-manager-gules.vercel.app npm --prefix frontend run test:e2e -- phase-b-smoke.spec.js --project=chromium --reporter=list --output=../receipts/e2e-production-report-bi-corrected -g "reports page"` - passed, 2/2.
- Production perf:
  - `npm run perf:lab -- --base https://edu-manager-gules.vercel.app --apis "/api/reports/bi?from=2026-01&to=2026-06&page=1&page_size=50" --skip-browser --api-repeat 3 --api-severe-ms 7000` - passed with samples around 1.8s to 4.0s.
- Browser probe:
  - Logged in, opened `/reports`, switched to `Rủi ro`, searched `Mover`, observed `/api/reports/bi` with `q=Mover`, no runtime/API errors, and no page overflow.

## Evidence
- `receipts/e2e-report-bi-corrected/`
- `receipts/e2e-production-report-bi-corrected/`
- `receipts/perf/perf-lab-2026-06-09T06-29-46-122Z.md`
- `receipts/perf/perf-lab-2026-06-09T06-29-46-122Z.json`
- `receipts/artifacts/report-bi-production-corrected.png`

## Safety Notes
- No Prisma migration, seed, or production data mutation was run in this closeout.
- Existing report data was read-only during smoke tests.
- No secrets were logged in this receipt.

## Residual Risk
- The BI endpoint currently builds the report cube in memory before pagination. This is acceptable for the current dataset, but future scale work should move heavy aggregation to SQL/materialized views.
- `StudentClass` still lacks an `endedAt` field, so historical enrollment inclusion uses evidence-based inference from attendance and fee lines.

## Status
- `IMPLEMENTED` with evidence.
