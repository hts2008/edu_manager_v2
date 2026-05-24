# EDU_MANAGER_V2 Production Readiness & UX Completion Master Plan

## Summary
- **Artifact target:** create `plans/2026-05-18-edu-manager-production-readiness/plan.md` as the first execution step, then keep it as the agent handoff source of truth.
- **Baseline found:** repo has real Vercel/Prisma API surface, 22 frontend routes, 50+ server handlers, E2E/unit tests, Stitch project `12785236930566023458`, and Figma file `ZYAaYcKXq9LAYFOgCPJLZq`.
- **Key risk found:** working tree is heavily dirty: tracked `.agent/.shared` deletions, doctrine changes, runtime DB WAL/SHM files, and an uncommitted `DashboardPage.jsx` experiment. This must be closed before new product work.
- **Product risk found:** current uncommitted dashboard UI expects `unpaid_students`, but `server/api/reports/dashboard.ts` does not return it. Treat all “implemented” board claims as hypotheses until route-by-route evidence confirms real dataflow.
- **UX direction:** “Education Operations Console” for a Vietnamese education center: dense, calm, fast, premium, data-linked, with grouped operations, finance, reports, and admin workflows. Avoid marketing-style hero pages, decorative blobs, emoji icons, and shell-only polish.

## Phase 0 — Plan Artifact & Branch Discipline
- Create `plans/2026-05-18-edu-manager-production-readiness/plan.md` with this plan verbatim.
- Create one working branch for the whole effort, but split commits by concern:
  - `chore(workspace): reconcile operational drift`
  - `docs(audit): record capability matrix`
  - `design(ux): sync production design source of truth`
  - `feat(ux): implement production UI system`
  - `fix(workflows): close dataflow gaps`
- Before any edit, snapshot:
  - `git status --short --branch`
  - `git diff --stat`
  - `npm run test:unit`
  - `npx tsc --noEmit`
  - `cd frontend && npm run lint -- --max-warnings=0`
  - `npm run build`
- Do not deploy, migrate, seed, or mutate production data unless explicitly approved for that step.

## Phase 1 — Dirty/Untracked Drift Closeout
- Classify current drift into five buckets and resolve each separately:
  - **Framework deletions:** `.agent/**`, `.shared/**`; default action is restore tracked deletions unless a specific replacement exists and is documented.
  - **Doctrine edits:** `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.agent/workflows/start-session.md`, skill files; keep only EDU_MANAGER_V2-scoped updates after scan for out-of-scope paths and broken encoding.
  - **Runtime artifacts:** `backend/data/*.db-shm`, `backend/data/*.db-wal`; stop local DB processes, preserve only if needed for local reference data, otherwise remove from product commits and add/confirm ignore policy.
  - **Product experiment:** `frontend/src/pages/DashboardPage.jsx`; preserve diff as review evidence, then either integrate via the new design system or revert before implementing the approved dashboard.
  - **Generated/untracked artifacts:** `.codex/config.toml.bak`, `frontend/output/`, `memory/*` scaffolding; keep only files referenced by workspace doctrine, archive evidence screenshots under `receipts/artifacts/`, ignore generated output.
- Acceptance: `git status --short` must show either clean state or only the active, intentional files for the next phase. No app code and framework drift in the same commit.

## Phase 2 — Deep Product Reality Audit
- Build `docs/audit/2026-05-18-capability-matrix.md` with one row per route:
  - UI route, page component, service method, API endpoint, Prisma models, auth role, data mutations, downstream data linkage, tests, production smoke, verdict.
- Verdict vocabulary:
  - `REAL`: UI uses real API, data persists, downstream modules consume it, tests and smoke pass.
  - `PARTIAL`: core path works but missing edge cases, linkage, validation, or evidence.
  - `SHELL`: page renders but is static, seed-only, mock-like, or not connected end-to-end.
  - `BROKEN`: 404/500/network/console/layout failure or bad contract.
- Audit critical journeys first:
  - Login/change password/logout/RBAC.
  - Student + parent onboarding.
  - Class enrollment and teacher assignment.
  - Attendance creation, review, period close.
  - Monthly fee calculate, confirm, pay.
  - Receipt/payment PDF generation and history.
  - Reports, advanced reports, unpaid students.
  - Templates and image upload.
  - Import CSV preview/commit.
  - Parent portal read-only.
  - Backups, recycle bin, users, settings.
- Add immediate bug tickets for mismatches found during audit, starting with dashboard `unpaid_students` contract.

## Phase 3 — UX/UI Design System Source Of Truth
- Use Stitch first with `modelId: GEMINI_3_1_PRO`.
  - Start from project `12785236930566023458`.
  - Reuse current design system asset visible in Stitch project.
  - Generate/refresh variants for: Dashboard, Student 360, Attendance Desk, Fee Collection, Receipt/Payment, Reports, Admin Settings, Parent Portal.
  - Variant criteria: operational density, mobile usability, no horizontal overflow, fast repeated actions, Vietnamese copy length, finance readability.
- Use Figma second as source of truth.
  - Update file `ZYAaYcKXq9LAYFOgCPJLZq`, page `EDU_MANAGER_V2 Production UX`.
  - Keep existing nodes `3:3`, `3:36`, `3:142`; add production frames for the missing main workflows.
  - Define tokens: primary blue, neutral surfaces, emerald success, amber warning, red danger, info cyan, 8px controls, 12px major panels only.
  - Create component specs for: AppShell, SidebarGroup, PageHeader, MetricCard, StatusBadge, FilterBar, DataTable, EmptyState, ErrorState, ConfirmDialog, FormField, Drawer, Tabs, Timeline, PDFActionButton.
- Design rules:
  - No emoji icons in production UI.
  - No gradient blobs/orbs as decoration.
  - No nested cards.
  - No `transition-all`.
  - Use `Intl.NumberFormat` and `Intl.DateTimeFormat`.
  - Apply Vercel Web Interface Guidelines checks for accessibility, focus, forms, motion, layout, and locale: [source](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md).

## Phase 4 — Frontend Implementation
- Implement shared UI primitives before page rewrites:
  - `frontend/src/components/ui/PageHeader.jsx`
  - `MetricCard.jsx`, `StatusBadge.jsx`, `FilterBar.jsx`, `ActionToolbar.jsx`, `PageState.jsx`, `FormField.jsx`
  - Upgrade `DataTable.jsx`, `Modal.jsx`, `Toast.jsx`, `EmptyState.jsx`.
- Implement shell upgrade:
  - Sidebar has primary/secondary menu groups, collapsible sections, role-aware items, keyboard focus, mobile drawer safe areas.
  - Header has page context, user actions, online state, and compact mobile behavior.
  - Layout supports dense tables and forms without overflow at 390px, 768px, 1440px.
- Page redesign order:
  - P0: Dashboard, Students, Classes, Attendance, Fee Collection, Receipts, Payments, Reports.
  - P1: Parents, Teachers, Attendance Insights, Attendance Periods, Templates, History.
  - P2: Advanced Reports, Audit Logs, Settings, Users, Imports, Fee Reminders, Backups, Recycle Bin, Parent Portal.
- Dashboard must be data-linked:
  - Either stop reading `unpaid_students` or add it to `/api/reports/dashboard`.
  - Preferred contract: add optional `unpaid_students`, `today_attendance`, `attention_items`, and `quick_metrics` while preserving existing `stats` and `recent_transactions`.
- Replace decorative quick actions with workflow queues:
  - “Cần điểm danh”, “Cần chốt phí”, “Cần thu”, “Phiếu lỗi/in lại”, “Nhắc phí chưa gửi”.
- Keep existing React/Vite/Tailwind architecture. Do not migrate framework.

## Phase 5 — Dataflow & Backend Completion
- For every `PARTIAL/SHELL/BROKEN` audit row, fix from backend outward:
  - Prisma query and transaction.
  - Serverless handler validation and RBAC.
  - API snake_case response boundary.
  - Frontend service method.
  - Page state and downstream linkage.
  - Unit/integration/E2E tests.
- Billing ledger rules:
  - Attendance drives monthly fee.
  - Monthly fee payment creates receipt in a transaction.
  - Receipt/payment PDF uses real persisted record and Unicode-safe font.
  - Reports aggregate from receipts/payments, not UI-side placeholders.
- Operational features:
  - Keep `REMINDER_SEND_ENABLED=false` until SMS/Zalo provider, opt-in policy, approved templates, and rate controls are ready.
  - Keep backup/cron endpoints protected by secrets and unauthenticated 403 smoke.
  - Rotate `admin/admin123` and `JWT_SECRET` before real production operation.

## Phase 6 — Verification Gates
- Static gates:
  - `npm run test:unit`
  - `npx tsc --noEmit`
  - `npm run build`
  - `cd frontend && npm run lint -- --max-warnings=0`
  - `npm audit --audit-level=high`
  - `cd frontend && npm audit --audit-level=high`
  - `git diff --check`
- E2E gates:
  - Existing Phase B smoke suite.
  - UX smoke at desktop 1440, tablet 768, mobile 390.
  - No horizontal overflow.
  - No console errors.
  - No failed API requests.
  - PDF endpoint returns `application/pdf`, `%PDF`, `/ToUnicode`, Roboto.
- Production smoke after deploy:
  - `/` 200.
  - Protected API without token 401.
  - Cron routes without secret 403.
  - Core UI pages load without network errors.
  - Critical journey smoke: login → student/class → attendance → fee → receipt PDF → reports.
- Evidence write-back:
  - `receipts/2026-05-18-production-readiness.md`
  - `KANBAN.md`
  - `memory/memory-bank/activeContext.md`
  - `memory/memory-bank/progress.md`
  - `memory/sessions/current-session.md`

## Assumptions
- Canonical workspace remains `C:\Users\haitr\OneDrive\0. GAU DATA\0.APP\EDU_MANAGER_V2`.
- Production stack remains Vercel Serverless + Prisma + Neon + Vercel Blob.
- Express/SQLite remains reference/local only.
- API envelope remains `{ success, data|error }`.
- Frontend boundary remains snake_case.
- No real SMS/Zalo sending in this production-live pass.
- Plan artifact creation is deferred until execution mode because the current turn is planning-only.
