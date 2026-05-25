# Progress Log

### 2026-05-19 - Phase MOT-UX-002 Dashboard Glassmorphic Redesign
- **Scope**: Modernize the `DashboardPage.jsx` layout using a premium "MotionSites.ai" glassmorphic aesthetic.
- **Implementation**: Transformed the Dashboard from standard cards to a premium glassmorphic layout using `@theme` color tokens (`surface-dim`, `glass-surface`, `midnight-indigo`) defined in `index.css`. Integrated `recharts` to implement a responsive Line Chart for real-time revenue and expense visualization, replacing static metric sections. Added depth via backdrop-blur, gradient-mesh background effects, and subtle shadow-blending. Enhanced interactivity using `framer-motion` for staggered entrance animations and hover states. Maintained API-driven data flow.
- **Validation**: UI changes successfully passed `npm run build` locally.
- **Next Steps**: Expand the glassmorphic design system to `TeachersPage`, `AttendancePage`, and `FeeCollectionPage`. Monitor production bundle sizes and perform cross-device QA testing.
- **STATUS**: IMPLEMENTED

---

### 2026-05-16 — Phase C C4 Monthly Fee Automation Dry-Run Review
- **Scope**: Add idempotent monthly fee generation without enabling unattended production mutation.
- **Implementation**: Added Vercel `/api/monthly-fees/generate`, Express reference `/api/monthly-fees/generate`, `monthlyFeesService.generate`, and Playwright API contract coverage. Endpoint defaults to `dry_run=true`; `dry_run=false` only creates/updates `pending|ready` fees and skips `confirmed|paid`.
- **Performance Fix**: Initial production dry-run hit Vercel 504 due N+1 attendance queries. The serverless handler was rewritten to use one monthly attendance `groupBy` and in-memory map aggregation.
- **Verification Passed**: `npx tsc --noEmit`, frontend lint max-warnings=0, `npm run test:unit` 13/13, `npm run build`, root/frontend audit 0 vulnerabilities, and `cd frontend && npm run test:e2e -- --reporter=list` 14/14.
- **Production Smoke**: After commit `26dfa7e`, production dry-run for `2026-05` returned `success=true`, `total_students=22`, `would_create=22`, `would_update=0`, `skipped=0`; Google Chrome/Playwright production smoke passed 1/1.
- **Evidence**: `receipts/2026-05-16-phase-c-monthly-fee-automation.md`.
- **Remaining**: Vercel Cron config and `dry_run=false` production mutation are not enabled until explicit approval.
- **STATUS**: REVIEW

---

### 2026-05-16 — Phase C C1 Bulk Actions Production Closeout
- **Scope**: Add multi-select bulk actions for Students, Parents, Receipts, and Payments without changing schema.
- **Implementation**: Added Vercel `/api/bulk-actions`, Express reference `/api/bulk-actions`, shared `bulkActionsService`, selectable `DataTable`, reusable `BulkActionBar`, and bulk controls on the four target pages.
- **Safety**: Admin-only API; students support archive via `status=inactive`; destructive delete paths guard linked records and report per-row failures. Parents/receipts/payments support delete only because current schema has no archive/deletedAt field.
- **Verification Passed**: `npx tsc --noEmit`, frontend lint max-warnings=0, `npm run test:unit` 13/13, `npm run build`, root/frontend audit 0 vulnerabilities, local mutation smoke using a temporary parent, and `cd frontend && npm run test:e2e -- --reporter=list` 13/13.
- **Production Smoke**: After commit `53e1b42`, production API validation returned `400 VALIDATION_ERROR`, non-mutating missing-ID smoke returned `success=true` with `failed=1/NOT_FOUND`, and Google Chrome/Playwright production smoke passed 1/1 for the bulk action UI/API contract.
- **Evidence**: `receipts/2026-05-16-phase-c-bulk-actions.md`.
- **Remaining**: Destructive production bulk actions were not run and still require explicit approval.
- **STATUS**: IMPLEMENTED

---

### 2026-05-16 — Phase C C11 User Management Production Closeout
- **Scope**: Add admin user management with list/create/update/deactivate/reset-password, using existing `User` schema.
- **Implementation**: Added Vercel `/api/users` routes, Express reference route, `usersService`, `/users` route/sidebar item, `UserManagementPage`, and `UserModal`.
- **Safety**: Server responses never return password hashes; deactivate/delete is implemented as status change; self-deactivation is blocked. Production smoke remains read-only unless the user explicitly approves mutation.
- **Verification Passed**: `npx tsc --noEmit`, `cd frontend && npm run lint -- --max-warnings=0`, `npm run test:unit` 13/13, `npm run build`, root/frontend `npm audit --audit-level=high`, local `/api/users` smoke, and `cd frontend && npm run test:e2e -- --reporter=list` 12/12.
- **Evidence**: `receipts/2026-05-16-phase-c-user-management.md`.
- **Production Smoke**: After commit `e05239e`, production login succeeded, read-only `GET /api/users` returned `success=true` with 2 users, and Google Chrome/Playwright production smoke passed 1/1 for `/users`.
- **Remaining**: Production user mutations were not run and still require explicit approval.
- **STATUS**: IMPLEMENTED

---

### 2026-05-16 — Phase C C7 Advanced Reports Local Review
- **Scope**: Add read-only advanced reports with revenue trend, teacher utilization, retention cohort, and stable CSV export.
- **Implementation**: Added Vercel `/api/reports/advanced`, Express reference parity route, `reportsService.getAdvanced`, `/advanced-reports` route/sidebar item, `AdvancedReportsPage`, and `exportAdvancedReport`.
- **Verification Passed**: `npx tsc --noEmit`, `cd frontend && npm run lint -- --max-warnings=0`, `npm run test:unit` 13/13, `npm run build`, root/frontend `npm audit --audit-level=high`, and `cd frontend && npm run test:e2e -- --reporter=list` 11/11.
- **Evidence**: `receipts/2026-05-16-phase-c-advanced-reports.md`.
- **Production Smoke**: After commit `bc8880a`, production `/api/reports/advanced` returned `success=true`, one revenue trend row, five teacher utilization rows, and summary; Google Chrome/Playwright production smoke passed 1/1 for `/advanced-reports`.
- **Remaining**: Mutation-heavy Phase C tasks still need explicit production boundaries before execution.
- **STATUS**: IMPLEMENTED

---

### 2026-05-16 — Phase C C3 Attendance Insight Production Closeout
- **Scope**: Close C3 after deploying the read-only attendance insight API and UI.
- **Implementation**: Pushed scoped commit `2986240` with Vercel `/api/attendance/insights`, Express reference parity, frontend service, `/attendance-insights` route, sidebar item, heatmap page, and E2E coverage.
- **Production Smoke**: Admin API login succeeded; `GET /api/attendance/insights` returned `success=true`, 365 days, and 465 records for `2025-05-17` to `2026-05-16`.
- **Browser Verification**: Google Chrome/Playwright production smoke for `attendance insights page and API contract are available` passed 1/1 against `https://edu-manager-delta.vercel.app`.
- **Evidence**: `receipts/2026-05-15-phase-c-attendance-insight.md`.
- **Degradation**: MCPProxy/Neural Memory/Context+ tools were still not exposed in this Codex session; markdown-only/manual write-back used.
- **STATUS**: IMPLEMENTED

---

### 2026-05-15 — Phase B Validation and Dependency Security
- **Scope**: Continue Phase B with server-side validation and security audit remediation.
- **Implemented**: Added zod validation helper and applied it to login, student, class, receipt, and payment write paths. Replaced vulnerable frontend `xlsx` export with CSV export. Removed root `vercel` and `@vercel/node` dependencies and replaced type imports with local type definitions.
- **Verification Passed**: `npm run test:unit` (8/8), `npx tsc --noEmit`, `cd frontend && npm run lint -- --max-warnings=0`, `npm run build`, root `npm audit --audit-level=high`, frontend `npm audit --audit-level=high`.
- **Evidence**: `receipts/2026-05-15-phase-b-validation-security.md`.
- **Remaining**: React Hook Form form validation, Playwright E2E, observability, credential rotation.
- **STATUS**: PARTIAL PHASE B — SERVER VALIDATION AND AUDIT CLEAN

---

### 2026-05-15 — Phase B Foundation Hardening Baseline
- **Scope**: Start Phase B after Phase A production parity by adding low-risk quality and reliability foundation.
- **Implemented**: Removed tracked frontend `.backup` files, ignored future backups, added API client `VITE_API_BASE`/retry/401 handling, added React ErrorBoundary, added login rate-limit baseline, added unit tests, added GitHub Actions CI, and recorded backend strategy.
- **Verification Passed**: `npm run test:unit` (6/6), `npx tsc --noEmit`, `cd frontend && npm run lint -- --max-warnings=0`, `npm run build`, and local browser smoke on `/`, `/students`, `/classes`, `/receipts`, `/payments`.
- **Evidence**: `receipts/2026-05-15-phase-b-foundation-hardening.md`.
- **Remaining**: B2 validation, B5 Playwright E2E, B7b observability/security, credential rotation, and broader integration tests.
- **STATUS**: PARTIAL PHASE B — FOUNDATION IMPLEMENTED

---

### 2026-05-15 — Phase A Production API Parity Implemented
- **Scope**: Complete Phase A production parity after user approved Neon + Vercel Blob setup.
- **Infrastructure**: Configured Neon project `dry-dew-91484915`, updated Vercel env, created Vercel Blob store `edu-manager-blob`, pushed Prisma schema, and seeded baseline data.
- **Deployment Fixes**: Deployed Phase A API code, then fixed Vercel function quota by consolidating API handlers behind `api/router.ts`; fixed router rewrite/lazy-loading; fixed monthly-fee calculate fallback and pdfmake runtime.
- **Verification Passed**: `npx tsc --noEmit`, `npm run build`, `cd frontend && npm run lint` (26 warnings, 0 errors), `node --check scripts\parity-test.mjs`, production API smoke, Chrome UI smoke, receipt/payment PDF smoke, and parity/contract run.
- **Production Evidence**: Vercel production alias points to commit `cd77f48`; Chrome UI smoke over `/receipts`, `/fee-collection`, `/payments`, `/templates`, `/reports`, `/history`, `/attendance`, `/attendance-periods` had no failed fetch requests.
- **Residual Risks**: Default credentials still need rotation; Phase B must add automated tests, validation, CI, observability, rate limiting, and lint cleanup.
- **Evidence**: `receipts/2026-05-15-phase-a-production-closeout.md`.
- **STATUS**: IMPLEMENTED

---

### 2026-05-14 — Phase A Closeout Attempt Blocked on Deploy/Config
- **Scope**: Implement safe parts of the Phase A/B/C plan by verifying Phase A closeout gates without production mutation.
- **Code/Config Change**: Added `SUPABASE_BUCKET` to `.env.example`; updated `lib/storage.ts` to read `SUPABASE_BUCKET` with `template-images` fallback.
- **Static Verification**: `npx tsc --noEmit`, `npm run build`, `cd frontend && npm run lint`, `node --check scripts\parity-test.mjs`, and `git diff --check` all pass. Lint remains 26 warnings, 0 errors.
- **Runtime Verification**: Production no-token probe returns 401 for `/api/auth/me` but 404 for Phase A routes (`receipts`, `payments`, `templates`, `reports/financial`, `reports/unpaid-students`, `monthly-fees`, `attendance/calculate-fee`), so live Vercel does not yet have Phase A code.
- **Browser Verification**: Production browser login with `admin/admin123` shows `Internal server error`; local reference browser smoke succeeds after rebuilding `better-sqlite3` and starting Express + Vite.
- **Blockers**: `npx prisma migrate status` fails against current `.env`/direct-host retry; local `vercel dev` fails because Vercel CLI has no credentials/token; live production needs Vercel deploy/config access.
- **Evidence**: `receipts/2026-05-14-phase-a-closeout-attempt.md`.
- **STATUS**: PARTIAL — PHASE A CLOSEOUT BLOCKED ON DEPLOY/CONFIG

---

### 2026-05-14 — Phase A Production API Parity Code Port
- **Scope**: Implement Phase A Vercel Serverless TypeScript + Prisma parity for Auth, Attendance fee, Monthly Fees, Receipts, Payments, Templates, Reports, PDF, Storage, frontend service shims, and parity testing.
- **Implemented**: Added `requireAuth(handler, roles?)`, logout/change-password, `attendance/calculate-fee`, `monthly-fees/*`, `receipts/*`, `payments/*`, `templates/*`, `reports/financial`, `reports/unpaid-students`, `lib/pdf.ts`, `lib/storage.ts`, and `scripts/parity-test.mjs`.
- **Frontend Compatibility**: Updated `frontend/src/services/api.js` for monthly fee calculate/pay signatures and base64 JSON template image upload. Fixed lint-only unused-variable issues and kept React Compiler migration findings as warnings.
- **Verification Passed**: `npx tsc --noEmit`, `npm run build`, `cd frontend && npm run lint`, `node --check scripts\parity-test.mjs`, and `git diff --check`.
- **Not Run**: API smoke, parity live run, 14-step manual production smoke, deploy, Prisma migrate/seed, or any production Supabase mutation.
- **Status**: REVIEW — code port complete with static evidence; runtime smoke and approved target verification pending before `IMPLEMENTED`.

> Append only. Most recent entry at top. Restored for EDU_MANAGER_V2 after external workspace memory cross-contamination.

---

### 2026-05-14 — EDU_MANAGER_V2 Scope/Path Cleanup
- **Scope**: Remove hard-coded out-of-scope paths and project-specific external workspace names from workflows, doctrine, memory/session files, and related skills.
- **Action**: Replaced the stale `D:\...` infrastructure path in `.agent/workflows/start-session.md` with the workspace-relative `.\scripts\start-infrastructure.ps1` fallback and aligned Neural Memory guidance to `edu_manager` only.
- **Files Updated**: `AGENTS.md`, `CLAUDE.md`, `CODEX.md`, `.agent/workflows/start-session.md`, `KANBAN.md`, `memory/memory-bank/*`, `memory/sessions/*`, `skills/ai-coding/swot-analysis/SKILL.md`, and `skills/cli-orchestration/SKILL.md`.
- **Verification**: Workspace text scan returned no remaining known external workspace markers or hard-coded out-of-scope paths.
- **App Code Safety**: No frontend/backend application source files changed for this cleanup.
- **STATUS**: IMPLEMENTED ✅

---

### 2026-04-25 — Context+ Verification Passed After Reload
- **Scope**: Re-run Context+ integration gates after user reloaded the MCP host/workspace.
- **Result**: `get_context_tree` succeeded and returned the repository tree; `semantic_code_search` also succeeded.
- **Verification**: Context+ is operational again for EDU_MANAGER_V2. Dual-Brain runtime is fully restored alongside Neural Memory on `edu_manager`.
- **Residual Note**: Output still shows a legacy `--help/` directory artifact from earlier bad startup behavior, but this no longer blocks MCP operation.
- **App Code Safety**: No app source files changed during verification.
- **STATUS**: IMPLEMENTED ✅

---

### 2026-04-25 — Context+ Runtime Stabilization Execution
- **Scope**: Execute approved operational plan to stabilize Context+ before app development or commit hygiene.
- **Result**: Minimal `.mcp.json` remediation applied: Context+ now starts via Windows-safe `cmd /c npx -y contextplus .` with explicit EDU_MANAGER_V2 root.
- **Evidence**: `.mcp.json` parsed as valid JSON; standalone startup smoke returned `Context+ MCP server running on stdio | root: C:\Users\haitr\OneDrive\0. GAU DATA\0.APP\EDU_MANAGER_V2`.
- **NM Gate**: `neural-memory-edu-manager:nmem_health` confirmed `brain=edu_manager`, Grade C, purity 62.7.
- **Remaining Blocker**: Existing Antigravity MCP client still returns `connection closed: EOF`; likely requires MCP host/workspace reload to pick up patched config.
- **App Code Safety**: Git status for app-code paths is clean; no app source files changed.
- **STATUS**: PARTIAL — CONFIG FIX APPLIED, MCP HOST RELOAD REQUIRED ⚠️

---

### 2026-04-25 — Gate Check and Context+ Stabilization Intake
- **Scope**: Complete pre-code gate after Neural Memory maintenance and dirty-state classification.
- **Result**: Confirmed app-code paths are clean; dirty state is framework sync plus restored board/memory files.
- **NM Gate**: `neural-memory-edu-manager:nmem_health` confirmed `brain=edu_manager`, Grade C, purity 62.7, 117 neurons, 357 synapses, 15 fibers.
- **C+ Gate**: Context+ remains degraded. MCP `get_context_tree` fails with `connection closed: EOF`; direct `npx -y contextplus --help` starts stdio server and treats `--help` as root path.
- **Reports/Evidence**: `receipts/` and `reports/` directories are absent; evidence currently lives in command output, KANBAN, and memory files.
- **Next Work**: Plan Context+ runtime stabilization as Medium-risk ops maintenance and wait for approval before changing runtime config.
- **STATUS**: READY FOR PLAN REVIEW ⚠️

---

### 2026-04-25 — Neural Memory edu_manager Maintenance and Gate Check
- **Scope**: Verify the previous memory-restoration work before starting the next task.
- **Result**: `neural-memory-edu-manager:nmem_health` confirmed `brain=edu_manager`, Grade C, purity 62.2, 115 neurons, 346 synapses, 14 fibers.
- **Maintenance**: Ran diverse Edu Manager recalls covering Vercel, Supabase, Prisma, attendance, billing, holiday status, review workflow, and serverless deployment patterns.
- **Consolidation**: `nmem_consolidate(strategy=mature)` ran safely on `edu_manager`; no memories promoted because Neural Memory requires repeated recalls over time.
- **Gates**: No app build/lint/type/test executed because no app source code changed. Operational gates passed for NM health, recall specificity, KANBAN update, and memory update.
- **Open Issue**: Context+ `get_context_tree` fails with `connection closed: EOF`; Dual-Brain remains degraded until fixed.
- **Next Work**: Classify git dirty state into framework sync, memory restoration, and app-code buckets; then repair/escalate Context+ runtime.
- **STATUS**: IMPLEMENTED WITH KNOWN C+ BLOCKER ⚠️

---

### 2026-04-25 — Memory Restoration: EDU_MANAGER_V2 Context Recovered
- **Scope**: Correct workspace memory files that had been overwritten by unrelated external workspace state.
- **Action**: Re-established EDU_MANAGER_V2 as the active project context.
- **Confirmed Product State**: Historical claim recorded as complete and production live; superseded by agency PRD reset on 2026-05-06, which classifies production as partial usable until Phase A API parity passes.
- **Production URL**: https://edu-manager-delta.vercel.app
- **Known Login**: `admin / admin123`
- **Known HEAD from prior audit**: `fc400eb` — `feat(attendance): add review modal before approving`.
- **Important Warning**: Working tree was reported dirty with many framework-related deletions/untracked files. Avoid broad commits.
- **Validation**: `progress.md`, `decisionLog.md`, `current-session.md`, and `handoff.md` were read back and contain Edu Manager truth; remaining external-workspace mentions are contamination warnings, not project facts.
- **NM Status**: `neural-memory-edu-manager` upstream verified with `brain=edu_manager`; 5 initial project memories saved and recall verified.
- **NM Health**: Improved from empty-brain Grade F to Grade D after seeding; further improvement requires more recalls/memories over time.
- **Next Work**: Superseded by Phase A production API parity; UI/UX improvements and seed data expansion are deferred.
- **STATUS**: RESTORED + VALIDATED ✅

---

### 2026-04-25 — Cross-Contamination Audit and Option B Decision
- **Finding**: `memory/memory-bank/*` and session handoff files contained external project facts instead of EDU_MANAGER_V2 facts.
- **Decision**: Option B selected — keep the local workflow framework structure, but overwrite project memory/session content with accurate EDU_MANAGER_V2 truth.
- **Reason**: The orchestration framework can remain useful as workflow infrastructure, but project truth must remain Edu Manager-specific.
- **Source of Correct Truth**: EduManage Knowledge Item plus project KANBAN and current repository state.
- **STATUS**: DECIDED ✅

---

### 2026-04-25 — Project State Snapshot for Restoration
- **Product**: Edu Manager V2 education management platform.
- **Stack**: Vite + React + Tailwind CSS v4 frontend; Node/Express-style serverless API; Prisma ORM; managed PostgreSQL.
- **Deployment**: Vercel production app currently connected to Neon PostgreSQL.
- **Build Gotcha**: Vercel build requires `npx prisma generate` before frontend build.
- **Core Data Pattern**: Prisma/camelCase backend fields map manually to snake_case frontend contracts.
- **Serverless Pattern**: Prefer query-param action branching where dynamic route shadowing is likely.
- **STATUS**: RECORDED ✅

---

### Production Restoration and Stabilization — Prior Completed Work
- **Production Deployment**: Edu Manager V2 restored and verified on Vercel + Supabase.
- **Prisma Desync Incident**: Prisma client/database desynchronization was resolved and documented.
- **Login Recovery**: Production login path recovered.
- **Attendance Periods Migration**: Attendance periods logic migrated for serverless reliability.
- **QA/QC**: API and browser automation verification documented in the EduManage Knowledge Item.
- **STATUS**: COMPLETED ✅

---

### Attendance Enhancements — Prior Completed Work
- **Holiday Status**: Added billing-aware Holiday (`Ngày lễ`) attendance behavior.
- **Calendar Markers**: Added visual calendar markers for attendance states.
- **Review Workflow**: Added Attendance Review flow with grouped review data, approve path, and reject/return capability.
- **Implementation Pattern**: Used student-grouped in-memory maps for review aggregation.
- **STATUS**: COMPLETED ✅

---

### Core System Completion — Prior Completed Work
- **Infrastructure**: Tailwind CSS v4 + Vite, Prisma ORM, Neon PostgreSQL, Vercel deployment.
- **Frontend**: Login, Dashboard, Students, Parents, Teachers, Classes, Attendance, Receipts, Payments, History, Reports, Templates, Template Designer, Attendance Periods.
- **Backend**: 70+ API endpoints, JWT auth + role access, PDF generation, Excel export, fee calculation, activity logging.
- **Documentation**: README, Vietnamese user guide, KANBAN, project knowledge artifacts.
- **STATUS**: HISTORICAL COMPLETION CLAIM — SUPERSEDED BY AGENCY PRD RESET

---

### 2026-05-15 — Phase B E2E Smoke Baseline
- **Scope**: Add Playwright smoke suite for auth, student onboarding surface, attendance, fee collection, payment surface, receipts/templates, and reports/API financial shape.
- **Implementation**: Added `frontend/playwright.config.js`, `frontend/e2e/phase-b-smoke.spec.js`, and `frontend` `test:e2e` script.
- **Safety**: Default E2E target is local `http://127.0.0.1:3000`; production can be targeted explicitly with `E2E_BASE_URL`. Mutation actions remain disabled unless `E2E_ALLOW_MUTATION=1`.
- **Validation**: `cd frontend && npm run test:e2e -- --reporter=list` passed 6/6 against local serverless target.
- **STATUS**: IMPLEMENTED ✅

---

### 2026-05-15 — Phase B React Hook Form Validation
- **Scope**: Add frontend form validation for Student, Class, Receipt, and Payment forms.
- **Implementation**: Added shared frontend zod schemas in `frontend/src/utils/formValidation.js`; wired React Hook Form + zod resolver into the four target forms while preserving existing payload contracts.
- **E2E Update**: Extended Playwright smoke to assert Student/Class/Receipt/Payment validation messages without mutating data.
- **Validation**: lint max-warnings=0, build, unit tests, audit, type-check, and Playwright smoke all pass; Playwright local serverless target passed 7/7.
- **STATUS**: IMPLEMENTED ✅

---

### 2026-05-15 — Phase B Observability/Security Hardening
- **Scope**: Close B7c baseline for API observability, security headers, and authenticated mutation audit.
- **Implementation**: Added `lib/observability.ts`, wired security headers/request IDs through `api/router.ts` and `handleCors`, replaced shared `sendApiError` raw logging with structured redacted logging, and added router-level `API_<METHOD>` audit events for authenticated mutation requests.
- **Validation**: `npm run test:unit` passed 13/13; `npx tsc --noEmit` passed; `npm run build` passed with existing Vite chunk warnings; `cd frontend && npm run lint -- --max-warnings=0` passed; root/frontend `npm audit --audit-level=high` passed; `cd frontend && npm run test:e2e -- --reporter=list` passed 7/7.
- **Production Smoke**: After Vercel deployment of commit `20949c2`, `/api/auth/me` returned the new security/request-id headers, login + `/api/auth/me` succeeded for the approved admin smoke account, and browser `/payments` loaded with no network/error text or console errors.
- **Degradation**: MCPProxy/Neural Memory/Context+ tools were not exposed in this Codex session; work used markdown-only/manual memory write-back.
- **STATUS**: IMPLEMENTED ✅

---

### 2026-05-15 — Phase C C8 Audit Log UI
- **Scope**: Add admin filterable activity log view backed by existing `activity_logs` data.
- **Implementation**: Added Vercel `/api/activity-logs`, Express reference `/api/activity-logs`, `activityLogsService`, `/audit-logs` route, sidebar menu item, and `AuditLogsPage`.
- **Validation**: `npx tsc --noEmit`, frontend lint max-warnings=0, `npm run test:unit` 13/13, `npm run build`, root/frontend audit 0 vulnerabilities, and Playwright smoke 8/8 pass locally.
- **Production Smoke**: After Vercel deployment of commit `e5cdcfa`, `GET /api/activity-logs?limit=5` returned 5 logs with total 45, and browser `/audit-logs` rendered the admin audit UI with no console errors.
- **STATUS**: IMPLEMENTED ✅

---

### 2026-05-15 — Phase C C12 Center Settings
- **Scope**: Add admin UI and API for center profile fields already present in `CenterSettings`.
- **Implementation**: Added Vercel `/api/center-settings`, Express reference `/api/center-settings`, `centerSettingsService`, `/settings` route, sidebar menu item, and `CenterSettingsPage`.
- **Validation**: `npx tsc --noEmit`, frontend lint max-warnings=0, `npm run test:unit` 13/13, `npm run build`, root/frontend audit 0 vulnerabilities, and Playwright smoke 9/9 pass locally.
- **Production Smoke**: After Vercel deployment of commit `903544f`, `GET /api/center-settings` returned populated settings, and browser `/settings` rendered the center profile UI with no console errors. Production PUT was not run to avoid live settings mutation without approval.
- **STATUS**: IMPLEMENTED ✅

---

### 2026-05-15 — Phase C C3 Attendance Insight
- **Scope**: Add read-only attendance heatmap insight for all-center, class, or student filters.
- **Implementation**: Added Vercel `/api/attendance/insights`, Express reference `/api/attendance/insights`, `attendanceService.getInsights`, `/attendance-insights` route, sidebar menu item, and `AttendanceInsightsPage`.
- **Validation**: `npx tsc --noEmit`, frontend lint max-warnings=0, `npm run test:unit` 13/13, `npm run build`, root/frontend audit 0 vulnerabilities, and Playwright smoke 10/10 pass locally.
- **STATUS**: REVIEW — production smoke pending after Vercel deploy.

---

### 2026-05-16 - Phase C C2 Student CSV Import
- **Scope**: Implement student + parent CSV import with preview, validation, duplicate detection, and rollback-protected commit.
- **Implementation**: Added shared import parser/preview logic in `lib/import-students.ts`, Vercel `/api/import/students`, Express reference `/api/import/students`, frontend `importService`, `/imports` route/sidebar page, and Playwright preview coverage.
- **Safety**: Production smoke was preview-only. Import commit was verified locally with a temporary student + parent and immediate direct cleanup; no production import commit or data mutation was run.
- **Validation**: Initial red unit test failed on missing module, then `npm run test:unit` passed 16/16; `npx tsc --noEmit`, frontend lint max-warnings=0, `npm run build`, root/frontend audit, and local Playwright 15/15 passed.
- **Production Smoke**: After commit `aed68f2` deployed, no-token route probe changed 404 -> 401, production preview API returned `total_rows=2`, `valid_rows=1`, `invalid_rows=1`, and Google Chrome/Playwright `/imports` smoke passed 1/1.
- **STATUS**: IMPLEMENTED

---

### 2026-05-16 - Phase C Remaining Blockers Classified
- **Scope**: Reconcile the remaining Phase C board after C2 completion.
- **Finding**: C4, C5, C6, C9, and C10 cannot be safely completed without explicit approval or external configuration.
- **Blocked Items**: C4 needs cron/production mutation approval; C5 needs parent auth strategy; C6 needs SMS/Zalo provider, opt-in policy, and rate controls; C9 needs backup target and restore-drill target; C10 needs schema migration plan and migration approval.
- **STATUS**: RECORDED

---

### 2026-05-16 - Phase C Operations + Soft Delete Closeout
- **Scope**: Complete C4 monthly fee automation, C5 parent portal, C6 fee reminders, C9 backup automation, and C10 soft delete/recycle bin after explicit approval.
- **Implementation**: Commit `142b99a` added cron endpoints protected by `CRON_SECRET`, shared monthly fee generation, parent portal JWT login, reminder preview/send-disabled flow, encrypted Vercel Blob backups, `deleted_at` schema fields, and recycle-bin UI/API.
- **Production Mutation**: `npx prisma db push` synced Neon schema. Production monthly fee generation for 2026-05 created 22 fees with total amount 20,150,000 VND.
- **Validation**: `npx tsc --noEmit`, `npm run test:unit` 18/18, `npm run build`, frontend lint max-warnings=0, root/frontend audits, `git diff --check`, and local Playwright smoke 17/17 passed.
- **Production Smoke**: Vercel deployment for `142b99a` reached Production Current Ready; backup upload/verify passed; unauthenticated cron returned 403; fee reminder preview returned 22 and live send remained disabled; recycle-bin temp delete/purge passed; parent portal login returned 2 students; Google Chrome UI smoke for `/fee-reminders`, `/backups`, `/recycle-bin`, `/parent-login`, and `/parent-portal` passed with no API failures.
- **Operational Note**: Live SMS/Zalo delivery remains disabled until provider webhook, opt-in policy, and `REMINDER_SEND_ENABLED=true` are intentionally configured. MCPProxy/Neural Memory/Context+ were unavailable in this Codex turn, so write-back used markdown files only.
- **STATUS**: IMPLEMENTED

---

### 2026-05-17 - Final Verification + Write-Back
- **Scope**: Close B2B-005 and B2B-008 after Phase C closeout.
- **Verification**: Production probes returned `/` 200, protected API routes 401, and cron endpoints 403. Branch `main` HEAD `4fb8297` matches `origin/main`. Local ports 3000/5000 have no listeners.
- **Scope Hygiene**: Text scan for out-of-scope markers returned no matches.
- **Tooling**: MCPProxy/Neural Memory/Context+ tools were not exposed in this Codex turn; final write-back was completed in markdown-only degraded mode.
- **Evidence**: `receipts/2026-05-17-final-verification-writeback.md`.
- **STATUS**: IMPLEMENTED

---

### 2026-05-17 - PDF + UX Production Hardening
- **Scope**: Fix garbled Vietnamese receipt/payment PDFs, harden print flow, group the expanded menu into primary/secondary sections, and create a Figma UX source-of-truth frame.
- **Implementation**: Embedded pdfmake Roboto VFS fonts in `lib/pdf.ts` and `backend/src/services/pdfService.js`; fixed Express reference pdfmake 0.3 constructor/async document creation; added shared `openAuthenticatedPdf`; replaced raw print blob handling in receipts/history/fee collection; rebuilt sidebar/header/layout/table shell; added Chrome-channel UX/PDF E2E smoke.
- **Design Sync**: Stitch project `12785236930566023458` and design screen `11130771813747459123` were created; Stitch variant/design-system calls returned `invalid argument`. Figma file `EDUMANAGER` was updated with page `EDU_MANAGER_V2 Production UX`, tokens `3:3`, desktop shell `3:36`, and mobile drawer `3:142`; design context was inspected.
- **Validation**: `npm run test:unit` 20/20, `npx tsc --noEmit`, frontend lint max-warnings=0, `npm run build`, targeted UX smoke 3/3, and full local Playwright E2E 20/20 all passed.
- **Production Smoke**: Commit `f544464` deployed; production receipt PDF returned 200 `application/pdf`, 16871 bytes, `%PDF`, `/ToUnicode`, Roboto, and no Helvetica. Production `/receipts` desktop/mobile menu grouping rendered with no API failures and horizontal overflow 0.
- **Evidence**: `receipts/2026-05-17-pdf-ux-production-hardening.md`.
- **STATUS**: IMPLEMENTED

---

### 2026-05-18 - Production Readiness Hardening From PLAN.md
- **Scope**: Continue from `PLAN.md` and close the next unchecked item: dashboard/dataflow readiness plus targeted UX primitives, while keeping SMS/Zalo live sending disabled.
- **Implementation**: Added dashboard production contract fields (`unpaid_students`, `today_attendance`, `attention_items`, `quick_metrics`); redesigned `DashboardPage` as a data-linked operations console; converted core handlers from token-only `verifyAuth()` to DB-backed `requireAuth()`; added locked attendance period guards; made monthly-fee pay conditional/idempotent; linked direct receipt creation to monthly-fee rows; wired the change-password modal; added `PageHeader`, `MetricCard`, `PageState`; improved Modal/DataTable/EmptyState accessibility; added CSV export/print actions for Reports; added `scripts/local-smoke-server.ts` to smoke current `api/router.ts` without relying on broken local Vercel CLI recursion.
- **Design Sync**: Reused Stitch project `12785236930566023458`, inspected generated Stitch screen `228034b2eb8a493da04a30c4f029372f`, and inspected Figma node `3:36` from the EDU_MANAGER_V2 Production UX file as the shell/source-of-truth reference.
- **Validation**: `npm run test:unit` passed 24/24; `npx tsc --noEmit` passed; `cd frontend && npm run lint -- --max-warnings=0` passed; `npm run build` passed outside sandbox after esbuild access failure inside sandbox; root/frontend `npm audit --audit-level=high` passed 0 vulnerabilities; `git diff --check` passed; Chrome-channel Playwright smoke `ux-redesign-smoke.spec.js` passed 4/4 against `npm run dev:smoke`.
- **Runtime Notes**: Local `vercel dev` still fails in unlinked local mode with a PATH-to-regexp warning and missing `yarn`, so the new smoke server is the reliable current-code local verification target. No production deploy, migration, seed, or destructive data mutation was run in this pass.
- **STATUS**: IMPLEMENTED locally; production deploy/smoke remains the next release step if desired.

---

### 2026-05-19 - Attendance Tuition RCA + Reports/Template UX
- **Scope**: Fix incorrect attendance/session-count tuition logic, add student-level tuition report, support bulk class enrollment, upgrade Template Designer, and continue motion-oriented UX pass.
- **RCA**: Phuc currently has 12 May attendance records and 2 June records in Neon. The paid May receipt has `days_count=0` and `amount=6000000`, caused by lock-time fee generation not setting `totalDays`, per-session treatment of monthly tuition, unsafe UTC date keys, and wrong Vietnamese weekday normalization.
- **Implementation**: Added `lib/tuition.ts` and `tests/tuition.test.ts`; wired tuition calculations into attendance calculate-fee, monthly fees, attendance-period lock fee refresh, generator, and receipt creation; added `frontend/src/utils/dateKeys.js`; added class bulk `student_ids`; added `/api/reports/student-fees` and Reports matrix; rebuilt Template Designer with image/background upload, layer/align/duplicate/lock/opacity tools; added motion-grid CSS and extended Playwright smoke.
- **Design Sync**: Stitch generated `GEMINI_3_1_PRO` reports concept `projects/12785236930566023458/screens/bcc2bae4057745d4969b2b3b114ce526`. Figma Desktop was unavailable with `No Figma window open`, so no Figma update was made.
- **Validation**: `npx tsc --noEmit`, `npm --prefix frontend run lint`, `npm run test:unit` 28/28, `npm run build`, `npm --prefix frontend run test:e2e -- ux-redesign-smoke.spec.js` 6/6, and `git diff --check` passed.
- **Evidence**: `receipts/2026-05-19-attendance-tuition-report-template-ux.md`; screenshots `frontend/output/playwright/reports-student-fees.png` and `frontend/output/playwright/template-designer.png`.
- **Safety**: No production deploy/migration/seed. Existing paid anomalous receipts were not auto-mutated; they now need explicit adjustment/void/reissue policy.
- **STATUS**: IMPLEMENTED locally; production deploy/smoke remains next release step.

---

### 2026-05-23 - Production Deploy + Env/Storage Closeout
- **Scope**: Deploy the 2026-05-18/2026-05-19 hardening and EduFlow UI updates to the active Vercel production project, restore missing runtime env/storage, and verify production end to end.
- **Root Cause**: The current active Vercel project `hts2008s-projects/edu-manager` had no Production env vars, so login initially failed with missing `DATABASE_URL`. The stale `edu-manager-delta` URL was not the current project alias. An initial `.vercelignore` used unanchored `receipts/` and `reports/` patterns, which excluded `server/api/receipts` and `server/api/reports` from the serverless bundle.
- **Implementation/Ops**: Added Production `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `BLOB_READ_WRITE_TOKEN`, and `CRON_SECRET` without logging values. Created and linked Vercel Blob store `edu-manager-live-blob`; deleted three unlinked empty Blob stores created during non-interactive CLI discovery. Added root-anchored `.vercelignore`. Closed frontend `ws` audit advisory through `npm --prefix frontend audit fix`.
- **Production Deployment**: Final production deployment `dpl_2HXPKo2UcdrRUBrAGBzrYyeHvHe9` is Ready and aliased to `https://edu-manager-gules.vercel.app`.
- **Validation**: `npx tsc --noEmit` passed; `npm run test:unit` 28/28 passed; `npm --prefix frontend run lint` passed; `npm run build` passed; `git diff --check` passed; root `npm audit --audit-level=high` passed; frontend `npm audit` found 0 vulnerabilities; Vercel build install found 0 vulnerabilities.
- **Production Smoke**: Root page 200 with current assets; login 200; no-token `/api/auth/me` 401; no-token cron 403; `/api/templates/upload-image` 201 with Blob URL; `npm --prefix frontend run test:e2e -- ux-redesign-smoke.spec.js` against production passed 6/6.
- **Design Context**: Applied the attached EduFlow guideline direction in code: indigo/violet/cyan palette, grouped navigation, motion-rich operations dashboard, modern glass surfaces, and production table/report/template ergonomics.
- **Remaining Follow-up**: Rotate default credentials/JWT secret; define financial correction policy for historical anomalous paid receipts; keep live SMS/Zalo disabled until provider/opt-in policy is approved.
- **STATUS**: IMPLEMENTED

---

### 2026-05-24 - Post-Deploy Operational Hygiene Closeout
- **Scope**: Close the stale unchecked `current-session.md` item about isolating/committing operational hygiene drift after the production deploy/env closeout.
- **Agent Review**: Spawned Codex sidecar explorer/worker agents to classify dirty tree state. Consensus: keep app/product hardening files, keep deploy/audit/receipt/memory evidence, delete one-off frontend update scripts, and exclude risky local `.codex/config.toml` policy drift from commits.
- **Cleanup**: Removed 9 untracked `frontend/update*` rewrite scripts after `rg` found no references and after resolved-path verification confirmed all targets were under the EDU_MANAGER_V2 workspace. Added `.gitignore` entries for `frontend/output/`, `frontend/update*.cjs`, `frontend/update*.js`, `frontend/update*.ps1`, and `.codex/*.bak`.
- **Config Safety**: Restored `.codex/config.toml` to tracked safe policy so `approval_policy=never` and `sandbox_mode=danger-full-access` are no longer dirty workspace state.
- **Decision**: Remaining dirty files must be handled as explicit batches: app/product source and tests first, docs/memory/evidence second. No broad `git add .`; no `.codex/config.toml` staging.
- **Verification**: `git diff --check`, `npx tsc --noEmit`, `npm run test:unit` 28/28, frontend lint, `npm run build`, root/frontend audit, and production Playwright 6/6 all passed.
- **Evidence**: `receipts/2026-05-24-operational-hygiene-closeout.md`.
- **STATUS**: IMPLEMENTED

---

### 2026-05-24 - Main Fast-Forward + Production Deploy
- **Scope**: Make `main` the source-of-truth for the production hardening branch and verify production after deployment.
- **Git**: Fast-forwarded `main` from `54902e5` to `e4bab40` and pushed `origin/main`.
- **Deployment**: Vercel Git deploy did not appear automatically, so `npx vercel deploy --prod --yes` was run from `main`. Deployment `dpl_8vQ9fWhfVJh1AAfKjzUr8mpNHH4o` reached Ready and was aliased to `https://edu-manager-gules.vercel.app`.
- **Local Verification Before Push**: `git diff --check`, `npx tsc --noEmit`, `npm run test:unit` 28/28, frontend lint, `npm run build`, root audit, and frontend audit passed.
- **Production Smoke**: root 200; no-token `/api/auth/me` 401; no-token cron 403; login 200; dashboard contract includes `stats`, `recent_transactions`, `unpaid_students`, `today_attendance`, `attention_items`, and `quick_metrics`; student-fees report 200; receipt PDF 200 `application/pdf` and `%PDF`; template upload-image 201 with Blob URL; production Playwright 6/6.
- **Evidence**: `receipts/2026-05-24-main-merge-production-deploy.md`.
- **STATUS**: IMPLEMENTED

---

### 2026-05-25 - P0/P1 Production Readiness Local Closeout
- **Scope**: Continue from the approved production-live goal and close the latest menu, fee, receipt, dashboard, and PDF defects before deploy.
- **Implementation**: Fixed `/classes` production crash by importing Motion, added full protected-menu route traversal across 22 routes on desktop/mobile, made attendance-period lock transactional and multi-class aware, protected monthly-fee calculate/confirm/cancel/pay with conditional state guards, blocked new positive tuition receipts with zero chargeable sessions, surfaced receipt-only zero-day anomalies in student-fees report, fixed dashboard unpaid aggregate math, and expanded Fabric-to-PDF support for text/line/rect/circle/ellipse/group/base64 image with fallback for unsupported image sources.
- **Team Mode**: Used Codex `ck:team` worker delegation for the bounded PDF slice and integrated/reverified the result locally.
- **Validation**: `git diff --check` passed; `npx tsc --noEmit` passed; `npm run test:unit` passed 35/35; frontend lint max-warnings=0 passed; `npm run build` passed after stopping the local smoke server that held Prisma's Windows query-engine DLL; root/frontend audits passed with 0 vulnerabilities; Playwright `ux-redesign-smoke.spec.js` passed 7/7 against `npm run dev:smoke`.
- **Evidence**: `receipts/2026-05-25-p0-p1-production-readiness.md`.
- **STATUS**: LOCAL VERIFIED; production deploy/smoke pending.
