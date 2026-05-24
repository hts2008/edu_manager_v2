# System Patterns

## Architecture

EDU_MANAGER_V2 is a Vercel-first full-stack app.

- `frontend/`: Vite + React UI.
- `api/router.ts`: single Vercel API entry to avoid function-count limits.
- `server/api/*`: production API modules.
- `lib/*`: shared server utilities.
- `prisma/*`: schema and seed logic.
- `backend/`: Express/SQLite reference only.
- `KANBAN.md`, `memory/`, `docs/`, `receipts/`: operational evidence.

## API Patterns

- Use Prisma through the singleton in `lib/prisma.ts`.
- Keep response envelopes stable: `{ success, data|error }`.
- Map camelCase Prisma fields to snake_case frontend fields explicitly.
- Prefer root action/query branching where Vercel dynamic route shadowing is
  possible.
- Use zod validation for write payloads.
- Preserve RBAC boundaries: admin-only mutations stay admin-only.

## Domain Patterns

- Attendance drives monthly fee calculation.
- Monthly fee payment creates a receipt in one transaction.
- Receipts and payments must print as Unicode-safe PDFs.
- Reports aggregate persisted receipts/payments/monthly fees, not UI-only
  placeholder values.
- Soft-delete uses identify/reactivate/insulate behavior where uniqueness is a
  risk.
- Reminder sending is gated by environment and provider readiness.

## UX Patterns

- Treat the app as an operations console, not a marketing site.
- Prefer dense full-width surfaces over decorative cards.
- Use semantic status chips for finance and attendance states.
- Avoid emoji icons, decorative gradient blobs, nested cards, and uncontrolled
  `transition-all`.
- Every touched workflow needs loading, empty, error, success, and mobile states.

## Evidence Patterns

- Do not claim completion without command output, browser smoke, screenshot,
  API probe, or receipt evidence.
- Keep product code separate from framework/memory drift.
- Update KANBAN, memory, current session, and receipts after substantial work.
