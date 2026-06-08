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
- Added a separate GitHub Actions `e2e` job with a PostgreSQL service, CI seed, local smoke server, and Playwright.

## Verification

- `npm run test:unit` passed 50/50.
- `npx tsc --noEmit` passed.
- `npm --prefix frontend run lint -- --max-warnings=0` passed.
- `npm run build` passed.
- `npm --prefix frontend run test:e2e -- advanced-reports-chart.spec.js template-designer-hardening.spec.js --project=chromium --reporter=list --output=playwright-optional-closeout-results` passed 2/2.
- `git diff --check` passed with LF/CRLF warnings only.

## Safety

- No Prisma migration was run.
- No seed was run against production.
- No production data mutation was run.
- CI E2E uses an ephemeral PostgreSQL service and seeded CI data.
