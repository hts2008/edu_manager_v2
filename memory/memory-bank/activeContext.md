# Active Context

> Current technical state of EDU_MANAGER_V2. Restored 2026-04-25 after memory cross-contamination cleanup. Updated 2026-05-14 after agency PRD assessment and workspace scope/path cleanup.

## Project State
- **Product**: Edu Manager V2 — Vietnamese education center management system for classes, students, parents, teachers, attendance, monthly fees, receipts, payments, reports, and printable templates.
- **Status**: PRODUCTION LIVE. Phase A API parity passed on production for existing UI flows; Phase B quality hardening remains pending.
- **Production URL**: https://edu-manager-delta.vercel.app
- **Login**: `admin / admin123`
- **Repository**: https://github.com/hts2008/edu_manager_v2
- **Current Git HEAD observed in Codex session**: `cd77f48`.
- **Working tree warning**: DIRTY due to framework import/cleanup state and uncommitted memory/board/evidence updates. Avoid broad commits; stage explicit paths only.

## Phase A Production Closeout (2026-05-15)
- **Production target**: Vercel alias `https://edu-manager-delta.vercel.app` on commit `cd77f48`, ready state `READY`.
- **Database/storage**: Neon project `dry-dew-91484915` is the approved Postgres target. Vercel Blob store `edu-manager-blob` replaces Supabase Storage for template image uploads.
- **Schema/data**: `prisma db push` and `npm run db:seed` completed against Neon. No Prisma migration deploy was run because repo has no `prisma/migrations` history.
- **Serverless routing**: Vercel function-count failure was fixed by moving handlers to `server/api/*` and routing `/api/:path*` through one `api/router.ts` function.
- **API smoke**: Auth/RBAC/change-password/logout, attendance fee, monthly-fees calculate/confirm/pay, receipt/payment PDFs, templates CRUD/default/upload, financial report, and unpaid-students report pass on production.
- **Chrome UI smoke**: `/receipts`, `/fee-collection`, `/payments`, `/templates`, `/reports`, `/history`, `/attendance`, `/attendance-periods` have no failed fetch requests.
- **Parity/contract**: `scripts/parity-test.mjs` passed 7/7 against local Express reference and production Vercel target.

## Current Sprint Focus
1. **Phase A Production API Parity** — port missing Express/reference backend modules to Vercel TypeScript + Prisma.
2. **Documentation Truth Reset** — keep KANBAN and memory aligned with agency PRD: production live but not yet production-ready.
3. **Operational Hygiene** — keep app-code changes isolated from framework drift.
4. **Post-Phase-A Work** — UI/UX improvements and seed-data expansion are deferred until production API parity passes.
5. **Phase B Quality** — tests, CI, validation, rate-limit, Sentry, and cleanup after Phase A.

## Verified Architecture
- **Frontend**: Vite + React + Tailwind CSS v4. Code truth from `frontend/package.json` currently shows React 19.2.0 and Vite 7.2.4; older docs may still mention React 18.
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
- **Git Hygiene**: Dirty state classification found no dirty app-code paths; current dirty scope is framework sync plus board/memory restoration files. Commit only explicit, reviewed files.
- **Actual Git State Changed**: Current `git status --short` shows app-code modifications in `frontend/src/pages/ClassesPage.jsx`, `DashboardPage.jsx`, `ReportsPage.jsx`, `StudentsPage.jsx`, plus untracked `frontend/src/hooks/`. Review before editing or committing those areas.
- **Windows Shell**: If PowerShell execution policy blocks scripts, run build commands via `cmd /c`.
- **Serverless Routing**: Dynamic folders like `[id]` can shadow each other; prefer query-param actions for ambiguous operations.
- **Dual-Brain Tooling Degradation (Codex session 2026-05-14)**: MCP tool discovery did not expose MCPProxy/Neural Memory or Context+ tools in this Codex turn. Work proceeded in markdown-only/manual mode; do not treat NM/C+ write-back as completed for this task.
- **Phase A Acceptance Boundary**: A1-A16 are implemented with production smoke evidence as of 2026-05-15. Phase B gates still need tests, CI, validation, and observability.
- **Default Credentials Risk**: `admin / admin123` is useful for dev/smoke, but production operation must rotate credentials and JWT secret.
- **Docs Drift**: README and old memory may mention React 18, Express/SQLite as primary, or 100% completion. Prefer current package/code + agency PRD + KANBAN updates.

## Files Touched This Session
- `lib/auth.ts`, `lib/api-utils.ts`, `lib/pdf.ts`, `lib/storage.ts`
- `api/auth/*`, `api/attendance/calculate-fee.ts`, `api/monthly-fees/*`, `api/receipts/*`, `api/payments/*`, `api/templates/*`, `api/reports/*`
- `frontend/src/services/api.js`, `frontend/eslint.config.js`, and lint-only frontend cleanup files
- `package.json`, `package-lock.json`, `.env.example`, `prisma/seed.ts`, `scripts/parity-test.mjs`
- `KANBAN.md`, `memory/memory-bank/activeContext.md`, `memory/memory-bank/progress.md`, `memory/memory-bank/decisionLog.md`, `memory/sessions/current-session.md`
- `receipts/2026-05-14-phase-a-api-parity-static.md`
- `receipts/2026-05-14-phase-a-closeout-attempt.md`

## Just Completed
Phase A production parity is deployed and smoked. The Supabase blocker was bypassed by moving the approved target to Neon Postgres and Vercel Blob. Serverless function-count failure was fixed by consolidating routes behind `api/router.ts`. PDF runtime failure was fixed by using the pdfmake Printer runtime correctly. Production API, Chrome UI, and parity/contract checks now pass.

## Now Doing
Phase A closeout documentation/evidence write-back. Production is usable for existing Phase A UI flows.

## Next Recommended Action
1. Start Phase B quality hardening: tests, CI, validation, error handling, rate limiting, Sentry/logging, and cleanup.
2. Rotate default production credentials before real operation.
3. Decide whether Express/SQLite remains reference/dev mock only and record the decision.
4. Clean existing frontend lint warnings and `.backup` files under Phase B.
