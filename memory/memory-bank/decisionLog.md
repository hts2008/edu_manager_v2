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

### ADR-03: Prisma ORM + Managed PostgreSQL
**Date**: 2026-01-09
**Context**: Production deployment needed a managed relational database and a typed ORM.
**Decision**: Use Prisma ORM with a managed PostgreSQL database. The current production target is Neon, superseding the original Supabase target via ADR-18.
**Rationale**: Prisma provides schema typing and migrations; managed PostgreSQL keeps production operations low-friction.
**Status**: IMPLEMENTED; database provider superseded by ADR-18.

### ADR-04: Vercel Serverless Deployment
**Date**: 2026-01-09
**Context**: Project needed simple cloud deployment for frontend and API routes.
**Decision**: Deploy to Vercel with serverless API functions and managed PostgreSQL connectivity.
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
**Rationale**: Improves connection stability with pooled managed PostgreSQL in serverless environments.
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

### ADR-24: Production Readiness Contract-First Hardening
**Date**: 2026-05-18
**Context**: The route-by-route audit found that visible UI polish was not enough: dashboard fields were missing, some handlers trusted old JWT payloads without checking active users, locked attendance periods did not protect later writes, and fee/receipt workflows could diverge.
**Decision**: Fix critical workflows backend-outward before continuing page-level visual redesign. New dashboard fields are additive; core handlers must use `requireAuth()`; attendance writes must reject locked periods; monthly-fee payment must claim the fee row conditionally before receipt creation; direct receipt creation may link an eligible monthly fee row.
**Rationale**: This preserves the existing frontend boundary while making production behavior enforceable from persisted data and transactions instead of UI assumptions.
**Status**: IMPLEMENTED locally with unit/type/lint/build/audit and Chrome-channel Playwright smoke evidence on 2026-05-18.

### ADR-25: Monthly Tuition Engine and Anomaly-First Financial Correction
**Date**: 2026-05-19
**Context**: A paid receipt could show `days_count=0` with a non-zero amount because attendance-period fee generation did not persist total days and because `sessions_per_week` class tuition was treated as per-session tuition. Existing production-like financial records may already contain anomalies.
**Decision**: Centralize tuition calculation in `lib/tuition.ts`. For `sessions_per_week` classes, treat `fee_per_day` as monthly tuition and divide by the actual expected sessions for that month (`calendar rows * sessions_per_week`). For `schedule_days`, count actual matching weekdays in the month. Keep unscheduled classes on legacy per-session billing. Do not silently mutate already-paid anomalous receipts; expose them through the student-fees report for explicit adjustment/void/reissue handling.
**Rationale**: A shared engine prevents endpoint drift, matches the operator model for monthly tuition, avoids future zero-session/non-zero-amount records, and protects financial auditability by not rewriting paid history without a policy.
**Status**: IMPLEMENTED locally with unit/type/lint/build/Playwright evidence on 2026-05-19.

### ADR-26: Canonical Production Alias and Vercel Env/Blob Ownership
**Date**: 2026-05-23
**Context**: The previous `edu-manager-delta` URL was stale/outside the active `hts2008s-projects/edu-manager` project, while the current project had no Production env vars and template image upload failed with `STORAGE_NOT_CONFIGURED`.
**Decision**: Treat `https://edu-manager-gules.vercel.app` as the canonical production alias for the active Vercel project. Required Production env keys are `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `BLOB_READ_WRITE_TOKEN`, and `CRON_SECRET`. Use Vercel Blob store `edu-manager-live-blob` for template images and backup storage. Keep `.vercelignore` patterns root-anchored so operational evidence folders do not exclude `server/api/*` modules.
**Rationale**: This aligns the URL users open with the Vercel project being deployed, restores Prisma/JWT/storage/cron runtime behavior, and prevents serverless bundle omissions from broad ignore patterns.
**Status**: IMPLEMENTED with production deploy `dpl_2HXPKo2UcdrRUBrAGBzrYyeHvHe9`, upload-image 201, cron guard 403, Playwright 6/6, and audit 0 vulnerabilities on 2026-05-23.

### ADR-27: Atomic Fee State and Zero-Day Receipt Invariant
**Date**: 2026-05-25
**Context**: Follow-up P0/P1 review found that attendance-period lock could refresh a one-class-only monthly fee, monthly-fee confirm/cancel/calculate could race with payment or clear paid linkage, and direct receipt creation could still create a positive tuition receipt with zero chargeable sessions.
**Decision**: Treat a positive tuition receipt with `days_count <= 0` as invalid unless it is handled by a future explicit adjustment/void/reissue workflow. Use conditional `updateMany` guards for MonthlyFee calculate/confirm/cancel/pay transitions and refresh attendance-period lock fees in a transaction that aggregates all active classes for the impacted students and leaves paid/linked rows untouched.
**Rationale**: Financial records must be audit-safe. Preventing new zero-day positive receipts and avoiding paid-row rewrites is safer than silently patching history; historical anomalies remain visible through `student-fees` reporting until an approved correction policy exists.
**Status**: IMPLEMENTED with unit 35/35, typecheck, lint, build, audit, local Playwright UX/menu/PDF 7/7, production Playwright 7/7, API probes, and final Vercel deployment `dpl_2gi9iJBPBnMAKRJb1ZsZs365DGcL` on 2026-05-25.

### ADR-28: Month-Bounded Weekly Tuition Sessions
**Date**: 2026-05-25
**Context**: The Phuc/May 2026 follow-up showed that `sessions_per_week` classes were still using calendar-row multiplication. For May 2026, that made a 2-session/week class expect 12 slots even though only 10 actual month-bounded class slots fit inside the month.
**Decision**: For `sessions_per_week` classes, calculate expected sessions by walking Monday-start weeks inside the target month and summing `min(sessions_per_week, active days in that week inside the month)`. Use default class days Monday-Saturday when explicit weekdays are unavailable. Keep `schedule_days` classes on exact weekday matching and unscheduled classes on legacy per-session billing.
**Rationale**: Tuition must be bounded by the exact month being billed, not by a generic calendar grid. This prevents inflated denominators, makes `2/week` and `3/week` deterministic for short edge weeks, and aligns Receipt, MonthlyFee, Attendance, reports, and frontend preview math.
**Status**: IMPLEMENTED with unit 38/38, typecheck, lint, build, local UX 7/7, local Phase-B 17/17, production UX 7/7, production Phase-B 17/17, source-synced production probe, and Vercel deployment `dpl_3AFgxEykCcXHhtC1A29jW37ZxJ9C`.

### ADR-29: Performance Closeout Uses Split Bundles, Safe GET Cache, And Read Aggregates
**Date**: 2026-05-27
**Context**: Production UI felt slow, especially when opening feature routes. Browser/perf smoke showed avoidable client bundle weight and some page-level overfetch, while serverless cold starts still dominate the slowest API timings.
**Decision**: Split page modules with `React.lazy`/`Suspense`, isolate heavy vendors with Vite manual chunks, keep page transitions lightweight, add short-lived GET-only dedupe/cache with mutation and 401 invalidation, and introduce read aggregate endpoints for high-fanout screens instead of relying on multiple independent page requests.
**Rationale**: This improves first-load and navigation responsiveness without weakening mutation safety. GET caching is intentionally short, bypassable, and invalidated by mutations; aggregate reads preserve the existing snake_case API boundary while cutting duplicate fetches for operator workbenches.
**Status**: IMPLEMENTED with local/prod perf smoke 10/10, local/prod UX 11/11, local/prod Phase-B 17/17, Neon additive index sync, and Vercel deployment `dpl_A4LV7b5BR7g6SmVmirRAusA1Y69B`.

### ADR-30: Performance Evidence Must Separate UI Jank From Serverless Cold Latency
**Date**: 2026-05-28
**Context**: Follow-up browser testing showed the app could still feel slow even after route-level lazy loading. The remaining symptoms mixed real UI jank, stale request races, broad table work, report overfetch, and production-only cold-start/Neon latency.
**Decision**: Keep frontend interactions lightweight by avoiding large blur/motion surfaces, false zero loading states, broad table scans, and stale async response writes. Add `scripts/perf-lab.mjs` as a read-only browser/API evidence harness so production latency is measured separately from UI regressions.
**Rationale**: The platform needs repeatable evidence before declaring lag fixed. Perf-lab allows local/production comparison with a write guard, while UI patches reduce client-side repaint and state-race defects without changing business contracts.
**Status**: IMPLEMENTED with local/prod perf-lab pass, local/prod Playwright 28/28, and Vercel deployment `dpl_8tNtmmYtCJtY8U4gv8swgUWhpKEj`.

### ADR-31: Financial Correction Must Be Explicit And Auditable
**Date**: 2026-06-01
**Context**: Historical paid receipts/monthly fees can contain `days_count=0` with a non-zero amount from earlier billing bugs. Rewriting paid receipt totals silently would break auditability and could make previously printed PDFs disagree with financial history.
**Decision**: Do not bulk rewrite or auto-mutate historical paid receipts. Surface anomalies in Reports/Receipts/Fee Workbench, allow admins to run an explicit receipt correction with a reason, soft-delete the anomalous receipt with a correction marker, recalculate the linked monthly fee back to `ready`, and block recycle-bin restore for corrected receipts.
**Rationale**: Operators get a usable correction path while finance history remains reviewable. The workflow prevents new collection against unsafe rows and avoids resurrecting a voided/corrected receipt into revenue reports.
**Status**: IMPLEMENTED with unit 43/43, local/prod Playwright smoke, production route probes 401/404 without mutation, and Vercel deployment `dpl_GJ3U47QRgzsCGxF3mvBhUGa29h9v`.

### ADR-32: Fee Workbench Collects Class Lines, Not Student Aggregates
**Date**: 2026-06-03
**Context**: A student enrolled in multiple classes could still be shown as one aggregate tuition row, which made operators collect multiple class fees as one payment. Parents may pay different classes on different dates, so this aggregate workflow is operationally wrong.
**Decision**: Fee Workbench must render and collect one row per class-level `MonthlyFeeLine`. The frontend sends only `line_ids` to bulk-pay, and non-line legacy rows are disabled for selection/payment. `GET /api/monthly-fees/workbench` must remain read-only; it may display legacy review rows but must not backfill/write line rows during listing.
**Rationale**: Class-line collection matches the real payment workflow, prevents accidental aggregate receipts, and avoids serverless timeout risk from DB writes in read endpoints.
**Status**: IMPLEMENTED with unit 46/46, typecheck, lint, build, local/prod API smoke, production Chromium E2E 1/1, and Vercel deployment `dpl_AnCEyFGkpmZohfsrA8d95JmsuMoU`.

### ADR-33: Template Designer Verification Requires Visible Canvas Proof
**Date**: 2026-06-05
**Context**: Template Designer actions could report success, increase object count, and update selected object state while the actual canvas remained visually blank in production. The cause was not missing objects but Fabric's generated `upper-canvas` inheriting an opaque `bg-white` class from the source canvas and covering the lower render canvas.
**Decision**: Template Designer fixes must keep Fabric's generated `upper-canvas` transparent and must verify visible canvas behavior with pixel/hash deltas, not only object count or saved JSON. Image/background upload tests must also assert visible changes and fail on page errors, API 5xx, and failed API requests.
**Rationale**: The operator cares whether fields/images are visible and printable. State-only assertions missed this defect, while visual-pixel regression coverage catches overlay, opacity, and render-layer failures.
**Status**: IMPLEMENTED with local/headed Chrome E2E, lint, typecheck, unit 46/46, build, production Chrome smoke, and Vercel deployment `dpl_8KRG5ePFEqeKNLZxZZdb9cMjdNg6`.

### ADR-34: Template Paper Size Metadata Lives In JSON Config
**Date**: 2026-06-06
**Context**: The user needs A4/A5/A6 and custom paper dimensions in Template Designer, but the production Prisma enum only supports `a4`, `a5`, `letter`, and `thermal_80mm`. Running a schema migration for every paper variant would add production risk and still would not store custom dimensions. Existing templates also lacked saved canvas dimensions, causing field alignment drift after paper changes.
**Decision**: Keep the DB `paper_size` enum as compatibility metadata and store the effective designer/page contract in `json_config.paper` and `json_config.canvas`. Designer, undo/redo, save/reload, and PDF generation must read that JSON metadata first; API updates must ignore invalid enum paper-size values instead of sending them to Prisma.
**Rationale**: This supports A6/custom immediately without a migration or seed, preserves existing template APIs, and gives the designer and PDF generator the same page dimensions. The JSON metadata also makes future saved templates self-describing, so fields can be scaled/fitted when the canvas size changes.
**Status**: IMPLEMENTED with local/headed Chrome E2E, lint, typecheck, unit 47/47, build, production Chrome smoke, and Vercel deployment `dpl_7vvKWQfjvgTJXQCSpMM52D2AtoYH`.

### ADR-35: API Docs Track Production Router And E2E CI Uses Deterministic Browser Smoke
**Date**: 2026-06-08
**Context**: The optional TODO list still had API documentation and E2E automation open, while README contained stale coarse routes and referenced `/api/kanban`, which is not exposed by the production Vercel router.
**Decision**: Treat `docs/API.md` plus `api/router.ts` as the production API documentation source of truth, with `tests/api-docs.test.ts` enforcing route coverage. GitHub Actions E2E must run deterministic mocked browser smoke specs against a frontend preview for the optional UI closeout; broader DB/serverless E2E remains a separate production-hardening track.
**Rationale**: Router-backed docs prevent stale API claims, and mocked CI browser smoke verifies the changed chart/designer surfaces without mutating Neon, requiring live secrets, or making the optional closeout depend on full seed/serverless setup.
**Status**: IMPLEMENTED with unit 50/50, typecheck, lint, build, focused Playwright 2/2, diff-check, production Advanced Reports smoke 1/1, production Template Designer thermal smoke, and Vercel deployment `dpl_57m2wBJuvyWonYWqL98Q92BCudfC` on 2026-06-08.

### ADR-36: Report BI Uses Student-Class-Month Grain And Evidence-Based Historical Enrollments
**Date**: 2026-06-09
**Context**: The user needs a report center strong enough for finance/attendance analysis. Fee Workbench already collects class-level tuition lines, but reports could still hide multi-class details, overstate legacy aggregate fees after a class filter, or lose historical rows when a student-class link became inactive.
**Decision**: Treat `student_class_month` as the report grain for `/api/reports/bi` and `/reports`. Build the cube from all relevant class enrollments before applying class/search/risk filters, prefer `MonthlyFeeLine` for class revenue, never spread or promote aggregate `MonthlyFee` amounts across class rows, and include inactive enrollments only when attendance or fee-line evidence exists in the requested range. First enrollment month expected sessions start at the enrollment date. Frontend search is server-side through `q`, and report tabs must render distinct analytical content rather than only changing highlight state.
**Rationale**: Finance reporting must not merge classes or invent revenue attribution. Evidence-based inactive enrollment inclusion preserves history without adding a schema migration, while explicit risk flags make rows needing review visible instead of silently wrong.
**Status**: IMPLEMENTED with unit 58/58, typecheck, lint, local E2E 3/3, build, production API/search smoke, production Phase-B reports smoke 2/2, production perf-lab, browser probe, and Vercel deployment `dpl_FiyiYAoozRGsZgdhk2PwCmNP6DPV`.

### ADR-37: Report BI Tabs Are Server-Side Modes
**Date**: 2026-06-09
**Context**: The user observed that the Report BI filter tabs appeared inert. Client-only tab highlighting and local row fallback were not strong enough for a BA/PI dashboard, because pagination, search, counts, and charts must all agree with the selected analytical mode.
**Decision**: Treat `overview`, `attendance`, `tuition`, and `risk` as server-side report modes on `/api/reports/bi`. Apply the mode before search and pagination, echo it in `meta.filters.mode`, and return full-cube `meta.classes` so class selectors remain stable even when the current mode narrows rows. Frontend charts must not mix VND and counts/risk on a single axis.
**Rationale**: A BI dashboard needs trustworthy slices, stable filter controls, and chart scales that match the metric type. Moving mode to the API makes browser tabs, table totals, summary cards, exports, and regression tests observe the same dataset.
**Status**: IMPLEMENTED with focused unit 18/18, full unit 59/59, typecheck, lint, build, local Report BI E2E 3/3, production API mode smoke, production browser proof, and Vercel inspect URL `https://vercel.com/hts2008s-projects/edu-manager/3e6ZCdUNAQrEg7bTeDJ7tKV2raFE`.

### ADR-38: Platform UX Redesign Uses Stitch Then Figma Then Code
**Date**: 2026-06-09
**Context**: EDU_MANAGER_V2 has broad functional coverage, but its pages, motion, loading feedback, navigation and component styling were produced across multiple hardening passes and are not fully consistent. Direct code-only restyling would risk repeating design drift and reintroducing performance lag.
**Decision**: Run the redesign as a staged track: inspect real workflows in Chrome; generate concepts in Google Stitch with `GEMINI_3_1_PRO`; normalize the selected direction into Figma tokens/components/frames; inspect exact Figma nodes with `get_design_context`; implement through the existing React/Vite/Tailwind/Framer Motion stack; then verify desktop/mobile/reduced-motion/performance behavior before production deploy.
**Rationale**: Stitch is suitable for fast concept exploration, Figma provides a persistent reviewable source of truth, and code remains constrained by existing architecture and functional tests. The staged approach protects attendance, finance, reports and Template Designer workflows from visual-only regressions.
**Status**: PLANNED in `plans/2026-06-09-eduflow-motion-ux-stitch-figma/plan.md`. No implementation has started.

### ADR-39: Production Closeout Requires Browser Baseline Plus Perf-Lab Evidence
**Date**: 2026-06-10
**Context**: The EduFlow Motion redesign touched the shell, dashboard, master data, attendance, finance, reports, template designer, admin secondary screens, loading states, reduced motion, and responsive behavior. A successful deploy alone would not prove the platform was ready because earlier issues were visible only in Chrome, canvas pixels, route latency, or responsive/modal behavior.
**Decision**: Treat Phase 8 closeout as evidence-driven: deploy to Vercel production only after local gates pass, then verify the production alias with authenticated Playwright, a multi-route UX baseline across mobile/tablet/desktop/wide and reduced-motion, targeted Template Designer and Report BI suites, production perf-lab, asset-version probe, and Vercel inspect.
**Rationale**: The user needs production-live confidence, not code-only claims. Combining route-level browser proof with read-only perf-lab separates functional UI regressions from serverless/DB latency and keeps production data safe.
**Status**: IMPLEMENTED with Vercel deployment `dpl_FMemytCK71osPxvskCWb4o2qt2B5`, production UX baseline 150/150, production responsive/a11y Playwright 2/2, Template Designer 1/1, Report BI 3/3, perf-lab 0/15 direct API failures and 0/10 route failures, and evidence in `receipts/2026-06-10-eduflow-motion-phase8-production-closeout.md`.

### ADR-40: Figma Source-Of-Truth Closeout Does Not Require A Runtime Redeploy
**Date**: 2026-06-11
**Context**: UXM-02 remained open after runtime UX/UI had already been deployed and production-smoked. The final work was Figma source-of-truth evidence: native components and linked implementation frames authored through Figma Desktop/plugin and verified by Figma MCP.
**Decision**: Accept Figma nodes `49:436`, `49:438`, `49:440`, `49:442`, `49:444`, `49:447`, and `49:472` as the Phase 2 source-of-truth for the already-deployed EduFlow Motion UI. Do not run a new production deploy when the closeout changes only Figma/project-control evidence and no React/Tailwind runtime source.
**Rationale**: A deploy without runtime source changes would add release noise and no user-visible UX delta. The correct closeout evidence is Figma MCP verification, implementation mapping, and board/memory synchronization.
**Status**: IMPLEMENTED with `get_design_context(49:447)`, `get_design_context(49:472)`, `get_variable_defs(49:447)`, `get_metadata(49:447)`, screenshots for `49:447`/`49:472`, and receipt `receipts/2026-06-11-uxm02-figma-source-final-closeout.md`.

### ADR-41: Accepted Figma Direction Must Become Runtime Code Before PROD UX Claims
**Date**: 2026-06-12
**Context**: The final UXM-02 Figma closeout proved source-of-truth frames/components, but the user clarified that "thiet ke Figma moi hon, dep hon" must be visibly applied on `https://edu-manager-gules.vercel.app`.
**Decision**: Treat Figma source-of-truth acceptance as necessary but not sufficient for user-visible UX completion. A production UX claim requires a runtime implementation pass: Figma inspect -> React/Tailwind mapping -> local gates -> browser smoke -> Vercel PROD deploy -> production browser/perf evidence.
**Rationale**: This prevents a Figma-only closeout from being mistaken for a deployed UX change and keeps future design work tied to production behavior.
**Status**: IMPLEMENTED with runtime apply deployed as `dpl_4LemiLebU9nYNmDq6YAmdUyGiQn4`; production Playwright 6/6; production UX baseline 150/150; production perf-lab pass; receipt `receipts/2026-06-12-figma-runtime-prod-apply.md`.

### ADR-42: Student Progress Reports Must Separate Operational Evidence From Academic Scores
**Date**: 2026-06-12
**Context**: The user requested a monthly parent-facing progress report for English students, initially around Starters, Movers, Flyers, KET, and PET. The current production schema has real attendance/class/fee evidence but no assessment/rubric tables for Listening, Reading/Writing, Speaking, vocabulary/grammar, CEFR descriptors, or Cambridge scale/shield results.
**Decision**: Phase 1 student progress reporting must be evidence-first and honest: compute operational progress/readiness from real student-class-month attendance and class data, map class names to Cambridge tracks where possible, and explicitly mark skill scores as `missing_input` until a real assessment input workflow/schema exists. Do not infer or fabricate Cambridge shields, CEFR levels, or Cambridge English Scale scores from attendance alone.
**Rationale**: Parent reports must be useful immediately without corrupting academic meaning. Attendance and consistency are valid progress signals, but they are not equivalent to Cambridge exam results. Separating proxy metrics from missing academic inputs keeps the product trustworthy and gives Phase 2 a clean path for assessment rubrics.
**Status**: IMPLEMENTED in `lib/student-progress-report.ts`, `/api/reports/student-progress`, `/student-progress`, and receipt `receipts/2026-06-12-student-progress-parent-report.md`; verified by focused unit 4/4, full unit 65/65, typecheck, lint, build, local Playwright smoke, Vercel production deploy `dpl_5NZEpgh9xKWqCyp99rt5GxWTLoYs`, and production Playwright route/API smoke.

### ADR-43: Attendance Fee Reconciliation Uses Deterministic Advisory Locks And Mutable Lines
**Date**: 2026-07-01
**Context**: Attendance-period locking timed out or returned HTTP 500 while rebuilding monthly tuition across multiple classes. Paid and receipt-linked class lines must not be overwritten, while mutable classes still need recalculation.
**Decision**: Claim `approved -> locked` conditionally, acquire sorted transaction-scoped advisory locks per student-month, read counts in batches, delete/recreate only mutable class lines, then refresh parent fee aggregates with parameterized set-based SQL. Cast `pg_advisory_xact_lock(...)` to `text` because Prisma 5.22 cannot deserialize PostgreSQL `void`.
**Rationale**: This removes N+1 writes, prevents concurrent student-month races, preserves financial ledger history, and avoids Prisma `P2010`.
**Status**: IMPLEMENTED and production-verified by the July 2026 lock mutation; evidence in `receipts/2026-07-01-attendance-lock-selector-daily-progress-closeout.md`.

### ADR-44: Daily Student Progress Owns Date-Scoped Entries
**Date**: 2026-07-01
**Context**: The monthly progress endpoint previously replaced all daily entries, making one-day edits destructive and preventing a real timeline.
**Decision**: `/api/student-progress/daily` is the only writer for daily entries. PUT replaces one selected date, DELETE removes one selected date, and monthly progress writes reject embedded daily entries. Monthly rollups are derived from persisted daily observations, while absent teacher input remains `missing_input`.
**Rationale**: Date ownership makes edits isolated, auditable, and suitable for month-over-month reporting without fabricated scores.
**Status**: IMPLEMENTED with additive Neon schema, local/production browser evidence, and receipt `receipts/2026-07-01-attendance-lock-selector-daily-progress-closeout.md`.
