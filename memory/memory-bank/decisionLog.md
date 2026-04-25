# Decision Log

> Architectural and strategic decisions for EDU_MANAGER_V2. Restored 2026-04-25 after TTNDD_Ops memory cross-contamination.

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

### ADR-11: Keep UAIC Framework, Restore Project Truth
**Date**: 2026-04-25
**Context**: Workspace memory was contaminated with TTNDD_Ops context after UAIC framework import/sync.
**Decision**: Keep UAIC operational structure, but overwrite memory/session files with EDU_MANAGER_V2-specific facts.
**Rationale**: Preserves useful workflow infrastructure while preventing project truth contamination.
**Status**: IMPLEMENTED

### ADR-12: Classify Dirty State Before Any Feature Commit
**Date**: 2026-04-25
**Context**: Git working tree contains a large UAIC framework sync/import delta plus restored Edu Manager memory files.
**Decision**: Separate dirty state into three buckets before committing or coding further: UAIC framework sync, memory restoration, and app-code changes.
**Rationale**: Prevents framework drift and contamination cleanup from being mixed into feature commits.
**Status**: ACTIVE

### ADR-13: Keep Contamination Evidence Only as Historical Evidence
**Date**: 2026-04-25
**Context**: TTNDD/UAIC references may appear in memory logs because the restoration task must document the contamination source.
**Decision**: Retain contamination mentions only where they explain cleanup history; do not treat them as EDU_MANAGER_V2 project truth.
**Rationale**: Maintains auditability while keeping active project context clean.
**Status**: ACTIVE

### ADR-14: Treat Context+ Runtime Repair as Medium-Risk Operational Maintenance
**Date**: 2026-04-25
**Context**: Context+ MCP calls fail with `connection closed: EOF`, while direct `npx -y contextplus --help` starts a stdio server and treats `--help` as a root path. The runtime is part of the Dual-Brain operating system, not application business logic.
**Decision**: Do not edit app code. First plan, isolate, and approve runtime/config remediation; prefer reversible config/process changes before dependency changes.
**Rationale**: Prevents operational tooling fixes from being mixed with production app commits and protects the already-live Edu Manager system.
**Status**: ACTIVE
