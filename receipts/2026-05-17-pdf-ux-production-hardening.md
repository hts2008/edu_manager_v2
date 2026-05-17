# 2026-05-17 - PDF + UX Production Hardening

## Scope
- Fix receipt/payment PDF rendering for Vietnamese text.
- Harden frontend print flow so API errors are not opened as fake PDF blobs.
- Redesign the navigation shell into main/secondary menu groups.
- Sync a reviewable Figma source-of-truth frame for the production UX direction.
- Keep real SMS/Zalo delivery disabled until provider, opt-in policy, and approved templates are configured.

## Hypothesis Testing
- **H-PDF-01**: The garbled Vietnamese PDF was caused by pdfmake using core Helvetica fonts without embedded Unicode cmap/ToUnicode data. Evidence before fix: generated PDF used Helvetica and did not include `/ToUnicode`; user screenshot showed broken Vietnamese glyphs. Fix: embed pdfmake Roboto VFS fonts in both Vercel and Express PDF services. Result: unit PDF now contains `/ToUnicode`, contains `Roboto`, and does not contain `Helvetica`.
- **H-PDF-02**: The local/reference Express PDF endpoint had additional pdfmake 0.3 runtime incompatibilities. Evidence: E2E first failed with `PdfPrinter is not a constructor`, then `pdfDoc.on is not a function`. Fix: resolve `pdfmake/js/Printer.js` constructor and await `createPdfKitDocument`. Result: local E2E PDF endpoint returns `%PDF` with payload greater than 10KB.
- **H-UX-01**: The flat sidebar caused navigation friction as the product surface expanded. Evidence: current menu screenshot showed a long ungrouped list. Fix: grouped sidebar into `Menu chính` and `Menu phụ`, with collapsible sections for `Vận hành`, `Tài chính`, `Báo cáo`, and `Quản trị`.

## Sequential Review
1. Traced print dataflow: UI print button -> `/api/receipts/:id/pdf` or `/api/payments/:id/pdf` -> PDF generator -> browser blob preview.
2. Fixed server-side PDF font embedding before changing UI flow.
3. Added a shared frontend PDF opener that opens a print tab immediately, checks `response.ok`, verifies `application/pdf`, closes on error, and revokes object URLs.
4. Reworked shell UX around an operational SaaS pattern: light workspace, grouped navigation, sticky header context, dense tables, restrained cards.
5. Verified with unit, type, lint, build, and full local Chrome-channel Playwright E2E.

## Stitch / Figma
- Stitch project created: `projects/12785236930566023458`.
- Stitch design screen uploaded from `DESIGN.md`: `11130771813747459123`.
- Stitch variant/design-system calls returned `invalid argument`; implementation continued from the accepted direction and runtime evidence.
- Figma file used: `EDUMANAGER` (`ZYAaYcKXq9LAYFOgCPJLZq`).
- Figma page created: `EDU_MANAGER_V2 Production UX`.
- Figma nodes: tokens `3:3`, desktop shell `3:36`, mobile drawer `3:142`.
- Figma design context was inspected for node `3:36` after creation.

## Verification
- `npm run test:unit` passed: 20 tests, 0 failures.
- `npx tsc --noEmit` passed.
- `cd frontend && npm run lint -- --max-warnings=0` passed.
- `npm run build` passed; existing Vite chunk-size/dynamic-import warnings remain.
- `cd frontend && npm run test:e2e -- e2e/ux-redesign-smoke.spec.js --reporter=list` passed: 3/3.
- `cd frontend && npm run test:e2e -- --reporter=list` passed: 20/20.
- Production PDF smoke on `https://edu-manager-delta.vercel.app` passed after commit `f544464` deployed: receipt PDF returned 200, `application/pdf`, 16871 bytes, starts with `%PDF`, includes `/ToUnicode`, includes `Roboto`, and does not include `Helvetica`.
- Production Chrome-channel UI smoke for `/receipts` passed: desktop and mobile grouped menu render, horizontal overflow is 0, and API failure list is empty.
- Screenshots captured:
  - `frontend/output/playwright/ux-redesign-desktop.png`
  - `frontend/output/playwright/ux-redesign-mobile.png`
  - `frontend/output/playwright/dashboard-desktop.png`
  - `frontend/output/playwright/prod-ux-receipts-desktop.png`
  - `frontend/output/playwright/prod-ux-receipts-mobile.png`

## Files
- `lib/pdf.ts`
- `backend/src/services/pdfService.js`
- `tests/pdf.test.ts`
- `package.json`
- `frontend/src/utils/pdfPrint.js`
- `frontend/src/pages/ReceiptsPage.jsx`
- `frontend/src/pages/HistoryPage.jsx`
- `frontend/src/pages/FeeCollectionPage.jsx`
- `frontend/src/components/layout/Sidebar.jsx`
- `frontend/src/components/layout/Header.jsx`
- `frontend/src/components/layout/MainLayout.jsx`
- `frontend/src/components/ui/DataTable.jsx`
- `frontend/src/index.css`
- `frontend/e2e/ux-redesign-smoke.spec.js`

## Remaining Operational Notes
- `REMINDER_SEND_ENABLED` must stay false until a real SMS/Zalo provider, opt-in policy, rate controls, and approved templates are configured.
- Existing broader workspace drift remains outside this task and must not be staged with this patch.
