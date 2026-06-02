# No-Blocking Flows + Line Fee Ledger Closeout - 2026-06-02

## Scope
- Closed the latest reported production defects around attendance make-up days, cross-month attendance weeks, class bulk student loading, per-class tuition collection, receipt print/PDF, finance reports, and Template Designer interactions.
- Changed tuition collection from a student/month aggregate-only model to a class-level line ledger so one student enrolled in multiple classes can be collected, tracked, reported, and printed per class.
- Deployed the fixes to production and verified the live alias with Chrome/Playwright.

## RCA Summary
- Attendance fixed-weekday logic was too rigid for make-up classes and did not consistently persist off-schedule days as make-up sessions.
- Cross-month week saves could touch dates in two months while only one attendance period was checked.
- Class edit modal could stay in a student-list loading state because the loader depended on changing selection state.
- Fee Workbench aggregated monthly fees per student, which hid class-level payment state and made multi-class students hard to operate.
- Receipt print could silently fail because the popup shell closed or stayed blank if authenticated PDF fetching had any delay/error.
- Reports were too high-level for finance operations because outstanding data was not line-level.
- Template Designer had visible controls but the canvas/object interaction state was not reliably initialized or testable.

## Code Changes
- `prisma/schema.prisma`
  - Added `MonthlyFeeLine` and `ReceiptLine`.
  - Linked line items to `Student`, `Class`, `MonthlyFee`, and `Receipt`.
- `lib/monthly-fee-lines.ts`
  - Added line sync, DTO mapping, aggregate refresh, and receipt-line data helpers.
- `server/api/monthly-fees/calculate.ts`
  - Calculates and persists per-class monthly fee lines, including make-up and extra-session metadata.
- `server/api/monthly-fees/workbench.ts`
  - Returns row-level class fee data and class-filtered pending placeholders.
- `server/api/monthly-fees/bulk-pay.ts`
  - Accepts `line_ids` and creates one receipt plus one receipt line per selected class fee line.
- `server/api/receipts/index.ts`, `server/api/receipts/[id]/pdf.ts`, `lib/pdf.ts`
  - Expose receipt lines and generate a production-safe default PDF layout with line-item tables.
- `frontend/src/pages/FeeCollectionPage.jsx`, `frontend/src/utils/pdfPrint.js`
  - Collects per class line, keeps a printable receipt queue, and opens authenticated PDFs with an explicit popup status/error shell.
- `server/api/reports/finance-dashboard.ts`, `frontend/src/pages/ReportsPage.jsx`, `api/router.ts`, `frontend/src/services/api.js`
  - Adds finance dashboard data with receipts, payments, category summary, outstanding-by-class, and report UI.
- `frontend/src/pages/AttendancePage.jsx`, `server/api/attendance/index.ts`, `server/api/attendance/bulk.ts`, `lib/tuition.ts`, `tests/tuition.test.ts`
  - Adds make-up session semantics, cross-month period checks, and tuition policy regression coverage.
- `frontend/src/pages/ClassesPage.jsx`
  - Fixes bulk student loader deadlock in create/edit class modal.
- `frontend/src/pages/TemplateDesignerPage.jsx`, `frontend/e2e/template-designer-hardening.spec.js`
  - Hardens canvas readiness, object add/select/save/reload, upload states, and designer regression coverage.
- `.gitignore`, `.vercelignore`
  - Ignores frontend Playwright result folders so local evidence artifacts are not packaged into Vercel deploys.

## Database / Deployment Notes
- `npx prisma db push` synced the additive line-ledger schema to the approved Neon production database.
- `npx prisma generate` passed after stopping the local smoke server that held the Windows Prisma query-engine DLL.
- No seed was run.
- Vercel production deploy command: `npx vercel deploy --prod --yes`.
- Final production deployment ID: `dpl_JCDmyuFBV7yQ2zEYHu5bLyyvF4kJ`.
- Production URL: `https://edu-manager-gules.vercel.app`.
- Vercel inspect status: Ready.

## Local Verification
- `npx prisma generate` passed.
- `npx tsc --noEmit` passed.
- `npm run test:unit` passed: 44/44.
- `npm --prefix frontend run lint -- --max-warnings=0` passed.
- `npm --prefix frontend run build` passed.
- `npm run build` passed.
- `git diff --check` passed with LF/CRLF warnings only.
- Local API probe after schema sync: `/api/receipts` returned 200.
- Local Chrome/Playwright:
  - `template-designer-hardening.spec.js ux-redesign-smoke.spec.js` passed: 12/12.
  - `phase-b-smoke.spec.js` passed: 17/17.

## Production Verification
- First production Playwright attempt used the wrong env key (`PLAYWRIGHT_BASE_URL`) and still targeted `127.0.0.1:3000`; this was a test-command issue, not a production failure.
- Correct production command used `E2E_BASE_URL=https://edu-manager-gules.vercel.app`.
- Production Chrome/Playwright passed: 29/29.
  - Template Designer hardening: 1/1.
  - UX/menu/modal/calendar/template/PDF smoke: 12/12.
  - Phase-B protected route/API smoke: 17/17.
- The suite confirmed the live receipt PDF endpoint returns a real PDF payload.

## Team / Tooling Notes
- Used `ck:team`-style bounded subagents for attendance/dataflow, reports, and Template Designer slices; integrated and reverified their work locally.
- A final release-readiness explorer was spawned for independent review, but did not return before closeout; the lead continued because local and production gates were complete.
- Context+/Neural Memory MCP tools were not exposed in this Codex tool palette, so workspace write-back was completed through markdown files and receipts.

## Residual Risk
- Production cold-start and Neon latency remain possible on first-touch serverless routes, but the current production Playwright suite passed.
- `admin / admin123` remains a production credential risk and must be rotated before real operation.
- SMS/Zalo sending remains intentionally disabled until a provider, opt-in policy, and approved templates are configured.

## Operator Rules
- Do not collect tuition as a hidden aggregate when a student has multiple classes; use the per-class line rows in Fee Workbench.
- Use make-up session markings for off-schedule attendance days instead of changing the class base schedule every time.
- For historical anomalous paid receipts, continue using the explicit admin correction workflow; do not bulk rewrite records.
