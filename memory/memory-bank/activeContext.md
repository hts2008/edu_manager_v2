# Active Context

> Current technical state of EDU_MANAGER_V2. Restored 2026-04-25 after memory cross-contamination cleanup. Updated 2026-05-14 after agency PRD assessment and workspace scope/path cleanup.

## Project State
- **Product**: Edu Manager V2 — Vietnamese education center management system for classes, students, parents, teachers, attendance, monthly fees, receipts, payments, reports, and printable templates.
- **Status**: PRODUCTION LIVE. Phase A API parity passed on production for existing UI flows; Phase B reliability/security baseline is implemented; Phase C C1-C12 product slices are implemented and production-smoked.
- **Production URL**: https://edu-manager-gules.vercel.app
- **Login**: `admin / admin123`
- **Repository**: https://github.com/hts2008/edu_manager_v2
- **Latest production deployment observed in Codex session**: `dpl_7vvKWQfjvgTJXQCSpMM52D2AtoYH` on `https://edu-manager-gules.vercel.app` after the 2026-06-06 Template Designer paper-size/custom canvas alignment fix.
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
1. **Template Designer Paper Size + Canvas Alignment Fix** - Template Designer now supports A4/A5/A6/custom paper dimensions from the designer itself. Effective paper metadata is stored in `json_config.paper`/`json_config.canvas` so custom sizes do not require a Prisma enum migration; existing Fabric objects are scaled/fitted when paper changes, PDF generation honors the JSON paper metadata, and production Chrome smoke passed on 2026-06-06 without saving/mutating the production template.
2. **Template Designer Visible Render + Upload Fix** - Template Designer now visibly renders newly added Text/Field/Rect/image/background objects. RCA found Fabric copied `bg-white` from the source canvas to the generated `upper-canvas`, visually covering the lower render canvas. The source canvas no longer carries `bg-white`, canvas controls are disabled until ready, background uploads fit the page with stronger opacity, and production Chrome smoke passed on 2026-06-05.
3. **Template Designer Legacy Canvas Fix** - default receipt templates with legacy `{ elements: [] }` config no longer keep the designer stuck at `Dang khoi tao canvas...`; the canvas scaffolds safely, tools work, save is enabled, and production smoke passed on 2026-06-04.
4. **Fee Workbench Class-Line Split Patch** - multi-class students now render and collect as one Fee Workbench row per class line; aggregate legacy rows are not collectable. Deployed and production-smoked on 2026-06-03.
5. **No-Blocking Flows + Line Fee Ledger Closeout** - attendance make-up/cross-month period handling, class bulk student loading, per-class fee lines, receipt line printing, finance dashboard data, and Template Designer interactions are implemented, deployed, and production-smoked on 2026-06-02.
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
Production is live on `https://edu-manager-gules.vercel.app` with the 2026-06-05 Template Designer visible render/upload fix deployed and production-smoked. Existing paid anomalous receipts are intentionally not auto-mutated; admins should use Reports/Receipts anomaly actions to void/recalculate one record at a time with an operator reason.

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
