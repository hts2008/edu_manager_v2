# Fee Workbench + UX Closeout - 2026-05-25

## Scope
- Fixed edit modal usability by moving the dialog into a viewport-bounded flex shell with a dedicated scrollable body.
- Added DataTable page-size controls with default `Tất cả` plus `500`, `100`, and `50`.
- Merged finance navigation so `Thu tiền` points to the operational Fee Workbench (`/fee-collection`); `/receipts` remains as receipt history/print route.
- Added attendance month-window navigation: previous/next month, previous/next 3 months, and today reset.
- Added `POST /api/monthly-fees/bulk-pay` for batch tuition collection with item-level failures, receipt queue output, and dynamic-route shadowing guard coverage.
- Added class filtering to production students/monthly-fees APIs and exposed `class_ids` for UI filtering.
- Rebuilt the Fee Workbench with class/month/status filters, multi-select, batch cash/transfer collection, calculate-selected, and print queue.
- Hardened Template Designer with default scaffold for empty templates, reload by template id, undo/redo, zoom controls, and responsive canvas layout.

## Local Evidence
- `git diff --check` passed.
- `npx tsc --noEmit` passed.
- `npm run test:unit` passed 39/39.
- `npm --prefix frontend run lint -- --max-warnings=0` passed.
- `npm run build` passed with existing Vite chunk-size/dynamic-import warnings.
- `npm audit --audit-level=high` passed with 0 vulnerabilities.
- `npm --prefix frontend audit --audit-level=high` passed with 0 vulnerabilities.
- Local API smoke:
  - No token `POST /api/monthly-fees/bulk-pay` returned `UNAUTHORIZED`.
  - Authenticated no-selection request returned `NO_SELECTION`.
- Local Playwright:
  - `npm --prefix frontend run test:e2e -- ux-redesign-smoke.spec.js --reporter=list` passed 10/10.
  - `npm --prefix frontend run test:e2e -- phase-b-smoke.spec.js --reporter=list` passed 17/17.

## Production Evidence
- Commit `c793de3` pushed to `origin/main`.
- Vercel production deployment `dpl_7FBhsvzbfCLy85aQoirLyhwBRg12` is Ready and aliased to `https://edu-manager-gules.vercel.app`.
- Production API smoke:
  - Login with approved smoke account returned success.
  - No token `POST /api/monthly-fees/bulk-pay` returned `UNAUTHORIZED`.
  - Authenticated no-selection request returned `NO_SELECTION`.
- Production Playwright:
  - `E2E_BASE_URL=https://edu-manager-gules.vercel.app npm --prefix frontend run test:e2e -- phase-b-smoke.spec.js --reporter=list` passed 17/17.
  - First `ux-redesign-smoke.spec.js` production run passed 9/10 and failed only because the new attendance button expectation timed out while production class data was still loading.
  - After increasing that test expectation timeout, `E2E_BASE_URL=https://edu-manager-gules.vercel.app npm --prefix frontend run test:e2e -- ux-redesign-smoke.spec.js --reporter=list` passed 10/10.
  - Reconfirmed on 2026-05-26: the same production UX smoke passed 10/10 after docs/test closeout updates.

## Notes
- No Prisma schema migration, seed, or destructive production data mutation was run.
- The new bulk-pay endpoint was only smoke-tested with non-mutating error cases on production.
- Vercel build still reports the pre-existing Vite chunk-size/dynamic-import warning; not introduced by this closeout.
