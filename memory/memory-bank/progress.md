# Progress Log

### 2026-06-12 - Student Progress Assessment Expansion Plan
- **Scope**: Plan the next phase after the implemented evidence-first student progress report: add a teacher-entered monthly assessment/update workflow, Cambridge-track weighting, real skill inputs, daily practice/shield tracking, and stronger parent/BA analytics.
- **Decision**: Keep the existing `/student-progress` report intact; do not replace the current operational proxy until rubric-backed teacher inputs exist.
- **STATUS**: PLANNED

### 2026-06-11 - UXM-02 Native Figma Variable Probe
- **Scope**: Continue the next unchecked `UXM-2026-06-09-02` item and use Figma Desktop through Computer Use to test whether native variables can be authored.
- **Implementation/evidence**: Computer Use opened the Figma Variables panel, created one native color variable in `Collection 1`, renamed it through Figma slash grouping to `color/primary`, and set the value to `#4F46E5`.
- **Verification**: Computer Use verified the visible row as group `color`, variable `primary`, value `4F46E5`. Figma MCP `get_variable_defs(37:415)` still returned `{}` because the probe is not bound to the selected source-pack component or final frames.
- **Decision**: Small native variable authoring is possible through Desktop, but this is only a probe. `UXM-2026-06-09-02` remains `REVIEW`; deploy gate remains closed until the full variable set, granular components/variants, corrected frames, bindings, and node IDs are complete.
- **Evidence**: `receipts/2026-06-10-figma-desktop-write-path-unblocked.md`.
- **STATUS**: REVIEW

---

### 2026-06-10 - Figma Desktop Write Path Verified For UXM-02
- **Scope**: Retest the Figma source-of-truth blocker using the user-requested `@figma` plugin plus Figma Desktop Computer Use approach.
- **Findings**: Figma MCP still exposes read/inspect tools only, but Figma Desktop can be driven in Design mode.
- **Implementation/evidence**: Computer Use switched `EDUMANAGER - Figma` from Inspect/Dev Mode to Design mode, pasted an EduFlow Motion V3 source-of-truth SVG board, and created real Figma node `31:2`.
- **Verification**: Figma MCP `get_metadata(31:2)` confirmed readable text/vector children; `get_screenshot(31:2)` rendered the imported board.
- **Decision**: `UXM-2026-06-09-02` moved from absolute `BLOCKED` to `REVIEW`; write path exists, but full token/component/frame source-of-truth expansion remains pending.
- **Evidence**: `receipts/2026-06-10-figma-desktop-write-path-unblocked.md`.
- **STATUS**: REVIEW

---

### 2026-06-12 - Working Tree Hygiene Closeout
- **Scope**: Continue cleaning the remaining dirty/untracked drift from the UX/report/template tracks while preserving the verified Student Monthly Progress Parent Report evidence trail.
- **Implementation**: Classified the tree into intentional source/docs/evidence versus generated browser traces, then added `.gitignore` rules for `docs/artifacts/ux-baseline/`, `docs/artifacts/playwright/`, and `**/.last-run.json` so the large local browser artifacts stay outside git.
- **Verification**: Re-ran `git diff --check`, frontend lint, `npx tsc --noEmit`, and `npm run build`; the Student Progress feature stayed implemented/production-smoked.
- **Evidence**: `receipts/2026-06-12-working-tree-hygiene-closeout.md`.
- **STATUS**: IMPLEMENTED

---

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

### 2026-05-25 - P0/P1 Production Readiness Closeout
- **Scope**: Continue from the approved production-live goal and close the latest menu, fee, receipt, dashboard, and PDF defects before deploy.
- **Implementation**: Fixed `/classes` production crash by importing Motion, added full protected-menu route traversal across 22 routes on desktop/mobile, made attendance-period lock transactional and multi-class aware, protected monthly-fee calculate/confirm/cancel/pay with conditional state guards, blocked new positive tuition receipts with zero chargeable sessions, surfaced receipt-only zero-day anomalies in student-fees report, fixed dashboard unpaid aggregate math, and expanded Fabric-to-PDF support for text/line/rect/circle/ellipse/group/base64 image with fallback for unsupported image sources.
- **Team Mode**: Used Codex `ck:team` worker delegation for the bounded PDF slice and integrated/reverified the result locally.
- **Validation**: `git diff --check` passed; `npx tsc --noEmit` passed; `npm run test:unit` passed 35/35; frontend lint max-warnings=0 passed; `npm run build` passed after stopping the local smoke server that held Prisma's Windows query-engine DLL; root/frontend audits passed with 0 vulnerabilities; Playwright `ux-redesign-smoke.spec.js` passed 7/7 against `npm run dev:smoke`.
- **Deployment**: Implementation commit `d2e19df` and docs closeout commit `5b2b568` were pushed to `origin/main`; final Vercel deployment `dpl_2gi9iJBPBnMAKRJb1ZsZs365DGcL` reached Ready and was aliased to `https://edu-manager-gules.vercel.app`.
- **Production Smoke**: Production Playwright `ux-redesign-smoke.spec.js` passed 7/7. API probes passed: root 200, no-token auth 401, no-secret cron 403, login 200, dashboard required fields with `quick_metrics.unpaid_count=14`, student-fees report 200 with 26 students and 2 anomalies, receipts list 200, receipt PDF 200 `application/pdf` with `%PDF` and 17070 bytes.
- **Evidence**: `receipts/2026-05-25-p0-p1-production-readiness.md`.
- **STATUS**: IMPLEMENTED.

---

### 2026-05-25 - Month-Bounded Tuition + EduFlow UI Closeout
- **Scope**: Continue the active production-live goal, address the remaining Phuc/May-June tuition/session defect, reconnect receipt creation to MonthlyFee truth, normalize EduFlow UI consistency, and deploy/smoke production.
- **Implementation**: Added month-bounded weekly session counting so May 2026 computes `2/week=10` and `3/week=14`; hardened month parsing and business-month defaults; updated MonthlyFee generation and receipt creation to avoid stale/paid-row drift; updated Receipts UI to calculate through MonthlyFee and submit `monthly_fee_id`; route-guarded admin pages; restored Dashboard to a coherent light EduFlow operations console; fixed Payment modal `ArrowDownRight` runtime crash; improved responsive forms, DataTable pagination, Modal aria, and Sidebar aria state.
- **Design Sync**: Created Stitch project `16406701261521949818` with `GEMINI_3_1_PRO`; generated screen `3da9badc59d341f5ad6d7916cb2471dc`; inspected Figma page `3:2` and node `3:36 Desktop / Receipts Shell`; captured Figma screenshot for evidence.
- **Team Mode**: Spawned three bounded subagents for tuition/dataflow audit, UI/menu audit, and verification review; all were closed after use.
- **Validation**: `git diff --check` passed with LF/CRLF warnings only; `npx tsc --noEmit` passed; `npm run test:unit` passed 38/38; frontend lint max-warnings=0 passed; `npm run build` passed with existing Vite chunk warnings; local Playwright UX smoke passed 7/7; local Phase-B smoke passed 17/17.
- **Deployment**: `npx vercel deploy --prod --yes` created production deployment `dpl_3AFgxEykCcXHhtC1A29jW37ZxJ9C`, Ready and aliased to `https://edu-manager-gules.vercel.app`.
- **Production Smoke**: Production Playwright UX smoke passed 7/7 and production Phase-B smoke passed 17/17.
- **DB Note**: `npx prisma migrate status` was read-only and reported the Neon DB is not managed by Prisma Migrate because this repo has no `prisma/migrations`; no migration or seed was run.
- **Evidence**: `receipts/2026-05-25-month-bounded-tuition-eduflow-ui.md`.
- **STATUS**: IMPLEMENTED.

---

### 2026-05-25 - Fee Workbench + UX Closeout
- **Scope**: Finish the approved plan for the latest reported production UX defects: edit modals could not reach save controls, Attendance only showed a fixed 3-month window, Template Designer behaved like a shell, finance navigation duplicated `Thu tien` and `Thu hoc phi`, and tuition collection required repetitive manual receipt work.
- **Implementation**: Updated the shared modal shell to use viewport-bounded scrollable bodies; changed DataTable to default to all filtered rows with `Tat ca`, `500`, `100`, and `50` display choices; added Attendance previous/next month-window controls; made Template Designer reload by template id and support default scaffolds, undo/redo, zoom, and responsive canvas layout; merged finance navigation into one Fee Workbench; added `POST /api/monthly-fees/bulk-pay`; exposed class filtering for students/monthly fees; and rebuilt `FeeCollectionPage` with filters, multi-select, calculate-selected, batch cash/transfer collection, and print queue.
- **Team Mode**: Used Codex `ck:team` style delegation for bounded exploration/worker slices earlier in the implementation; the final closeout explorer hit quota and was closed, so final evidence reconciliation continued inline per fallback policy.
- **Validation**: `git diff --check`, `npx tsc --noEmit`, `npm run test:unit` 39/39, frontend lint max-warnings=0, `npm run build`, root/frontend high audit gates, local bulk-pay API smoke, local UX smoke 10/10, and local Phase-B smoke 17/17 passed.
- **Deployment**: Implementation commit `c793de3` was pushed to `origin/main`; Vercel production deployment `dpl_7FBhsvzbfCLy85aQoirLyhwBRg12` is Ready and aliased to `https://edu-manager-gules.vercel.app`.
- **Production Smoke**: Production login succeeded; non-mutating bulk-pay probes returned `UNAUTHORIZED` without token and `NO_SELECTION` with an empty authenticated request; production Phase-B smoke passed 17/17; production UX smoke passed 10/10 after stabilizing the attendance expectation timeout.
- **Safety**: No Prisma migration, seed, or destructive production mutation was run. The new production bulk-pay route was smoke-tested only through non-mutating error cases.
- **Evidence**: `receipts/2026-05-25-fee-workbench-ux-closeout.md`.
- **STATUS**: IMPLEMENTED.

---

### 2026-05-26 - Modal Scroll Production Fix
- **Scope**: Fix the remaining production defect where long edit/create modals could not scroll far enough to expose lower fields and save actions.
- **RCA**: Chrome production probing showed shared modals were still rendered inline under Framer Motion page wrappers and app scroll containers, so `position: fixed` was not reliably viewport-fixed. A secondary double-padding issue could keep tall dialogs a few pixels below the viewport even after portaling.
- **Implementation**: Portaled `Modal.jsx` to `document.body`, preserved/restored prior body overflow, changed the shell to `box-border overflow-hidden`, made the panel `max-h-full`, removed double vertical padding, and kept the modal body as the only scroll region with `overscroll-contain`.
- **Coverage**: Added Chrome-channel Playwright coverage that opens and scrolls action buttons for `/classes`, `/students`, `/parents`, `/teachers`, `/payments`, and `/receipts`.
- **Validation**: Local `npm run build`, `npx tsc --noEmit`, frontend lint max-warnings=0, unit 39/39, focused modal smoke 1/1, UX smoke 11/11, Phase-B smoke 17/17, and `git diff --check` passed.
- **Deployment**: Commit `8819718` was pushed to `origin/main`; Vercel production deployment `dpl_3TTwAgFMPEzeM8zfa5Q3A8RWYGDn` is Ready and aliased to `https://edu-manager-gules.vercel.app`.
- **Production Smoke**: Focused modal smoke passed 1/1; full UX smoke passed 11/11; Phase-B smoke passed 17/17.
- **Safety**: No Prisma migration, seed, or destructive production mutation was run.
- **Evidence**: `receipts/2026-05-26-modal-scroll-production-fix.md`.
- **STATUS**: IMPLEMENTED.

---

### 2026-05-27 - Performance Route-Loading Production Closeout
- **Scope**: Continue the active production-live goal and address reported slowness by reducing initial bundle cost, removing known overfetch, adding safe API dedupe/cache, and creating repeatable Chrome performance evidence.
- **Implementation**: Added route-level `React.lazy`/`Suspense`, Vite vendor manual chunks, lighter page transition, GET request cache/dedupe with mutation/401 invalidation, DB-backed `/auth/me` payload reuse, slim `/students?fields=options`, lazy student-option loading in `/classes`, read-only `/api/monthly-fees/workbench`, Fee Workbench wiring to the aggregate endpoint, unpaid-students `groupBy`, and Prisma composite indexes.
- **Team Mode**: Spawned worker/explorer subagents per user authorization, but new subagents hit runtime usage-limit errors; completed the remaining scope inline under `ck:team` fallback and closed/verified locally.
- **Validation**: `git diff --check`, `npx prisma validate`, `node --check scripts/perf-smoke.mjs`, `npx tsc --noEmit`, `npm run test:unit` 39/39, frontend lint max-warnings=0, and `npm run build` passed. Local Chrome perf smoke passed 10/10 routes and 25/25 API calls; local UX smoke passed 11/11; local Phase-B smoke passed 17/17.
- **Database/Deploy**: `npx prisma db push` synced additive indexes to Neon. Commit `5c761ba` was pushed to `origin/main`; Vercel deployment `dpl_A4LV7b5BR7g6SmVmirRAusA1Y69B` is Ready and aliased to `https://edu-manager-gules.vercel.app`.
- **Production Smoke**: Production Chrome perf smoke passed 10/10 routes and 25/25 API calls with read-only guard enabled; production UX smoke passed 11/11; production Phase-B smoke passed 17/17.
- **Evidence**: `receipts/2026-05-27-performance-production-closeout.md`, `receipts/perf/perf-smoke-2026-05-27T06-11-33-159Z.md`, `receipts/perf/perf-smoke-2026-05-27T06-17-57-458Z.md`.
- **STATUS**: IMPLEMENTED.

---

### 2026-05-28 - Performance Lag RCA Closeout
- **Scope**: Continue the active production-live performance goal after the user reported remaining lag/jank. Close the next unchecked item with `ck:team` subagent outputs, final local/browser verification, production deploy, and evidence write-back.
- **RCA**: Remaining lag came from a combination of large blur/motion surfaces, route loading overlays, false zero states while data loaded, broad DataTable search/default-all rendering, high-fanout report overfetch, and stale async Attendance/Fee Workbench request races. Production still has a cold-start/Neon latency floor, now measured separately from UI jank.
- **Implementation**: Removed heavy page remount/y motion, changed protected route loading to a lightweight skeleton, defaulted DataTable to 100 rows with deferred/keyed search, made Students/Fee metrics honest while loading, guarded Fee Workbench request races, guarded and parallelized Attendance class/week/month fetches, removed large header/sidebar/Attendance backdrop blur surfaces, narrowed report Prisma selects, added `scripts/perf-lab.mjs`, and added `npm run perf:lab`.
- **Team Mode**: Integrated three bounded subagent outputs: backend report-select worker, perf-lab worker, and frontend performance reviewer. All subagents were closed after integration.
- **Validation**: `node --check scripts/perf-lab.mjs`, `npm run perf:lab -- --help`, `npx tsc --noEmit`, frontend lint max-warnings=0, `npm run test:unit` 39/39, `npm run build`, and `git diff --check` passed. Local perf-lab passed with read-only guard and local Playwright `ux-redesign-smoke.spec.js phase-b-smoke.spec.js` passed 28/28.
- **Deployment**: `npx vercel deploy --prod --yes` produced Ready deployment `dpl_8tNtmmYtCJtY8U4gv8swgUWhpKEj`, aliased to `https://edu-manager-gules.vercel.app`.
- **Production Smoke**: Production perf-lab passed against `https://edu-manager-gules.vercel.app` with read-only violations 0. Production Playwright `ux-redesign-smoke.spec.js phase-b-smoke.spec.js` passed 28/28.
- **Evidence**: `receipts/2026-05-28-performance-lag-rca-closeout.md`, `receipts/perf/perf-lab-2026-05-28T16-04-40-168Z.md`, `receipts/perf/perf-lab-2026-05-28T16-08-15-968Z.md`.
- **STATUS**: IMPLEMENTED.

---

### 2026-06-01 - Financial Correction Policy Closeout
- **Scope**: Continue the approved production-live goal and close the next unchecked item: historical paid records with `days_count=0` and non-zero amount must be corrected by explicit admin action, not silent mutation.
- **Implementation**: Added shared finance anomaly helpers, admin-only `POST /api/receipts/:id/correct`, anomaly fields in Receipts/student-fees/workbench APIs, Reports/Receipts admin correction entry points, Fee Workbench admin-review locks, and recycle-bin restore protection for corrected receipts.
- **Team Mode**: Used existing `ck:team` subagents for backend dataflow, frontend UX, and verification review; integrated their outputs inline and closed them after evidence write-back.
- **Validation**: `npx tsc --noEmit`, `npm run test:unit` 43/43, frontend lint max-warnings=0, `npm run build`, `git diff --check`, local perf-lab, local UX smoke 11/11, local Phase-B smoke 17/17 all passed.
- **Deployment**: `npx vercel deploy --prod --yes` produced final production deployment `dpl_GJ3U47QRgzsCGxF3mvBhUGa29h9v`, Ready and aliased to `https://edu-manager-gules.vercel.app`.
- **Production Smoke**: Production perf-lab passed; production Phase-B smoke passed 17/17; production modal-scroll smoke passed 1/1; production calendar/template/PDF targeted UX smoke passed 4/4; correction route no-token returned 401 and authenticated nonexistent receipt returned 404, with no production data mutation. Final post-commit smoke confirmed root 200, auth no-token 401, and correction no-token 401.
- **Residual Risk**: Production backend latency remains measurable on dashboard/report/workbench endpoints, with serverless/DB samples still around 2.8-4.6s. This is tracked as a separate performance follow-up, not a UI smoke failure.
- **Evidence**: `receipts/2026-06-01-financial-correction-policy-closeout.md`, `receipts/perf/perf-lab-2026-06-01T13-55-44-834Z.md`, `receipts/perf/perf-lab-2026-06-01T13-58-02-410Z.md`, `receipts/perf/perf-lab-2026-06-01T14-08-01-723Z.md`.
- **STATUS**: IMPLEMENTED.

---

### 2026-06-02 - No-Blocking Flows + Line Fee Ledger Closeout
- **Scope**: Continue the active production-live goal and close the latest reported blockers in attendance make-up/cross-month logic, class bulk student loading, per-class tuition collection, receipt print/PDF, finance reports, and Template Designer.
- **Implementation**: Added `MonthlyFeeLine` and `ReceiptLine` schema models plus line sync helpers; updated monthly-fee calculate/workbench/bulk-pay to return and collect class-level fee rows; updated receipt DTO/PDF/default layout and authenticated print popups; added make-up attendance handling and cross-month period checks; fixed the class modal student loader; added finance dashboard reporting; hardened Template Designer canvas/object/upload interactions and regression coverage; ignored frontend Playwright artifact folders for Vercel packaging.
- **Team Mode**: Integrated bounded `ck:team` subagent outputs for attendance/dataflow, reports, and Template Designer slices. A final release-readiness explorer did not return before closeout, so final verification and evidence continued inline.
- **Database/Deploy**: `npx prisma db push` synced additive line-ledger schema to Neon; no seed was run. Vercel production deployment `dpl_JCDmyuFBV7yQ2zEYHu5bLyyvF4kJ` is Ready and aliased to `https://edu-manager-gules.vercel.app`.
- **Validation**: `npx prisma generate`, `npx tsc --noEmit`, `npm run test:unit` 44/44, frontend lint max-warnings=0, frontend build, root build, and `git diff --check` passed. Local Playwright passed 12/12 for template/UX and 17/17 for Phase-B.
- **Production Smoke**: Production Playwright with `E2E_BASE_URL=https://edu-manager-gules.vercel.app` passed 29/29 across Template Designer hardening, UX/menu/modal/calendar/template/PDF, and Phase-B protected route/API smoke.
- **Evidence**: `receipts/2026-06-02-no-blocking-flows-line-fee-closeout.md`.
- **STATUS**: IMPLEMENTED.

---

### 2026-06-03 - Fee Workbench Class-Line Split Patch
- **Scope**: Fix the production defect where a multi-class student could still appear as one aggregate tuition row in Fee Workbench. Each class must be a separate row because parents can pay per class on different dates.
- **RCA**: Workbench still had aggregate/legacy fallback behavior, `bulk-pay` still accepted fee/student targets, and the frontend selection model could tick non-line rows even though payment ignored them. A prior production smoke also found GET workbench timeout risk from read-time backfill/write work.
- **Implementation**: Made `GET /api/monthly-fees/workbench` read-only, returning existing line rows or non-collectable legacy review rows; changed bulk-pay to resolve all targets to `MonthlyFeeLine` IDs; made Fee Workbench send only `line_ids`; added `DataTable.isRowSelectable` so non-line/paid/admin-review rows cannot be selected; added unit/contract/E2E regression coverage.
- **Team Mode**: Used two `ck:team` explorer agents. The frontend explorer found the row-selection gap and the fix was integrated inline. The backend explorer timed out and was shut down after local/static/production gates covered the risk.
- **Validation**: `npx tsc --noEmit`, `npm run test:unit` 46/46, frontend lint max-warnings=0, `npm run build`, local API smoke (`rows=41`, `bad_multi_class_rows=0`, `payable_without_line=0`, 577ms), and local Chromium E2E 1/1 passed.
- **Deployment**: Vercel production deployment `dpl_AnCEyFGkpmZohfsrA8d95JmsuMoU` is Ready and aliased to `https://edu-manager-gules.vercel.app`.
- **Production Smoke**: Production API smoke returned `rows=41`, `bad_multi_class_rows=0`, `payable_without_line=0`, `prod_workbench_ms=6170`; production Chromium/Playwright `fee-workbench-line-split.spec.js` passed 1/1.
- **Evidence**: `receipts/2026-06-03-fee-workbench-class-line-split.md`.
- **STATUS**: IMPLEMENTED.

---

### 2026-06-04 - Template Designer Legacy Canvas Fix
- **Scope**: Fix the production issue where the default receipt template designer stayed stuck at `Dang khoi tao canvas...` after refresh/cache clear.
- **RCA**: Production and local probes showed the default template still stored legacy JSON `{"version":"1.0","elements":[]}`. Passing that shape through Fabric `loadFromJSON()` left the init path vulnerable to Fabric/React StrictMode canvas lifecycle races, producing `Cannot read properties of undefined (reading 'save')` before `canvasReady` could be set.
- **Implementation**: Added template JSON normalization that skips unsupported legacy `elements` configs and opens the default scaffold instead; added guarded Fabric disposal and init-id checks so stale async init paths cannot render or update state after cleanup; wrapped Fabric layer operations behind safe helpers; changed Template Designer E2E to use the legacy config as regression input.
- **Validation**: Local production-shape probe passed with save enabled and no page errors; `npm --prefix frontend run test:e2e -- template-designer-hardening.spec.js --reporter=list --output=playwright-template-fix-results` passed 1/1; `npm --prefix frontend run lint`, `npx tsc --noEmit`, `npm run test:unit` 46/46, and `npm run build` passed.
- **Deployment**: Commit `5e1b907` was pushed to `origin/main`; Vercel production deployment `dpl_EGoc3DQj6qYhSkFPxehw8LVUdHHt` is Ready and aliased to `https://edu-manager-gules.vercel.app`.
- **Production Smoke**: Direct Playwright probe opened default receipt template `cmp6dbuc900s7gcyrty4jd0ik`, added Text + `receipt_id` field, saw `15 object(s)`, save enabled, blank stage overlay, and no page errors. Production E2E `template-designer-hardening.spec.js` passed 1/1.
- **Evidence**: `receipts/2026-06-04-template-designer-legacy-canvas-fix.md`.
- **STATUS**: IMPLEMENTED.

---

### 2026-06-05 - Template Designer Visible Render + Upload Fix
- **Scope**: Continue the active Template Designer production goal after the user reported that upload succeeded and object count increased, but images/fields/components were still invisible on the canvas.
- **RCA**: Fabric copies the source canvas CSS class to the generated `upper-canvas`. The source canvas had `bg-white`, so the generated interaction canvas sat above the render canvas with an opaque white background and covered all visible objects. Background uploads also used low opacity and did not upscale small images.
- **Implementation**: Removed the source canvas `bg-white`, added `getUsableCanvas()` guards, disabled tool/upload/field controls until canvas-ready, refreshed coordinates/rendering after object insertion, scaled background uploads to fit the page, raised background opacity to `0.72`, and expanded Template Designer E2E to assert visible pixel/hash changes, transparent upper canvas, upload behavior, and save/reload persistence.
- **Team Mode**: Used bounded `ck:team` exploration for the RCA/review path. One final closeout explorer hit usage-limit and was closed; closeout evidence continued inline under the lead agent.
- **Validation**: `npm --prefix frontend run test:e2e -- template-designer-hardening.spec.js --reporter=list --output=playwright-template-visible-results-final` passed 1/1; headed Chrome E2E passed 1/1; `npm --prefix frontend run lint`, `npx tsc --noEmit`, `npm run test:unit` 46/46, `npm run build`, and `git diff --check` passed.
- **Deployment**: Commit `d3e3df0` was pushed to `origin/main`; Vercel production deployment `dpl_8KRG5ePFEqeKNLZxZZdb9cMjdNg6` is Ready and aliased to `https://edu-manager-gules.vercel.app`.
- **Production Smoke**: Chrome/Playwright opened `https://edu-manager-gules.vercel.app/templates/cmp6dbue800s9gcyrkhbzw8tj/design`, verified `upper-canvas` transparent before/after actions, clicked Text and `receipt_id`, uploaded image/background through the real production endpoint, confirmed checksum changes after each action, saw `17 object(s)`, and captured no runtime/API errors.
- **Safety**: Production smoke uploaded two small test images to Vercel Blob but did not click save, so template JSON was not intentionally mutated. No Prisma migration or seed was run.
- **Evidence**: `receipts/2026-06-05-template-designer-visible-render-fix.md`.
- **STATUS**: IMPLEMENTED.

---

### 2026-06-06 - Template Designer Paper Size + Canvas Alignment Fix
- **Scope**: Add A4/A5/A6/custom paper-size controls in Template Designer and fix the existing-template alignment issue where default fields could drift against the visible canvas.
- **RCA**: Designer and PDF both used DB `paper_size` as fixed enum truth, while saved Fabric JSON did not carry canvas/page metadata. Existing templates could therefore reload with stale coordinates after paper changes. Editing template metadata from the list also risked overwriting `json_config` because list DTOs omit `json_config`.
- **Implementation**: Added `json_config.paper` and `json_config.canvas` metadata, A6/custom controls, canvas resize with object scale/fit and undo/redo-aware snapshots, PDF effective-paper parsing, API enum guard for invalid paper-size writes, and a TemplatesPage metadata-edit payload that no longer sends `json_config`.
- **Team Mode**: Used a read-only `ck:team` explorer sidecar for paper/custom/offset RCA and closed it after integrating findings. Main implementation stayed inline to avoid overlapping writes in the same designer file.
- **Validation**: Focused Template Designer E2E passed 1/1 locally and headed Chrome 1/1; `npm --prefix frontend run lint`, `npx tsc --noEmit`, `npm run test:unit` 47/47, `npm run build`, and `git diff --check` passed.
- **Deployment**: Vercel production deployment `dpl_7vvKWQfjvgTJXQCSpMM52D2AtoYH` is Ready and aliased to `https://edu-manager-gules.vercel.app`.
- **Production Smoke**: Opened default receipt template `cmp6dbuc900s7gcyrty4jd0ik`, switched A6, switched custom 120x180mm, added Text and `receipt_id`, verified canvas `454x680`, non-white pixel proof, `15 object(s)`, and no API/page errors. Did not click save, so production template JSON was not mutated.
- **Evidence**: `receipts/2026-06-06-template-designer-paper-size-alignment.md`, `receipts/artifacts/template-paper-prod-smoke.png`.
- **STATUS**: IMPLEMENTED.

---

### 2026-06-08 - Optional TODO Closeout: API Docs, Reports Chart, Thermal Print, E2E CI
- **Scope**: Continue the current goal from the clean `main` state and close the remaining low-priority optional TODOs: API documentation, line chart for reports, Thermal 80mm print test, and automated E2E CI.
- **Implementation**: Added `docs/API.md` as the production Vercel API route surface, updated README to link the API source of truth instead of stale Express/SQLite and `/api/kanban` notes, added `tests/api-docs.test.ts` to enforce docs/router drift, added a Recharts line chart to Advanced Reports, added mocked `advanced-reports-chart.spec.js`, exposed `thermal_80mm` in Template Designer paper picker, hardened Template Designer paper-size E2E with polling, added Thermal 80mm PDF MediaBox coverage, and added a GitHub Actions Playwright E2E job that runs deterministic mocked browser smoke specs against frontend preview.
- **Team Mode**: Used a bounded read-only `ck:team` explorer to review route docs, CI E2E feasibility, Recharts keys, and Template Designer thermal risks. The explorer was closed after findings were integrated.
- **Validation**: `npm run test:unit` passed 50/50, `npx tsc --noEmit` passed, `npm --prefix frontend run lint -- --max-warnings=0` passed, `npm run build` passed, `git diff --check` passed, focused Playwright passed 2/2 for `advanced-reports-chart.spec.js` and `template-designer-hardening.spec.js`, and CI-equivalent frontend preview Playwright passed 2/2 after narrowing the E2E job.
- **Deployment**: Commit `fee8bc3` was pushed and Vercel production deployment `dpl_57m2wBJuvyWonYWqL98Q92BCudfC` is Ready and aliased to `https://edu-manager-gules.vercel.app`.
- **Production Smoke**: Production Playwright Advanced Reports smoke passed 1/1 with Recharts SVG assertion. Production Template Designer read-only smoke opened template `cmp6dbuc900s7gcyrty4jd0ik`, switched to `thermal_80mm`, verified `Thermal 80mm`, and measured canvas `302x756`.
- **Safety**: No Prisma migration or production seed was run. Template Designer production smoke did not click save, so no production template JSON was mutated. CI E2E uses mocked API responses and frontend preview, so it does not touch Neon, production credentials, or live data.
- **Evidence**: `receipts/2026-06-08-optional-todo-closeout.md`.
- **STATUS**: IMPLEMENTED.

---

### 2026-06-09 - Report Intelligence Center Closeout
- **Scope**: Continue the approved production-live goal and complete the report center feature requested by the user: PowerBI-like overview charts, attendance/tuition detail, student-class-month tracking, drilldown, loading UX, and production smoke evidence.
- **Implementation**: Added `lib/report-cube.ts`, admin-only `server/api/reports/bi.ts`, router/API docs/service wiring, a redesigned `/reports` page with summary cards, monthly/class charts, tab-specific analysis, server-side search, risk filter, table drilldown drawer, CSV export, route loading skeleton, and focused E2E/contract tests.
- **Review + RCA**: Two `ck:team` reviewer agents found blocking issues before final closeout. Fixed class filters so multi-class aggregate legacy fees cannot be promoted into single-class revenue; included inactive enrollments only when attendance/fee-line evidence exists in the reporting range; counted first enrollment month expected sessions from enrollment date; made tabs render real analysis content; sent search to `/api/reports/bi?q=...`; and made initial API errors render an error-only state instead of fake zero analytics.
- **Validation**: `npx tsc --noEmit`, `npm run test:unit` 58/58, `npm --prefix frontend run lint -- --max-warnings=0`, local Playwright `report-bi.spec.js` 3/3, `npm run build`, and `git diff --check` passed.
- **Deployment**: Vercel production deployment `dpl_FiyiYAoozRGsZgdhk2PwCmNP6DPV` is Ready and aliased to `https://edu-manager-gules.vercel.app`. A prior deployment `dpl_Fei1LwgEYLxkSqj59GMDazr4uiyq` was superseded after reviewer findings.
- **Production Smoke**: `GET /api/reports/bi?from=2026-01&to=2026-06&page=1&page_size=50&q=Mover` returned `success=true`, 4 rows, and `q=mover`; production Phase-B report smoke passed 2/2; production perf-lab passed 3 samples at 3967.8ms, 3303.9ms, and 1782.2ms; browser probe verified Report Intelligence charts, `Rủi ro` tab, search `Mover`, no page overflow, and no console/API errors.
- **Evidence**: `receipts/2026-06-09-report-intelligence-center.md`, `receipts/artifacts/report-bi-production-corrected.png`, `receipts/perf/perf-lab-2026-06-09T06-29-46-122Z.md`.
- **Residual risk**: `/api/reports/bi` still materializes a bounded cube before pagination; acceptable for current data but should become DB-side aggregation/materialized reporting for larger centers. `StudentClass` lacks `endedAt`, so inactive historical rows are evidence-based, not exact date-bounded.
- **STATUS**: IMPLEMENTED.

---

### 2026-06-09 - Report BI Tab-Mode + BA/PI Dashboard Patch
- **Scope**: Fix the follow-up report-center issue where clicking `Tong quan`, `Chuyen can`, `Hoc phi`, and `Rui ro` appeared to change only the active button, then expand the dashboard so it feels closer to a BA/PI analysis surface.
- **RCA**: The frontend changed local `activeTab`, but the API request did not carry a report mode and local table fallback could keep the visible dataset too similar. Backend pagination/search also did not have a stable mode filter, while class options could be derived from narrowed data and disappear after filtering. Some charts mixed money/count/risk on one axis, which made the dashboard visually misleading.
- **Implementation**: Added `mode=overview|attendance|tuition|risk` to `parseReportBiQuery`, filtered rows by mode before `q` and pagination, returned stable full-cube `meta.classes`, sent `mode` from `ReportsPage`, reset pagination when switching tabs, removed fallback rows for focused tabs, deferred search input, fixed duplicate initial error rendering, separated mixed chart axes, and added fee funnel, attendance distribution, risk breakdown, action list, and risk heatmap panels.
- **Team Mode**: Used two bounded `ck:team` explorer agents for frontend and backend review. Both agents had already become inactive by closeout time; `close_agent` returned `not found`, which means no active runtime agent remained to close.
- **Validation**: Focused unit `npx tsx --test tests/report-bi.test.ts tests/production-contracts.test.ts` passed 18/18; `npx tsc --noEmit` passed; `npm --prefix frontend run lint -- --max-warnings=0` passed; `npm run test:unit` passed 59/59; `npm run build` passed; local Playwright `report-bi.spec.js` passed 3/3; local browser probe saw 5 chart panels, no console errors, and no horizontal overflow.
- **Deployment**: `npx vercel deploy --prod --yes` produced production URL `https://edu-manager-aphqqe489-hts2008s-projects.vercel.app`, inspect URL `https://vercel.com/hts2008s-projects/edu-manager/3e6ZCdUNAQrEg7bTeDJ7tKV2raFE`, and alias `https://edu-manager-gules.vercel.app`.
- **Production Smoke**: Production static root returned 200 and included `ReportsPage-CvAq1yby.js`; no-token `/api/reports/bi` returned 401 `UNAUTHORIZED`; authenticated API modes returned `overview=118`, `attendance=111`, `tuition=118`, and `risk=114` current rows. Browser probe clicked tabs and captured `attendance`, `tuition`, and `risk` mode responses, saw 5 chart panels, no horizontal overflow, and no console errors.
- **Evidence**: `receipts/2026-06-09-report-bi-tabs-dashboard-patch.md`, `receipts/artifacts/report-bi-tabs-dashboard-local.png`, `receipts/artifacts/report-bi-tabs-dashboard-production.png`, and `receipts/e2e-report-bi-tabs-dashboard/`.
- **Residual Risk**: `tuition` currently returns the same total as `overview` on production because current data has all/most rows needing tuition action; this is data-dependent, not a tab wiring failure. The report cube is still built in memory before pagination and should be materialized/aggregated in DB for larger centers.
- **STATUS**: IMPLEMENTED.

---

### 2026-06-09 - EduFlow Motion UX/UI Stitch-Figma Plan
- **Scope**: Plan the next platform-wide UX/UI track with clear loading animation, responsive operational screens, Stitch concept generation, Figma source-of-truth handoff, implementation sequencing, browser verification, and production closeout.
- **Research**: Reviewed current route/component inventory, existing loading/page-transition code, Design Guideline direction, current Stitch project `16803115577660289376`, and Figma page `3:2` with frames `3:3`, `3:36`, and `3:142`.
- **Decision**: Use a staged Stitch MCP -> Figma MCP -> React implementation pipeline. Every Stitch generation must use `modelId=GEMINI_3_1_PRO`. Motion is constrained to meaningful transform/opacity transitions, clear loading/error states, reduced-motion support, and measurable performance gates.
- **Plan Artifact**: `plans/2026-06-09-eduflow-motion-ux-stitch-figma/plan.md` plus phases `00` through `08`.
- **Team Mode**: One UX/codebase scout completed and was integrated. Two additional scout runtimes were already inactive (`not_found`) before retrieval; no active subagent remains.
- **STATUS**: PLANNED. No product code, Stitch screen generation, Figma write, deploy, or production mutation was performed.

---

### 2026-06-09 - EduFlow Motion Phase 0 Baseline + Phase 1 Stitch Concepts
- **Scope**: Continue the approved EduFlow Motion UX/UI track after plan approval; capture production browser baseline and generate initial Stitch concepts with `GEMINI_3_1_PRO`.
- **Baseline**: Added `scripts/ux-motion-baseline.mjs` and `npm run ux:baseline`. Production baseline covered 32 scenarios across desktop/mobile and default/reduced-motion modes for dashboard, students, classes, attendance, fee collection, reports, templates, and Template Designer.
- **Findings**: No API failures, page errors, blank/near-blank pages, horizontal overflow, or read-only production mutations were captured. Recharts emitted 24 width/height warnings on dashboard/reports, and dashboard/fee collection remain the slowest perceived routes.
- **Stitch**: Created project `projects/5084496326021058210` and generated dashboard shell, Fee Workbench, Analytics Center, Template Designer, and mobile shell screens using `modelId=GEMINI_3_1_PRO`. Generated design-system asset: `assets/9c0c3259747c46bdb0fa12c1560cf5bb`.
- **Team Mode**: Two new sidecar explorers were spawned but hit usage-limit before returning findings; close attempts returned `not found`, so no active subagent remained and the lead continued inline.
- **Evidence**: `docs/artifacts/ux-baseline/2026-06-09T11-27-25-725Z/`, `docs/artifacts/ux-baseline/motion-reference-notes.md`, and `receipts/2026-06-09-eduflow-motion-baseline-stitch-execution.md`.
- **Status**: UXM-00 IMPLEMENTED; UXM-01 REVIEW pending full variant scoring/Figma normalization.

---

### 2026-06-09 - EduFlow Motion Phase 2 Figma Source Blocked
- **Scope**: Verify whether Figma can be updated as the source-of-truth for the EduFlow Motion UX/UI track.
- **Tooling**: `tool_search` found no write-capable Figma tools (`use_figma`, `create_new_file`, `search_design_system`, `get_libraries`, `generate_figma_design`). Available tools are read/inspect only.
- **Figma Evidence**: `get_metadata` found page `3:2` with frames `3:3`, `3:36`, and `3:142`; `get_screenshot`/`get_design_context` succeeded for `3:36`; `get_screenshot` succeeded for `3:142`.
- **Finding**: Existing Figma frames are stale and still contain duplicate finance navigation (`Thu tien` plus `Thu hoc phi`), so they cannot be treated as the updated EduFlow Motion v3 source-of-truth.
- **Decision**: UXM-02 is BLOCKED until write-capable Figma MCP is exposed. Continue code-side vertical slices only with this limitation recorded.
- **Evidence**: `receipts/2026-06-09-eduflow-motion-figma-source-blocked.md`.

---

### 2026-06-09 - EduFlow Motion Phase 3 Loading + Chart-Safe Partial
- **Scope**: Continue the EduFlow Motion UX/UI track with the first code-side shared motion/loading slice while Figma write was still blocked at that time.
- **Implementation**: Added `frontend/src/components/ui/LoadingStates.jsx`, wired shared route loading in `App.jsx`, auth-session loading in `ProtectedRoute.jsx`, reduced-motion page transitions in `PageTransition.jsx`, and stable `ChartFrame` wrappers for Dashboard, Reports, and Advanced Reports.
- **RCA**: Phase 0 baseline captured Recharts `width(-1)/height(-1)` warnings. A read-only `ck:team` explorer found all current `ResponsiveContainer` mounts still needed `initialDimension`, `minWidth`, and `minHeight`; added `SAFE_RECHARTS_CONTAINER_PROPS` and `min-w-0` chart wrappers.
- **Validation**: `npm --prefix frontend run lint -- --max-warnings=0`, `npx tsc --noEmit`, `npm run build`, `npm run test:unit` 59/59, and `git diff --check` passed.
- **Browser Proof**: Local production bundle smoke via `npm run dev:smoke` passed `docs/artifacts/ux-baseline/local-phase3-safe/2026-06-09T13-58-12-656Z/` (4/4) and `docs/artifacts/ux-baseline/local-phase3-safe-reduced/2026-06-09T13-58-41-386Z/` (8/8) with zero console/API/page errors, no overflow, no blank pages, and no read-only violations.
- **Team Mode**: Chart review explorer `019eaca4-642a-7f52-a163-8c8596de9744` completed and was closed after integration.
- **Evidence**: `receipts/2026-06-09-eduflow-motion-phase3-loading-chart-safe.md`.
- **Status**: UXM-03 PARTIAL; remaining Phase 3 primitives include token/motion modules, AsyncBoundary, action progress button, long-operation status, and DataTable/Modal async integration.

---

### 2026-06-09 - EduFlow Motion Phase 3 Loading/Motion Closeout
- **Scope**: Complete the remaining Phase 3 primitives and reviewer fixes for the EduFlow Motion UX/UI production track.
- **Implementation**: Added design token and motion modules, `AsyncBoundary`, `RouteProgress`, `LoadingScene`, `Skeletons`, `ActionProgressButton`, and `LongOperationStatus`; integrated table skeleton/`aria-busy`, modal busy/async-confirm guards, action progress on login/change-password/settings/backups, and reduced-motion opacity-only page/modal transitions. Fixed reviewer findings for modal close races, confirm async failure handling, center-settings reload errors, DataTable keyboard row activation, and `aria-sort` placement.
- **Validation**: `npm --prefix frontend run lint -- --max-warnings=0`; `npx tsc --noEmit`; `npm run test:unit` 61/61; `npm run build`; `git diff --check`; local Chrome baseline default `docs/artifacts/ux-baseline/local-phase3-final/2026-06-09T15-01-36-967Z/` passed 16/16; local Chrome reduced-motion baseline `docs/artifacts/ux-baseline/local-phase3-final-reduced/2026-06-09T15-02-30-688Z/` passed 32/32. Both browser runs had zero console/API/page/overflow/blank findings.
- **Team Mode**: Read-only async/motion reviewer `019eaccc-0712-7d12-8a8a-1aa1289482e4` completed; follow-up `close_agent` returned `not found`, indicating no active runtime agent remained.
- **Evidence**: `receipts/2026-06-09-eduflow-motion-phase3-loading-chart-safe.md` plus the final baseline artifact directories above.
- **Status**: UXM-03 IMPLEMENTED; next unchecked UXM work was Phase 4 shell/dashboard/master-data screen migration. Later follow-up reduced UXM-02 from absolute `BLOCKED` to `REVIEW` through Figma Desktop/Computer Use evidence.

---

### 2026-06-09 - EduFlow Motion Phase 4 Shell/Master-Data Slice
- **Scope**: Continue the approved EduFlow Motion UX/UI track from the next unchecked Phase 4 item. This pass focused on the reusable shell-adjacent master-data surfaces rather than declaring the whole Phase 4 complete.
- **Implementation**: Added `frontend/src/components/ui/OperationalPage.jsx` with `OperationalPage`, `PageIntro`, `MetricGrid`, `MetricTile`, and `ListPanel`; migrated Students, Parents, Classes, and Teachers to a consistent light operational layout while preserving existing DataTable, CRUD, search, selection, and modal flows; added honest API error/retry states for Parents and Teachers; made Header, Sidebar, and BulkActionBar reduced-motion aware; and restored the `/advanced-reports` sidebar item.
- **Team Mode**: Used a read-only `ck:team` explorer for Phase 4 UI audit. Findings included legacy dark hero drift on Teachers, silent Parents/Teachers API failure risk, reduced-motion gaps, modal/focus follow-ups, duplicate finance route history, and missing advanced-reports navigation. Integrated the high-confidence slice findings; the close attempt returned `not found`, so no active runtime subagent remained.
- **Validation**: `npm --prefix frontend run lint -- --max-warnings=0`, `npx tsc --noEmit`, `npm run test:unit` 61/61, `npm run build`, and `git diff --check` passed. Local browser baseline passed 14/14 at `docs/artifacts/ux-baseline/local-phase4-shell-master-data/2026-06-09T15-54-53-007Z/`; reduced-motion baseline passed 28/28 at `docs/artifacts/ux-baseline/local-phase4-shell-master-data-reduced/2026-06-09T15-54-56-105Z/`.
- **Evidence**: `receipts/2026-06-09-eduflow-motion-phase4-shell-master-data-slice.md`.
- **Status**: UXM-04 PARTIAL. Remaining work: Dashboard deeper redesign, Login migration, long edit modal unsaved-change/focus/mobile-sheet hardening, manual drawer/back-forward review, and production deploy/smoke.

---

### 2026-06-09 - EduFlow Motion Phase 4 Dashboard/Login/Modal Guarded Slice
- **Scope**: Continue `UXM-2026-06-09-04` from the next unchecked items after shell/master-data: production-style Login, Dashboard partial-error feedback, and long edit-modal close safety.
- **Implementation**: Rebuilt `frontend/src/pages/LoginPage.jsx` into an EduFlow operational access screen with progress feedback and no visible demo credential block; added retryable detail-error banner in `DashboardPage.jsx`; extended `Modal.jsx` with opt-in unsaved-change guard, form snapshot tracking, guarded child cancel buttons, keyboard focus loop, close guard, and focus restoration; added guarded cancel buttons plus sticky action footers to Students, Parents, Classes, and Teachers edit forms.
- **Team Mode**: Read-only `ck:team` explorer `019ead43-5efc-7830-b4a0-18652ed66942` found two blocking issues before closeout: visible `Huy` buttons bypassed `confirmOnClose`, and Modal open/cleanup side effects depended on `busy`. Both were fixed before evidence update.
- **Validation**: `npm --prefix frontend run lint -- --max-warnings=0`, `npx tsc --noEmit`, `npm run test:unit` 61/61, and `npm run build` passed. Targeted local `modal-guard.spec.js` passed 3/3 using output `docs/artifacts/playwright/modal-guard-phase4/`. Local browser baseline passed 12/12 at `docs/artifacts/ux-baseline/local-phase4-dashboard-login-modal-guarded/2026-06-09T16-57-29-699Z/`; reduced-motion baseline passed 24/24 at `docs/artifacts/ux-baseline/local-phase4-dashboard-login-modal-guarded-reduced/2026-06-09T16-58-10-058Z/`; local mobile drawer/back-forward probe passed. Vercel deploy `dpl_9qWTHirrZpVktfNh5W3wcaHRZX5V` is Ready on `https://edu-manager-gules.vercel.app`; production `modal-guard.spec.js` passed 3/3; production browser baseline passed 12/12 at `docs/artifacts/ux-baseline/production-phase4-dashboard-login-modal-guarded/2026-06-09T17-11-14-311Z/`; production reduced-motion baseline passed 24/24 at `docs/artifacts/ux-baseline/production-phase4-dashboard-login-modal-guarded-reduced/2026-06-09T17-12-28-101Z/`; production mobile drawer/back-forward probe passed.
- **Evidence**: `receipts/2026-06-09-eduflow-motion-phase4-dashboard-login-modal.md`.
- **Status**: UXM-04 IMPLEMENTED. Next UXM work: Phase 5 attendance/finance/reports visual normalization.
### 2026-06-10 — EduFlow Motion Phase 5 Attendance/Finance/Reports

- **Scope**: Closed `UXM-2026-06-09-05` from the approved Stitch/Figma UX motion plan.
- **Implemented**: Attendance week readiness/error guards; Fee Workbench class-line safety/error/refresh/print progress states; Reports stale-data guard, pagination clamp, drilldown audit context, and visible student tuition matrix heading.
- **Design flow**: Stitch `GEMINI_3_1_PRO` concept generated at `projects/5084496326021058210/screens/fc4f6bb5841d4935bfc36f40a2ce3061`. Figma Desktop node `3:36` was inspected/screenshot-captured; no writable Figma sync tool was exposed this run.
- **Verification**: `npm --prefix frontend run lint -- --max-warnings=0`; `npx tsc --noEmit`; `npm run test:unit` 61/61; `npm run build`; Playwright `fee-workbench-line-split.spec.js report-bi.spec.js modal-guard.spec.js` 7/7; Playwright `template-designer-hardening.spec.js ux-redesign-smoke.spec.js` 12/12; `npm run ux:baseline` 16/16 desktop/mobile route probes.
- **Evidence**: `receipts/2026-06-10-eduflow-motion-phase5-attendance-finance-reports.md`; `docs/artifacts/ux-baseline/2026-06-09T18-31-42-820Z/`.
- **Operational note**: Start local smoke server with `npm.cmd`, not plain `npm`, on Windows. Stop the smoke server before `npm run build` if Prisma generate reports an EPERM DLL rename.

---

### 2026-06-10 - EduFlow Motion Phase 6 Template/Admin/Parent

- **Scope**: Closed `UXM-2026-06-09-06` from the approved Stitch/Figma UX motion plan.
- **Implemented**: Template Designer save/upload/tool hardening, shortcut hint, layer list, and stronger smoke assertions; Templates library operational layout and paper metadata labels; User Management shared modal/retry/confirm; Import long-operation progress and confirm; Recycle Bin purge confirm/progress; Fee Reminders progress and live-send confirmation; Parent Portal mobile-first read-only loading/error flow.
- **Team Mode**: New sidecar explorer/worker spawns were attempted with `ck:team`, but both hit usage-limit immediately; inactive prior agents were not present in the registry. Lead continued inline under fallback.
- **Verification**: `npm --prefix frontend run lint -- --max-warnings=0`; `npx tsc --noEmit`; `npm run test:unit` 61/61; `npm run build`; Playwright `admin-secondary-phase6.spec.js` 2/2; Playwright `template-designer-hardening.spec.js` 1/1; UX baseline 100/100 default/reduced-motion route/viewport scenarios.
- **Evidence**: `receipts/2026-06-10-eduflow-motion-phase6-template-admin-parent.md`; `docs/artifacts/ux-baseline/local-phase6-template-admin-parent-reduced/2026-06-10T05-54-51-997Z/`.
- **Operational note**: No production deploy or production mutation was run. Stop local smoke server before build to avoid Prisma Client DLL `EPERM` on Windows.

---

### 2026-06-10 - EduFlow Motion Phase 7 Responsive/A11y/Performance

- **Scope**: Closed `UXM-2026-06-09-07` from the approved Stitch/Figma UX motion plan with local built-dist browser and perf evidence.
- **Implemented**: Added a layout-level `role=status`/`aria-live` region, accessible names/titles for Template Library icon-only actions, and a new Phase 7 Playwright guard for mobile/desktop routes, landmarks, headings, live regions, focusable controls, unnamed buttons, overflow, runtime/API errors, and reduced-motion infinite animation.
- **Team Mode**: New `ck:team` explorer/worker spawns were attempted, but both hit usage-limit immediately. Close attempts returned `not found`; lead continued inline under fallback and no active subagent remained.
- **Verification**: `npm --prefix frontend run lint -- --max-warnings=0`; `npx tsc --noEmit`; `npm run test:unit` 61/61; `npm run build`; `git diff --check`; Playwright `responsive-accessibility-phase7.spec.js` 2/2; UX baseline 150/150 across mobile/tablet/tablet-landscape/desktop/wide and default/reduced-motion; local perf-lab pass with 0/15 direct API failures, 0/10 route failures, and 0/24 browser API failed/severe.
- **Evidence**: `receipts/2026-06-10-eduflow-motion-phase7-responsive-a11y-performance.md`; `docs/artifacts/ux-baseline/local-phase7-responsive-a11y-performance/2026-06-10T06-29-24-670Z/`; `docs/artifacts/playwright/phase7-responsive-a11y-local/`; `receipts/perf/perf-lab-2026-06-10T06-33-58-416Z.md`.
- **Operational note**: Production deploy was not run in this turn; Phase 8 remains the production verification/closeout item.

---

### 2026-06-10 - EduFlow Motion Phase 8 Production Verification And Closeout

- **Scope**: Closed `UXM-2026-06-09-08` from the approved EduFlow Motion UX/UI production track.
- **Deployed**: Vercel production deploy `dpl_FMemytCK71osPxvskCWb4o2qt2B5` is Ready and aliased to `https://edu-manager-gules.vercel.app`; root HTML references the new asset `index-DrLVhz64.js`; production login probe returned HTTP 200.
- **Verification**: Production responsive/a11y Playwright 2/2, Template Designer hardening 1/1, Report BI 3/3, production UX baseline 150/150, production perf-lab pass with 0/15 direct API failures, 0/10 route failures, 0/24 browser API failed/severe, and `git diff --check` clean aside from existing CRLF warnings.
- **Evidence**: `receipts/2026-06-10-eduflow-motion-phase8-production-closeout.md`; `docs/artifacts/ux-baseline/production-phase8-responsive-a11y-performance/2026-06-10T06-45-34-107Z/`; `docs/artifacts/playwright/phase7-responsive-a11y-production/`; `docs/artifacts/playwright/phase8-template-production/`; `docs/artifacts/playwright/phase8-report-bi-production/`; `receipts/perf/perf-lab-2026-06-10T06-59-13-443Z.md`.
- **Team Mode**: A closeout explorer was spawned but returned a usage-limit error before producing findings; close returned `not found`, so the lead completed the remaining verification inline.
- **Residual risk**: Writable Figma MCP remains unavailable, but Figma Desktop/Computer Use later reduced the source-of-truth blocker to `REVIEW`. Production latency is functionally passing but serverless/DB-sensitive, with perf-lab direct API p95 5124.7 ms and route p95 6372.1 ms.

---

### 2026-06-10 - EduFlow Motion Phase 1 Stitch Selection Closeout

- **Scope**: Closed the next unchecked EduFlow Motion project-control item after Phase 8 by scoring and explicitly accepting the Stitch direction.
- **Decision**: Accepted `Calm Operations + Motion Data Command` as the selected direction with a 95/100 weighted score.
- **Reasoning**: Additional Stitch-only variants were rejected because production browser evidence from the implemented React app now provides stronger validation than another disconnected concept batch.
- **Evidence**: `receipts/2026-06-10-eduflow-motion-phase1-selection-closeout.md`; `receipts/2026-06-10-eduflow-motion-phase8-production-closeout.md`.
- **Status**: `UXM-2026-06-09-01` is `IMPLEMENTED`. `UXM-2026-06-09-02` is now `REVIEW`: Figma MCP remains read-oriented, but Figma Desktop/Computer Use has a verified manual write path.

---

### 2026-06-10 - Figma Source-Of-Truth Offline Handoff Package

- **Scope**: Continue the blocked Figma Phase 2 as far as possible without write-capable Figma MCP tools.
- **Completed**: Added `docs/artifacts/figma-handoff/eduflow-motion-v3-source-of-truth-spec.md` with variables, components, desktop/mobile frames, prototype flows, implementation mapping and write checklist.
- **Updated**: Phase 2 plan and Figma blocker receipt now point to the offline handoff package.
- **Boundary**: At this offline-handoff point Figma itself was not updated. Later follow-up used Figma Desktop/Computer Use to create nodes `31:2`, `35:128`, and coarse component definition `37:415`, so `UXM-2026-06-09-02` is now `REVIEW` rather than absolute `BLOCKED`.

---

### 2026-06-10 - EduFlow Motion Track Final State Reconciliation

- **Scope**: Reconciled project-control state after subagent audit.
- **Result**: Marked the current-session top-level UXM code/deploy scope as closed, while keeping a separate unchecked blocker for Figma source-of-truth sync.
- **Confirmed**: UXM-00, UXM-01, and UXM-03 through UXM-08 are implemented. UXM-02 later moved from absolute `BLOCKED` to `REVIEW` after Figma Desktop/Computer Use authoring evidence.
- **Next**: Continue Figma sync through Desktop-assisted authoring or a future write-capable MCP/plugin, without claiming Figma source-of-truth completion until granular native variables/components/frames exist.

---

### 2026-06-10 - Figma Desktop Source Pack Expansion

- **Scope**: Continue `UXM-2026-06-09-02` after the user requested trying the `@figma` plugin path and Figma Desktop/Computer Use instead of waiting for a write-capable MCP tool.
- **Completed**: Verified Figma Desktop write path, pasted the initial proof board `31:2`, then pasted and renamed a larger source-pack frame `35:128` to `EDU_MANAGER_V2 / EduFlow Motion V3 Source Pack`.
- **Verification**: Figma MCP `get_metadata(35:128)` confirmed the renamed frame and child sections; `get_design_context(35:128)` succeeded as `DESIGN_SYSTEM`; `get_screenshot(35:128, contentsOnly=true)` rendered the source pack.
- **Team Mode**: Two read-only subagents reviewed Phase 2 gaps. Both agreed `UXM-02` should stay `REVIEW`, not `IMPLEMENTED`, until imported content becomes native variables/components/linked frames.
- **Evidence**: `receipts/2026-06-10-figma-desktop-write-path-unblocked.md`; Figma node `35:128`.
- **Status**: `UXM-2026-06-09-02` remains `REVIEW`; the absolute Figma write blocker is reduced to native design-system completion work.

---

### 2026-06-10 - Figma Source Pack Component Definition

- **Scope**: Continue `UXM-2026-06-09-02` using Figma Desktop/Computer Use after source-pack node `35:128` was created.
- **Completed**: Selected the source-pack board in Figma Desktop and converted it with `Ctrl+Alt+K` into coarse native component definition `37:415`.
- **Verification**: Figma MCP `get_metadata(37:415)` returned a `symbol` named `EDU_MANAGER_V2 / EduFlow Motion V3 Source Pack`; `get_design_context(37:415)` succeeded as `DESIGN_SYSTEM`; `get_screenshot(37:415, contentsOnly=true)` rendered the component.
- **Boundary**: This proves native Figma component authoring is possible through Desktop/Computer Use, but it is still one coarse wrapper. Granular variables/components/variants and linked implementation frames remain pending.
- **Evidence**: `receipts/2026-06-10-figma-desktop-write-path-unblocked.md`; Figma node `37:415`.
- **Status**: `UXM-2026-06-09-02` remains `REVIEW`.

---

### 2026-06-11 - Conditional Figma Deploy Gate Recheck

- **Scope**: Continue from the approved UX/UI plan and evaluate the user's conditional request to deploy UX/UI to production if Figma is done.
- **Team Mode**: Spawned two `ck:team` explorer agents. The Figma DoD explorer found UXM-02 still in `REVIEW`; the deploy-readiness explorer found the worktree too dirty for an auditable release without explicit staging and rerun gates. Both agents completed and were used as gate input.
- **Computer Use Verification**: Figma Desktop window `EDUMANAGER - Figma` was active. The accessibility tree reported `Figma Design, 1 item selected` and selected component definition `EDU_MANAGER_V2 / EduFlow Motion V3 Source Pack` with ID `37:415`.
- **Figma MCP Verification**: `get_metadata(37:415)` returned a single `symbol` sized `2400 x 1800`, confirming the artifact is still a coarse source-pack component wrapper.
- **Additional Verification**: `get_variable_defs(37:415)` returned `{}`; the Figma Variables panel says `No variables created in this file`; `get_metadata(3:2)` still shows stale frames `3:36` and `3:142` with duplicate `Thu tiền`/`Thu học phí` navigation.
- **Decision**: Did not run a new Vercel PROD deploy because the condition "Figma is done" is not met. UXM-02 remains `REVIEW` pending granular reusable variables/components/variants and linked desktop/mobile implementation frames.
- **Evidence**: `receipts/2026-06-10-figma-desktop-write-path-unblocked.md` 2026-06-11 recheck section; KANBAN current state updated.

---

### 2026-06-11 - Figma Native Token Binding Component Probe

- **Scope**: Continue `UXM-2026-06-09-02` with Computer Use in Figma Desktop, focusing on UX/UI source-of-truth evidence rather than production deploy.
- **Team Mode**: Spawned two explorer agents. The DoD explorer confirmed UXM-02 cannot close without granular native variables/components/linked frames. The Computer Use explorer recommended an isolated token-binding probe rather than mutating stale frames or the source-pack wrapper.
- **Computer Use**: Created `color/brand/primarySoft = #EEF2FF`, drew a separate probe card, bound its fill to the native variable, renamed it `UXM-02 / Native Token Binding Probe / primarySoft Card`, and converted it into a native component definition.
- **Figma MCP evidence**: `get_metadata` returned symbol `47:421`; `get_variable_defs(47:421)` returned `{"color/brand/primarySoft":"#eef2ff"}`; `get_screenshot(47:421, contentsOnly=true)` rendered the primary-soft card.
- **Decision**: Native Figma variable-to-component binding is now proven through Desktop-assisted authoring, but UXM-02 remains `REVIEW` because the full variable set, granular component library, variants, linked implementation frames, loading/prototype flows, and stale frame replacement are still incomplete.
- **Evidence**: `receipts/2026-06-10-figma-desktop-write-path-unblocked.md`; Figma node `47:421`.

---

### 2026-06-11 - Figma Probe Context Verification And Subagent Cleanup

- **Scope**: Continue from the latest UXM-02 checkpoint, inspect git diff, use subagent support, and verify whether the native token-binding proof is enough to open the deploy gate.
- **Subagent**: Spawned explorer `Ampere` for an independent UXM-02 checklist review; it confirmed the next unchecked item is still granular Figma source-of-truth completion. The subagent was closed after reporting.
- **Verification**: Figma MCP `get_metadata(3:2)` confirmed the page currently contains one coarse source-pack symbol `37:415` and one probe symbol `47:421`; no accidental duplicate source-pack was left by the latest Computer Use attempt.
- **Additional evidence**: `get_design_context(47:421)` returned code using `var(--color/brand/primarysoft,#eef2ff)`, matching `get_variable_defs(47:421) = {"color/brand/primarySoft":"#eef2ff"}`.
- **Decision**: Deploy gate remains closed. The next safe batch is full token authoring, binding 2-3 core granular components, then replacing stale frames `3:36`/`3:142` and recording final desktop/mobile node IDs.
- **Evidence**: `receipts/2026-06-10-figma-desktop-write-path-unblocked.md`; `memory/sessions/handoff.md`.
## 2026-06-11 - Figma Native Source Plugin Frames

- **Task**: Continue UXM-2026-06-09-02 Figma source-of-truth completion using Figma Desktop/Computer Use and subagent review.
- **RCA**: Figma Desktop was available but positioned on an offscreen monitor (`x=-2060`), causing primary-monitor screenshots and earlier Computer Use attempts to appear blocked.
- **Implementation**: Added/hardened local Figma development plugin under `tools/figma-eduflow-source-plugin/` with dynamic page loading, Variables API guards, no spread syntax, and safer font/text creation.
- **Figma output**: Running the plugin in Figma Desktop created native components `49:436`, `49:438`, `49:440`, `49:442`, `49:444`, desktop frame `49:447`, mobile frame `49:472`, and note `49:483`.
- **Evidence**: Figma MCP `get_variable_defs` confirmed bindings for `49:447`, `49:436`, and `49:444`; `get_design_context` succeeded for `49:447`, `49:436`, and `49:472`; screenshots rendered for `49:447` and `49:472`; `node --check tools/figma-eduflow-source-plugin/code.js` passed.
- **Status**: UXM-02 remains `REVIEW` pending final design acceptance and deploy mapping; no production deploy was run in this Figma-only slice.

---

## 2026-06-11 - UXM-02 Figma Source Final Closeout

- **Task**: Close the remaining EduFlow Motion UX/UI source-of-truth item after the native Figma plugin pass.
- **Verification**: Re-ran Figma MCP `get_design_context` for `49:447` and `49:472`, `get_variable_defs(49:447)`, `get_metadata(49:447)`, and screenshots for `49:447`/`49:472`.
- **Decision**: Accepted Figma nodes `49:436`, `49:438`, `49:440`, `49:442`, `49:444`, `49:447`, and `49:472` as the Phase 2 source-of-truth for the already-deployed EduFlow Motion UI.
- **Deploy gate**: No new production deploy was run because this closeout changed only Figma/project-control evidence, not runtime source.
- **Evidence**: `receipts/2026-06-11-uxm02-figma-source-final-closeout.md`.
- **Status**: UXM-02 and the EduFlow Motion UX/UI production track are now `IMPLEMENTED`.

## 2026-06-12 - Figma Runtime PROD Apply

- **Task**: Apply the accepted Figma source-of-truth direction into runtime React/Tailwind and deploy the visible UX/UI update to `https://edu-manager-gules.vercel.app`.
- **Implementation**: Added shared Figma/EduFlow runtime tokens and CSS surfaces; updated app shell, header, sidebar, page panels, table shell, loading scene, Dashboard, Fee Workbench, and Reports toward the accepted light operations-console direction.
- **QA fixes during pass**: Fee Workbench now separates calculable rows from collectable rows so pending rows can be selected for bulk calculate; bulk calculate/pay now use `try/catch/finally`; `DataTable` search now tolerates `null`/`undefined` search text.
- **Verification**: lint zero warnings; `npx tsc --noEmit`; `git diff --check`; unit 61/61; build; local Playwright 6/6; local UX baseline pass; local perf-lab pass.
- **Production**: Vercel deployment `dpl_4LemiLebU9nYNmDq6YAmdUyGiQn4` Ready; alias `https://edu-manager-gules.vercel.app`; production Playwright 6/6; production UX baseline 150/150; production perf-lab pass.
- **Evidence**: `receipts/2026-06-12-figma-runtime-prod-apply.md`, `docs/artifacts/ux-baseline/figma-runtime-local/2026-06-11T17-16-05-725Z/`, `docs/artifacts/ux-baseline/figma-runtime-production/2026-06-11T17-33-27-461Z/`, `receipts/perf/perf-lab-2026-06-11T17-29-41-163Z.md`, `receipts/perf/perf-lab-2026-06-11T17-43-43-495Z.md`.
- **Residual risk**: Production serverless/DB latency remains visible in samples, especially Fee Workbench and Reports APIs, but gates passed and no UI/runtime failure was observed.

---

## 2026-06-12 - Student Monthly Progress Parent Report

- **Task**: Research, plan, and implement a monthly parent-facing student progress report for English-center operations, initially aligned to Starters/Movers/Flyers/KET/PET.
- **Research**: Used official Cambridge/CEFR sources for Young Learners shield model, A2 Key/KET and B1 Preliminary/PET exam component weighting, CEFR alignment, and Cambridge English Scale boundaries.
- **Decision**: Phase 1 does not invent academic skill results. It computes an operational progress/readiness proxy from real student-class-month attendance/class/fee evidence and marks academic skill dimensions as missing input until assessment/rubric data exists.
- **Implementation**: Added `lib/student-progress-report.ts`, `server/api/reports/student-progress.ts`, router/docs/API wiring, `reportsService.getStudentProgress`, `/student-progress` UI with dashboard charts/table/CSV/printable parent report, sidebar menu entry, and focused unit tests.
- **Verification**: `npx tsx --test tests/student-progress-report.test.ts` 4/4; `npx tsc --noEmit`; `npm --prefix frontend run lint -- --max-warnings=0`; `npm run test:unit` 65/65; `npm run build`; feature `git diff --check`; local Playwright smoke on `http://127.0.0.1:4321/student-progress` with API contract, table/action visibility, no console/API errors, and screenshot `receipts/artifacts/student-progress-local-smoke.png`.
- **Production**: Deployed to Vercel production as `dpl_5NZEpgh9xKWqCyp99rt5GxWTLoYs`, aliased to `https://edu-manager-gules.vercel.app`; production smoke passed for root 200, no-token API 401, login, authenticated `/api/reports/student-progress`, `/student-progress` route render, view/print actions, no console/API errors, and screenshot `receipts/artifacts/student-progress-production-smoke.png`.
- **Evidence**: `plans/2026-06-12-student-progress-parent-report/plan.md`; `receipts/2026-06-12-student-progress-parent-report.md`.
- **Residual risk**: Phase 2 needs real academic assessment input tables/workflows before the report can show Cambridge skill scores or formal readiness.

---

## 2026-06-14 - Student Progress Assessment Expansion

- **Task**: `SPRX-2026-06-12-01..07`
- **Status**: `IMPLEMENTED` and deployed to production.
- **Implementation**: added Prisma assessment persistence, `/api/student-progress`, track-aware scoring/honesty engine, report merge, teacher input panel, richer BA/PI analytics, and parent print integration.
- **Verification**: `npm run test:unit` 78/78; `npx tsc --noEmit`; `npm --prefix frontend run lint -- --max-warnings=0`; `npm run build`; `git diff --check`; `npx prisma validate`; `npx prisma db push --skip-generate`; local Playwright 1/1; production Playwright 1/1.
- **Production**: Vercel inspect `https://vercel.com/hts2008s-projects/edu-manager/2ZxVKk5NGPq64xhe7H2zokBurm3C`; alias `https://edu-manager-gules.vercel.app`.
- **Evidence**: `receipts/2026-06-14-student-progress-assessment-expansion.md`, `docs/artifacts/playwright/student-progress-assessment-local-final-20260614/`, `docs/artifacts/playwright/student-progress-assessment-production-20260614/`.
- **Follow-up**: add a true class-wide bulk/copy-last-month grid and run a dependency-security pass for npm audit warnings.
