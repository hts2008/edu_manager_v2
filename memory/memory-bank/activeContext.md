# Active Context

> Current technical state of EDU_MANAGER_V2. Restored 2026-04-25 after memory cross-contamination cleanup.

## Project State
- **Product**: Edu Manager V2 — education management system for classes, students, parents, teachers, attendance, receipts, payments, reports, and templates.
- **Status**: ✅ 100% COMPLETE, PRODUCTION LIVE.
- **Production URL**: https://edu-manager-delta.vercel.app
- **Login**: `admin / admin123`
- **Repository**: https://github.com/hts2008/edu_manager_v2
- **Current Git HEAD known from prior audit**: `fc400eb` — `feat(attendance): add review modal before approving`.
- **Working tree warning**: DIRTY due to UAIC framework import/cleanup state. Avoid broad commits until reviewed.

## Current Sprint Focus
1. **Operational Drift Cleanup** — reconcile board, session, and memory files after the successful Dual-Brain recovery.
2. **Memory Maintenance Cycle** — continue lightweight edu_manager recall cycles; consolidate again only after repeated recalls over time.
3. **UI/UX Improvements** — next product task after operational hygiene is stable.
4. **More Seed Data** — expand `prisma/seed.ts` after git scope is clean.
5. **Optional Low Priority** — API docs, line chart reports, thermal 80mm print testing, E2E automation.

## Verified Architecture
- **Frontend**: Vite + React + Tailwind CSS v4.
- **Backend**: Node.js / Express-style API on Vercel Serverless Functions.
- **ORM**: Prisma ORM.
- **Database**: Supabase PostgreSQL production database.
- **Deployment**: Vercel production deployment with Supabase connection pooling.
- **Build Requirement**: Vercel build must run `npx prisma generate` before frontend build.

## Critical Project Patterns
- **Snake-Sync Protocol**: Backend/Prisma uses camelCase while frontend expects snake_case. API handlers must map responses manually to snake_case where legacy UI components require it.
- **Prisma Client Singleton**: `lib/prisma.ts` singleton is required for serverless connection stability.
- **Tri-State Sync**: Use Identify → Reactivate → Insulate for soft-deleted records to avoid Prisma P2002 unique conflicts.
- **Bulk Aggregation**: Prefer in-memory `Map` aggregation for attendance/reporting windows instead of complex joins in serverless paths.
- **Parametric Branching**: Prefer root routes with `?action=X` where possible to avoid serverless dynamic route shadowing.

## Important Features Already Implemented
- Integrated billing-aware Holiday (`Ngày lễ`) attendance status.
- Visual attendance calendar markers.
- Attendance Review workflow with preview/reject/approve lifecycle.
- Production login recovery and Prisma client/database desync resolution.
- Template Designer and template management flows.
- Attendance periods serverless migration.

## Known Risks / Gotchas
- **Memory Cross-Contamination**: Historical TTNDD/UAIC mentions are allowed only as contamination-cleanup evidence, not project truth.
- **Neural Memory Status**: `neural-memory-edu-manager:nmem_health` returns `brain=edu_manager`, Grade C, purity 62.1. Main warning is `NO_CONSOLIDATION`; memories need repeated recall over time.
- **Operational Drift**: `KANBAN.md`, `current-session.md`, and git status still need cleanup/alignment so future commits do not mix framework drift with product work.
- **Git Hygiene**: Dirty state classification found no dirty app-code paths; current dirty scope is UAIC framework sync plus board/memory restoration files. Commit only explicit, reviewed files.
- **Windows Shell**: If PowerShell execution policy blocks scripts, run build commands via `cmd /c`.
- **Serverless Routing**: Dynamic folders like `[id]` can shadow each other; prefer query-param actions for ambiguous operations.

## Files Touched This Session
- `KANBAN.md`
- `memory/memory-bank/activeContext.md`
- `memory/memory-bank/progress.md`
- `memory/memory-bank/decisionLog.md`
- `memory/sessions/current-session.md`

## Just Completed
Completed Context+ stabilization and verification end-to-end. After MCP host reload, both `get_context_tree` and `semantic_code_search` now work again. Dual-Brain runtime is fully restored for EDU_MANAGER_V2.

## Now Doing
Cleaning operational drift so board/session state and git scope all reflect the verified runtime recovery before any new feature work.

## Next Recommended Action
1. Finalize operational doc cleanup for KANBAN + current-session alignment.
2. Review git dirty buckets and isolate operational changes from framework drift.
3. Resume product work with the next queued task: UI/UX improvements, then seed-data expansion once git scope is explicitly reviewed/isolated.
