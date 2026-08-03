# Current Architecture State

> Last verified: 2026-08-03
> Production: https://edu-manager-gules.vercel.app

## Runtime Flow

```text
Browser
  -> React 19 / React Router 7 / Vite 7 static application on Vercel
  -> /api/* rewrite
  -> api/router.ts
  -> server/api TypeScript handlers
  -> shared lib services and Prisma 5
  -> Neon PostgreSQL
```

## Sources of Truth

| Concern | Source |
| --- | --- |
| API routing | `api/router.ts` |
| API behavior | `server/api/` and `lib/` |
| Database | `prisma/schema.prisma` and ordered migrations |
| Frontend routes | `frontend/src/App.jsx` |
| API contract docs | `docs/API.md` |

The legacy Express implementation in `backend/` is reference-only. It must not be used to infer the production request path or database topology.

## Major Domains

- Stateful JWT authentication, role checks, login rate limiting, and activity audit.
- Student, parent, teacher, class, enrollment, and soft-delete workflows.
- Class sessions and class-month plans as the attendance denominator.
- Attendance periods with submit, approve, lock, and controlled reopen transitions.
- Per-class tuition ledger, monthly aggregates, receipts, expenses, and reconciliation.
- Print template editor, object storage, and PDF generation.
- Financial, attendance, risk, and student-progress analytics.
- Backup/restore and scheduled operational jobs.

## Deployment

- Frontend and API are deployed together on Vercel.
- PostgreSQL is hosted by Neon.
- Uploaded template assets use Vercel Blob.
- Connection strings, JWT signing material, blob tokens, and operator credentials are deployment secrets and are never documented with values.

## Local Development

Use `npm run dev:vercel` for production-shaped local routing. `npm run dev` starts the frontend-only Vite server. Local execution requires environment variables for the selected database and auth configuration.

## Verification

The minimum architecture gate is:

```powershell
npx prisma validate
npx tsc --noEmit
npm --prefix frontend run lint -- --max-warnings=0
npm run test:unit
npm run build
```

Database migration status and runtime smoke checks are environment-specific release gates.
