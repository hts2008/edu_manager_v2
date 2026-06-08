# 2026-06-08 Optional TODO Closeout

## Scope

Closed the remaining low-priority optional TODOs in `KANBAN.md`:

- API documentation.
- Line chart for reports.
- Thermal 80mm print test.
- E2E automated tests.

## Implementation

- Added `docs/API.md` for the production Vercel API surface served by `api/router.ts`.
- Added `tests/api-docs.test.ts` so unit tests fail when production routes are missing from `docs/API.md`.
- Updated `README.md` to stop presenting stale Express/SQLite and `/api/kanban` production claims.
- Added a Recharts revenue line chart to `frontend/src/pages/AdvancedReportsPage.jsx`.
- Added `frontend/e2e/advanced-reports-chart.spec.js` with mocked auth/API data to verify the chart renders an SVG in browser.
- Added `thermal_80mm` to the Template Designer paper-size dropdown.
- Hardened Template Designer E2E paper-size assertions with polling instead of fixed timeouts.
- Added Thermal 80mm PDF MediaBox coverage in `tests/pdf.test.ts`.
- Added a separate GitHub Actions `e2e` job that builds frontend preview and runs deterministic mocked Playwright browser smoke specs for Advanced Reports and Template Designer.

## Verification

- `npm run test:unit` passed 50/50.
- `npx tsc --noEmit` passed.
- `npm --prefix frontend run lint -- --max-warnings=0` passed.
- `npm run build` passed.
- `npm --prefix frontend run test:e2e -- advanced-reports-chart.spec.js template-designer-hardening.spec.js --project=chromium --reporter=list --output=playwright-optional-closeout-results` passed 2/2.
- `E2E_BASE_URL=http://127.0.0.1:3101 npm --prefix frontend run test:e2e -- advanced-reports-chart.spec.js template-designer-hardening.spec.js --project=chromium --reporter=list --output=playwright-ci-preview-closeout-results` passed 2/2 against frontend preview, matching the narrowed CI E2E job.
- `git diff --check` passed with LF/CRLF warnings only.

## Deployment And Production Smoke

- Commit `fee8bc3` was pushed to `origin/main`.
- Vercel production deployment `dpl_57m2wBJuvyWonYWqL98Q92BCudfC` is Ready and aliased to `https://edu-manager-gules.vercel.app`.
- Production Playwright smoke passed 1/1 for Advanced Reports, including the new Recharts SVG assertion.
- Production Template Designer read-only smoke opened template `cmp6dbuc900s7gcyrty4jd0ik`, switched the paper-size selector to `thermal_80mm`, verified summary `Thermal 80mm`, and measured canvas `302x756`.

## Safety

- No Prisma migration was run.
- No seed was run against production.
- No production data mutation was run; the Template Designer production smoke did not click save.
- CI E2E uses mocked API responses and frontend preview, so it does not touch Neon, production credentials, or live data.
