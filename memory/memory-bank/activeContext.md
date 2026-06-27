# Active Context

> Current technical state of EDU_MANAGER_V2. Restored 2026-04-25 after memory cross-contamination cleanup. Updated 2026-05-14 after agency PRD assessment and workspace scope/path cleanup.

## Project State
- **Product**: Edu Manager V2 — Vietnamese education center management system for classes, students, parents, teachers, attendance, monthly fees, receipts, payments, reports, and printable templates.
- **Status**: PRODUCTION LIVE. Phase A API parity passed on production for existing UI flows; Phase B reliability/security baseline is implemented; Phase C C1-C12 product slices are implemented and production-smoked.
- **Production URL**: https://edu-manager-gules.vercel.app
- **Login**: `admin / admin123`
- **Repository**: https://github.com/hts2008/edu_manager_v2
- **Latest production deployment observed in Codex session**: Vercel inspect URL `https://vercel.com/hts2008s-projects/edu-manager/4LemiLebU9nYNmDq6YAmdUyGiQn4`; production URL `https://edu-manager-p01b3s0mp-hts2008s-projects.vercel.app`, aliased to `https://edu-manager-gules.vercel.app`, after the 2026-06-12 Figma runtime UX/UI apply.
- **Commit hygiene**: Avoid broad commits; stage explicit paths only and verify `git status` before each closeout.

## Phase A Production Closeout (2026-05-15)
- **Production target**: Vercel alias `https://edu-manager-delta.vercel.app` on commit `cd77f48`, ready state `READY`.
- **Database/storage**: Neon project `dry-dew-91484915` is the approved Postgres target. Vercel Blob store `edu-manager-blob` replaces Supabase Storage for template image uploads.
- **Schema/data**: `prisma db push` and `npm run db:seed` completed against Neon. No Prisma migration deploy was run because repo has no `prisma/migrations` history.
- **Serverless routing**: Vercel function-count failure was fixed by moving handlers to `server/api/*` and routing `/api/:path*` through one `api/router.ts` function.
- **API smoke**: Auth/RBAC/change-password/logout, attendance fee, monthly-fees calculate/confirm/pay, receipt/payment PDFs, templates CRUD/default/upload, financial report, and unpaid-students report pass on production.
- **Chrome UI smoke**: `/receipts`, `/fee-collection`, `/payments`, `/templates`, `/reports`, `/history`, `/attendance`, `/attendance-periods` have no failed fetch requests.
- **Parity/contract**: `scripts/parity-test.mjs` passed 7/7 against local Express reference and production Vercel target.

## Production Deploy / Env Closeout (2026-05-23)
- **Canonical production target**: `https://edu-manager-gules.vercel.app` in Vercel project `hts2008s-projects/edu-manager`.
- **Drift finding**: `https://edu-manager-delta.vercel.app` is not the current project alias and was stale/outside the active deploy target; do not use it as production truth unless reattached in Vercel.
- **Runtime env restored**: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `BLOB_READ_WRITE_TOKEN`, and `CRON_SECRET` exist as encrypted Production env vars in Vercel.
- **Storage**: Vercel Blob store `edu-manager-live-blob` (`store_UOmPDaMiPE4RpzcX`) is linked to the project for Production; template upload-image smoke returned 201 with a public Blob URL.
- **Packaging fix**: added `.vercelignore` with root-only operational ignores. The first unanchored `receipts/` and `reports/` patterns excluded `server/api/receipts` and `server/api/reports`; fixed before final deploy.
- **Production evidence**: latest deploy `dpl_8vQ9fWhfVJh1AAfKjzUr8mpNHH4o` is Ready; login 200, no-token auth 401, cron no-token 403, upload-image 201, dashboard/student-fees/receipt PDF smoke pass, production Playwright UX smoke 6/6.
- **Dependency audit**: frontend `ws` advisory closed via transitive lock update; root audit high gate and frontend full audit pass.

## Main Merge + Production Deploy (2026-05-24)
- **Source-of-truth sync**: branch `codex/edu-production-readiness` was fast-forwarded into `main`; `origin/main` now points to `e4bab40`.
- **Deployment**: Vercel CLI production deploy created `dpl_8vQ9fWhfVJh1AAfKjzUr8mpNHH4o`; `https://edu-manager-gules.vercel.app` aliases to this Ready deployment.
- **Verification**: root 200, no-token `/api/auth/me` 401, no-token cron 403, login 200, dashboard contract fields present, student-fees report 200, receipt PDF 200 `application/pdf` with `%PDF`, template upload-image 201 with Blob URL, and production Playwright 6/6 passed.
- **Build note**: Vercel build passed with existing chunk/dynamic import warnings and Node engine warning for `"node": ">=20"`; pin Node major separately if runtime drift needs tighter control.

## Operational Hygiene Closeout (2026-05-24)
- **Next unchecked item closed**: post-deploy dirty-tree hygiene replaced the stale "before Phase B" wording in `current-session.md`.
- **Agent review**: Codex sidecar explorer agents classified the tree into app/product changes, temp/generated artifacts, local config risk, and docs/memory/evidence drift.
- **Cleanup applied**: removed 9 untracked one-off `frontend/update*` rewrite scripts after no-reference scan and workspace path verification.
- **Local config risk removed**: `.codex/config.toml` was restored to tracked safe policy; the earlier `approval_policy=never` and `sandbox_mode=danger-full-access` drift is not part of the working tree.
- **Ignore policy**: `.gitignore` now ignores generated Playwright output, one-off update scripts, and local Codex backup files. `.vercelignore` remains intentional because it protects Vercel packaging.
- **Commit hygiene decision**: keep product/app changes and docs/memory/evidence in separate explicit batches; do not broad-stage or mix framework/doctrine drift with app code.
- **Verification**: `git diff --check`, `npx tsc --noEmit`, `npm run test:unit` 28/28, frontend lint, `npm run build`, root/frontend audits, and production Playwright 6/6 all passed after cleanup.

## Current Sprint Focus
0. **Attendance/Delete/Daily Progress Hotfix (IMPLEMENTED locally 2026-06-25)** - Latest operator-reported issues were fixed locally: attendance calendar row click now uses the exact visible CN-T7 row; attendance lock syncs class-level `MonthlyFeeLine` rows so locked tuition no longer reads as `0d`; Attendance class dropdown shows explicit loading/disabled feedback; class/teacher/parent delete paths now archive instead of hard-blocking on linked records; student-progress report exposes attendance dates and the input panel can create per-attendance-day daily entries. Evidence: `receipts/2026-06-25-attendance-delete-daily-progress-hotfix.md`. Verification: frontend lint, focused regression 7/7, typecheck, full unit 85/85, build, and local Chrome smoke. No production deploy was run in this turn.
0. **Working tree hygiene closeout (IMPLEMENTED)** - Remaining UX/report/template drift has been classified into intentional source/docs/evidence versus generated browser traces. The large browser-evidence directories `docs/artifacts/ux-baseline/` and `docs/artifacts/playwright/` are now ignored locally, while source, tests, receipts, plans, and compact screenshots remain tracked for explicit commit/push. Student Monthly Progress Parent Report remains implemented and production-smoked.
0. **Student Monthly Progress Parent Report (IMPLEMENTED + PROD 2026-06-12)** - Added `/api/reports/student-progress` and `/student-progress` for parent-facing monthly student progress reporting. Phase 1 is evidence-first: it uses real student-class-month operational data (attendance, class, tuition/fee state), maps English class names to Cambridge tracks where possible (Pre A1 Starters, A1 Movers, A2 Flyers, A2 Key/KET, B1 Preliminary/PET), computes an operational progress/readiness proxy, and explicitly marks academic skill scores as missing input instead of fabricating Listening/Reading-Writing/Speaking/Vocabulary-Grammar results. Plan: `plans/2026-06-12-student-progress-parent-report/plan.md`. Production: Vercel deployment `dpl_5NZEpgh9xKWqCyp99rt5GxWTLoYs`, aliased to `https://edu-manager-gules.vercel.app`. Evidence: `receipts/2026-06-12-student-progress-parent-report.md`; screenshots `receipts/artifacts/student-progress-local-smoke.png` and `receipts/artifacts/student-progress-production-smoke.png`. Verification: focused unit 4/4, typecheck, frontend lint, full unit 65/65, build, feature diff-check, local Playwright route/API smoke, and production Playwright route/API smoke.
0. **EduFlow Motion UX/UI Production Track (IMPLEMENTED)** - Platform-wide UX track documented at `plans/2026-06-09-eduflow-motion-ux-stitch-figma/plan.md`. Phase 0 production browser baseline is implemented, Phase 1 Stitch concept set was generated with `GEMINI_3_1_PRO` and accepted at 95/100, Phase 2 Figma source-of-truth is implemented, and Phases 3-8 code/deploy/browser verification are implemented. Figma Desktop/Computer Use created nodes `31:2`, `35:128`, coarse component definition `37:415`, token-bound native component probe `47:421`, and the final plugin-authored native source nodes `49:436`, `49:438`, `49:440`, `49:442`, `49:444`, desktop frame `49:447`, and mobile frame `49:472`. The accepted Figma direction was applied to runtime React/Tailwind and deployed to production on 2026-06-12 as `dpl_4LemiLebU9nYNmDq6YAmdUyGiQn4`.
   - **2026-06-11 final Figma source closeout**: the local plugin `tools/figma-eduflow-source-plugin` was imported/run from Figma Desktop Quick Actions after RCA found the Figma window was on an offscreen monitor (`x=-2060`). Figma MCP verified variable bindings for `49:447`, `49:436`, and `49:444`; `get_design_context` succeeded for `49:447`, `49:436`, and `49:472`; screenshots rendered for `49:447` and `49:472`; `get_metadata(49:447)` confirmed component instances inside the desktop frame. Final design acceptance and implementation/deploy mapping are recorded in `receipts/2026-06-11-uxm02-figma-source-final-closeout.md`. No new PROD deploy was run because the final pass changed only Figma/project-control evidence, not runtime app code.
   - **2026-06-12 Figma runtime PROD apply**: the accepted Figma nodes were mapped into `frontend/src/design/tokens.js`, `frontend/src/index.css`, shell/layout primitives, `OperationalPage`, `DataTable`, `LoadingStates`, Dashboard, Fee Workbench, and Reports. QA also hardened Fee Workbench bulk calculate/pay state and DataTable null search. Gates passed: lint, typecheck, unit 61/61, build, local Playwright 6/6, local UX baseline, local perf-lab, production Playwright 6/6, production UX baseline 150/150, production perf-lab. Evidence: `receipts/2026-06-12-figma-runtime-prod-apply.md`.
1. **Report BI Tab-Mode + Dashboard Patch** - `/reports` now sends server-side `mode=overview|attendance|tuition|risk`, filters before pagination, keeps stable `meta.classes`, and renders a richer BA/PI dashboard with funnel, attendance distribution, risk mix, action list, and risk heatmap panels. Production smoke on 2026-06-09 confirmed mode totals (`overview=118`, `attendance=111`, `tuition=118`, `risk=114` current rows), 5 chart panels, no horizontal overflow, and no console errors. The base Report Intelligence Center remains a student-class-month report center with admin-only `/api/reports/bi`, server-side search, CSV export, drilldown, loading/error states, inactive historical enrollment evidence handling, and aggregate multi-class fee safeguards.
2. **Template Designer Paper Size + Canvas Alignment Fix** - Template Designer now supports A4/A5/A6/custom paper dimensions from the designer itself. Effective paper metadata is stored in `json_config.paper`/`json_config.canvas` so custom sizes do not require a Prisma enum migration; existing Fabric objects are scaled/fitted when paper changes, PDF generation honors the JSON paper metadata, and production Chrome smoke passed on 2026-06-06 without saving/mutating the production template.
3. **Template Designer Visible Render + Upload Fix** - Template Designer now visibly renders newly added Text/Field/Rect/image/background objects. RCA found Fabric copied `bg-white` from the source canvas to the generated `upper-canvas`, visually covering the lower render canvas. The source canvas no longer carries `bg-white`, canvas controls are disabled until ready, background uploads fit the page with stronger opacity, and production Chrome smoke passed on 2026-06-05.
4. **Template Designer Legacy Canvas Fix** - default receipt templates with legacy `{ elements: [] }` config no longer keep the designer stuck at `Dang khoi tao canvas...`; the canvas scaffolds safely, tools work, save is enabled, and production smoke passed on 2026-06-04.
5. **Fee Workbench Class-Line Split Patch** - multi-class students now render and collect as one Fee Workbench row per class line; aggregate legacy rows are not collectable. Deployed and production-smoked on 2026-06-03.
6. **Financial Correction Policy Closeout** - explicit admin correction is implemented for historical paid receipt/monthly-fee anomalies (`days_count=0` with non-zero amount); Reports/Receipts surface anomaly metadata and Fee Workbench blocks unsafe collection rows. Deployed and production-smoked on 2026-06-01.
7. **Performance Lag RCA Closeout** - latest pass reduced large motion/blur surfaces, made table/search/loading states lighter, guarded Fee Workbench and Attendance stale async responses, parallelized Attendance month fetches, narrowed report selects, added read-only `perf-lab`, and passed local + production browser/API smoke on 2026-05-28.
8. **Performance Route-Loading Closeout** - route-level lazy loading, vendor chunks, lighter page transitions, GET cache/dedupe, DB-backed `/auth/me` reuse, slim student options, Fee Workbench aggregate read endpoint, Prisma indexes, and local/production Chrome perf smoke are implemented and deployed.
9. **Month-Bounded Tuition + EduFlow UI Closeout** - May 2026 session counts are now bounded inside the month (`2/week=10`, `3/week=14`), receipt creation uses MonthlyFee truth, admin routes are guarded, the dark dashboard drift was replaced with a coherent light EduFlow operations console, and local + production Playwright UX/Phase-B smokes pass.
10. **Production Readiness Hardening** - dashboard API/UI contract, DB-backed auth for core handlers, attendance lock enforcement, fee ledger idempotency, shared UX primitives, and local smoke server are implemented and locally smoked.
11. **Phase B Closeout** - observability/security hardening is implemented and production-smoked; credential rotation remains an operational follow-up.
12. **Phase C Product Slices** - C1-C12 are implemented and production-smoked on Google Chrome/Playwright after deploy.
13. **Operational Hygiene** - B2B-005/B2B-008 final verification is implemented with markdown-only fallback because C+/NM tools were unavailable; 2026-05-24 post-deploy dirty-tree hygiene is closed and recorded.
14. **Product Expansion** - future Phase D/product growth should be planned separately after real operational traction.

## Verified Architecture
- **Frontend**: Vite + React + Tailwind CSS v4. Code truth from `frontend/package.json` currently shows React 19.2.0 and Vite 7.2.4; older docs may still mention stale React versions.
- **Backend Production**: Vercel Serverless TypeScript router `api/router.ts` dispatching to handlers under `server/api/*`.
- **Backend Local/Reference**: Express + SQLite under `backend/`; use as reference logic only, not production truth.
- **ORM**: Prisma ORM.
- **Database**: Neon Postgres production database for Phase A.
- **Deployment**: Vercel production deployment with Neon connection pooling and Vercel Blob.
- **Build Requirement**: Vercel build must run `npx prisma generate` before frontend build.

## Agency PRD Findings (2026-05-06)
- Agency PRD files state that the old "100% complete" claim is inaccurate for production.
- Existing Vercel API modules are only: auth login/me, students, parents, teachers, classes, attendance, attendance bulk/month, attendance-periods, reports dashboard.
- Missing production API modules: auth logout, auth change-password, attendance calculate-fee, monthly-fees, receipts, payments, templates, reports financial, reports unpaid-students.
- Strategic decision for recovery: **Option A — Port Express → Vercel TS + Prisma**.
- Phase A objective: every existing frontend page must stop producing 404 / Network error on production.

## Workspace Scope Cleanup (2026-05-14)
- Canonical workspace path: `C:\Users\haitr\OneDrive\0. GAU DATA\0.APP\EDU_MANAGER_V2`.
- EDU_MANAGER_V2 is the only active project scope for this workspace.
- Removed project-specific external workspace names and hard-coded out-of-scope paths from workflow, doctrine, memory/session, and skill files.
- Verification scan found no remaining known external workspace markers or hard-coded out-of-scope paths in workspace text files.

## Critical Project Patterns
- **Snake-Sync Protocol**: Backend/Prisma uses camelCase while frontend expects snake_case. API handlers must map responses manually to snake_case where legacy UI components require it.
- **Prisma Client Singleton**: `lib/prisma.ts` singleton is required for serverless connection stability.
- **Tri-State Sync**: Use Identify → Reactivate → Insulate for soft-deleted records to avoid Prisma P2002 unique conflicts.
- **Bulk Aggregation**: Prefer in-memory `Map` aggregation for attendance/reporting windows instead of complex joins in serverless paths.
- **Parametric Branching**: Prefer root routes with `?action=X` where possible to avoid serverless dynamic route shadowing.
- **Response Envelope**: Prefer `{ success: boolean, data?: ..., error?: { code, message, details? } }` for new Vercel API work.
- **Phase A Upload Rule**: Prefer base64 JSON image upload for template images over multipart/multer because Vercel serverless FS/multipart handling is risky.

## Important Features Already Implemented
- Integrated billing-aware Holiday (`Ngày lễ`) attendance status.
- Visual attendance calendar markers.
- Attendance Review workflow with preview/reject/approve lifecycle.
- Production login recovery and Prisma client/database desync resolution.
- Template Designer and template management flows.
- Attendance periods serverless migration.

## Known Risks / Gotchas
- **Memory Cross-Contamination**: Active files must not retain project-specific external workspace names; any remaining references are cleanup defects to remove, not project truth.
- **Neural Memory Routing**: Always access Neural Memory for EDU_MANAGER_V2 through MCPProxy server `neural-memory-default`, visible at `http://127.0.0.1:8080/ui/servers/neural-memory-default`; within that server, use the existing `edu_manager` brain that contains the correct prior brain and memory history.
- **Neural Memory Status**: `edu_manager` is the authoritative brain for this workspace. Do not route EDU_MANAGER_V2 work to any other brain.
- **Operational Drift**: `KANBAN.md`, `current-session.md`, and git status still need cleanup/alignment so future commits do not mix framework drift with product work.
- **Git Hygiene**: Current dirty state contains intentional app/product hardening plus docs/memory/evidence changes. Commit only explicit, reviewed batches; do not mix `.codex` local config or temp scripts into product commits.
- **Windows Shell**: If PowerShell execution policy blocks scripts, run build commands via `cmd /c`.
- **Serverless Routing**: Dynamic folders like `[id]` can shadow each other; prefer query-param actions for ambiguous operations.
- **Dual-Brain Tooling Degradation (Codex session 2026-05-16)**: MCP tool discovery did not expose MCPProxy/Neural Memory or Context+ tools in this Codex turn. Work proceeded in markdown-only/manual mode; do not treat NM/C+ write-back as completed for this task.
- **Phase A Acceptance Boundary**: A1-A16 are implemented with production smoke evidence as of 2026-05-15. Phase B now has CI, unit, E2E smoke, validation, dependency audit, React Hook Form, and observability/security baselines.
- **Default Credentials Risk**: `admin / admin123` is useful for dev/smoke, but production operation must rotate credentials and JWT secret.
- **Docs Drift**: README and old memory may mention stale React versions, Express/SQLite as primary, or 100% completion. Prefer current package/code + agency PRD + KANBAN updates.

## Files Touched This Session
- `lib/auth.ts`, `lib/api-utils.ts`, `lib/pdf.ts`, `lib/storage.ts`
- `api/auth/*`, `api/attendance/calculate-fee.ts`, `api/monthly-fees/*`, `api/receipts/*`, `api/payments/*`, `api/templates/*`, `api/reports/*`
- `frontend/src/services/api.js`, `frontend/eslint.config.js`, and lint-only frontend cleanup files
- `package.json`, `package-lock.json`, `.env.example`, `prisma/seed.ts`, `scripts/parity-test.mjs`
- `api/router.ts`, `lib/observability.ts`, `tests/observability.test.ts`
- `KANBAN.md`, `memory/memory-bank/activeContext.md`, `memory/memory-bank/progress.md`, `memory/memory-bank/decisionLog.md`, `memory/sessions/current-session.md`
- `receipts/2026-05-14-phase-a-api-parity-static.md`
- `receipts/2026-05-14-phase-a-closeout-attempt.md`

## 2026-06-09 Active Context - EduFlow Motion Phase 4 Dashboard/Login/Modal

- **Scope**: Continue approved EduFlow Motion UX/UI Phase 4 after the shell/master-data slice.
- **Implemented locally**:
  - `LoginPage.jsx` rebuilt as a production-style EduFlow operational login screen with action progress and no visible demo credential block.
  - `DashboardPage.jsx` now surfaces partial detail-load failure through a retryable warning banner instead of silently swallowing errors.
  - `Modal.jsx` now supports opt-in unsaved-change protection, form snapshot tracking, guarded child cancel buttons, keyboard focus loop, close guard, and focus restoration.
  - Students, Parents, Classes, and Teachers long edit forms now use `confirmOnClose` and sticky action footers.
- **Evidence**:
  - `receipts/2026-06-09-eduflow-motion-phase4-dashboard-login-modal.md`
  - `docs/artifacts/ux-baseline/local-phase4-dashboard-login-modal-guarded/2026-06-09T16-57-29-699Z/`
  - `docs/artifacts/ux-baseline/local-phase4-dashboard-login-modal-guarded-reduced/2026-06-09T16-58-10-058Z/`
  - `docs/artifacts/playwright/modal-guard-phase4/`
- **Verification**: lint zero warnings, `npx tsc --noEmit`, unit 61/61, build, targeted local `modal-guard.spec.js` 3/3, local browser baseline 12/12, local reduced-motion baseline 24/24, local mobile drawer/back-forward pass, Vercel deploy `dpl_9qWTHirrZpVktfNh5W3wcaHRZX5V` Ready, production `modal-guard.spec.js` 3/3, production browser baseline 12/12, production reduced-motion baseline 24/24, and production mobile drawer/back-forward pass.
- **Production evidence**:
  - `docs/artifacts/playwright/modal-guard-phase4-production/`
  - `docs/artifacts/ux-baseline/production-phase4-dashboard-login-modal-guarded/2026-06-09T17-11-14-311Z/`
  - `docs/artifacts/ux-baseline/production-phase4-dashboard-login-modal-guarded-reduced/2026-06-09T17-12-28-101Z/`
  - `docs/artifacts/ux-baseline/production-phase4-mobile-drawer-back-forward.png`
- **Status**: `UXM-2026-06-09-04` is `IMPLEMENTED`. Next UXM work is Phase 5 attendance/finance/reports visual normalization.
- **Tooling note**: Context+/Neural Memory direct tools were not exposed in this Codex turn, so write-back is markdown/manual only.

## Just Completed
Phase B foundation hardening baseline: removed tracked `.backup` files, added `VITE_API_BASE`/retry/401 handling to the API client, added ErrorBoundary, added login rate-limit, added unit tests and CI, recorded backend strategy, and brought frontend lint to zero warnings.

Phase B validation/security slice: added zod validation for Login, Student, Class, Receipt, and Payment server-side payloads; removed `xlsx`; replaced Excel export implementation with CSV; removed vulnerable root Vercel dev/type dependencies in favor of local request/response types and `npx vercel dev`; root and frontend audits now report 0 vulnerabilities.

Phase B E2E/Form baseline: added Playwright smoke suite under `frontend/e2e` covering auth, student onboarding validation, class creation validation, attendance, fee collection, payment validation, receipt validation, templates, and reports/API financial shape. Added React Hook Form + zod submit boundaries for Student, Class, Receipt, and Payment forms. Local serverless target `http://127.0.0.1:3000` passed 7/7.

Phase B observability/security baseline: added security headers, request ID propagation, structured JSON API logs with secret redaction, shared error logging, and a router-level mutation audit baseline for authenticated `POST/PUT/PATCH/DELETE` API calls.

Production B7c smoke: commit `20949c2` deployed to Vercel; `/api/auth/me` exposes the new security/request-id headers, production login + `/api/auth/me` succeeds for the approved admin smoke account, and browser `/payments` smoke shows no network/error text or console errors.

Phase C C11 User Management closeout: commit `e05239e` deployed to Vercel; production login succeeded, read-only `GET /api/users` returned `success=true` with 2 users, and Google Chrome/Playwright production smoke for `/users` passed 1/1. No production user mutations were run.

Phase C C1 Bulk Actions closeout: commit `53e1b42` deployed to Vercel; local mutation smoke created and bulk-deleted a temporary parent successfully, full local Playwright smoke passed 13/13, production API validation/non-mutating missing-ID smoke passed, and Google Chrome/Playwright production smoke for bulk selection passed 1/1. No destructive production bulk action was run.

Phase C C4 Monthly Fee Automation dry-run: commit `26dfa7e` deployed to Vercel; endpoint `POST /api/monthly-fees/generate` computes active-student fees idempotently and defaults to `dry_run=true`. Production dry-run returned 22 active students with `would_create=22` for 2026-05 and Playwright production smoke passed 1/1. Cron activation and `dry_run=false` production mutation were not run.

Phase C C2 Student CSV Import: commit `aed68f2` deployed to Vercel; added admin-only `/api/import/students`, CSV parser/preview validation, duplicate detection, rollback-protected commit path, Express reference route, `/imports` UI, import service, and Playwright coverage. Local mutation smoke committed 1 temporary student + parent and cleaned up to 0 remaining temp rows. Production smoke used preview only: API returned `total_rows=2`, `valid_rows=1`, `invalid_rows=1`, and Google Chrome/Playwright `/imports` smoke passed 1/1. No production import commit was run.

Phase C operations + soft-delete closeout: commit `142b99a` deployed to Vercel; C4 cron/monthly fee generation, C5 parent portal, C6 fee reminders, C9 encrypted Blob backup, and C10 soft delete/recycle bin are implemented. `npx prisma db push` synced the Neon schema; production smoke generated 22 monthly fees for 2026-05, verified cron 403 without auth, uploaded and verified an encrypted backup, tested recycle-bin delete/purge with a temporary record, verified parent portal login/data, and passed Google Chrome UI smoke for `/fee-reminders`, `/backups`, `/recycle-bin`, `/parent-login`, and `/parent-portal`.

Final verification + write-back closeout: commit `4fb8297` was pushed and matches `origin/main`; production probes returned `/` 200, protected API routes 401, and cron routes 403; local ports 3000/5000 had no listeners; out-of-scope marker scan returned no matches. `B2B-005` and `B2B-008` are closed with receipt `receipts/2026-05-17-final-verification-writeback.md`.

Production UX/PDF hardening pass: commit `f544464` fixed pdfmake Unicode embedding for Vercel and Express PDF generation, exported/reference-fixed Express `numberToWords`, hardened frontend PDF opening, grouped sidebar navigation into main/secondary sections, synced a Figma UX frame, and added `frontend/e2e/ux-redesign-smoke.spec.js`. Local verification passed: unit 20/20, typecheck, lint max-warnings=0, build, targeted UX smoke 3/3, and full local E2E 20/20. Production smoke passed: receipt PDF is a 16871-byte Unicode PDF with `/ToUnicode` and Roboto, and `/receipts` grouped menu has no API failure or horizontal overflow. Evidence: `receipts/2026-05-17-pdf-ux-production-hardening.md`.

Production readiness pass after `PLAN.md`: fixed the dashboard contract and redesigned the dashboard into a data-linked operations console; converted core Vercel handlers from token-only `verifyAuth()` to DB-backed `requireAuth()`; added attendance locked-period write guards; made monthly-fee payment conditional/idempotent; linked direct receipt creation back to monthly-fee rows when possible; wired the change-password modal; added PageHeader/MetricCard/PageState and accessibility improvements for Modal/DataTable/EmptyState; added a local smoke server that runs the real `api/router.ts` plus `frontend/dist`.

Attendance/tuition RCA + report/template UX pass: investigated Phuc and Starter A1 Neon records, confirmed the current DB has Phuc with 12 May attendance records and 2 June records, while the existing paid May receipt shows `days_count=0` and `amount=6000000`. Root causes were attendance-period fee generation not setting `MonthlyFee.totalDays`, `sessions_per_week` classes treating monthly tuition as per-session tuition, unsafe UTC `toISOString()` date keys in Attendance UI, and Vietnamese weekday values not being normalized to JavaScript weekday numbers.

Implemented shared tuition calculation in `lib/tuition.ts` and wired it into attendance calculate-fee, monthly-fee calculate/detail/generator, attendance-period lock fee refresh, and receipt creation. Added `tests/tuition.test.ts`; local-safe date helpers in `frontend/src/utils/dateKeys.js`; class create/update bulk `student_ids`; `/api/reports/student-fees` plus Reports matrix; and a rebuilt Template Designer with image/background upload, Fabric layer controls, opacity, lock, duplicate, align, text/shape styling, QR placeholder, and richer data fields. Follow-up on 2026-05-25 changed `sessions_per_week` expected sessions from calendar-row multiplication to month-bounded weekly slots, so May 2026 now computes `2/week=10` and `3/week=14`.

Validation for the 2026-05-19 patch passed: `npx tsc --noEmit`, `npm --prefix frontend run lint`, `npm run test:unit` 28/28, `npm run build`, `npm --prefix frontend run test:e2e -- ux-redesign-smoke.spec.js` 6/6, and `git diff --check`. Evidence: `receipts/2026-05-19-attendance-tuition-report-template-ux.md`, screenshots in `frontend/output/playwright/`. Stitch generated a `GEMINI_3_1_PRO` reports concept in project `12785236930566023458`; Figma Desktop was unavailable (`No Figma window open`), so no Figma write/inspect succeeded this pass.

MOT-UX-002 Dashboard Glassmorphic Redesign: refactored `DashboardPage.jsx` using the premium MotionSites.ai design system. Added deep-dark surface colors, glass panels (`glass-surface`), backdrop-blur, and framer-motion animations. Replaced static metric sections with responsive `recharts` Line Charts for live revenue and expense data. Verified production build locally.

Production deploy/env closeout: deployed the 2026-05-18/2026-05-19 hardening and EduFlow UI pass to `https://edu-manager-gules.vercel.app`. Fixed Vercel env drift (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`), linked Vercel Blob store `edu-manager-live-blob`, added `.vercelignore`, corrected an unanchored ignore bug that excluded `server/api/receipts` and `server/api/reports`, closed the frontend `ws` audit advisory, and verified production with login 200, upload-image 201, auth no-token 401, cron no-token 403, and Playwright 6/6.

## Now Doing
2026-06-09 Report BI tab-mode + dashboard patch: fixed the issue where `Tong quan` / `Chuyen can` / `Hoc phi` / `Rui ro` looked inert by adding a backend `mode` filter and making the frontend request/tab state drive the API. Added additional chart panels for BA/PI-style analysis, stabilized class filter options from `meta.classes`, separated mixed VND/count chart axes, deferred search input, and removed duplicate initial error rendering. Local gates passed: focused unit 18/18, full unit 59/59, typecheck, frontend lint zero warnings, build, local Report BI E2E 3/3, and browser probe. Production deploy/smoke passed on `https://edu-manager-gules.vercel.app` with API mode totals and screenshot evidence in `receipts/artifacts/report-bi-tabs-dashboard-production.png`.

Production-live optional closeout is implemented and deployed on 2026-06-08: API documentation now lives in `docs/API.md` with a unit drift test against `api/router.ts`; Advanced Reports has a Recharts revenue line chart plus mocked/prod E2E coverage; Template Designer exposes Thermal 80mm in the paper-size picker and PDF tests verify the 80x200mm MediaBox; GitHub Actions now has a separate Playwright E2E job that runs deterministic mocked browser smoke specs against frontend preview. Local gates passed: `npm run test:unit` 50/50, `npx tsc --noEmit`, `npm --prefix frontend run lint -- --max-warnings=0`, `npm run build`, focused Playwright 2/2, CI-equivalent frontend preview Playwright 2/2, and `git diff --check`. Production deployment `dpl_57m2wBJuvyWonYWqL98Q92BCudfC` is Ready; production Advanced Reports smoke passed 1/1 and Template Designer thermal smoke verified canvas `302x756` without saving.

Production is live on `https://edu-manager-gules.vercel.app` with the 2026-06-05 Template Designer visible render/upload fix deployed and production-smoked. Existing paid anomalous receipts are intentionally not auto-mutated; admins should use Reports/Receipts anomaly actions to void/recalculate one record at a time with an operator reason.

2026-06-27 attendance/delete/daily-progress production closeout: commit `0fc9b80` was pushed and Vercel deployment `dpl_DD5oAS6CoUwpySZerue1RbHXvGCU` is Ready on `https://edu-manager-gules.vercel.app`. Static gates passed with unit 85/85, typecheck, lint zero warnings, build, and diff-check. Focused production Playwright passed 6/6 for Fee Workbench class-line rendering, attendance/fee workspaces, attendance month navigation, modal scroll, Template Designer canvas, and receipt PDF. Read-only Fee Workbench probes for 2026-05 and 2026-06 found no collectable zero-amount rows.

2026-06-05 Template Designer visible render/upload fix: commit `d3e3df0` was pushed to `origin/main` and Vercel production deploy `dpl_8KRG5ePFEqeKNLZxZZdb9cMjdNg6` is Ready on `https://edu-manager-gules.vercel.app`. RCA found the Fabric-generated `upper-canvas` inherited `bg-white` from the source canvas and covered lower-canvas rendering; upload background also used low opacity and no upscaling. The fix removes source canvas `bg-white`, gates controls until canvas-ready, refreshes object coordinates/rendering, fits background uploads to the page, and strengthens E2E pixel/hash coverage. Local gates passed: Template Designer E2E 1/1, Chrome headed E2E 1/1, lint, typecheck, unit 46/46, build, diff-check. Production Chrome smoke opened `cmp6dbue800s9gcyrkhbzw8tj/design`, verified transparent upper canvas, clicked Text and `receipt_id`, uploaded image/background through the real production endpoint, confirmed canvas pixel/hash changes after every action, saw `17 object(s)`, and captured no runtime/API errors. Evidence: `receipts/2026-06-05-template-designer-visible-render-fix.md`.

2026-06-02 no-blocking flows + line fee ledger closeout: added additive Neon schema tables `MonthlyFeeLine` and `ReceiptLine`, synced with `npx prisma db push`, and deployed Vercel production `dpl_JCDmyuFBV7yQ2zEYHu5bLyyvF4kJ`. Fee Workbench now operates on per-class fee rows instead of hidden student/month aggregates; bulk pay can collect selected class lines and print generated receipts. Attendance now supports off-schedule make-up sessions and checks all touched periods for cross-month weeks. Class edit bulk student loading no longer deadlocks. Receipt PDF fallback renders line tables and authenticated print popups show status/error instead of blank failure. Reports include finance dashboard data and Template Designer controls are backed by canvas state and regression tests. Local gates passed: Prisma generate, typecheck, unit 44/44, frontend lint zero warnings, frontend build, root build, diff-check, Playwright 12/12 and 17/17. Production Playwright on `https://edu-manager-gules.vercel.app` passed 29/29.

2026-05-25 P0/P1 hardening closeout: fixed `/classes` crash by importing Motion, added full protected-menu traversal across 22 routes desktop/mobile, made attendance-period lock transactional and multi-class aware, guarded monthly-fee calculate/confirm/cancel/pay transitions with conditional `updateMany`, blocked new positive tuition receipts with zero chargeable sessions, made student-fees report surface receipt-only anomalies, corrected dashboard unpaid aggregate math, and expanded PDF Fabric rendering for text/line/rect/circle/ellipse/group/base64 image with fallback for unsupported images. Local gates passed: `git diff --check`, `npx tsc --noEmit`, `npm run test:unit` 35/35, frontend lint max-warnings=0, `npm run build`, root/frontend audits 0 vulnerabilities, and Playwright UX/menu/PDF 7/7 against `npm run dev:smoke`. Implementation commit `d2e19df` and docs commit `5b2b568` were pushed; final Vercel production deployment `dpl_2gi9iJBPBnMAKRJb1ZsZs365DGcL` is Ready; production Playwright 7/7 and API probes passed.

2026-05-25 month-bounded tuition + EduFlow UI closeout: fixed remaining session-count logic so expected sessions are bounded by actual days inside the target month, routed receipt creation through MonthlyFee calculation and `monthly_fee_id`, rejected stale direct receipt totals, guarded invalid month values, replaced UTC month defaults with local/business month helpers, route-guarded admin pages, restored a coherent light EduFlow dashboard, fixed the Payments modal `ArrowDownRight` crash, and updated Playwright smoke to current product copy. Stitch project `16406701261521949818` generated a `GEMINI_3_1_PRO` direction; Figma node `3:36` was inspected and screenshot-captured. Local verification passed: unit 38/38, typecheck, lint, build, UX smoke 7/7, Phase-B smoke 17/17. Production deploy `dpl_3AFgxEykCcXHhtC1A29jW37ZxJ9C` is Ready on `https://edu-manager-gules.vercel.app`; production UX smoke 7/7 and Phase-B smoke 17/17 passed. `prisma migrate status` remained read-only and reported no Prisma Migrate history; no schema migration/seed was run.

2026-05-25 Fee Workbench + UX closeout: fixed reported edit-modal scroll/save reachability, added all/500/100/50 table display controls, added attendance previous/next month-window navigation, made Template Designer usable with default scaffold/undo/redo/zoom, merged finance navigation into one operational `Thu tien` Fee Workbench, and added batch tuition collection API/UI with print queue. Implementation commit `c793de3` was pushed to `origin/main`; production deploy `dpl_7FBhsvzbfCLy85aQoirLyhwBRg12` is Ready on `https://edu-manager-gules.vercel.app`. Local gates passed: `git diff --check`, `npx tsc --noEmit`, unit 39/39, frontend lint max-warnings=0, build, root/frontend audits, API bulk-pay smoke, UX smoke 10/10, and Phase-B smoke 17/17. Production smoke passed: login success, bulk-pay no-token `UNAUTHORIZED`, auth no-selection `NO_SELECTION`, UX smoke 10/10, and Phase-B smoke 17/17. No Prisma migration, seed, or destructive production data mutation was run.

2026-05-26 modal scroll production fix: RCA showed shared modals were rendered inline under Framer Motion page wrappers, so `position: fixed` could be re-anchored by transformed ancestors and long dialogs stayed below the viewport. `Modal.jsx` now portals content to `document.body`, preserves previous body overflow, uses a viewport-bounded `box-border` shell, removes double padding, and keeps only the modal body scrollable with `overscroll-contain`. Added Chrome regression coverage for classes, students, parents, teachers, payments, and receipts. Commit `8819718` was pushed and Vercel deploy `dpl_3TTwAgFMPEzeM8zfa5Q3A8RWYGDn` is Ready. Local gates passed: build, typecheck, lint, unit 39/39, focused modal smoke 1/1, UX 11/11, Phase-B 17/17, diff-check. Production gates passed: focused modal smoke 1/1, UX 11/11, Phase-B 17/17. No Prisma migration, seed, or destructive production data mutation was run.

2026-05-27 performance route-loading closeout: route pages now load through `React.lazy` + `Suspense`; Vite emits manual vendor chunks for React/router/motion/charts/Fabric/icons; page transitions no longer use blur; API GET calls have short-lived dedupe/cache with mutation and 401 invalidation; `/auth/me` reuses the DB-backed `requireAuth()` payload; `/students?fields=options` supports slim lookup payloads; `/classes` no longer loads all active students on page open; Fee Workbench uses read-only `/api/monthly-fees/workbench` for active students + fees in one request; unpaid-students attendance counts use `groupBy`; Prisma composite indexes were added and synced to Neon with `npx prisma db push`. Commit `5c761ba` was pushed and Vercel deploy `dpl_A4LV7b5BR7g6SmVmirRAusA1Y69B` is Ready. Local gates passed: diff-check, Prisma validate, perf script syntax, typecheck, unit 39/39, lint, build, perf smoke 10/10, UX 11/11, Phase-B 17/17. Production gates passed: perf smoke 10/10 and 25/25 API calls, UX 11/11, Phase-B 17/17. Evidence: `receipts/2026-05-27-performance-production-closeout.md`.

2026-05-28 performance lag RCA closeout: finished the follow-up lag pass after user-reported jank. Integrated subagent work for backend select narrowing, read-only perf-lab, and frontend review. Reduced route/page motion and large blur surfaces, replaced full-screen protected-route spinner with a lightweight skeleton, made DataTable default to 100 rows with deferred/keyed search, prevented false zero metrics on initial load, guarded Fee Workbench stale requests, guarded Attendance class/week async requests, and parallelized Attendance 3-month fetches. Added `scripts/perf-lab.mjs` and `npm run perf:lab`. Vercel production deploy `dpl_8tNtmmYtCJtY8U4gv8swgUWhpKEj` is Ready and aliased to `https://edu-manager-gules.vercel.app`. Local gates passed: typecheck, lint zero warnings, unit 39/39, build, diff-check, perf-lab pass, and Playwright 28/28. Production gates passed: perf-lab pass and Playwright 28/28. Evidence: `receipts/2026-05-28-performance-lag-rca-closeout.md`.

2026-06-01 financial correction policy closeout: implemented explicit admin correction for historical paid receipt/monthly-fee anomalies instead of silent rewrite. Added `lib/finance-corrections.ts`, admin-only `POST /api/receipts/:id/correct`, anomaly metadata in receipts/student-fees/workbench APIs, Reports/Receipts correction entry points, Fee Workbench admin-review locks, and recycle-bin restore protection for corrected receipts. Vercel production deploy `dpl_GJ3U47QRgzsCGxF3mvBhUGa29h9v` is Ready and aliased to `https://edu-manager-gules.vercel.app`. Local gates passed: typecheck, unit 43/43, lint zero warnings, build, diff-check, local perf-lab, UX 11/11, and Phase-B 17/17. Production gates passed: perf-lab, Phase-B 17/17, modal-scroll 1/1, calendar/template/PDF 4/4, and no-mutation correction route probes 401/404 plus final post-commit root/auth/correction smoke. Evidence: `receipts/2026-06-01-financial-correction-policy-closeout.md`.

## Next Recommended Action
1. Audit the current anomaly list in Reports and apply the correction action per record with an operator reason; do not bulk rewrite historical paid receipts.
2. Rotate production default credentials and JWT secret before real operation.
3. Continue monitoring production perf reports; cold serverless starts still dominate dashboard/report/workbench timings, but current routes have no smoke failures or severe threshold hits.
4. Keep `REMINDER_SEND_ENABLED=false` until SMS/Zalo webhook, opt-in policy, and approved message templates are ready.
5. Preserve commit hygiene: stage only explicit app/docs files and leave unrelated framework drift out of product commits.
6. Plan the next Student Progress Assessment Expansion phase so teachers can enter real Listening/Speaking/Reading/Writing/Homework/daily-practice evidence and the report can stop depending only on the Phase 1 proxy.

## 2026-06-10 Current Context - EduFlow Motion Phase 5 Attendance/Finance/Reports

- **Active task closed**: `UXM-2026-06-09-05` is `IMPLEMENTED` locally with browser/test evidence.
- **Scope completed**:
  - Attendance: added week-level loading/error/readiness guards, blocked edit/save/select-all while selected week data is not loaded, and surfaced retry/status messaging for week fetches.
  - Fee Workbench: removed unsafe aggregate fallback when `/api/monthly-fees/workbench` fails, added error/retry and refresh status, locked stale actions while loading, required row month to match selected month before collect/print, and added print progress states.
  - Reports: guarded against stale BI data after tab/filter request failure, added backend pagination clamping, added drawer audit context, and restored visible `Theo dõi học phí theo học viên` matrix heading.
  - Design workflow: Stitch generated a `GEMINI_3_1_PRO` operations concept in project `5084496326021058210`; Figma Desktop node `3:36` was inspected/screenshot-captured, but no writable Figma sync tool was available in this Codex run.
- **Evidence**:
  - `receipts/2026-06-10-eduflow-motion-phase5-attendance-finance-reports.md`
  - `docs/artifacts/ux-baseline/2026-06-09T18-31-42-820Z/`
- **Verification**: frontend lint zero warnings, `npx tsc --noEmit`, `npm run test:unit` 61/61, `npm run build`, local Playwright Phase 5 7/7, local template/UX smoke 12/12, and local UX baseline desktop/mobile 16/16.
- **Operational note**: Local smoke server must be started with `npm.cmd`; plain `Start-Process npm` opened Notepad through Windows file association. Prisma generate initially hit EPERM because the local smoke server held Prisma Client DLL; stopping the port-3000 child process fixed the build.

## 2026-06-10 Current Context - EduFlow Motion Phase 6 Template/Admin/Parent

- **Active task closed**: `UXM-2026-06-09-06` is `IMPLEMENTED` locally with browser/test evidence.
- **Scope completed**:
  - Template Designer: typed status notices, save recovery, disabled controls during save/upload, discoverable shortcut hint, layer list, and stronger E2E assertions.
  - Templates library: operational layout, loading/error/retry states, action progress, and paper labels from `json_config.paper`.
  - Admin secondary surfaces: users retry/shared confirm, import progress/confirm, recycle-bin purge confirm/progress, fee reminder progress/live-send confirmation.
  - Parent portal: mobile-first read-only login/portal with progress, loading scene, error retry, and no admin navigation.
- **Evidence**:
  - `receipts/2026-06-10-eduflow-motion-phase6-template-admin-parent.md`
  - `docs/artifacts/ux-baseline/local-phase6-template-admin-parent-reduced/2026-06-10T05-54-51-997Z/`
  - `docs/artifacts/playwright/phase6-admin-secondary-local/`
  - `docs/artifacts/playwright/phase6-template-local/`
- **Verification**: frontend lint zero warnings, `npx tsc --noEmit`, `npm run test:unit` 61/61, `npm run build`, Playwright admin/parent 2/2, Playwright Template Designer 1/1, UX baseline 100/100 across mobile/tablet/desktop/wide and default/reduced-motion.
- **Operational note**: Phase 6 was not production-deployed in this turn. Stop local smoke server before build if Prisma Client DLL `EPERM` appears on Windows.
- **Next unchecked item**: `UXM-2026-06-09-07` responsive/accessibility/performance hardening, then `UXM-2026-06-09-08` production deploy/smoke/closeout.

## 2026-06-10 Current Context - EduFlow Motion Phase 7 Responsive/A11y/Performance

- **Active task closed**: `UXM-2026-06-09-07` is `IMPLEMENTED` locally with browser/test/perf evidence.
- **Scope completed**:
  - Added a stable layout-level screen-reader live/status region so settled protected routes keep an async status target after loading scenes disappear.
  - Added accessible names/titles for Template Library icon-only edit, set-default, and delete actions.
  - Added `frontend/e2e/responsive-accessibility-phase7.spec.js` to guard mobile/desktop protected routes, main landmarks, headings, focusable controls, live regions, unnamed icon buttons, horizontal overflow, runtime/API errors, and reduced-motion infinite animation.
- **Evidence**:
  - `receipts/2026-06-10-eduflow-motion-phase7-responsive-a11y-performance.md`
  - `docs/artifacts/playwright/phase7-responsive-a11y-local/`
  - `docs/artifacts/ux-baseline/local-phase7-responsive-a11y-performance/2026-06-10T06-29-24-670Z/`
  - `receipts/perf/perf-lab-2026-06-10T06-33-58-416Z.md`
- **Verification**: frontend lint zero warnings, `npx tsc --noEmit`, `npm run test:unit` 61/61, `npm run build`, `git diff --check`, Playwright Phase 7 2/2, UX baseline 150/150, and local perf-lab pass.
- **Operational note**: Phase 7 was not production-deployed in this turn. The UX baseline does not yet emit numeric CLS from browser layout-shift entries; it does enforce zero overflow, zero blank pages, zero console/API/page findings, and reduced-motion coverage.
- **Next unchecked item**: `UXM-2026-06-09-08` production verification and closeout.

## 2026-06-10 Current Context - EduFlow Motion Phase 8 Production Verification

- **Active task closed**: `UXM-2026-06-09-08` is `IMPLEMENTED` with production deployment/browser/perf evidence.
- **Production**: `https://edu-manager-gules.vercel.app` is on Vercel deployment `dpl_FMemytCK71osPxvskCWb4o2qt2B5`; inspect reported Ready; root HTML references `index-DrLVhz64.js`; production login probe returned HTTP 200.
- **Evidence**:
  - `receipts/2026-06-10-eduflow-motion-phase8-production-closeout.md`
  - `docs/artifacts/ux-baseline/production-phase8-responsive-a11y-performance/2026-06-10T06-45-34-107Z/`
  - `docs/artifacts/playwright/phase7-responsive-a11y-production/`
  - `docs/artifacts/playwright/phase8-template-production/`
  - `docs/artifacts/playwright/phase8-report-bi-production/`
  - `receipts/perf/perf-lab-2026-06-10T06-59-13-443Z.md`
- **Verification**: Production responsive/a11y Playwright 2/2, production Template Designer 1/1, production Report BI 3/3, production UX baseline 150/150, production perf-lab pass, and `git diff --check` passed with only existing CRLF warnings.
- **Operational note**: Figma MCP write remains unavailable, but Figma Desktop/Computer Use plus the local plugin path now provided enough verified authoring evidence to close UXM-02. Production latency still shows serverless/DB cold-start sensitivity; perf-lab route p95 was 6372.1 ms, but no failures or severe browser API errors were observed.
- **Next recommended**: Continue product feature work or deeper performance optimization only after reviewing whether DB/serverless latency is acceptable for live operators.

## 2026-06-10 Current Context - EduFlow Motion Phase 1 Selection Closeout

- **Active task closed**: `UXM-2026-06-09-01` is `IMPLEMENTED`.
- **Decision**: accepted the Stitch direction `Calm Operations + Motion Data Command` at 95/100 instead of running another detached variant loop, because the direction has already been implemented and production-verified through Phase 3-8.
- **Evidence**:
  - `receipts/2026-06-10-eduflow-motion-phase1-selection-closeout.md`
  - `receipts/2026-06-10-eduflow-motion-phase8-production-closeout.md`
  - `docs/artifacts/ux-baseline/production-phase8-responsive-a11y-performance/2026-06-10T06-45-34-107Z/`
- **Superseded blocker note**: `UXM-2026-06-09-02` later closed after the plugin-authored native components/frames `49:436`, `49:438`, `49:440`, `49:442`, `49:444`, `49:447`, and `49:472` were verified and accepted.

## 2026-06-10 Current Context - Figma Offline Handoff Package

- **Actionable fallback completed**: prepared `docs/artifacts/figma-handoff/eduflow-motion-v3-source-of-truth-spec.md`.
- **Content**: implementation-aligned Figma variables, components, desktop/mobile frames, prototype flows, code mapping and write checklist.
- **Boundary**: this does not complete Figma Phase 2. It is a local handoff package only; actual Figma source-of-truth sync still requires a write-capable Figma MCP/plugin.

## 2026-06-10 Current Context - Figma Desktop Write Path Verified

- **User-directed approach**: switched from waiting on write-capable Figma MCP to using `@figma` read tools plus Computer Use against Figma Desktop.
- **Figma MCP state**: read/inspect tools work (`get_metadata`, `get_screenshot`) but write/create/update tools such as `use_figma` remain unavailable in this Codex session.
- **Desktop evidence**: Computer Use located `EDUMANAGER - Figma`, switched Figma from Inspect/Dev Mode to Design mode, and pasted a source-of-truth SVG board into the active `EDU_MANAGER_V2 Production UX` page.
- **Created Figma node**: `31:2` (`Frame`, `1440 x 1080`, `x=1679`, `y=914`) with readable children for `EDU_MANAGER_V2 / EDUFLOW MOTION V3`, `FEE WORKBENCH`, `TEMPLATE DESIGNER`, `REPORT INTELLIGENCE`, and `VALIDATION`.
- **Evidence**: `receipts/2026-06-10-figma-desktop-write-path-unblocked.md`.
- **Boundary superseded**: This 2026-06-10 boundary is historical. `UXM-2026-06-09-02` is now `IMPLEMENTED` through the 2026-06-11 native source closeout receipt.

## 2026-06-10 Current Context - Figma Source Pack Expanded

- **Active task status superseded**: `UXM-2026-06-09-02` is now `IMPLEMENTED`; this section is retained as historical source-pack evidence.
- **Primary Figma node**: `35:128` named `EDU_MANAGER_V2 / EduFlow Motion V3 Source Pack`.
- **Native component evidence**: `37:415` is a coarse native component definition wrapping the source pack.
- **Completed**:
  - Pasted a larger source-pack SVG into Figma Desktop after the first proof node.
  - Renamed the imported frame through Figma Desktop.
  - Verified the node through Figma MCP `get_metadata`, `get_design_context`, and `get_screenshot`.
  - Converted the selected source pack to a native Figma component definition with Desktop shortcut `Ctrl+Alt+K`.
  - Verified `37:415` through Figma MCP `get_metadata`, `get_design_context`, and `get_screenshot`.
  - Source pack includes sections for design direction, tokens, component library, navigation, loading/motion, dashboard, fee workbench, report intelligence, attendance, template designer, mobile, and implementation map.
- **Evidence**: `receipts/2026-06-10-figma-desktop-write-path-unblocked.md`; Figma nodes `35:128` and `37:415`.
- **Boundary**: This is still not a complete native Figma design-system implementation. `37:415` is one coarse source-pack component wrapper; remaining review work is granular native variables/components/variants plus stale frame replacement for `3:36` and `3:142`.

## 2026-06-14 Current Context - Student Progress Assessment Expansion

- **Active task closed**: `SPRX-2026-06-12-01..07` are `IMPLEMENTED`.
- **Scope completed**:
  - Added Prisma persistence for monthly student progress, per-skill scores, daily practice/mock-test entries, focus notes, teacher notes, and draft/finalized status.
  - Added `/api/student-progress` for authenticated admin list/upsert and wired it through the production router.
  - Added `lib/student-progress-assessment.ts` scoring/rubric logic for Listening, Speaking, Reading, Writing, Homework, Daily Practice, and Mock Test across Starters/Movers/Flyers/KET/PET-oriented tracks and communicative/exam-prep/mixed class types.
  - Extended `/api/reports/student-progress` and `/student-progress` so teacher-entered academic input appears in analytics, table rows, focus areas, and parent print output.
  - Fixed two regressions during verification: invalid API body now returns `VALIDATION_ERROR` instead of generic server error, and empty skill scores remain `missing_input` instead of being coerced to zero.
- **Production**: deployed to `https://edu-manager-gules.vercel.app`; Vercel inspect `https://vercel.com/hts2008s-projects/edu-manager/2ZxVKk5NGPq64xhe7H2zokBurm3C`.
- **Verification**: `npm run test:unit` 78/78, `npx tsc --noEmit`, frontend lint zero warnings, `npm run build`, `git diff --check`, `npx prisma validate`, `npx prisma db push --skip-generate` already in sync, local Playwright 1/1, production Playwright 1/1.
- **Evidence**: `receipts/2026-06-14-student-progress-assessment-expansion.md`, `docs/artifacts/playwright/student-progress-assessment-local-final-20260614/`, `docs/artifacts/playwright/student-progress-assessment-production-20260614/`.
- **Residual risk**: class-wide bulk/copy-last-month entry is not yet a dedicated grid workflow; current production supports row-level monthly save/finalize. npm audit warnings remain and need a separate dependency-security pass.
