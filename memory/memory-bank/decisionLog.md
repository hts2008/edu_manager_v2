# Decision Log

> Architectural and strategic decisions for EDU_MANAGER_V2. Restored 2026-04-25 after external workspace memory cross-contamination.

---

### ADR-01: Vite + React Frontend
**Date**: 2026-01-09
**Context**: Edu Manager needs a fast, lightweight SPA for education operations.
**Decision**: Use Vite + React for frontend delivery.
**Rationale**: Fast dev server, simple production build, low framework overhead, suitable for Vercel deployment.
**Status**: IMPLEMENTED

### ADR-02: Tailwind CSS v4 Design Layer
**Date**: 2026-01-09
**Context**: UI needed consistent utility styling and rapid iteration.
**Decision**: Use Tailwind CSS v4 for frontend styling.
**Rationale**: Enables quick layout work and consistent visual tokens without a heavy component framework.
**Status**: IMPLEMENTED

### ADR-03: Prisma ORM + Supabase PostgreSQL
**Date**: 2026-01-09
**Context**: Production deployment needed a managed relational database and a typed ORM.
**Decision**: Use Prisma ORM with Supabase PostgreSQL.
**Rationale**: Prisma provides schema typing and migrations; Supabase provides managed PostgreSQL suitable for production.
**Status**: IMPLEMENTED

### ADR-04: Vercel Serverless Deployment
**Date**: 2026-01-09
**Context**: Project needed simple cloud deployment for frontend and API routes.
**Decision**: Deploy to Vercel with serverless API functions and Supabase database connectivity.
**Rationale**: Low operational burden, automatic deployments, and a good fit for the existing JavaScript stack.
**Status**: IMPLEMENTED

### ADR-05: Prisma Generate in Build Pipeline
**Date**: 2026-01-09
**Context**: Vercel builds require Prisma Client to match the deployed schema.
**Decision**: Run `npx prisma generate` before building the frontend in production.
**Rationale**: Prevents Prisma client/database desync and missing generated client errors.
**Status**: IMPLEMENTED

### ADR-06: Snake-Sync Legacy Contract
**Date**: 2026-04-25
**Context**: Backend and Prisma use camelCase names while existing frontend components expect snake_case fields.
**Decision**: Preserve manual API response mapping from camelCase to snake_case where required by UI contracts.
**Rationale**: Avoids broad frontend rewrites and stabilizes existing production behavior.
**Alternatives**: Rename Prisma schema fields or rewrite all UI contracts, both too risky for production-live system.
**Status**: ACTIVE

### ADR-07: Prisma Client Singleton for Serverless
**Date**: 2026-04-25
**Context**: Serverless functions can create excessive database connections if PrismaClient is instantiated per request.
**Decision**: Use a singleton Prisma client pattern in `lib/prisma.ts`.
**Rationale**: Improves connection stability with Supabase pooler in serverless environments.
**Status**: ACTIVE

### ADR-08: Tri-State Soft-Delete Synchronization
**Date**: 2026-04-25
**Context**: Soft-deleted entities can conflict with unique constraints when recreated.
**Decision**: Use Identify → Reactivate → Insulate before inserting records that may already exist as inactive rows.
**Rationale**: Prevents Prisma P2002 conflicts and preserves historical records.
**Status**: ACTIVE

### ADR-09: Bulk Aggregation with In-Memory Maps
**Date**: 2026-04-25
**Context**: Attendance and reporting windows require multi-record aggregation under serverless constraints.
**Decision**: Prefer fetching bounded windows and aggregating with `Map` in memory for review/report APIs.
**Rationale**: Predictable performance and simpler logic than deep join chains in serverless handlers.
**Status**: ACTIVE

### ADR-10: Parametric Branching over Ambiguous Dynamic Routes
**Date**: 2026-04-25
**Context**: Vercel serverless route folders with dynamic segments can shadow each other.
**Decision**: Prefer root handlers with `?action=X` for closely related operations where dynamic route conflicts are likely.
**Rationale**: Reduces route shadowing risk and simplifies deployment behavior.
**Status**: ACTIVE

### ADR-11: Keep Local Workflow Framework, Restore Project Truth
**Date**: 2026-04-25
**Context**: Workspace memory was contaminated with external project context after framework import/sync.
**Decision**: Keep the local operational structure, but overwrite memory/session files with EDU_MANAGER_V2-specific facts.
**Rationale**: Preserves useful workflow infrastructure while preventing project truth contamination.
**Status**: IMPLEMENTED

### ADR-12: Classify Dirty State Before Any Feature Commit
**Date**: 2026-04-25
**Context**: Git working tree contains a large framework sync/import delta plus restored Edu Manager memory files.
**Decision**: Separate dirty state into three buckets before committing or coding further: framework sync, memory restoration, and app-code changes.
**Rationale**: Prevents framework drift and contamination cleanup from being mixed into feature commits.
**Status**: ACTIVE

### ADR-13: Keep Contamination Evidence Only as Historical Evidence
**Date**: 2026-04-25
**Context**: External workspace references may appear in historical memory logs because the restoration task documented the contamination source.
**Decision**: Retain only generic contamination notes where they explain cleanup history; do not treat them as EDU_MANAGER_V2 project truth.
**Rationale**: Maintains auditability while keeping active project context clean.
**Status**: ACTIVE

### ADR-14: Treat Context+ Runtime Repair as Medium-Risk Operational Maintenance
**Date**: 2026-04-25
**Context**: Context+ MCP calls fail with `connection closed: EOF`, while direct `npx -y contextplus --help` starts a stdio server and treats `--help` as a root path. The runtime is part of the Dual-Brain operating system, not application business logic.
**Decision**: Do not edit app code. First plan, isolate, and approve runtime/config remediation; prefer reversible config/process changes before dependency changes.
**Rationale**: Prevents operational tooling fixes from being mixed with production app commits and protects the already-live Edu Manager system.
**Status**: ACTIVE

### ADR-15: Neural Memory via MCPProxy `neural-memory-default` with `edu_manager` Brain
**Date**: 2026-04-26
**Context**: The user confirmed that EDU_MANAGER_V2 must use Neural Memory through MCPProxy server `neural-memory-default`, exposed in the MCPProxy UI at `http://127.0.0.1:8080/ui/servers/neural-memory-default`. This server contains the existing `edu_manager` brain with the correct prior brain and memory history.
**Decision**: Always route EDU_MANAGER_V2 Neural Memory access through MCPProxy server `neural-memory-default`, then use the `edu_manager` brain as the authoritative workspace memory. Do not route this workspace to any other brain.
**Rationale**: Preserves continuity with the correct Edu Manager memory history and prevents cross-project contamination during Dual-Brain startup, recall, consolidation, and post-task write-back.
**Status**: ACTIVE

### ADR-16: EDU_MANAGER_V2 Workspace Boundary
**Date**: 2026-05-14
**Context**: The user confirmed this workspace is EDU_MANAGER_V2 only and that external workspace paths/names were accidental contamination.
**Decision**: Treat `C:\Users\haitr\OneDrive\0. GAU DATA\0.APP\EDU_MANAGER_V2` as the canonical workspace path. Workflow, doctrine, memory, and skill files must not reference project-specific external workspace names or hard-coded out-of-scope paths.
**Rationale**: Prevents cross-project context leakage and keeps future agents focused on EDU_MANAGER_V2 production API parity work.
**Status**: ACTIVE

### ADR-17: Phase A Vercel API Parity Before UI/Seed Expansion
**Date**: 2026-05-14
**Context**: Agency PRD reset found production live but only partial usable because Vercel API modules were missing for existing UI flows.
**Decision**: Port the missing Express/reference backend behavior into Vercel Serverless TypeScript + Prisma first, keep `prisma/schema.prisma` as data source of truth, and defer UI polish/seed expansion until Phase A smoke passes.
**Rationale**: Existing UI already expects these modules. API parity removes production 404/network failures without broad frontend redesign or unapproved production DB mutation.
**Status**: IMPLEMENTED — production deploy, API smoke, Chrome UI smoke, PDF smoke, and parity/contract run passed on 2026-05-15. See `receipts/2026-05-15-phase-a-production-closeout.md`.

### ADR-18: Neon + Vercel Blob for Phase A Production Runtime
**Date**: 2026-05-15
**Context**: The original Supabase project was paused/unusable and Supabase Storage created operational risk for Phase A. Vercel Hobby also failed when the API was expanded to 35 separate serverless functions.
**Decision**: Use Neon Postgres project `dry-dew-91484915` as the approved database target and Vercel Blob store `edu-manager-blob` for template image uploads. Consolidate Vercel API routing into one `api/router.ts` function that dispatches to `server/api/*` handlers.
**Rationale**: Neon restores a controllable Postgres target quickly; Vercel Blob removes Supabase Storage dependency; one router function avoids Vercel function-count limits while preserving frontend API paths.
**Status**: IMPLEMENTED

### ADR-19: Vercel + Prisma Is Production Backend Truth
**Date**: 2026-05-15
**Context**: Phase A restored production behavior by porting reference Express endpoints into Vercel Serverless TypeScript handlers backed by Prisma and Neon. Keeping Express as a production-equivalent backend would create two divergent contracts.
**Decision**: Treat `server/api/*` plus `api/router.ts` as the production backend. Keep `backend/` Express + SQLite as reference/dev comparison only.
**Rationale**: Production smoke, parity, and deployment evidence now validate Vercel + Prisma. New production behavior must be tested against that path and preserve the existing frontend API boundary.
**Status**: IMPLEMENTED. See `docs/architecture/backend-strategy.md`.

### ADR-20: CSV Import Before Reintroducing XLSX
**Date**: 2026-05-16
**Context**: Phase C C2 requested Excel/CSV import. Phase B removed the vulnerable `xlsx` dependency and both root/frontend audits are clean. Reintroducing spreadsheet parsing would expand the dependency and security surface during product-slice closeout.
**Decision**: Implement C2 as CSV import for Student + Parent records, including Excel-exported CSV support, robust preview validation, duplicate detection, and rollback-protected commit. Defer native `.xlsx` binary parsing until there is an approved dependency/security plan.
**Rationale**: CSV covers the immediate operator workflow without adding dependency risk, keeps production deploy small, and allows production smoke to remain non-mutating via preview-only checks.
**Status**: IMPLEMENTED

### ADR-21: Phase C Operational Safety Gates
**Date**: 2026-05-16
**Context**: The user approved completing remaining Phase C work, including cron generation, parent portal, fee reminders, backup automation, and soft delete/recycle bin. Some flows can create production side effects or require external providers.
**Decision**: Enable production cron and backup only behind explicit server-side secrets; keep live fee-reminder delivery disabled unless `REMINDER_SEND_ENABLED=true` and a provider webhook is configured; use parent phone + student DOB as the Phase C parent portal baseline.
**Rationale**: This completes the operator workflows while preventing unauthenticated cron calls, accidental SMS/Zalo sending, and secret leakage.
**Status**: IMPLEMENTED

### ADR-22: Phase C Soft Delete Scope
**Date**: 2026-05-16
**Context**: C10 required recoverable deletion without rewriting the full data model during production closeout.
**Decision**: Add nullable `deleted_at` soft delete to Students, Parents, Receipts, and Payments, then provide admin recycle-bin list/restore/purge operations for those entities.
**Rationale**: These are the user-facing records most likely to need recovery. Keeping the scope narrow reduces migration risk while preserving fee and receipt history through guarded delete behavior.
**Status**: IMPLEMENTED

### ADR-23: Encrypted Vercel Blob Backups
**Date**: 2026-05-16
**Context**: C9 required backup automation and a restore drill without introducing another storage provider during the same closeout.
**Decision**: Store encrypted JSON backups in Vercel Blob using AES-256-GCM, with verification that decrypts and validates payload shape/table counts. Do not run destructive restore operations automatically.
**Rationale**: Vercel Blob is already part of the production stack and avoids a second external dependency. Verification proves the backup can be read without risking production data overwrite.
**Status**: IMPLEMENTED
