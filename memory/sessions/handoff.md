# Session Handoff - EDU_MANAGER_V2 Phase C Closeout

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
- **Latest production deployment observed**: `dpl_GJ3U47QRgzsCGxF3mvBhUGa29h9v`.
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
