# Fee Workbench Class-Line Split Closeout - 2026-06-03

## Scope
- Fix the reported production issue where Fee Workbench could show one student row aggregating multiple classes and collect the total as one payment.
- Requirement: one student enrolled in multiple classes must appear as one fee row per class, because parents may pay each class on different dates.
- Deploy the fix to production and verify the live alias with API and Chromium/Playwright smoke.

## RCA Summary
- Fee Workbench still had legacy aggregate fallback paths for monthly fees without line rows.
- `bulk-pay` still accepted `fee_ids` and `student_ids`, which could collect an aggregate monthly fee instead of a specific class line.
- The frontend had been changed to pay with `line_ids`, but the shared `DataTable` still allowed selecting non-line rows; selected legacy rows were ignored by collection, but the UX could imply they were included.
- A previous production deploy timed out on `GET /api/monthly-fees/workbench?month=2026-05&limit=1000` because read listing still attempted class-line backfill/write work.

## Code Changes
- `server/api/monthly-fees/workbench.ts`
  - Keeps GET read-only.
  - Returns existing `MonthlyFeeLine` rows when present.
  - Displays legacy fees as per-class read-only placeholders or paid estimated splits requiring admin review.
  - Removes GET-time line sync/backfill and aggregate collectable fallback.
- `server/api/monthly-fees/bulk-pay.ts`
  - Resolves all supported targets to `MonthlyFeeLine` IDs.
  - Collects each class line through `collectFeeLine`.
  - Prevents creating receipt lines with `monthlyFeeLineId: null`.
- `frontend/src/pages/FeeCollectionPage.jsx`
  - Normalizes only `line_id` rows as collectable.
  - Sends only `line_ids` to `bulkPay`.
  - Shows row action only for collectable line rows.
  - Displays class name in the payment confirmation modal.
- `frontend/src/components/ui/DataTable.jsx`
  - Adds `isRowSelectable`.
  - Select-all and row checkboxes ignore/disable non-collectable rows.
- `tests/tuition.test.ts`
  - Adds a mocked API test proving one multi-class student returns one collectable Fee Workbench row per class.
- `tests/production-contracts.test.ts`
  - Locks the read-only workbench contract and line-ledger bulk-pay linkage.
- `frontend/e2e/fee-workbench-line-split.spec.js`
  - Adds Chromium regression coverage that visible Fee Workbench rows contain at most one class chip/name.

## Local Verification
- `npx tsc --noEmit` passed.
- `npm run test:unit` passed: 46/46.
- `npm --prefix frontend run lint -- --max-warnings=0` passed.
- `npm run build` passed.
- Local API smoke against `http://127.0.0.1:3000`:
  - `local_workbench_ms=577`
  - `rows=41`
  - `bad_multi_class_rows=0`
  - `payable_without_line=0`
  - `total_amount=17041866`
- Local Chromium/Playwright:
  - `npm --prefix frontend run test:e2e -- fee-workbench-line-split.spec.js` passed 1/1.

## Production Deployment
- Command: `npx vercel deploy --prod --yes`.
- Deployment ID: `dpl_AnCEyFGkpmZohfsrA8d95JmsuMoU`.
- Deployment URL: `https://edu-manager-7p9kui0zl-hts2008s-projects.vercel.app`.
- Canonical alias: `https://edu-manager-gules.vercel.app`.
- Ready state: `READY`.

## Production Verification
- Production API smoke against `https://edu-manager-gules.vercel.app`:
  - `prod_workbench_ms=6170`
  - `rows=41`
  - `bad_multi_class_rows=0`
  - `payable_without_line=0`
  - `total_amount=17041866`
- Production Chromium/Playwright:
  - `E2E_BASE_URL=https://edu-manager-gules.vercel.app npm --prefix frontend run test:e2e -- fee-workbench-line-split.spec.js` passed 1/1.

## Team / Tooling Notes
- Used `ck:team` with two bounded explorer subagents.
- Frontend explorer found the row-selection gap; the lead integrated `isRowSelectable` into the shared DataTable and Fee Workbench.
- Backend explorer did not return before closeout and was shut down to save resources; direct local/static/production gates covered the backend risk.

## Residual Risk
- Historical paid aggregate monthly fees without `MonthlyFeeLine` are displayed as estimated per-class splits with `needs_admin_review=true`; they are intentionally not collectable until recalculated/corrected.
- Production serverless and Neon latency can still make first-touch API calls slower than local. The current workbench call no longer times out.

## Operator Rule
- Do not collect multi-class tuition through a hidden student-month aggregate. Use one Fee Workbench row per class line.
