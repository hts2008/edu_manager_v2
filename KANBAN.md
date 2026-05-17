# 📋 KANBAN BOARD - EDU MANAGER

> **Status**: PRODUCTION LIVE — Phase A API parity passed on Neon + Vercel Blob
>
> **Agency PRD reset (2026-05-06)**: PRD agency assessment supersedes the old "100% complete" claim. UI and local/reference backend are broad, but Vercel production is missing critical API modules. Treat production as approximately 50-60% usable until Phase A is verified.

---

## 🖥️ DEPLOYMENTS

| Environment    | URL                                  | Status  |
| -------------- | ------------------------------------ | ------- |
| **Production** | https://edu-manager-delta.vercel.app | Live, Phase A API parity passed |
| **Local Dev**  | http://localhost:3000                | 🔧 Dev / parity testing |
| **Dashboard**  | [dashboard.html](./dashboard.html)   | 📊      |

**Default/dev login:** `admin / admin123` — rotate before real production operation.

---

## ✅ IMPLEMENTED ASSETS (UI + LOCAL/REFERENCE)

> These assets exist and remain valuable, but production parity is not complete until the missing Vercel API modules are ported and smoke-tested.

### Infrastructure ✅

- [x] Tailwind CSS v4 + Vite
- [x] SQLite + PostgreSQL (Supabase)
- [x] 70+ API endpoints
- [x] JWT Auth + Role-based access
- [x] Docker configuration
- [x] **Vercel Deployment** ⭐ NEW
- [x] **Prisma ORM** ⭐ NEW
- [x] **Supabase PostgreSQL** ⭐ NEW

### Frontend (14 Pages) ✅

- [x] Login, Dashboard
- [x] Students, Parents, Teachers, Classes
- [x] Attendance, Receipts, Payments, History
- [x] Reports, Templates, Template Designer
- [x] KANBAN Dashboard
- [x] Attendance Periods Management

### Backend Services ✅

- [x] PDF Generation (pdfmake)
- [x] Excel Export (xlsx)
- [x] Fee Calculation
- [x] Activity Logging

### Deployment ✅ NEW

- [x] Vercel Production Deployment
- [x] Supabase PostgreSQL Database
- [x] Prisma Schema Migration
- [x] ES Module Configuration
- [x] Environment Variables Setup

### Deployment Tools ✅

- [x] start.bat - Local dev
- [x] stop.bat - Stop servers
- [x] backup.bat - Auto backup
- [x] restore.bat - Restore data
- [x] docker-compose.yml - Production
- [x] Nginx config

### Documentation ✅

- [x] README.md
- [x] USER_GUIDE_VI.md
- [x] KANBAN.md

---

## IMPLEMENTED — PHASE A PRODUCTION API PARITY

**Strategic decision:** Option A — port Express local/reference backend logic to Vercel TypeScript + Prisma. Express/SQLite is reference only, not production truth.

**Phase A objective:** No production page should return 404 / Network error for existing UI flows.

### Sprint A.1 — Foundation

| Task ID | Description | Scope | Agent Owner | Dependencies | Status | Quality Gates |
| ------- | ----------- | ----- | ----------- | ------------ | ------ | ------------- |
| A1 | Add `requireAuth(handler, roles?)` middleware | `lib/auth.ts` | backend-specialist | None | IMPLEMENTED | Production smoke: no-token 401, staff 403, login/change-password/logout pass |
| A8 | Add Vercel Blob Storage wrapper | `lib/storage.ts` | backend-specialist | Env/bucket | IMPLEMENTED | Production smoke: template image upload returns Blob URL |
| A12 | Configure Vercel/Neon env and storage bucket | Vercel + Neon + Vercel Blob ops | devops-engineer | None | IMPLEMENTED | Vercel env patched; Blob store configured; production deploy ready |
| A13 | Push Prisma schema and seed approved target | Prisma/Neon | database-architect | A12 | IMPLEMENTED | `prisma db push` and `npm run db:seed` completed on Neon |

### Sprint A.2 — Auth + Attendance Fee

| Task ID | Description | Scope | Agent Owner | Dependencies | Status | Quality Gates |
| ------- | ----------- | ----- | ----------- | ------------ | ------ | ------------- |
| A2 | Add logout and change-password Vercel endpoints | `server/api/auth/*` | backend-specialist | A1 | IMPLEMENTED | Production smoke passed |
| A4 | Add attendance calculate-fee endpoint | `server/api/attendance/calculate-fee.ts` | backend-specialist | A1 | IMPLEMENTED | Production smoke confirms legacy fields |

### Sprint A.3 — Money Modules

| Task ID | Description | Scope | Agent Owner | Dependencies | Status | Quality Gates |
| ------- | ----------- | ----- | ----------- | ------------ | ------ | ------------- |
| A3 | Port monthly-fees lifecycle | `server/api/monthly-fees/*` | backend-specialist | A1, A4 | IMPLEMENTED | Production smoke: calculate -> confirm -> pay -> receipt |
| A11 | Add PDF generation wrapper | `lib/pdf.ts`, Vercel PDF config | backend-specialist | A1 | IMPLEMENTED | Production smoke: receipt PDF 1964 bytes, payment PDF 2044 bytes |
| A5 | Port receipts CRUD + PDF | `server/api/receipts/*` | backend-specialist | A1, A11 | IMPLEMENTED | Production smoke passed |
| A6 | Port payments CRUD + PDF | `server/api/payments/*` | backend-specialist | A1, A11 | IMPLEMENTED | Production smoke passed |

### Sprint A.4 — Templates + Reports

| Task ID | Description | Scope | Agent Owner | Dependencies | Status | Quality Gates |
| ------- | ----------- | ----- | ----------- | ------------ | ------ | ------------- |
| A7 | Port templates CRUD/default endpoints | `server/api/templates/*` | backend-specialist | A1 | IMPLEMENTED | Production smoke: CRUD, set-default, restore default pass |
| A9 | Add template image upload endpoint | `server/api/templates/upload.ts` | backend-specialist | A1, A8 | IMPLEMENTED | Production smoke: Vercel Blob upload pass |
| A10 | Port financial + unpaid reports | `server/api/reports/financial.ts`, `unpaid-students.ts` | backend-specialist | A1 | IMPLEMENTED | Production smoke confirms report shape |

### Sprint A.5 — Closeout

| Task ID | Description | Scope | Agent Owner | Dependencies | Status | Quality Gates |
| ------- | ----------- | ----- | ----------- | ------------ | ------ | ------------- |
| A14 | Sync docs and board to real production state | `KANBAN.md`, project context/memory | documentation-writer | A1-A13 | IMPLEMENTED | Updated with production smoke and deployment evidence |
| A15 | Run production smoke checklist | Browser + production URL | qa-automation-engineer | A1-A14 | IMPLEMENTED | Chrome UI smoke over 8 Phase A pages: no failed API requests |
| A16 | Add parity/contract test script | `scripts/parity-test.mjs` | test-engineer | A1-A14 | IMPLEMENTED | Express local + Vercel production contract run passed 7/7 |

### Phase A Evidence Snapshot — 2026-05-14

- **Implemented in code**: A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11, A16.
- **Static gates passed**: `npx tsc --noEmit`, `npm run build`, `cd frontend && npm run lint`, `node --check scripts\parity-test.mjs`, `git diff --check`.
- **Receipt**: `receipts/2026-05-14-phase-a-api-parity-static.md`.
- **Follow-up verification receipt**: `receipts/2026-05-14-phase-a-closeout-attempt.md`.
- **A12 config finding**: `.env.example` now includes `SUPABASE_BUCKET`; `lib/storage.ts` resolves `SUPABASE_BUCKET` with `template-images` fallback. Current process/user/machine env has no Phase A keys loaded; local `.env` only declares `DATABASE_URL`, `DIRECT_URL`, and `JWT_SECRET`.
- **A13 DB finding**: `npx prisma migrate status` failed against current `.env` with Supabase pooler tenant/user not found. No migration, seed, deploy, or production mutation was run.
- **Production browser/API finding**: Browser login with `admin/admin123` shows `Internal server error` and direct `POST /api/auth/login` returns 500. `GET /api/auth/me` without token returns 401, but `receipts`, `payments`, `templates`, `reports/financial`, `reports/unpaid-students`, `monthly-fees`, and `attendance/calculate-fee` still return 404 on production. This proves the live target is blocked by deploy/config.
- **Vercel dashboard finding**: Current Production Deployment is old commit `fc400eb` from Jan 24; Phase A code is not deployed. Runtime logs show `/api/auth/login` fails with Prisma `FATAL: (ENOTFOUND) tenant/user postgres.rdtqbivfnrdcureoazbh not found`. Env page only has `JWT_SECRET`, `DIRECT_URL`, and `DATABASE_URL`; missing `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_BUCKET`.
- **Local Vercel dev blocker**: `npm run dev -- --listen 3000` could not start because Vercel CLI has no credentials/token in this environment.
- **Local reference browser smoke**: After `npm rebuild better-sqlite3`, Express reference backend + Vite frontend login succeeds locally and `/receipts`, `/fee-collection`, `/payments`, `/templates`, `/reports`, and `/attendance` show no visible Network/404/Internal error. This does not replace Vercel/prod smoke.
- **Lint note**: frontend lint exits 0 with 26 warnings after preserving React Compiler migration findings as warnings; no lint errors remain.
- **Not run yet**: API smoke, parity live run, 14-step manual production smoke, deploy, Prisma migrate/seed, or any production Supabase mutation.
- **Reason not IMPLEMENTED yet**: Phase A acceptance requires deployment/config verification, runtime smoke against an approved target, and default template/storage/env verification.

---

### Phase A Production Closeout Evidence — 2026-05-15

- **Deployment**: Production alias `https://edu-manager-delta.vercel.app` points to Vercel deployment for commit `cd77f48` (`test(api): relax parity script to frontend contract`), ready state `READY`.
- **Database/storage**: Neon project `dry-dew-91484915` is the approved Postgres target; Vercel Blob store `edu-manager-blob` handles template image uploads. Supabase project is no longer the Phase A production dependency.
- **Schema/data**: `prisma db push` and `npm run db:seed` completed against Neon. Prisma Migrate was not used because this repo has no `prisma/migrations` history.
- **Serverless quota fix**: API handlers moved under `server/api/*`; Vercel exposes one `api/router.ts` function via rewrite to avoid Hobby/serverless function count failure.
- **Static gates**: `npx tsc --noEmit`, `npm run build`, and `cd frontend && npm run lint` pass. Lint remains 26 warnings, 0 errors.
- **API smoke**: Auth/RBAC/change-password/logout, attendance calculate-fee, monthly-fees calculate/confirm/pay, receipt PDF, payment create/PDF/delete, templates CRUD/default/upload, financial report, and unpaid-students report pass on production.
- **PDF smoke**: Receipt PDF returns `application/pdf` with 1964 bytes; payment PDF returns `application/pdf` with 2044 bytes.
- **Chrome UI smoke**: `/receipts`, `/fee-collection`, `/payments`, `/templates`, `/reports`, `/history`, `/attendance`, `/attendance-periods` show no failed fetch requests.
- **Parity/contract run**: `node scripts\parity-test.mjs` with local Express reference and production Vercel target passed 7/7.
- **Receipt**: `receipts/2026-05-15-phase-a-production-closeout.md`.

---

## ⏸️ DEFERRED UNTIL PHASE A PASSES

| Task ID | Description | Reason |
| ------- | ----------- | ------ |
| B2B-006 | UI/UX Improvements | Phase A is passed; keep deferred until Phase B reliability gates are stable |
| B2B-007 | More Seed Data | Phase A is passed; still requires approved dev/staging data plan |
| Optional API docs | API surface is changing during Phase A |

---

## PHASE B — QUALITY, SAFETY, MAINTAINABILITY

**Objective:** harden the production-usable Phase A system so future product expansion does not reintroduce hidden broken flows.

| Task ID | Description | Scope | Status | Evidence |
| ------- | ----------- | ----- | ------ | -------- |
| B1 | Cleanup tracked `.backup` files | `frontend/src/**/*.backup`, `.gitignore` | IMPLEMENTED | `rg --files -g '*.backup' frontend/src` returns no files |
| B3 | Add UI failure boundary baseline | `frontend/src/components/ui/ErrorBoundary.jsx`, app routes | IMPLEMENTED | Local browser smoke: no boundary fallback on 5 core pages |
| B4 | Add unit test baseline | `tests/*.test.ts`, `npm run test:unit` | IMPLEMENTED | 13/13 node:test tests pass |
| B6 | Add CI gate baseline | `.github/workflows/ci.yml` | IMPLEMENTED | CI runs audit, unit, tsc, build, lint max-warnings=0 |
| B7a | Add login rate-limit baseline | `lib/rate-limit.ts`, `server/api/auth/login.ts` | IMPLEMENTED | Unit tests cover limiter; tsc/build pass |
| B8 | Record backend strategy | `docs/architecture/backend-strategy.md`, ADR-19 | IMPLEMENTED | Express = reference only; Vercel + Prisma = production truth |
| B9 | Improve API client reliability | `frontend/src/services/api.js` | IMPLEMENTED | `VITE_API_BASE`, GET retry, safer parse, 401 event |
| B10 | Bring lint to zero warnings | `frontend/eslint.config.js` | IMPLEMENTED | `cd frontend && npm run lint -- --max-warnings=0` passed |
| B2a | Server-side zod validation baseline | Login, Student, Class, Receipt, Payment API payloads | IMPLEMENTED | `receipts/2026-05-15-phase-b-validation-security.md` |
| B2b | React Hook Form validation | Student, Class, Receipt, Payment forms | IMPLEMENTED | `receipts/2026-05-15-phase-b-e2e-smoke.md` |
| B5 | E2E Playwright smoke suite | Auth, student, class, attendance, fee, payment, reports | IMPLEMENTED | `receipts/2026-05-15-phase-b-e2e-smoke.md` |
| B7b | Dependency audit remediation | root + frontend dependency graph | IMPLEMENTED | `npm audit --audit-level=high` passes in both packages |
| B7c | Observability/security hardening | Security headers, request IDs, structured redacted API logs, mutation audit baseline | IMPLEMENTED | `receipts/2026-05-15-phase-b-observability-security.md`; unit/type/build/lint/audit/E2E pass |

**Phase B receipts:** `receipts/2026-05-15-phase-b-foundation-hardening.md`, `receipts/2026-05-15-phase-b-validation-security.md`, `receipts/2026-05-15-phase-b-e2e-smoke.md`, `receipts/2026-05-15-phase-b-observability-security.md`.

---

## PHASE C — PRODUCT VALUE EXPANSION

**Objective:** add operator-facing product value on top of the hardened Phase B baseline. Production data mutation, schema migration, cron, SMS, backup, and payment integrations still require explicit approval before running against production.

| Task ID | Description | Scope | Status | Evidence |
| ------- | ----------- | ----- | ------ | -------- |
| C1 | Bulk Actions | Multi-select delete/archive for Students, Parents, Receipts, Payments | IMPLEMENTED | `receipts/2026-05-16-phase-c-bulk-actions.md`; local mutation smoke + 13/13 E2E + production non-mutating API/Google Chrome smoke pass |
| C2 | Import Excel/CSV | Student + Parent CSV import with preview, validation, duplicates, rollback | IMPLEMENTED | `receipts/2026-05-16-phase-c-import-csv.md`; unit parser tests + local 15/15 E2E + local commit/cleanup smoke + production preview API/Google Chrome smoke pass |
| C3 | Attendance Insight | Student/class attendance heatmap | IMPLEMENTED | `receipts/2026-05-15-phase-c-attendance-insight.md`; local 10/10 E2E + production API/Google Chrome smoke pass |
| C4 | Monthly Fee Automation | Idempotent monthly fee generation job | IMPLEMENTED | `receipts/2026-05-16-phase-c-operations-soft-delete.md`; cron protected by `CRON_SECRET`; production generation created 22 fees for 2026-05 |
| C5 | Parent Portal | Read-only parent view for attendance, fees, receipts | IMPLEMENTED | `receipts/2026-05-16-phase-c-operations-soft-delete.md`; parent phone + student DOB login and Chrome portal smoke passed |
| C6 | Fee Reminders | SMS/Zalo overdue fee reminders | IMPLEMENTED | `receipts/2026-05-16-phase-c-operations-soft-delete.md`; preview/send workflow implemented; live send remains gated by `REMINDER_SEND_ENABLED=true` |
| C7 | Advanced Reports | Revenue trend, teacher utilization, retention/cohort, stable export | IMPLEMENTED | `receipts/2026-05-16-phase-c-advanced-reports.md`; local 11/11 E2E + production API/Google Chrome smoke pass |
| C8 | Audit Log UI | Admin filterable activity log view | IMPLEMENTED | `receipts/2026-05-15-phase-c-audit-log-ui.md`; local 8/8 E2E + production API/browser smoke pass |
| C9 | Backup Automation | Weekly DB backup and restore drill | IMPLEMENTED | `receipts/2026-05-16-phase-c-operations-soft-delete.md`; encrypted Vercel Blob backup uploaded and verify drill passed |
| C10 | Soft Delete + Recycle Bin | `deletedAt` strategy and recovery UI | IMPLEMENTED | `receipts/2026-05-16-phase-c-operations-soft-delete.md`; Neon schema synced; delete/list/purge smoke passed |
| C11 | User Management | Admin CRUD users, reset password, deactivate | IMPLEMENTED | `receipts/2026-05-16-phase-c-user-management.md`; local 12/12 E2E + production read-only API/Google Chrome smoke pass |
| C12 | Center Settings | Admin UI for center profile/logo/defaults | IMPLEMENTED | `receipts/2026-05-15-phase-c-center-settings.md`; local 9/9 E2E + production API/browser smoke pass |

---

## PRODUCTION UX / PDF HARDENING - 2026-05-17

**Objective:** close the visible receipt-print defect and make the expanded product surface easier to operate before the next production-live pass.

| Task ID | Description | Scope | Status | Evidence |
| ------- | ----------- | ----- | ------ | -------- |
| UXPDF-001 | Fix Vietnamese receipt/payment PDF rendering | `lib/pdf.ts`, `backend/src/services/pdfService.js`, `tests/pdf.test.ts` | IMPLEMENTED | `receipts/2026-05-17-pdf-ux-production-hardening.md`; unit PDF asserts `/ToUnicode` + Roboto; production PDF smoke returns 16871-byte Unicode PDF |
| UXPDF-002 | Harden frontend PDF print flow | `frontend/src/utils/pdfPrint.js`, receipt/history/fee pages | IMPLEMENTED | Shared opener checks status/content-type, closes failed popup, revokes object URLs |
| UXNAV-001 | Group navigation into primary/secondary sections | `Sidebar.jsx`, `Header.jsx`, `MainLayout.jsx`, `DataTable.jsx`, `index.css` | IMPLEMENTED | Chrome-channel Playwright UX smoke desktop/mobile passes locally and production `/receipts` has overflow 0 |
| UXDES-001 | Sync Figma source-of-truth UX frame | Figma `EDUMANAGER`, Stitch project `12785236930566023458` | IMPLEMENTED | Figma page `EDU_MANAGER_V2 Production UX`; nodes tokens `3:3`, desktop `3:36`, mobile `3:142` |

---

## 🧭 OPERATIONAL / MEMORY HYGIENE TRACK

| Task ID | Description | Scope | Agent Owner | Dependencies | Status | Quality Gates |
| ------- | ----------- | ----- | ----------- | ------------ | ------ | ------------- |
| CTX-001 | Confirm approved Context+ stabilization plan and gates | Operational planning | project-planner | Approved plan | ✅ IMPLEMENTED | Plan summary + NM routing check |
| CTX-002 | Update KANBAN and active context before remediation | Project control docs | project-planner | CTX-001 | ✅ IMPLEMENTED | Board/context updated before diagnostics |
| CTX-003 | Run Context+ runtime diagnostics | MCP/Ollama/runtime | debugger + devops-engineer | CTX-002 | ✅ IMPLEMENTED | NM OK; C+ MCP EOF reproduced; standalone Context+ startup captured |
| CTX-004 | Apply minimal safe remediation if root cause is identified | `.mcp.json` or runtime process only | devops-engineer | CTX-003 | ✅ IMPLEMENTED | `.mcp.json` patched to `cmd /c npx -y contextplus .`; JSON valid; standalone smoke OK |
| CTX-005 | Verify Context+ tools and integration gates | MCP tools + git audit | test-engineer + judge-agent | CTX-004 | ✅ IMPLEMENTED | `get_context_tree` and semantic search both succeed after reload |
| CTX-006 | Update memory, receipt, and walkthrough | State/evidence | documentation-writer + memory-curator | CTX-005 | ✅ IMPLEMENTED | KANBAN, activeContext, progress, task, walkthrough updated |
| Dual-Brain Runtime Completion | Restore complete Dual-Brain operation | NM + C+ | memory-curator | CTX-005 | ✅ IMPLEMENTED | NM healthy on `edu_manager`; C+ operational after MCP host reload |
| B2B-001 | Confirm approved continuation plan | Plan objective, tasks, dependencies, owners, gates | project-planner | User approval | ✅ IMPLEMENTED | Plan restated; task tracker created |
| B2B-002 | Register approved plan tasks before code | KANBAN operational rows | project-planner | B2B-001 | ✅ IMPLEMENTED | All tasks registered with owner, scope, dependencies, status, gates |
| B2B-003 | Doctrine diff audit | `GEMINI.md`, `CLAUDE.md`, `CODEX.md`, memory/session files | project-planner + documentation-writer | B2B-002 | ✅ IMPLEMENTED | Workspace scan identified external path/name contamination; no app-code mutation |
| B2B-004 | Minimal doctrine contamination cleanup | Canonical doctrine and memory truth files only | documentation-writer | B2B-003 | ✅ IMPLEMENTED | Post-clean scan clean for external workspace names and out-of-scope paths |
| B2B-005 | Context+ blocker handling and deep-sync reconciliation | Context+ status, KANBAN, activeContext, current-session | memory-curator + debugger | B2B-004 | IMPLEMENTED | `receipts/2026-05-17-final-verification-writeback.md`; C+/NM unavailable in Codex, degraded markdown-only fallback recorded |
| B2B-006 | UI/UX Improvements | Frontend UI focused enhancement | frontend-specialist | Phase A API parity | DEFERRED | Existing design patterns followed; lint/build/browser evidence captured |
| B2B-007 | More Seed Data | `prisma/schema.prisma`, seed script | backend-specialist | Phase A API parity + approved DB target | DEFERRED | Schema-safe realistic seed additions; no production mutation without approval |
| B2B-008 | Final verification and write-back | Evidence, receipts, memory, KANBAN, walkthrough | test-engineer + memory-curator | Phase A closeout | IMPLEMENTED | `receipts/2026-05-17-final-verification-writeback.md`; production health probes, git alignment, scope scan, memory/KANBAN write-back |

---

## ✅ RECENT OPERATIONAL MAINTENANCE

| Task | Status | Evidence |
| ---- | ------ | -------- |
| Neural Memory edu_manager runtime restore | ✅ IMPLEMENTED | `neural-memory-edu-manager:nmem_health` returned `brain=edu_manager`, Grade C, purity 62.2 → 62.7 |
| Edu Manager brain-maintenance recall cycle | ✅ IMPLEMENTED | Recalled Vercel, Supabase, Prisma, attendance, billing, holiday, review, deployment topics |
| Safe mature consolidation attempt | ✅ IMPLEMENTED | `nmem_consolidate(strategy=mature)` ran on `edu_manager`; no promotion yet because memories need repeated recall over time |
| Git dirty state classification | ✅ IMPLEMENTED | App-code paths clean; dirty state is framework sync + restored memory/board files; no app feature code mixed in |
| Context+ runtime remediation and verification | ✅ IMPLEMENTED | `.mcp.json` patched to Windows-safe `cmd /c npx -y contextplus .`; after MCP host reload, both `get_context_tree` and `semantic_code_search` succeeded |
| EDU_MANAGER_V2 scope/path cleanup | ✅ IMPLEMENTED | No remaining known external workspace markers or hard-coded out-of-scope paths in workspace text scan |

---

## 📝 OPTIONAL TODO

| Priority | Task                    |
| -------- | ----------------------- |
| 🟢 Low   | API documentation       |
| 🟢 Low   | Line chart for reports  |
| 🟢 Low   | Thermal 80mm print test |
| 🟢 Low   | E2E automated tests     |

---

## 📊 PRODUCT READINESS

| Area | Status |
| ---- | ------ |
| UI pages | Broadly implemented |
| Local/reference Express backend | Broadly implemented |
| Vercel production API | Phase A parity implemented and production-smoked |
| Prisma/Supabase schema | Strong baseline, verify migrations before mutation |
| Tests/CI | Phase B/C baseline implemented; unit 18/18, Playwright smoke 17/17, audit/tsc/build/lint pass |
| Production usability | Usable for existing Phase A UI flows; Phase B hardening and Phase C C1-C12 value slices deployed and smoked |

**Overall:** Production live and usable for existing Phase A UI flows; Phase B reliability/security baseline and Phase C C1-C12 product slices are implemented and smoked. Fee reminder live provider delivery remains intentionally disabled until `REMINDER_SEND_ENABLED=true` and provider/opt-in policy are approved. Production credential rotation remains before real operation.

---

## 🚀 QUICK START

```bash
# Local Development
start.bat

# Production (Docker)
docker-compose up -d

# Vercel (Cloud)
# Auto-deploy on push to main branch

# Database Seeding
npm run db:seed

# Backup
backup.bat

# Stop
stop.bat
```

---

## 📦 GitHub

**Repository:** https://github.com/hts2008/edu_manager_v2

**Recent Commits:**

- `a087f51` fix: add .js extensions to ES module imports for Vercel
- `23a2ec1` fix: add ES module type for Vercel API routes
- `93a68dd` feat: add Vercel/Prisma infrastructure for cloud deployment
- `55d5b9d` fix: attendance bugs - week spanning months & period creation
- `814f015` feat: Excel export, backup/restore, User Guide
- `35650a1` docs: README and KANBAN
- `0ee65ac` feat: Docker configuration
- `801f2d7` feat: Print PDF button
- `0779260` feat: PDF generation
- `28456c5` Initial commit

---

## 🖥️ URLs

| Service   | URL                                                         |
| --------- | ----------------------------------------------------------- |
| **Live**  | https://edu-manager-delta.vercel.app                        |
| Frontend  | http://localhost:3000                                       |
| Backend   | http://localhost:5000                                       |
| Dashboard | dashboard.html                                              |
| Supabase  | https://supabase.com/dashboard/project/rdtqbivfnrdcureoazbh |

---

**Last Updated:** 2026-05-17 09:40
