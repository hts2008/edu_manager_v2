# Session Handoff - EDU_MANAGER_V2 Phase C Closeout

## 2026-06-12 Handoff - Student Monthly Progress Parent Report
- **Current Outcome**: Phase 1 monthly parent-facing student progress reporting is implemented and deployed to production with plan, API, UI, tests, browser smoke, KANBAN/memory, and receipt evidence.
- **Implementation**: Added `lib/student-progress-report.ts`, admin-only `/api/reports/student-progress`, `/student-progress` dashboard/charts/table/CSV/printable report UI, sidebar entry, API client method, focused tests, API docs, and plan/receipt artifacts.
- **Key Decision**: Attendance-derived `progress_score` is an operational proxy only. Do not treat it as Cambridge shields, CEFR level, or Cambridge English Scale score. Skill dimensions remain `missing_input` until real assessment/rubric data exists.
- **Verification**: focused unit 4/4, typecheck, frontend lint, full unit 65/65, build, feature diff-check, local Playwright route/API smoke, production deploy `dpl_5NZEpgh9xKWqCyp99rt5GxWTLoYs`, and production Playwright route/API smoke.
- **Evidence**: `plans/2026-06-12-student-progress-parent-report/plan.md`, `receipts/2026-06-12-student-progress-parent-report.md`, screenshots `receipts/artifacts/student-progress-local-smoke.png` and `receipts/artifacts/student-progress-production-smoke.png`.
- **Residual Risk**: Phase 2 should add assessment input workflow/schema and parent report layout polish.

---

## 2026-06-12 Handoff - Working Tree Hygiene Closeout
- **Current Outcome**: Remaining UX/report/template dirty/untracked drift has been reduced to explicit source/docs/evidence paths while large generated browser traces stay local-only.
- **Cleanup**: Added `.gitignore` for `docs/artifacts/ux-baseline/`, `docs/artifacts/playwright/`, and `**/.last-run.json`.
- **Verification**: Lint, typecheck, build, test:unit, and `git diff --check` all passed after the hygiene pass.
- **Evidence**: `receipts/2026-06-12-working-tree-hygiene-closeout.md`.
- **Next**: Stage and commit explicit source/evidence batches, then push `main` so the working tree is closed out cleanly.

---

## 2026-06-12 Handoff - Figma Runtime PROD Apply
- **Current Outcome**: Accepted Figma source nodes are now applied to runtime and deployed to production.
- **Production**: `https://edu-manager-gules.vercel.app` aliases Vercel deployment `dpl_4LemiLebU9nYNmDq6YAmdUyGiQn4`, status Ready.
- **Implementation**: Runtime tokens/surfaces were updated in `tokens.js`, `index.css`, shell/layout primitives, `OperationalPage`, `DataTable`, `LoadingStates`, Dashboard, Fee Workbench, and Reports.
- **QA Fixes**: Fee Workbench bulk calculate now works for pending/current selected rows instead of requiring collectable/payable rows; bulk calculate/pay cannot leave `processing` stuck after thrown errors; shared `DataTable` search tolerates null search text.
- **Verification**: lint zero warnings, typecheck, diff-check, unit 61/61, build, local Playwright 6/6, local UX baseline, local perf-lab, production Playwright 6/6, production UX baseline 150/150, production perf-lab.
- **Evidence**: `receipts/2026-06-12-figma-runtime-prod-apply.md`, `docs/artifacts/ux-baseline/figma-runtime-production/2026-06-11T17-33-27-461Z/`, `receipts/perf/perf-lab-2026-06-11T17-43-43-495Z.md`.
- **Residual Risk**: Production API latency remains serverless/DB-sensitive. Perf gates pass, but Fee Workbench and Reports endpoints still show multi-second samples and should be handled in a future backend performance pass.

---

## UXM-02 Figma Source Final Closeout - 2026-06-11
- **Current Outcome**: EduFlow Motion UX/UI production track is now fully implemented, including the previously open Figma source-of-truth phase.
- **Figma Source**: Accepted native components `49:436`, `49:438`, `49:440`, `49:442`, `49:444`, desktop frame `49:447`, and mobile frame `49:472`.
- **Verification**: Final pass ran Figma MCP `get_design_context(49:447)`, `get_design_context(49:472)`, `get_variable_defs(49:447)`, `get_metadata(49:447)`, and screenshots for `49:447`/`49:472`.
- **Deploy Decision**: No new production deploy was run because this slice only changed Figma/project-control evidence. Runtime UX/UI had already been deployed and smoked in Phase 8.
- **Evidence**: `receipts/2026-06-11-uxm02-figma-source-final-closeout.md`.
- **Next**: Future richer dashboard/report/template Figma frames or prototype animation variants should be planned as new UX enhancement work, not as a blocker for UXM-02.

---

## EduFlow Motion Phase 4 Shell/Master-Data Slice - 2026-06-09
- **Current Outcome**: UXM-2026-06-09-04 is PARTIAL. The shell/master-data slice is locally implemented and browser-smoked, but the full Phase 4 remains open.
- **Implemented**: added shared `OperationalPage` primitives; migrated Students, Parents, Classes, and Teachers into a consistent light operational layout; added Parents/Teachers API error retry instead of fake zero/empty success; restored `/advanced-reports` in Sidebar; and made Header, Sidebar, and BulkActionBar reduced-motion aware.
- **Verification**: `npm --prefix frontend run lint -- --max-warnings=0`, `npx tsc --noEmit`, `npm run test:unit` 61/61, `npm run build`, `git diff --check`, local browser baseline 14/14, and local reduced-motion baseline 28/28 passed.
- **Browser Evidence**: `docs/artifacts/ux-baseline/local-phase4-shell-master-data/2026-06-09T15-54-53-007Z/` and `docs/artifacts/ux-baseline/local-phase4-shell-master-data-reduced/2026-06-09T15-54-56-105Z/`.
- **Evidence**: `receipts/2026-06-09-eduflow-motion-phase4-shell-master-data-slice.md`.
- **Residual Risk**: local production-bundle evidence only; no production deploy/smoke was run in this slice. Dashboard, Login, long edit modals, and manual mobile drawer/back-forward route-state review remain for the next Phase 4 pass.
- **Subagent Hygiene**: Phase 4 explorer `019eacf3-495b-7a50-bea9-3315f108fe34` completed; follow-up `close_agent` returned `not found`, indicating no active runtime subagent remained.

---

## EduFlow Motion Phase 3 Loading/Motion Closeout - 2026-06-09
- **Current Outcome**: UXM-2026-06-09-03 is IMPLEMENTED locally. The shared motion/loading foundation now includes token/motion modules, AsyncBoundary, RouteProgress, LoadingScene, Skeletons, ActionProgressButton, LongOperationStatus, route/auth/table/modal/chart/action loading, reduced-motion opacity-only safeguards, and async confirm guards.
- **Implemented**: wired route loading in `App.jsx`, auth loading in `ProtectedRoute.jsx`, reduced-motion page/modal transitions, Recharts-safe chart frames, DataTable skeleton/keyboard/aria-sort behavior, modal busy/async-confirm protection, and action-progress buttons for login/change-password/settings/backups.
- **Verification**: `npm --prefix frontend run lint -- --max-warnings=0`, `npx tsc --noEmit`, `npm run test:unit` 61/61, `npm run build`, `git diff --check`, local Chrome default baseline 16/16, and local Chrome reduced-motion baseline 32/32 passed.
- **Browser Evidence**: `docs/artifacts/ux-baseline/local-phase3-final/2026-06-09T15-01-36-967Z/` and `docs/artifacts/ux-baseline/local-phase3-final-reduced/2026-06-09T15-02-30-688Z/`; both had zero console/API/page/overflow/blank findings.
- **Evidence**: `receipts/2026-06-09-eduflow-motion-phase3-loading-chart-safe.md`.
- **Residual Risk**: This is local production-bundle evidence only; no Vercel deploy/production smoke was run in this slice. At this point UXM-02 was still blocked by missing write-capable Figma MCP tools; later Desktop/Computer Use evidence reduced it to `REVIEW`. Next unchecked work was UXM-04 Phase 4 shell/dashboard/master-data migration.
- **Subagent Hygiene**: Async/motion reviewer `019eaccc-0712-7d12-8a8a-1aa1289482e4` completed; follow-up `close_agent` returned `not found`, indicating no active runtime agent remained.

---

## Report BI Tab-Mode + BA/PI Dashboard Patch - 2026-06-09
- **Current Outcome**: Report BI tabs now drive real API modes instead of only local highlight state. The dashboard has additional BA/PI-style chart panels and production browser/API smoke evidence.
- **Deployment**: Vercel inspect URL `https://vercel.com/hts2008s-projects/edu-manager/3e6ZCdUNAQrEg7bTeDJ7tKV2raFE`; production URL `https://edu-manager-aphqqe489-hts2008s-projects.vercel.app`; aliased to `https://edu-manager-gules.vercel.app`.
- **Implemented**: `/api/reports/bi` accepts `mode=overview|attendance|tuition|risk`, applies it before `q` and pagination, echoes `meta.filters.mode`, and returns stable full-cube `meta.classes`. `/reports` sends mode per tab, resets pagination when switching tabs, avoids focused-tab fallback rows, separates chart axes by metric type, and adds fee funnel, attendance distribution, risk breakdown, action list, and risk heatmap panels.
- **Verification**: Focused unit 18/18, full unit 59/59, `npx tsc --noEmit`, frontend lint zero warnings, `npm run build`, local Report BI E2E 3/3, and local browser probe passed. Production smoke confirmed root 200, protected BI API 401 with no token, authenticated API mode totals (`overview=118`, `attendance=111`, `tuition=118`, `risk=114` current rows), browser tab mode fetches, 5 chart panels, no horizontal overflow, and no console errors.
- **Evidence**: `receipts/2026-06-09-report-bi-tabs-dashboard-patch.md`, `receipts/artifacts/report-bi-tabs-dashboard-local.png`, `receipts/artifacts/report-bi-tabs-dashboard-production.png`, and `receipts/e2e-report-bi-tabs-dashboard/`.
- **Residual Risk**: `tuition` currently equals `overview` on production because current data has all/most rows needing tuition action; this is data-dependent. The BI cube is still built in memory before pagination and should be materialized/aggregated for larger centers.
- **Subagent Hygiene**: The two report follow-up sidecar agents were already inactive at closeout; `close_agent` returned `not found`, so no active subagent remained to close.

---

## Report Intelligence Center Closeout - 2026-06-09
- **Current Outcome**: Report Intelligence Center is implemented, corrected after reviewer RCA, deployed to production, and smoke-tested on `https://edu-manager-gules.vercel.app`.
- **Deployment**: Vercel production deployment `dpl_FiyiYAoozRGsZgdhk2PwCmNP6DPV`, status Ready, aliased to `https://edu-manager-gules.vercel.app`.
- **Implemented**: added `GET /api/reports/bi`, shared `lib/report-cube.ts`, Report BI frontend tabs/charts/student-class-month table, backend-side search/filtering, tab-specific analytical details, initial API error state, CI/perf gates, and report E2E coverage.
- **RCA Fixes**: class filters now run after building the full student-class-month cube so legacy aggregate fees are not misrepresented as single-class revenue; historical inactive enrollments are included only when attendance or fee-line evidence exists; first enrollment month expected sessions start from enrollment date; search `q` is sent to the API and reflected in response metadata.
- **Verification**: `npx tsc --noEmit`, `npm run test:unit` 58/58, `npm --prefix frontend run lint -- --max-warnings=0`, local Report BI E2E 3/3, `npm run build`, `git diff --check`, production Report page E2E 2/2, production API smoke, production perf-lab, and Playwright browser probe passed.
- **Evidence**: `receipts/2026-06-09-report-intelligence-center.md`, `receipts/e2e-report-bi-corrected/`, `receipts/e2e-production-report-bi-corrected/`, `receipts/perf/perf-lab-2026-06-09T06-29-46-122Z.md`, `receipts/artifacts/report-bi-production-corrected.png`.
- **Safety**: No Prisma migration, seed, or production data mutation was run for this closeout.
- **Residual Risk**: BI still builds the report cube in memory before pagination; acceptable for the current dataset, but a future scale task should add SQL aggregation/materialization. `StudentClass` still has no `endedAt`, so historical inclusion uses evidence-based inference.
- **Next**: Continue product hardening with credential rotation and deeper backend latency work if production usage grows.

---

## Template Designer Paper Size + Canvas Alignment Fix - 2026-06-06
- **Current Outcome**: Template Designer supports A4, A5, A6, and custom paper sizes from the designer UI. Existing objects are scaled/fitted when paper changes so fields/images stay on the visible canvas.
- **Deployment**: Vercel production deployment `dpl_7vvKWQfjvgTJXQCSpMM52D2AtoYH`, status Ready, aliased to `https://edu-manager-gules.vercel.app`.
- **Implemented**: added `json_config.paper` and `json_config.canvas` metadata, designer A6/custom controls, paper-aware undo/redo snapshots, object fit/scale logic, PDF effective-paper parsing, API enum guard, and metadata-edit protection so `TemplatesPage` does not wipe `json_config`.
- **Verification**: local Template Designer E2E 1/1, headed Chrome E2E 1/1, frontend lint, `npx tsc --noEmit`, unit 47/47, `npm run build`, and `git diff --check` passed.
- **Production Smoke**: Chrome/Playwright opened default receipt template `cmp6dbuc900s7gcyrty4jd0ik`, switched A6 (`397x559`), switched custom 120x180mm (`454x680`), added Text and `receipt_id`, saw `15 object(s)`, non-white pixel proof, and no runtime/API errors.
- **Safety**: Production smoke did not click save, so production template JSON was not mutated. No Prisma migration or seed was run.
- **Evidence**: `receipts/2026-06-06-template-designer-paper-size-alignment.md`, `receipts/artifacts/template-paper-prod-smoke.png`.
- **Next**: If exact WYSIWYG PDF coordinates are required later, plan a separate absolute-position PDF renderer; this closeout makes page size and designer/PDF metadata consistent.

---

## Template Designer Visible Render + Upload Fix - 2026-06-05
- **Current Outcome**: Template Designer no longer appears blank after adding fields/components or uploading images. The root cause was Fabric's generated `upper-canvas` inheriting an opaque `bg-white` class from the source canvas and covering the lower render canvas.
- **Deployment**: Vercel production deployment `dpl_8KRG5ePFEqeKNLZxZZdb9cMjdNg6`, status Ready, aliased to `https://edu-manager-gules.vercel.app`.
- **Implemented**: removed the opaque source canvas background class, added `getUsableCanvas()` guards, disabled tools until canvas-ready, refreshed coordinates/rendering after insertions, scaled background uploads to fit the page, raised background opacity, and added visual pixel/hash regression checks.
- **Verification**: local Template Designer E2E 1/1, headed Chrome E2E 1/1, final E2E 1/1, frontend lint, `npx tsc --noEmit`, unit 46/46, `npm run build`, and `git diff --check` passed.
- **Production Smoke**: Chrome/Playwright opened `https://edu-manager-gules.vercel.app/templates/cmp6dbue800s9gcyrkhbzw8tj/design`, verified transparent `upper-canvas`, clicked Text and `receipt_id`, uploaded image/background through the real production upload endpoint, confirmed checksum changes after every action, saw `17 object(s)`, and captured no runtime/API errors.
- **Safety**: Production smoke uploaded two small test images to Vercel Blob but did not click save, so production template JSON was not intentionally mutated. No Prisma migration or seed was run.
- **Evidence**: `receipts/2026-06-05-template-designer-visible-render-fix.md`.
- **Next**: If the user still sees a blank designer, first hard refresh the exact Vercel alias and inspect whether `upper-canvas` has a non-transparent background. Do not rely only on object count; verify visible pixels.

---

## Main Fast-Forward + Production Deploy - 2026-05-24
- **Current Outcome**: `main` is synced with `codex/edu-production-readiness` and pushed to `origin/main` at `e4bab40`.
- **Deployment**: Vercel production deployment `dpl_8vQ9fWhfVJh1AAfKjzUr8mpNHH4o`, status Ready, aliases include `edu-manager-gules.vercel.app`.
- **Verification**: Local gates on `main` passed (`git diff --check`, `npx tsc --noEmit`, unit 28/28, frontend lint, build, root/frontend audit). Production smoke passed: root 200, auth no-token 401, cron no-token 403, login 200, dashboard contract, student-fees, receipt PDF, template upload-image 201, and Playwright 6/6.
- **Note**: Git push to `main` did not visibly create a Vercel deployment, so production was deployed via `npx vercel deploy --prod --yes`.
- **Evidence**: `receipts/2026-05-24-main-merge-production-deploy.md`.

## Post-Deploy Operational Hygiene Closeout - 2026-05-24
- **Current Outcome**: The stale unchecked hygiene item in `current-session.md` is closed as a post-deploy dirty-tree hygiene task.
- **Agent Coordination**: Used Codex `multi_agent_v1` sidecar agents as the available fallback for `ck:team`: one explorer classified all dirty/untracked files, one explorer audited temp/generated artifacts, and one worker identified the real next unchecked item.
- **Cleanup Done**: Removed 9 untracked `frontend/update*` rewrite scripts after no-reference and workspace-path checks. Added `.gitignore` coverage for generated Playwright output, one-off update scripts, and local Codex backup files.
- **Config Safety**: `.codex/config.toml` was restored to tracked safe policy; do not stage local permission changes such as `approval_policy=never` or `sandbox_mode=danger-full-access`.
- **Decision**: Remaining dirty state is intentional but must be split into explicit batches: app/product source/tests/deploy config first, docs/memory/evidence second. Do not use broad `git add .`.
- **Verification**: `git diff --check`, `npx tsc --noEmit`, `npm run test:unit` 28/28, frontend lint, `npm run build`, root/frontend audit, and production Playwright 6/6 passed.
- **Evidence**: `receipts/2026-05-24-operational-hygiene-closeout.md`.

## Production Deploy + Env/Storage Closeout - 2026-05-23
- **Current Outcome**: Latest hardening and EduFlow UI are deployed to production on `https://edu-manager-gules.vercel.app`.
- **Deployment**: Vercel production deployment `dpl_2HXPKo2UcdrRUBrAGBzrYyeHvHe9`, status Ready, aliases include `edu-manager-gules.vercel.app`.
- **Env/Storage**: Production has encrypted `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `BLOB_READ_WRITE_TOKEN`, and `CRON_SECRET`. Vercel Blob store `edu-manager-live-blob` (`store_UOmPDaMiPE4RpzcX`) is linked for Production.
- **Fixes During Deploy**: Added `.vercelignore`; corrected root-only ignore patterns after unanchored `receipts/` and `reports/` excluded API handlers from Vercel bundle; frontend `ws` audit advisory closed through lockfile update.
- **Verification**: `npx tsc --noEmit`, `npm run test:unit` 28/28, `npm --prefix frontend run lint`, `npm run build`, `git diff --check`, root high audit, frontend full audit, final Vercel build/install, production upload-image 201, auth no-token 401, cron no-token 403, and production Playwright 6/6 all passed.
- **Important URL Note**: `edu-manager-delta.vercel.app` is stale/not the active project alias. Use `https://edu-manager-gules.vercel.app` unless Vercel aliases are intentionally changed.
- **Remaining Follow-up**: Rotate default credentials/JWT secret, define financial correction policy for old anomalous paid receipts, keep SMS/Zalo live send disabled until provider + opt-in policy are approved.

## Attendance Tuition RCA + Reports/Template UX - 2026-05-19
- **Mode**: Production-readiness hardening after user-reported attendance/tuition defects and UI/tooling requests.
- **Current Outcome**: Local-verified patch fixes shared tuition logic, Attendance UI date/weekday handling, student-level tuition reports, class bulk enrollment, Template Designer tools, and report motion UX.
- **RCA**: Phuc has 12 May attendance records and 2 June records in current Neon data. Existing paid May receipt has `days_count=0` and `amount=6000000`. Root causes: period lock did not persist total days, monthly tuition was multiplied as per-session tuition, Attendance UI used UTC date keys, and Vietnamese weekday values were not normalized.
- **Verification**: `npx tsc --noEmit`, `npm --prefix frontend run lint`, `npm run test:unit` 28/28, `npm run build`, `npm --prefix frontend run test:e2e -- ux-redesign-smoke.spec.js` 6/6, and `git diff --check` passed.
- **Evidence**: `receipts/2026-05-19-attendance-tuition-report-template-ux.md`; screenshots in `frontend/output/playwright/`.
- **Design**: Stitch project `12785236930566023458` generated `GEMINI_3_1_PRO` reports concept `bcc2bae4057745d4969b2b3b114ce526`. Figma Desktop was unavailable with `No Figma window open`.
- **Not Deployed**: No production deploy/migration/seed was run. Existing paid anomalous receipts were not auto-mutated.
- **Next**: deploy/prod-smoke if approved; define financial correction policy for historical anomalies; rotate default credentials/JWT secret.

## Production Readiness Hardening - 2026-05-18
- **Mode**: Continue `PLAN.md` execution after explicit approval.
- **Current Outcome**: Dashboard/dataflow hardening and targeted UX primitives are implemented and locally verified. This pass is not deployed.
- **Implemented**: Dashboard additive contract (`unpaid_students`, `today_attendance`, `attention_items`, `quick_metrics`), operations-console dashboard UI, DB-backed `requireAuth()` on core handlers, locked attendance period write guard, idempotent monthly-fee pay, direct receipt-to-monthly-fee linking, change-password menu action, shared PageHeader/MetricCard/PageState, Modal/DataTable/EmptyState accessibility improvements, Reports CSV/print actions, and local smoke server for `api/router.ts`.
- **Validation**: `npm run test:unit` 24/24, `npx tsc --noEmit`, `cd frontend && npm run lint -- --max-warnings=0`, `npm run build`, root/frontend audit 0 vulnerabilities, `git diff --check`, and Chrome-channel Playwright `ux-redesign-smoke.spec.js` 4/4 passed.
- **Tooling note**: Local `vercel dev` was still unreliable in unlinked/local mode; `npm run dev:smoke` is the current-code local smoke target.
- **Remaining follow-up**: deploy + production smoke if releasing this patch; rotate default credentials/JWT secret; keep SMS/Zalo live sending disabled until provider and opt-in policy are approved.

## Final Verification + Write-Back - 2026-05-17
- **Mode**: Operational closeout.
# Performance Lag RCA Closeout - 2026-05-28
- **Mode**: Production performance follow-up after user-reported remaining lag/jank.
- **Current Outcome**: Latest production deployment `dpl_8tNtmmYtCJtY8U4gv8swgUWhpKEj` is Ready and aliased to `https://edu-manager-gules.vercel.app`.
- **Implemented**: reduced large motion/blur surfaces, lighter protected-route loading, DataTable default 100 + deferred/keyed search, honest Students/Fee loading metrics, Fee Workbench stale-request guard, Attendance stale-request guard plus parallel month fetches, report select narrowing, and read-only `scripts/perf-lab.mjs`.
- **Evidence**: `receipts/2026-05-28-performance-lag-rca-closeout.md`, local perf-lab `receipts/perf/perf-lab-2026-05-28T16-04-40-168Z.md`, production perf-lab `receipts/perf/perf-lab-2026-05-28T16-08-15-968Z.md`.
- **Validation**: typecheck, lint zero warnings, unit 39/39, build, diff-check, local perf-lab pass, local Playwright 28/28, production perf-lab pass, production Playwright 28/28.
- **Residual risk**: production cold-start/Neon latency remains visible in perf-lab p95 route/API timings; next infra-level optimization should evaluate Fluid Compute/warmers, report materialization, region/pooling alignment, and cache headers.
- **Tooling note**: MCPProxy/Neural Memory and Context+ tools were not exposed in this Codex turn, so Dual-Brain write-back remains markdown-only/manual.

---

- **Current Outcome**: Phase A/B/C and B2B-005/B2B-008 closeout are implemented with evidence.
- **Latest docs/evidence commit before this update**: `4fb8297 docs(phase-c): record operations closeout`.
- **Verification**: Production `/` returned 200; protected APIs returned 401; cron routes returned 403; branch `main` matched `origin/main`; local ports 3000/5000 had no listeners; out-of-scope marker scan returned no matches.
- **Evidence**: `receipts/2026-05-17-final-verification-writeback.md`.
- **Tooling note**: MCPProxy/Neural Memory and Context+ tools were unavailable in this Codex turn, so B2B-005 was closed with degraded markdown-only fallback.
- **Remaining operational follow-up**: rotate default credentials/JWT secret; keep live reminder send disabled until provider, opt-in policy, and message templates are approved.

## Phase C Operations + Soft Delete Closeout - 2026-05-16
- **Mode**: Phase C completion after explicit approval.
- **Current Outcome**: Phase A API parity, Phase B hardening, and Phase C C1-C12 product slices are implemented and production-smoked.
- **Latest code commit**: `142b99a feat(phase-c): complete operations and soft delete`.
- **Implemented in final slice**: `CRON_SECRET`-protected monthly fee cron, parent portal, fee reminders with live-send gate, encrypted Vercel Blob backups, `deleted_at` soft delete, recycle-bin UI/API.
- **Production evidence**: `receipts/2026-05-16-phase-c-operations-soft-delete.md`.
- **Validation**: `npx prisma generate`, `npx prisma db push`, `npx tsc --noEmit`, `npm run test:unit` 18/18, `npm run build`, frontend lint max-warnings=0, root/frontend audits, `git diff --check`, local Playwright 17/17, production API smoke, and Chrome UI smoke all passed.
- **Operational follow-up**: keep `REMINDER_SEND_ENABLED=false` until provider webhook/opt-in/message approval; rotate `admin / admin123` and JWT secret before real production operation.
- **Tooling note**: MCPProxy/Neural Memory and Context+ tools were not exposed in this Codex turn, so write-back used markdown files only.

## Phase A API Parity Update — 2026-05-14
- **Mode**: Phase A production API parity implementation.
- **Current Outcome**: A1-A11/A16 are code-complete and moved to `REVIEW` in `KANBAN.md`; static/build/lint gates pass, runtime smoke is pending.
- **Implemented**: Auth middleware/logout/change-password, attendance calculate-fee, monthly fee lifecycle, receipts/payments CRUD + PDF, templates/default/upload, Supabase storage wrapper, financial/unpaid reports, frontend service shims, and `scripts/parity-test.mjs`.
- **Evidence**: `receipts/2026-05-14-phase-a-api-parity-static.md`; commands passed: `npx tsc --noEmit`, `npm run build`, `cd frontend && npm run lint`, `node --check scripts\parity-test.mjs`, `git diff --check`.
- **Not Done**: API smoke, live parity run, production deploy, Prisma migrate/seed, production Supabase mutation, and 14-step manual smoke checklist.
- **Tooling Note**: MCPProxy/Neural Memory and Context+ tools were not exposed to this Codex turn after tool discovery, so Dual-Brain write-back is degraded/manual for this task.

## Session Summary
- **Date**: 2026-06-01
- **Workspace**: EDU_MANAGER_V2
- **Mode**: Financial correction policy closeout after production performance/UX hardening.
- **Current Outcome**: Explicit admin correction workflow for historical paid receipt/monthly-fee anomalies is implemented, deployed, and smoke-tested on production.

## Latest Project Truth
- **Product**: Edu Manager V2 education management system.
- **Status**: Production live on `https://edu-manager-gules.vercel.app`.
- **Latest production deployment observed**: `dpl_8KRG5ePFEqeKNLZxZZdb9cMjdNg6`.
- **Latest fix**: Template Designer visible render/upload fix. Fabric `upper-canvas` must remain transparent; future tests should prove visible pixel/hash deltas, not only object count.
- **Correction policy**: do not bulk rewrite historical paid receipts. Use Reports/Receipts anomaly actions one record at a time with an operator reason.
- **Residual risk**: production serverless/DB latency remains measurable on dashboard/report/workbench APIs; current UI/API smoke passes but deeper backend latency work remains separate.

## Completed This Session
- [x] Added shared finance anomaly detection and correction-note policy.
- [x] Added admin-only `POST /api/receipts/:id/correct`.
- [x] Exposed anomaly metadata in Receipts, student-fees report, and Monthly Fees workbench.
- [x] Added Reports/Receipts admin correction actions and Fee Workbench admin-review locks.
- [x] Blocked recycle-bin restore for corrected receipts.
- [x] Deployed to production and ran local + production smoke evidence.

## Verification Snapshot
- `npx tsc --noEmit` passed.
- `npm run test:unit` passed 43/43.
- `npm --prefix frontend run lint -- --max-warnings=0` passed.
- `npm run build` passed.
- `git diff --check` passed with LF/CRLF warnings only.
- Local Playwright UX 11/11 and Phase-B 17/17 passed.
- Production Playwright Phase-B 17/17, modal-scroll 1/1, and targeted UX 4/4 passed.
- Production perf-lab passed; latest reports live under `receipts/perf/perf-lab-2026-06-01T*.md`.
- Production correction route probes were non-mutating: no-token 401, authenticated nonexistent receipt 404.

## Next Recommended Work
0. Start Phase 0 of `plans/2026-06-09-eduflow-motion-ux-stitch-figma/plan.md`: open production and the Facebook motion reference in Chrome, capture baseline states, and create the loading/motion inventory before invoking Stitch.
0. 2026-06-08 optional TODO closeout is deployed; use `receipts/2026-06-08-optional-todo-closeout.md` for evidence and continue with anomaly review or credential rotation.
1. Audit current report anomalies and correct them through the new admin action with a reason.
2. Rotate default admin credentials and JWT secret before real operation.
3. Open a dedicated backend-latency task for serverless/DB endpoints still sampling around 2.8-4.6s.

---

## Session Summary
- **Date**: 2026-05-14
- **Workspace**: EDU_MANAGER_V2
- **Mode**: Scope/path cleanup after agency PRD reset
- **Current Outcome**: External workspace names and hard-coded out-of-scope paths removed from workflow, doctrine, memory/session, and related skill files. EDU_MANAGER_V2 is the only active workspace scope.

## Correct Project Truth
- **Product**: Edu Manager V2 education management system.
- **Status**: ⚠️ Production live, partial usable. Agency PRD assessment estimates 50-60% usable until Phase A API parity is verified.
- **Production URL**: https://edu-manager-delta.vercel.app
- **Login**: `admin / admin123`
- **Repository**: https://github.com/hts2008/edu_manager_v2
- **Current Git HEAD observed in Codex session**: `433d21c`.

## Architecture Summary
- **Frontend**: Vite + React + Tailwind CSS v4.
- **Backend**: Node.js / Express-style serverless API on Vercel.
- **Database**: Neon PostgreSQL.
- **ORM**: Prisma.
- **Deployment**: Vercel production app with Neon connection pooling and Vercel Blob.
- **Build Rule**: `npx prisma generate` must run before frontend build.

## Core Patterns to Preserve
| Pattern | Purpose |
|---------|---------|
| Snake-Sync | Map Prisma camelCase fields to snake_case UI contracts. |
| Prisma Singleton | Avoid serverless database connection exhaustion. |
| Tri-State Sync | Identify → Reactivate → Insulate for soft-deleted records. |
| Bulk Aggregation | Use bounded fetch + in-memory `Map` for attendance/reporting. |
| Parametric Branching | Prefer `?action=X` to avoid dynamic route shadowing. |

## Completed Restoration Work
- [x] Identified external workspace contamination in active/session memory files.
- [x] Restored `memory/memory-bank/activeContext.md` to Edu Manager truth.
- [x] Restored `memory/memory-bank/progress.md` to Edu Manager history.
- [x] Restored `memory/memory-bank/decisionLog.md` with Edu Manager ADRs.
- [x] Restored `memory/sessions/current-session.md` for current Edu Manager task.
- [x] Restored `memory/sessions/handoff.md` for future continuity.
- [x] Removed project-specific external workspace names and hard-coded out-of-scope paths from workflow/doctrine/memory/skill files.
- [x] Updated KANBAN operational hygiene rows and Last Updated timestamp.

## Next Recommended Work
1. Review the operational hygiene diff and optionally commit it as a dedicated non-app-code change set.
2. Start Phase A with `A1` — add `requireAuth(handler, roles?)` middleware in `lib/auth.ts`.
3. Keep UI/UX improvements and seed-data expansion deferred until production API parity passes.

## Known Risks
- Workspace may still have many untracked framework files and deletions from the contamination incident.
- Root doctrine files should not retain project-specific external workspace names; treat project memory and KANBAN as higher-priority project truth for EDU_MANAGER_V2.
- Avoid broad search/replace across framework files unless explicitly requested and reviewed.

## Verification Status
- KANBAN confirms Edu Manager production-live, partial-usable state from agency PRD reset.
- Workspace text scan found no remaining known external workspace markers or hard-coded out-of-scope paths.
- No frontend/backend application source files were changed for the cleanup.

---

## Session Summary
- **Date**: 2026-06-09
- **Workspace**: EDU_MANAGER_V2
- **Mode**: EduFlow Motion Phase 4 continuation.
- **Current Outcome**: Dashboard/Login/Modal slice is implemented, deployed, and production-smoked; `UXM-2026-06-09-04` is IMPLEMENTED.

## Completed This Session Slice
- [x] Rebuilt Login as an EduFlow operational access screen with action progress and no visible demo credential block.
- [x] Added Dashboard partial-error retry banner so detail-load failures are visible.
- [x] Added opt-in unsaved-change guard, guarded child cancel buttons, keyboard focus loop, and focus restoration in shared Modal.
- [x] Applied guarded cancel behavior and sticky action footers to Students, Parents, Classes, and Teachers long edit forms.
- [x] Ran local static/build/browser checks and recorded receipt evidence.

## Verification Snapshot
- `npm --prefix frontend run lint -- --max-warnings=0` passed.
- `npx tsc --noEmit` passed.
- `npm run test:unit` passed 61/61.
- `npm run build` passed.
- `npm --prefix frontend run test:e2e -- modal-guard.spec.js --reporter=list --output=../docs/artifacts/playwright/modal-guard-phase4` passed 3/3.
- Local browser baseline passed 12/12 at `docs/artifacts/ux-baseline/local-phase4-dashboard-login-modal-guarded/2026-06-09T16-57-29-699Z/`.
- Local reduced-motion browser baseline passed 24/24 at `docs/artifacts/ux-baseline/local-phase4-dashboard-login-modal-guarded-reduced/2026-06-09T16-58-10-058Z/`.
- Vercel deploy `dpl_9qWTHirrZpVktfNh5W3wcaHRZX5V` is Ready and aliased to `https://edu-manager-gules.vercel.app`.
- Production `modal-guard.spec.js` passed 3/3 at `docs/artifacts/playwright/modal-guard-phase4-production/`.
- Production browser baseline passed 12/12 at `docs/artifacts/ux-baseline/production-phase4-dashboard-login-modal-guarded/2026-06-09T17-11-14-311Z/`.
- Production reduced-motion baseline passed 24/24 at `docs/artifacts/ux-baseline/production-phase4-dashboard-login-modal-guarded-reduced/2026-06-09T17-12-28-101Z/`.
- Production mobile drawer/back-forward probe passed and captured `docs/artifacts/ux-baseline/production-phase4-mobile-drawer-back-forward.png`.

## Evidence
- `receipts/2026-06-09-eduflow-motion-phase4-dashboard-login-modal.md`

## Still Open
- Phase 5 attendance/finance/reports visual normalization.
- Production route timing remains sensitive to serverless cold starts; dashboard smoke sampled around 5-8s but had no functional failures.
## 2026-06-10 Handoff - EduFlow Motion Phase 5

- **Completed locally**: `UXM-2026-06-09-05` Attendance/Finance/Reports.
- **Key changes**: Attendance week readiness guards; Fee Workbench no aggregate fallback on workbench failure, stale action lock, row-month validation, print progress; Reports stale data guard, backend page clamp, drawer audit context, visible tuition matrix heading.
- **Evidence**: `receipts/2026-06-10-eduflow-motion-phase5-attendance-finance-reports.md`; `docs/artifacts/ux-baseline/2026-06-09T18-31-42-820Z/`.
- **Gates passed**: lint zero warnings; `npx tsc --noEmit`; unit 61/61; build; Playwright Phase 5 7/7; Playwright template/UX 12/12; UX baseline 16/16.
- **Not done**: production deploy was not run in this turn.
- **Next**: either deploy Phase 5 to production and run production smoke, or continue the next unchecked UXM phase.

## 2026-06-10 Handoff - EduFlow Motion Phase 6

- **Completed locally**: `UXM-2026-06-09-06` Template Designer/Admin/Parent.
- **Key changes**: Template Designer status/save/upload/layer/shortcut hardening; Templates operational layout and JSON paper labels; Users shared modal/retry/confirm; Import/Recycle/FeeReminders long-operation and confirmation UX; Parent Portal mobile-first read-only loading/error flow.
- **Evidence**: `receipts/2026-06-10-eduflow-motion-phase6-template-admin-parent.md`; `docs/artifacts/ux-baseline/local-phase6-template-admin-parent-reduced/2026-06-10T05-54-51-997Z/`.
- **Gates passed**: lint zero warnings; `npx tsc --noEmit`; unit 61/61; build; Playwright admin/parent 2/2; Playwright Template Designer 1/1; UX baseline 100/100.
- **Not done**: production deploy was not run in this turn; at that point Figma write remained blocked because only read/metadata Figma tools were exposed. Later Desktop/Computer Use evidence reduced UXM-02 to `REVIEW`.
- **Next**: `UXM-2026-06-09-07` responsive/accessibility/performance hardening, then `UXM-2026-06-09-08` deploy and production smoke.

## 2026-06-10 Handoff - EduFlow Motion Phase 7

- **Completed locally**: `UXM-2026-06-09-07` Responsive/A11y/Performance.
- **Key changes**: Added shared layout live/status region; added Template Library icon action accessible names; added Phase 7 Playwright guard for responsive, accessibility, runtime errors, overflow, and reduced motion.
- **Evidence**: `receipts/2026-06-10-eduflow-motion-phase7-responsive-a11y-performance.md`; `docs/artifacts/ux-baseline/local-phase7-responsive-a11y-performance/2026-06-10T06-29-24-670Z/`; `docs/artifacts/playwright/phase7-responsive-a11y-local/`; `receipts/perf/perf-lab-2026-06-10T06-33-58-416Z.md`.
- **Gates passed**: lint zero warnings; `npx tsc --noEmit`; unit 61/61; build; diff-check; Playwright Phase 7 2/2; UX baseline 150/150; perf-lab pass.
- **Not done**: production deploy was not run in this turn. Numeric CLS is not directly emitted by the UX baseline script yet.
- **Next**: `UXM-2026-06-09-08` deploy and production smoke/closeout.

## 2026-06-10 Handoff - Figma Desktop Write Path

- `UXM-2026-06-09-02` is no longer an absolute Figma-write blocker.
- Figma MCP remains read/inspect only, but Figma Desktop can be authored through Computer Use after switching Toolbelt mode to Design.
- First Figma source-of-truth proof node: `31:2` in page `3:2` (`EDU_MANAGER_V2 Production UX`).
- Primary current source-pack node: `35:128`, named `EDU_MANAGER_V2 / EduFlow Motion V3 Source Pack`.
- Coarse native component definition: `37:415`, created from the source pack through Figma Desktop `Ctrl+Alt+K` and verified by Figma MCP metadata/context/screenshot.
- Evidence receipt: `receipts/2026-06-10-figma-desktop-write-path-unblocked.md`.
- Verified through Figma MCP `get_metadata`, `get_design_context`, and `get_screenshot`.
- Superseded by 2026-06-11 closeout: Phase 2 is now `IMPLEMENTED` using plugin-authored native components/frames and final receipt evidence.

## 2026-06-10 Handoff - EduFlow Motion Phase 8

- **Completed in production**: `UXM-2026-06-09-08` Production Verification And Closeout.
- **Deployment**: Vercel `dpl_FMemytCK71osPxvskCWb4o2qt2B5` is Ready and aliased to `https://edu-manager-gules.vercel.app`.
- **Key evidence**: `receipts/2026-06-10-eduflow-motion-phase8-production-closeout.md`; `docs/artifacts/ux-baseline/production-phase8-responsive-a11y-performance/2026-06-10T06-45-34-107Z/`; `docs/artifacts/playwright/phase7-responsive-a11y-production/`; `docs/artifacts/playwright/phase8-template-production/`; `docs/artifacts/playwright/phase8-report-bi-production/`; `receipts/perf/perf-lab-2026-06-10T06-59-13-443Z.md`.
- **Gates passed**: production responsive/a11y 2/2; production Template Designer 1/1; production Report BI 3/3; production UX baseline 150/150; production perf-lab pass; `git diff --check` clean except existing CRLF warnings.
- **Superseded note**: Figma MCP writeback remains unavailable, but Figma Desktop/Computer Use plus the local plugin path later provided enough verified source-of-truth evidence to close UXM-02.
- **Next**: Decide whether to optimize cold serverless/DB timings further or move back to product feature work. Current production smoke has no P0/P1 UX failure, but perf-lab p95 remains several seconds on DB-heavy routes.

## 2026-06-10 Handoff - EduFlow Motion Phase 1 Selection Closeout

- **Completed**: `UXM-2026-06-09-01` Stitch exploration/selection is now `IMPLEMENTED`.
- **Selected direction**: `Calm Operations + Motion Data Command`, scored 95/100 using the weighted matrix.
- **Evidence**: `receipts/2026-06-10-eduflow-motion-phase1-selection-closeout.md`.
- **Superseded review note**: `UXM-2026-06-09-02` Figma source-of-truth sync is now `IMPLEMENTED`; nodes `31:2`, `35:128`, and `37:415` remain historical evidence before the final plugin-authored native nodes.
- **Fallback prepared**: `docs/artifacts/figma-handoff/eduflow-motion-v3-source-of-truth-spec.md` defines the Figma page structure, variables, components, desktop/mobile frames, prototype flows and implementation mapping for the future write pass.
- **Next**: Future Figma expansion should be planned as a new UX enhancement batch, not as Phase 2 blocker work.

## 2026-06-10 Handoff - EduFlow Motion Track Final State

- **Closed**: UXM code/deploy/browser scope is closed. UXM-00, UXM-01, and UXM-03 through UXM-08 are `IMPLEMENTED`.
- **Closed after this historical note**: UXM-02 Figma source-of-truth sync is now `IMPLEMENTED` through final accepted nodes `49:436`, `49:438`, `49:440`, `49:442`, `49:444`, `49:447`, and `49:472`.
- **Prepared/used for completion**: `docs/artifacts/figma-handoff/eduflow-motion-v3-source-of-truth-spec.md`, Figma node `35:128`, coarse component definition `37:415`, and the final closeout receipt.
- **Operational boundary**: Do not claim Figma synchronization until actual Figma frames/tokens/components are written and node IDs are recorded.

## 2026-06-11 Handoff - Conditional Figma Deploy Gate Recheck

- **Request handled**: Continue the approved UX/UI track and deploy to production only if Figma is done.
- **Subagent review**: Two `ck:team` explorer agents reviewed Figma DoD and deploy readiness. Both concluded the deploy gate is not open: UXM-02 remains `REVIEW`, and the worktree is too dirty for an auditable release without explicit staging plus rerun gates.
- **Runtime verification**: Computer Use connected to Figma Desktop window `EDUMANAGER - Figma`; the active Figma accessibility tree reports `Figma Design, 1 item selected` and selected component definition `EDU_MANAGER_V2 / EduFlow Motion V3 Source Pack` with ID `37:415`.
- **Figma MCP/Desktop verification**: `get_metadata(37:415)` returned a single `<symbol ... width="2400" height="1800" />`, confirming it is still a coarse source-pack component wrapper. Computer Use created one native variable probe `color/primary = #4F46E5` in `Collection 1`, but `get_variable_defs(37:415)` returned `{}` because that probe is not bound to the selected source-pack component or final frames. `get_metadata(3:2)` still shows stale frames `3:36`/`3:142` with duplicate finance navigation.
- **Decision**: No new PROD deploy was run because the user's condition "if Figma is done" is false. Phase 2 remains `REVIEW` until granular variables/components/variants and linked implementation frames are authored and verified.
- **Evidence**: `receipts/2026-06-10-figma-desktop-write-path-unblocked.md` now includes the 2026-06-11 recheck section.

## 2026-06-11 Handoff - Native Token Binding Component Probe

- **Request handled**: Continue `UXM-2026-06-09-02` with subagent-assisted review plus Figma Desktop/Computer Use evidence.
- **Subagent review**: Explorer `Ampere` confirmed the next unchecked item is still Phase 2 source-of-truth completion, not deploy. The agent was closed after reporting to avoid keeping stale subagents open.
- **New Figma proof**: Computer Use created a native Figma component definition `47:421`, named `UXM-02 / Native Token Binding Probe / primarySoft Card`.
- **Token binding proof**: Figma MCP `get_variable_defs(47:421)` returned `{"color/brand/primarySoft":"#eef2ff"}`.
- **Design-context proof**: Figma MCP `get_design_context(47:421)` returned implementation code using `bg-[var(--color/brand/primarysoft,#eef2ff)]`, confirming the component is reading a native variable binding rather than only visual pixels.
- **Page integrity check**: Figma MCP `get_metadata(3:2)` still shows exactly one coarse source-pack symbol `37:415` and one native probe symbol `47:421`; no accidental duplicate source-pack component was left behind.
- **Decision**: This probe reduces risk, but it does not complete UXM-02. Full token set, granular component library/variants, corrected current desktop/mobile frames, loading/prototype flows, and final node IDs remain pending.
- **Deploy gate**: Closed. Do not deploy a UX/UI release on the basis of this Figma proof alone.

## 2026-06-11 Handoff - Native Figma Plugin Source Frames

- **Request handled**: Continue UXM-02 and use Figma/Computer Use for source-of-truth design artifacts.
- **RCA**: Figma Desktop was open but positioned on an offscreen monitor (`x=-2060`), so screenshots of the primary monitor made it look like Figma was not responding/writing. Moving the Figma window to the primary monitor unblocked direct desktop operation.
- **Plugin path**: Added local development plugin under `tools/figma-eduflow-source-plugin/` with dynamic page loading and Figma Variables API binding.
- **Figma action**: Imported/ran `EduFlow Source Of Truth Builder` from Figma Desktop Quick Actions.
- **Created nodes**: native reusable components `49:436`, `49:438`, `49:440`, `49:442`, `49:444`; desktop frame `49:447`; mobile frame `49:472`; implementation note `49:483`.
- **MCP verification**: `get_variable_defs(49:447)` returned brand/surface/border/status token bindings; `get_variable_defs(49:436)` returned `color/brand/primary`; `get_variable_defs(49:444)` returned `color/brand/primary` and `color/brand/primarySoft`. `get_design_context` succeeded for `49:447`, `49:436`, and `49:472`; screenshots rendered for `49:447` and `49:472`.
- **Status**: UXM-02 remains `REVIEW` pending final design acceptance and deployment mapping. This pass did not run a new production deploy.
