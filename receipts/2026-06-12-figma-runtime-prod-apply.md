# 2026-06-12 - Figma Runtime PROD Apply

## Scope
- Applied the accepted Figma source-of-truth direction to the runtime React/Tailwind UI and deployed it to production.
- Figma source nodes referenced: `49:436`, `49:438`, `49:440`, `49:442`, `49:444`, desktop frame `49:447`, mobile frame `49:472`.
- Production alias: `https://edu-manager-gules.vercel.app`.

## Runtime Changes
- Added shared EduFlow/Figma runtime tokens for canvas, card, border, primary, primary-soft, warning-soft, radius, and panel/card shadows.
- Updated shell surfaces: app canvas, main layout, header, sidebar, page intro panels, table shells, metric cards, and loading scenes.
- Updated high-visibility pages to the Figma light operations-console direction:
  - Dashboard
  - Fee Workbench / Thu tien hoc phi
  - Reports / Trung tam phan tich
- Hardened Fee Workbench bulk actions during QA:
  - Pending/current rows can be selected for bulk calculate.
  - Collectable rows remain separate from calculable rows.
  - Bulk calculate and bulk pay use `try/catch/finally` so `processing` cannot stay stuck after a thrown API/helper error.
- Hardened `DataTable` search so `getSearchText` returning `null` or `undefined` cannot crash shared tables.

## Files Touched In This Pass
- `frontend/src/design/tokens.js`
- `frontend/src/index.css`
- `frontend/src/components/layout/MainLayout.jsx`
- `frontend/src/components/layout/Header.jsx`
- `frontend/src/components/layout/Sidebar.jsx`
- `frontend/src/components/ui/OperationalPage.jsx`
- `frontend/src/components/ui/DataTable.jsx`
- `frontend/src/components/ui/LoadingStates.jsx`
- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/pages/FeeCollectionPage.jsx`
- `frontend/src/pages/ReportsPage.jsx`

## Verification
- `npm --prefix frontend run lint -- --max-warnings=0` passed.
- `npx tsc --noEmit` passed.
- `git diff --check` passed with existing CRLF warnings only.
- `npm run test:unit` passed 61/61.
- `npm run build` passed after stopping the local smoke server that held the Prisma Windows DLL.
- Local Playwright passed 6/6:
  - `responsive-accessibility-phase7.spec.js`
  - `template-designer-hardening.spec.js`
  - `report-bi.spec.js`
- Local UX baseline passed across all configured routes/viewports/reduced-motion:
  - `docs/artifacts/ux-baseline/figma-runtime-local/2026-06-11T17-16-05-725Z/`
- Local perf lab passed:
  - `receipts/perf/perf-lab-2026-06-11T17-29-41-163Z.md`
- Production deploy succeeded:
  - Deployment URL: `https://edu-manager-p01b3s0mp-hts2008s-projects.vercel.app`
  - Inspect URL: `https://vercel.com/hts2008s-projects/edu-manager/4LemiLebU9nYNmDq6YAmdUyGiQn4`
  - Deployment ID: `dpl_4LemiLebU9nYNmDq6YAmdUyGiQn4`
  - Alias: `https://edu-manager-gules.vercel.app`
  - Status: Ready
- Production Playwright passed 6/6.
- Production UX baseline passed across all configured routes/viewports/reduced-motion:
  - `docs/artifacts/ux-baseline/figma-runtime-production/2026-06-11T17-33-27-461Z/`
- Production perf lab passed:
  - `receipts/perf/perf-lab-2026-06-11T17-43-43-495Z.md`

## Residual Risk
- Production serverless/DB latency is still visible. Perf lab passed, but sampled slow endpoints include:
  - `/api/monthly-fees/workbench?month=2026-06&limit=500`: 4638.6ms
  - `/api/reports/dashboard`: 3721.4ms
  - `/api/reports/bi?from=2026-01&to=2026-06&page=1&page_size=50`: 3239.3ms
- This pass did not run schema migration, seed, or production data mutation.
