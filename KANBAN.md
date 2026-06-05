# 📋 KANBAN BOARD - EDU MANAGER

> **Status**: PRODUCTION LIVE - Template Designer visible render/upload fix deployed and production-smoked on 2026-06-05
>
> **Agency PRD reset (2026-05-06)**: PRD agency assessment supersedes the old "100% complete" claim. UI and local/reference backend are broad, but Vercel production is missing critical API modules. Treat production as approximately 50-60% usable until Phase A is verified.

---

## 🖥️ DEPLOYMENTS

| Environment    | URL                                  | Status  |
| -------------- | ------------------------------------ | ------- |
| **Production** | https://edu-manager-gules.vercel.app | Live, latest Template Designer visible render/upload fix deployed and smoked |
| **Local Dev**  | http://localhost:3000                | 🔧 Dev / parity testing |
| **Dashboard**  | [dashboard.html](./dashboard.html)   | 📊      |

**Default/dev login:** `admin / admin123` — rotate before real production operation.

---

## IMPLEMENTED - NO-BLOCKING FLOWS + LINE FEE LEDGER CLOSEOUT (2026-06-02)

**Objective:** close the latest reported production blockers in attendance, class edit, tuition collection, receipt printing, reports, and template design while keeping production usable end to end.

| Task ID | Description | Scope | Agent Owner | Dependencies | Status | Quality Gates |
| ------- | ----------- | ----- | ----------- | ------------ | ------ | ------------- |
| NBF-2026-06-02-01 | Add make-up attendance and cross-month attendance period handling | `AttendancePage`, attendance APIs, `lib/tuition.ts` | backend/frontend specialists | Month-bounded tuition policy | IMPLEMENTED | Unit 44/44, local/prod Playwright |
| NBF-2026-06-02-02 | Fix class bulk student loader in create/edit modal | `ClassesPage` | frontend-specialist | Modal scroll fix | IMPLEMENTED | Local/prod Playwright |
| NBF-2026-06-02-03 | Add per-class fee ledger and collection flow | `MonthlyFeeLine`, `ReceiptLine`, monthly-fees APIs, Fee Workbench | database/backend/frontend specialists | Neon schema sync | IMPLEMENTED | Prisma generate, typecheck, unit, browser smoke |
| NBF-2026-06-02-04 | Fix receipt print and default PDF line layout | `pdfPrint`, receipts APIs, `lib/pdf.ts` | backend/frontend specialists | Receipt line data | IMPLEMENTED | Production receipt PDF smoke |
| NBF-2026-06-02-05 | Expand financial reports with finance dashboard data | Reports API/UI | backend/frontend specialists | Fee line data | IMPLEMENTED | Phase-B + UX smoke |
| NBF-2026-06-02-06 | Make Template Designer controls actionable | `TemplateDesignerPage`, designer E2E | frontend-specialist | Template API | IMPLEMENTED | Template hardening smoke |
| NBF-2026-06-02-07 | Deploy and verify production | Neon + Vercel alias `edu-manager-gules` | release-manager | NBF-2026-06-02-01..06 | IMPLEMENTED | Deploy `dpl_JCDmyuFBV7yQ2zEYHu5bLyyvF4kJ`, production Playwright 29/29 |

**Evidence:** `receipts/2026-06-02-no-blocking-flows-line-fee-closeout.md`.

**Validation:** `npx prisma generate`, `npx tsc --noEmit`, `npm run test:unit` 44/44, frontend lint zero warnings, frontend build, root build, `git diff --check`, local Playwright 12/12 + 17/17, and production Playwright 29/29.

**Database note:** `npx prisma db push` synced additive `MonthlyFeeLine` and `ReceiptLine` schema to Neon. No seed was run.

**Residual risk:** serverless cold-start/Neon latency can still appear on first-touch routes. Rotate default credentials before real operation.

---

## IMPLEMENTED - FEE WORKBENCH CLASS-LINE SPLIT PATCH (2026-06-03)

**Objective:** fix the production issue where a student enrolled in multiple classes could still appear as one aggregate tuition row, making operators collect a combined amount instead of class-by-class payments.

| Task ID | Description | Scope | Agent Owner | Dependencies | Status | Quality Gates |
| ------- | ----------- | ----- | ----------- | ------------ | ------ | ------------- |
| FEE-LINE-2026-06-03-01 | Return one Fee Workbench row per class line and keep GET read-only | `server/api/monthly-fees/workbench.ts` | backend-specialist | Line fee ledger | IMPLEMENTED | Typecheck, unit, local/prod API smoke |
| FEE-LINE-2026-06-03-02 | Ensure bulk collection resolves to `MonthlyFeeLine` targets only | `server/api/monthly-fees/bulk-pay.ts` | backend-specialist | FEE-LINE-2026-06-03-01 | IMPLEMENTED | Unit contract, no null receipt line linkage |
| FEE-LINE-2026-06-03-03 | Disable selection/payment for non-line legacy rows | `DataTable`, `FeeCollectionPage` | frontend-specialist | FEE-LINE-2026-06-03-01 | IMPLEMENTED | Lint, build, local/prod Playwright |
| FEE-LINE-2026-06-03-04 | Add regression coverage and deploy production | Unit/E2E, Vercel alias `edu-manager-gules` | qa/release | FEE-LINE-2026-06-03-01..03 | IMPLEMENTED | Deploy `dpl_AnCEyFGkpmZohfsrA8d95JmsuMoU`, production API + E2E |

**Evidence:** `receipts/2026-06-03-fee-workbench-class-line-split.md`.

**Validation:** `npx tsc --noEmit`, `npm run test:unit` 46/46, frontend lint zero warnings, `npm run build`, local API smoke (`rows=41`, `bad_multi_class_rows=0`, `payable_without_line=0`, 577ms), local Chromium E2E 1/1, production API smoke (`rows=41`, `bad_multi_class_rows=0`, `payable_without_line=0`, 6170ms), and production Chromium E2E 1/1.

**Residual risk:** historical paid aggregate monthly fees without line rows are shown as estimated per-class review rows and remain non-collectable until recalculated/corrected.

---

## IMPLEMENTED - TEMPLATE DESIGNER LEGACY CANVAS FIX (2026-06-04)

**Objective:** fix the production Template Designer issue where the default receipt template stayed stuck at `Dang khoi tao canvas...` even after refresh/cache clear.

| Task ID | Description | Scope | Agent Owner | Dependencies | Status | Quality Gates |
| ------- | ----------- | ----- | ----------- | ------------ | ------ | ------------- |
| TPL-CANVAS-2026-06-04-01 | RCA and fix legacy `{ elements: [] }` template config init hang | `TemplateDesignerPage.jsx` | frontend-specialist | Template Designer hardening | IMPLEMENTED | Local/prod Playwright, lint, tsc, unit, build |
| TPL-CANVAS-2026-06-04-02 | Add regression coverage for legacy template JSON | `template-designer-hardening.spec.js` | qa-automation | TPL-CANVAS-2026-06-04-01 | IMPLEMENTED | Local/prod E2E 1/1 |
| TPL-CANVAS-2026-06-04-03 | Deploy and production smoke | Vercel alias `edu-manager-gules` | release-manager | TPL-CANVAS-2026-06-04-01..02 | IMPLEMENTED | Deploy `dpl_EGoc3DQj6qYhSkFPxehw8LVUdHHt`, production UI probe + E2E |

**Evidence:** `receipts/2026-06-04-template-designer-legacy-canvas-fix.md`.

**Validation:** production repro showed status `Dang khoi tao canvas...13 object(s)` and page error `Cannot read properties of undefined (reading 'save')`; local legacy-config probe after fix showed save enabled and no page errors; `npm --prefix frontend run test:e2e -- template-designer-hardening.spec.js --reporter=list --output=...` passed 1/1 locally and on production; `npm --prefix frontend run lint`, `npx tsc --noEmit`, `npm run test:unit` 46/46, and `npm run build` passed. Production probe opened default receipt template, added Text + `receipt_id` field, saw `15 object(s)`, save enabled, and no page errors.

**Residual risk:** existing default template still stores legacy `{ elements: [] }`; the designer now scaffolds it safely. Saving the template will persist Fabric `{ objects: [] }` JSON.

---

## IMPLEMENTED - TEMPLATE DESIGNER VISIBLE RENDER + UPLOAD FIX (2026-06-05)

**Objective:** fix the production Template Designer issue where upload and add-field/add-component actions reported success but nothing visibly appeared on the canvas.

| Task ID | Description | Scope | Agent Owner | Dependencies | Status | Quality Gates |
| ------- | ----------- | ----- | ----------- | ------------ | ------ | ------------- |
| TPL-RENDER-2026-06-05-01 | RCA and fix Fabric upper-canvas overlay hiding rendered objects | `TemplateDesignerPage.jsx` | frontend-specialist | TPL-CANVAS-2026-06-04 | IMPLEMENTED | Local E2E, headed Chrome, production smoke |
| TPL-RENDER-2026-06-05-02 | Make upload background visibly fit the page and guard actions until canvas-ready | `TemplateDesignerPage.jsx` | frontend-specialist | TPL-RENDER-2026-06-05-01 | IMPLEMENTED | Pixel/hash browser smoke |
| TPL-RENDER-2026-06-05-03 | Add regression coverage for visible canvas deltas and runtime/API errors | `template-designer-hardening.spec.js` | qa-automation | TPL-RENDER-2026-06-05-01 | IMPLEMENTED | E2E 1/1 |
| TPL-RENDER-2026-06-05-04 | Deploy and production smoke real upload + field/component actions | Vercel alias `edu-manager-gules` | release-manager | TPL-RENDER-2026-06-05-01..03 | IMPLEMENTED | Deploy `dpl_8KRG5ePFEqeKNLZxZZdb9cMjdNg6`, production Chrome smoke |

**Evidence:** `receipts/2026-06-05-template-designer-visible-render-fix.md`.

**Validation:** focused Template Designer E2E passed 1/1 locally; Chrome headed Template Designer E2E passed 1/1; `npm --prefix frontend run lint`, `npx tsc --noEmit`, `npm run test:unit` 46/46, `npm run build`, and `git diff --check` passed. Production smoke opened `https://edu-manager-gules.vercel.app/templates/cmp6dbue800s9gcyrkhbzw8tj/design`, confirmed `upper-canvas` background `rgba(0, 0, 0, 0)`, clicked Text and `receipt_id`, uploaded image and background through the real production endpoint, verified canvas pixel/hash changes after every action, saw `17 object(s)`, and captured no runtime/API errors.

**Safety:** production smoke uploaded two small test images to Vercel Blob but did not save the template JSON. No Prisma migration or seed was run.

---

## IMPLEMENTED - FINANCIAL CORRECTION POLICY CLOSEOUT (2026-06-01)

**Objective:** close the next unchecked item: historical paid receipts/monthly fees with `days_count=0` and non-zero amount must be corrected through an explicit admin workflow, not silent data rewrite.

| Task ID | Description | Scope | Agent Owner | Dependencies | Status | Quality Gates |
| ------- | ----------- | ----- | ----------- | ------------ | ------ | ------------- |
| FIN-2026-06-01-01 | Add shared finance anomaly detection and correction note policy | `lib/finance-corrections.ts`, tests | backend-specialist | ADR-25, ADR-27 | IMPLEMENTED | Unit 43/43, typecheck |
| FIN-2026-06-01-02 | Add admin-only receipt correction endpoint | `server/api/receipts/[id]/correct.ts`, `api/router.ts` | backend-specialist | FIN-2026-06-01-01 | IMPLEMENTED | Production 401/404 route smoke, no mutation |
| FIN-2026-06-01-03 | Surface anomaly metadata across receipts, reports, and fee workbench | Receipts API, student-fees report, monthly-fees workbench | backend-specialist | FIN-2026-06-01-01 | IMPLEMENTED | Contract tests, local/prod smoke |
| FIN-2026-06-01-04 | Add admin UI entry points and lock unsafe collection rows | `ReceiptsPage`, `ReportsPage`, `FeeCollectionPage`, API client | frontend-specialist | FIN-2026-06-01-02..03 | IMPLEMENTED | Local/prod Playwright |
| FIN-2026-06-01-05 | Prevent recycle-bin restore from resurrecting corrected receipts | `lib/recycle-bin.ts` | backend-specialist | FIN-2026-06-01-02 | IMPLEMENTED | Contract test |
| FIN-2026-06-01-06 | Deploy and verify production | Vercel alias `edu-manager-gules` | release-manager | FIN-2026-06-01-01..05 | IMPLEMENTED | Deploy `dpl_GJ3U47QRgzsCGxF3mvBhUGa29h9v`, local/prod smoke |

**Evidence:** `receipts/2026-06-01-financial-correction-policy-closeout.md`, `receipts/perf/perf-lab-2026-06-01T13-55-44-834Z.md`, `receipts/perf/perf-lab-2026-06-01T13-58-02-410Z.md`, `receipts/perf/perf-lab-2026-06-01T14-08-01-723Z.md`.

**Residual risk:** production serverless/DB latency remains visible on first-touch dashboard/report/workbench APIs, with samples still around 2.8-4.6s on some endpoints. UI smoke passes and no 500/network errors were found, but deeper backend latency work remains a separate performance task.

---

## IMPLEMENTED - PERFORMANCE LAG RCA CLOSEOUT (2026-05-28)

**Objective:** close the latest reported lag/jank issues with measurable local and production browser evidence.

| Task ID | Description | Scope | Agent Owner | Dependencies | Status | Quality Gates |
| ------- | ----------- | ----- | ----------- | ------------ | ------ | ------------- |
| PERF-2026-05-28-01 | Reduce client jank from large motion/blur surfaces | `MainLayout`, `PageTransition`, `ProtectedRoute`, `Header`, `Sidebar`, Attendance cards | frontend-specialist | 2026-05-27 perf closeout | IMPLEMENTED | Local/prod Playwright 28/28 |
| PERF-2026-05-28-02 | Make heavy tables and loading states honest/lightweight | `DataTable`, `StudentsPage`, `FeeCollectionPage` | frontend-specialist | PERF-2026-05-28-01 | IMPLEMENTED | Lint/type/build + local/prod perf-lab |
| PERF-2026-05-28-03 | Guard stale fee/attendance async requests and parallelize Attendance month fetches | `FeeCollectionPage`, `AttendancePage` | frontend-specialist | PERF-2026-05-28-02 | IMPLEMENTED | Local/prod Playwright 28/28 |
| PERF-2026-05-28-04 | Reduce report API overfetch without changing response shape | `server/api/reports/*`, `monthly-fees/workbench`, `students?fields=table` | backend-specialist | PERF-2026-05-28-02 | IMPLEMENTED | `npx tsc --noEmit`, unit 39/39 |
| PERF-2026-05-28-05 | Add read-only browser/API performance harness | `scripts/perf-lab.mjs`, `receipts/perf/*` | qa-automation-engineer | PERF-2026-05-28-01 | IMPLEMENTED | Local/prod perf-lab pass, read-only violations 0 |
| PERF-2026-05-28-06 | Deploy and production smoke final build | Vercel alias `edu-manager-gules` | release-manager | PERF-2026-05-28-01..05 | IMPLEMENTED | Deploy `dpl_8tNtmmYtCJtY8U4gv8swgUWhpKEj`, production Playwright 28/28 |

**Evidence:** `receipts/2026-05-28-performance-lag-rca-closeout.md`, `receipts/perf/perf-lab-2026-05-28T16-04-40-168Z.md`, `receipts/perf/perf-lab-2026-05-28T16-08-15-968Z.md`.

**Residual risk:** production serverless cold starts and Neon network latency still produce multi-second first-touch samples; they are now measured and isolated from UI jank/overfetch defects.

---

## ✅ IMPLEMENTED ASSETS (UI + LOCAL/REFERENCE)

> These assets exist and remain valuable, but production parity is not complete until the missing Vercel API modules are ported and smoke-tested.

### Infrastructure ✅

- [x] Tailwind CSS v4 + Vite
- [x] SQLite reference + Neon PostgreSQL production
- [x] 70+ API endpoints
- [x] JWT Auth + Role-based access
- [x] Docker configuration
- [x] **Vercel Deployment** ⭐ NEW
- [x] **Prisma ORM** ⭐ NEW
- [x] **Neon PostgreSQL + Vercel Blob** ⭐ NEW

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
- [x] Neon PostgreSQL Database
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

## PRODUCTION READINESS HARDENING - 2026-05-18

**Objective:** close audit findings found while executing `PLAN.md`: dashboard must be data-linked, core APIs must use DB-backed auth, attendance locks must be enforceable, fee payment must be idempotent, and UX shell primitives must be safer for production operation.

| Task ID | Description | Scope | Status | Evidence |
| ------- | ----------- | ----- | ------ | -------- |
| PRUX-001 | Dashboard operations contract | `server/api/reports/dashboard.ts`, `DashboardPage.jsx` | IMPLEMENTED | `receipts/2026-05-18-production-readiness-hardening.md`; dashboard contract smoke passed |
| PRUX-002 | DB-backed auth for core handlers | auth/me, students, parents, classes, teachers, attendance, attendance periods, dashboard | IMPLEMENTED | `tests/production-contracts.test.ts`; no remaining `verifyAuth(` in `server/api` |
| PRUX-003 | Attendance lock enforcement | `lib/attendance-lock.ts`, attendance single/bulk write APIs | IMPLEMENTED | `receipts/2026-05-18-production-readiness-hardening.md`; locked periods return `ATTENDANCE_PERIOD_LOCKED` |
| PRUX-004 | Fee ledger idempotency | monthly fee pay, receipt create, receipt validation | IMPLEMENTED | `receipts/2026-05-18-production-readiness-hardening.md`; conditional fee claim + monthly fee link |
| PRUX-005 | UX primitives and shell fixes | PageHeader, MetricCard, PageState, Header, Modal, DataTable, EmptyState, Reports | IMPLEMENTED | Unit 24/24, typecheck, lint, build, audit, Chrome Playwright UX smoke 4/4 |
| PRUX-006 | Local smoke server for Vercel router | `scripts/local-smoke-server.ts`, `package.json` | IMPLEMENTED | `npm run dev:smoke` served `api/router.ts` + built frontend for current-code smoke |

---

## ATTENDANCE / TUITION RCA + REPORT / TEMPLATE UX - 2026-05-19

**Objective:** fix the real attendance-fee defect behind the Phuc example, make monthly tuition calculation deterministic, and add operational screens/tools needed to catch and manage the issue.

| Task ID | Description | Scope | Status | Evidence |
| ------- | ----------- | ----- | ------ | -------- |
| FEE-RCA-001 | RCA incorrect session count and tuition amount | Neon data, Phuc monthly fees/receipts/attendance, class config | IMPLEMENTED | `receipts/2026-05-19-attendance-tuition-report-template-ux.md`; root causes documented |
| FEE-ENG-001 | Shared tuition engine | `lib/tuition.ts`, fee endpoints, monthly fee generator, receipt linkage | IMPLEMENTED | `tests/tuition.test.ts`; unit 28/28; typecheck pass |
| ATT-UI-001 | Local-safe date keys and weekday convention | `frontend/src/utils/dateKeys.js`, `AttendancePage.jsx` | IMPLEMENTED | `toISOString()` removed from attendance date keys; Vietnamese weekday mapping tested |
| CLS-BULK-001 | Bulk add students while creating/updating class | `server/api/classes/index.ts`, `ClassesPage.jsx`, validation schema | IMPLEMENTED | Class create/update accepts `student_ids`; capacity checks included |
| REP-FEE-001 | Student tuition collection report | `server/api/reports/student-fees.ts`, `api/router.ts`, `ReportsPage.jsx`, API service | IMPLEMENTED | Playwright reports smoke pass; screenshot `frontend/output/playwright/reports-student-fees.png` |
| TPL-UX-001 | Canva-like Template Designer upgrade | `TemplateDesignerPage.jsx`, template image upload service | IMPLEMENTED | Playwright template designer smoke pass; screenshot `frontend/output/playwright/template-designer.png` |
| MOT-UX-001 | Motion-oriented operations UI direction | `index.css`, Reports UI, Stitch project `12785236930566023458` | IMPLEMENTED | Stitch `GEMINI_3_1_PRO` screen `bcc2bae4057745d4969b2b3b114ce526`; Figma Desktop unavailable in this session |
| MOT-UX-002 | Premium Dashboard Glassmorphism UI | `DashboardPage.jsx`, `index.css`, Recharts integration | IMPLEMENTED | Integrated `recharts` for LineChart, used `glass-surface` and `midnight-indigo` themes, verified with `npm run build` pass |

**Verification:** `npx tsc --noEmit`, `npm --prefix frontend run lint`, `npm run test:unit` 28/28, `npm run build`, `npm --prefix frontend run test:e2e -- ux-redesign-smoke.spec.js` 6/6, and `git diff --check` all passed.

**Operational note:** existing paid anomalous receipts were not auto-mutated. The new report flags them for explicit financial adjustment/void/reissue policy.

---

## PRODUCTION DEPLOY / ENV CLOSEOUT - 2026-05-23

**Objective:** make the locally verified 2026-05-18/2026-05-19 hardening visible on production and close the env/storage/runtime gaps that kept fixes from appearing.

| Task ID | Description | Scope | Status | Evidence |
| ------- | ----------- | ----- | ------ | -------- |
| DEPLOY-001 | Point active production target to current Vercel project | Vercel `hts2008s-projects/edu-manager` | IMPLEMENTED | `vercel inspect edu-manager-gules.vercel.app` -> deployment `dpl_8vQ9fWhfVJh1AAfKjzUr8mpNHH4o`, status Ready |
| DEPLOY-002 | Restore production runtime env | `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET` | IMPLEMENTED | `vercel env ls` shows encrypted Production entries for all required keys |
| DEPLOY-003 | Fix Vercel deployment packaging | `.vercelignore` | IMPLEMENTED | Root-only ignore patterns prevent excluding `server/api/receipts` and `server/api/reports` |
| DEPLOY-004 | Verify production app/API/storage | Auth, dashboard, student-fees, receipts/PDF, template upload, cron guard | IMPLEMENTED | Production Playwright `ux-redesign-smoke.spec.js` 6/6; upload-image 201; cron no-token 403 |
| DEPLOY-005 | Close dependency audit drift | `frontend/package-lock.json` | IMPLEMENTED | Root `npm audit --audit-level=high` pass; frontend `npm audit` found 0 vulnerabilities; Vercel install found 0 vulnerabilities |

**Canonical production URL:** `https://edu-manager-gules.vercel.app`.

**Delta URL note:** `https://edu-manager-delta.vercel.app` is not the current project alias for `hts2008s-projects/edu-manager`; do not use it as production truth unless it is explicitly reattached in Vercel.

**Receipt:** `receipts/2026-05-23-production-deploy-env-closeout.md`.

---

## PRODUCTION P0/P1 HARDENING - 2026-05-25

**Objective:** close the latest observed UI/menu and finance dataflow defects before the next production-live deployment.

| Task ID | Description | Scope | Status | Evidence |
| ------- | ----------- | ----- | ------ | -------- |
| P0MENU-001 | Fix `/classes` runtime crash | `frontend/src/pages/ClassesPage.jsx` | IMPLEMENTED | Imported `motion` alias and added full protected-menu traversal. Local Playwright UX smoke 7/7 passes. |
| P0FEE-001 | Make attendance-period lock atomic and multi-class aware | `server/api/attendance-periods/[id]/index.ts`, `lib/tuition.ts` | IMPLEMENTED | Transactional lock, aggregate active classes per student/month, unit 35/35, production-contract tests. |
| P0FEE-002 | Guard monthly-fee state transitions against race/corruption | `server/api/monthly-fees/*` | IMPLEMENTED | Conditional `updateMany` for calculate/confirm/cancel/pay; paid/linked rows no longer revert. Unit 35/35. |
| P0RCPT-001 | Prevent new positive tuition receipts with zero chargeable sessions | `lib/validation.ts`, `server/api/receipts/index.ts`, `server/api/monthly-fees/[id]/pay.ts` | IMPLEMENTED | Validation and runtime invariant `ZERO_DAY_POSITIVE_RECEIPT`; student-fees report surfaces receipt-only anomalies. |
| P1DASH-001 | Fix dashboard unpaid aggregate math | `server/api/reports/dashboard.ts` | IMPLEMENTED | Uses count/aggregate from DB instead of truncated preview list; contract tests updated. |
| P1PDF-001 | Improve Template Designer to PDF fidelity | `lib/pdf.ts`, `tests/pdf.test.ts` | IMPLEMENTED | Fabric text/line/rect/circle/ellipse/group/base64 image support; unsupported images skipped/fallback. PDF tests pass. |
| P1TEST-001 | Add route/menu regression coverage | `frontend/e2e/ux-redesign-smoke.spec.js` | IMPLEMENTED | Traverses 22 protected routes on desktop and mobile with no page/console/API errors or overflow. |

**Local evidence - 2026-05-25**
- `git diff --check` passed.
- `npx tsc --noEmit` passed.
- `npm run test:unit` passed 35/35.
- `npm --prefix frontend run lint -- --max-warnings=0` passed.
- `npm run build` passed after stopping the local smoke server that held Prisma's Windows query-engine DLL.
- `npm audit --audit-level=high` and `npm --prefix frontend audit --audit-level=high` passed with 0 vulnerabilities.
- `npm --prefix frontend run test:e2e -- ux-redesign-smoke.spec.js --reporter=list` passed 7/7 against `npm run dev:smoke`.

**Production status:** final production deploy `dpl_2gi9iJBPBnMAKRJb1ZsZs365DGcL` Ready on `https://edu-manager-gules.vercel.app`; production Playwright 7/7 and API probes passed after docs closeout commit `5b2b568`.

**Receipt:** `receipts/2026-05-25-p0-p1-production-readiness.md`.

---

## MONTH-BOUNDED TUITION + EDUFLOW UI CLOSEOUT - 2026-05-25

**Objective:** fix the remaining month/session tuition defect, reconnect receipt creation to MonthlyFee truth, and normalize the EduFlow UI shell after the dark dashboard/menu drift.

| Task ID | Description | Scope | Status | Evidence |
| ------- | ----------- | ----- | ------ | -------- |
| FEE-MONTH-001 | Count expected sessions inside the target month | `lib/tuition.ts`, `frontend/src/utils/dateKeys.js`, `tests/tuition.test.ts` | IMPLEMENTED | May 2026 regression tests: `2/week=10`, `3/week=14`, prorated monthly tuition, extra-session flag; unit 38/38. |
| FEE-MONTH-002 | Prevent stale receipt/monthly-fee drift | `ReceiptsPage.jsx`, `server/api/receipts/index.ts`, `lib/monthly-fee-generator.ts` | IMPLEMENTED | Receipts UI now calculates via MonthlyFee and submits `monthly_fee_id`; backend rejects stale direct totals when an eligible MonthlyFee exists. |
| FEE-MONTH-003 | Fix business-month defaults and invalid month parsing | `lib/api-utils.ts`, fee reminders, reports, fee collection | IMPLEMENTED | `parseMonthRange` rejects `YYYY-00`/`YYYY-13`; local/business month helpers replace UTC `toISOString()` defaults. |
| UI-EDUFLOW-001 | Restore coherent light EduFlow operations UI | Dashboard, sidebar/header/layout, forms, payments modal | IMPLEMENTED | Stitch `GEMINI_3_1_PRO` concept created; Figma node `3:36` inspected and screenshot captured; local/prod UX smoke pass. |
| UI-EDUFLOW-002 | Strengthen menu/admin route and UX regression coverage | `App.jsx`, `Header.jsx`, `Sidebar.jsx`, Playwright smoke | IMPLEMENTED | Admin routes are route-guarded; production Playwright UX smoke traverses 22 protected routes desktop/mobile. |
| QA-LIVE-001 | Deploy and smoke production after fixes | Vercel + Playwright | IMPLEMENTED | Vercel deploy `dpl_3AFgxEykCcXHhtC1A29jW37ZxJ9C` Ready; production UX smoke 7/7 and Phase-B smoke 17/17. |

**Local evidence - 2026-05-25 late pass**
- `git diff --check` passed with LF/CRLF warnings only.
- `npx tsc --noEmit` passed.
- `npm run test:unit` passed 38/38.
- `npm --prefix frontend run lint -- --max-warnings=0` passed.
- `npm run build` passed with existing Vite chunk-size/dynamic-import warnings.
- `npm --prefix frontend run test:e2e -- ux-redesign-smoke.spec.js --reporter=list` passed 7/7 locally.
- `npm --prefix frontend run test:e2e -- phase-b-smoke.spec.js --reporter=list` passed 17/17 locally.

**Production evidence - 2026-05-25 late pass**
- `npx vercel deploy --prod --yes` created `dpl_3AFgxEykCcXHhtC1A29jW37ZxJ9C`, Ready, aliased to `https://edu-manager-gules.vercel.app`.
- Production `ux-redesign-smoke.spec.js` passed 7/7.
- Production `phase-b-smoke.spec.js` passed 17/17.
- Final source-synced deployment probe passed: root/login/dashboard/receipts/PDF all 200; PDF content-type `application/pdf`, 17070 bytes.
- `npx prisma migrate status` was read-only and reported the Neon DB is not managed by Prisma Migrate because the repo has no `prisma/migrations`; no schema migration or seed was run.

**Receipt:** `receipts/2026-05-25-month-bounded-tuition-eduflow-ui.md`.

---

## FEE WORKBENCH + UX CLOSEOUT - 2026-05-25

**Objective:** close the reported production UX defects in edit modals, attendance month browsing, printable template design, and tuition collection workflow.

| Task ID | Description | Scope | Status | Evidence |
| ------- | ----------- | ----- | ------ | -------- |
| UX-MODAL-001 | Make edit dialogs scrollable and save actions reachable | `Modal.jsx`, modal consumers | IMPLEMENTED | Modal shell uses viewport-bounded flex layout with scrollable body; Phase-B smoke 17/17 local/prod. |
| UX-TABLE-001 | Add production row display controls | `DataTable.jsx` | IMPLEMENTED | Default shows all filtered rows; selector supports `Tất cả`, `500`, `100`, `50`; UX smoke local/prod pass. |
| UX-ATT-001 | Add attendance month navigation | `AttendancePage.jsx` | IMPLEMENTED | Previous/next month, previous/next 3 months, today reset; UX smoke local/prod pass. |
| UX-TPL-001 | Make Template Designer usable beyond a blank shell | `TemplateDesignerPage.jsx` | IMPLEMENTED | Default scaffold, reload by template id, undo/redo, zoom, responsive layout; Template Designer smoke local/prod pass. |
| FEE-WB-001 | Merge tuition collection into one Fee Workbench | Sidebar/Header, `FeeCollectionPage.jsx`, `ReceiptsPage.jsx` | IMPLEMENTED | Finance menu has one `Thu tiền` entry to `/fee-collection`; `/receipts` remains receipt history. |
| FEE-WB-002 | Add batch tuition collection API and UI | `server/api/monthly-fees/bulk-pay.ts`, router, API client | IMPLEMENTED | Unit contract route-shadow guard; production non-mutating bulk-pay smoke returns 401/NO_SELECTION correctly. |
| QA-LIVE-002 | Deploy and smoke production after UX/Fee Workbench fixes | Vercel + Playwright | IMPLEMENTED | Vercel deploy `dpl_7FBhsvzbfCLy85aQoirLyhwBRg12` Ready; production UX smoke 10/10 and Phase-B smoke 17/17. |

**Local evidence**
- `git diff --check`, `npx tsc --noEmit`, `npm run test:unit` 39/39, frontend lint max-warnings=0, `npm run build`, root/frontend audit high gates passed.
- Local API smoke for `/api/monthly-fees/bulk-pay`: no token -> `UNAUTHORIZED`; auth no selection -> `NO_SELECTION`.
- Local Playwright: `ux-redesign-smoke.spec.js` 10/10 and `phase-b-smoke.spec.js` 17/17.

**Production evidence**
- Commit `c793de3` pushed to `origin/main`.
- Production deploy `dpl_7FBhsvzbfCLy85aQoirLyhwBRg12` Ready and aliased to `https://edu-manager-gules.vercel.app`.
- Production API smoke: login success; bulk-pay no token -> `UNAUTHORIZED`; auth no selection -> `NO_SELECTION`.
- Production Playwright: UX smoke 10/10 and Phase-B smoke 17/17.

**Receipt:** `receipts/2026-05-25-fee-workbench-ux-closeout.md`.

---

## MODAL SCROLL PRODUCTION FIX - 2026-05-26

**Objective:** fix the remaining production defect where long edit/create modals could not scroll to bottom fields and save actions.

| Task ID | Description | Scope | Status | Evidence |
| ------- | ----------- | ----- | ------ | -------- |
| UX-MODAL-002 | Portal shared modal to viewport root | `frontend/src/components/ui/Modal.jsx` | IMPLEMENTED | Modal now renders through `createPortal(..., document.body)` so Framer Motion page transforms cannot re-anchor `position: fixed`. |
| UX-MODAL-003 | Make modal shell truly viewport bounded | `Modal.jsx` | IMPLEMENTED | Overlay uses `box-border overflow-hidden`, panel uses `max-h-full`, body is the only vertical scroll area with `overscroll-contain`. |
| QA-MODAL-001 | Add Chrome modal-scroll regression coverage | `frontend/e2e/ux-redesign-smoke.spec.js` | IMPLEMENTED | Tests open/scroll action buttons for classes, students, parents, teachers, payments, and receipts. |
| QA-LIVE-003 | Deploy and production-smoke modal fix | Vercel + Chrome Playwright | IMPLEMENTED | Production deploy `dpl_3TTwAgFMPEzeM8zfa5Q3A8RWYGDn` Ready; focused modal smoke 1/1, full UX 11/11, Phase-B 17/17. |

**Receipt:** `receipts/2026-05-26-modal-scroll-production-fix.md`.

---

## PERFORMANCE / ROUTE LOADING CLOSEOUT - 2026-05-27

**Objective:** reduce the reported platform slowness by cutting first-load bundle weight, removing page-level overfetch, adding safe API dedupe/cache, and creating repeatable Chrome performance evidence.

| Task ID | Description | Scope | Status | Evidence |
| ------- | ----------- | ----- | ------ | -------- |
| PERF-001 | Split route bundles and heavy vendors | `frontend/src/App.jsx`, `frontend/vite.config.js` | IMPLEMENTED | Vite build now emits page chunks plus `vendor-react`, `vendor-router`, `vendor-motion`, `vendor-charts`, `vendor-fabric`, `vendor-icons`. |
| PERF-002 | Reduce transition and API duplicate-call overhead | `PageTransition.jsx`, `frontend/src/services/api.js` | IMPLEMENTED | Removed blur-heavy page transition; GET cache/dedupe with mutation/401 invalidation; local/prod perf smoke pass. |
| PERF-003 | Remove `/classes` initial student overfetch | `ClassesPage.jsx`, `/api/students?fields=options` | IMPLEMENTED | `/classes` production perf smoke loads `auth/me`, `classes`, `teachers`; active student options load only when the class form opens. |
| PERF-004 | Add Fee Workbench aggregate read endpoint | `server/api/monthly-fees/workbench.ts`, router, `FeeCollectionPage.jsx` | IMPLEMENTED | `/fee-collection` production perf smoke uses `/api/monthly-fees/workbench?month=2026-05&limit=500`. |
| PERF-005 | Add DB/query performance hardening | `prisma/schema.prisma`, `reports/unpaid-students.ts`, `auth/me.ts` | IMPLEMENTED | Neon schema synced with additive indexes; unpaid-students uses grouped attendance count; `/auth/me` reuses DB-backed auth payload. |
| PERF-006 | Add repeatable Chrome perf smoke tooling | `scripts/perf-smoke.mjs`, `receipts/perf/*` | IMPLEMENTED | Local and production read-only perf smoke passed 10/10 routes and 25/25 API calls. |
| QA-LIVE-004 | Deploy and production-smoke performance closeout | Vercel + Chrome Playwright | IMPLEMENTED | Production deploy `dpl_A4LV7b5BR7g6SmVmirRAusA1Y69B` Ready; production perf 10/10, UX 11/11, Phase-B 17/17. |

**Local evidence**
- `git diff --check`, `npx prisma validate`, `node --check scripts/perf-smoke.mjs`, `npx tsc --noEmit`, `npm run test:unit` 39/39, frontend lint max-warnings=0, and `npm run build` passed.
- `npm run test:perf -- --base http://127.0.0.1:3000` passed 10/10 routes and 25/25 API calls with read-only guard enabled.
- Local Playwright: `ux-redesign-smoke.spec.js` 11/11 and `phase-b-smoke.spec.js` 17/17.
- Local perf report: `receipts/perf/perf-smoke-2026-05-27T06-11-33-159Z.md`.

**Production evidence**
- Commit `5c761ba` pushed to `origin/main`.
- `npx prisma db push` synced additive indexes to Neon; no seed or destructive production data mutation was run.
- Vercel production deploy `dpl_A4LV7b5BR7g6SmVmirRAusA1Y69B` Ready and aliased to `https://edu-manager-gules.vercel.app`.
- Production perf smoke passed 10/10 routes and 25/25 API calls with route p95 `7278.1ms` and API p95 `4262.2ms`.
- Production Playwright: UX smoke 11/11 and Phase-B smoke 17/17.
- Production perf report: `receipts/perf/perf-smoke-2026-05-27T06-17-57-458Z.md`.

**Receipt:** `receipts/2026-05-27-performance-production-closeout.md`.

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
| Post-deploy dirty-tree hygiene closeout | IMPLEMENTED | `receipts/2026-05-24-operational-hygiene-closeout.md`; sidecar agents classified drift, temp `frontend/update*` scripts removed, `.codex/config.toml` restored safe, diff/type/unit/lint/build/audit/prod Playwright pass |
| Main fast-forward + production deploy | IMPLEMENTED | `receipts/2026-05-24-main-merge-production-deploy.md`; `main` fast-forwarded to `e4bab40`, pushed, Vercel production deployment `dpl_8vQ9fWhfVJh1AAfKjzUr8mpNHH4o`, production API/UI smoke pass |
| P0/P1 production hardening closeout | IMPLEMENTED | `receipts/2026-05-25-p0-p1-production-readiness.md`; implementation commit `d2e19df`, docs commit `5b2b568`, final Vercel `dpl_2gi9iJBPBnMAKRJb1ZsZs365DGcL`, local + production Playwright 7/7, API probes pass |
| Month-bounded tuition + EduFlow UI closeout | IMPLEMENTED | `receipts/2026-05-25-month-bounded-tuition-eduflow-ui.md`; Stitch `GEMINI_3_1_PRO`, Figma node `3:36`, local unit 38/38, local/prod UX 7/7, local/prod Phase-B 17/17, Vercel `dpl_3AFgxEykCcXHhtC1A29jW37ZxJ9C` |
| Performance route-loading closeout | IMPLEMENTED | `receipts/2026-05-27-performance-production-closeout.md`; commit `5c761ba`, Vercel `dpl_A4LV7b5BR7g6SmVmirRAusA1Y69B`, local/prod perf 10/10, local/prod UX 11/11, local/prod Phase-B 17/17 |

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
| Tests/CI | Phase B/C baseline implemented; latest gates pass with unit 39/39, local/prod perf smoke 10/10, local/prod UX smoke 11/11, local/prod Phase-B smoke 17/17, tsc/build/lint/diff-check pass |
| Production usability | Live on `edu-manager-gules`; latest performance route-loading closeout is deployed and production-smoked |

**Overall:** Production live and usable on `https://edu-manager-gules.vercel.app`; Phase A/B/C plus the 2026-05-18/2026-05-19 hardening, EduFlow UI pass, 2026-05-25 P0/P1 fixes, month-bounded tuition closeout, Fee Workbench + UX closeout, the 2026-05-26 modal scroll production fix, and the 2026-05-27 performance route-loading closeout are deployed and smoked. Fee reminder live provider delivery remains intentionally disabled until `REMINDER_SEND_ENABLED=true` and provider/opt-in policy are approved. Production credential rotation remains before real operation.

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
| **Live**  | https://edu-manager-gules.vercel.app                        |
| Frontend  | http://localhost:3000                                       |
| Backend   | http://localhost:5000                                       |
| Dashboard | dashboard.html                                              |
| Neon DB   | https://console.neon.tech/app/projects/dry-dew-91484915     |

---

**Last Updated:** 2026-06-05 20:46
