# EDU MANAGER V2 - Project Context

> Last verified: 2026-08-03
> Runtime: production on Vercel
> Production: https://edu-manager-gules.vercel.app

## Product

EDU MANAGER V2 is an operations platform for education centers. It covers student and parent records, classes, attendance, monthly tuition, receipts and expenses, printable templates, operational reports, and student progress reporting.

## Production Architecture

```text
Browser
  -> React 19 + React Router 7 + Vite 7 frontend
  -> Vercel rewrite /api/* -> api/router.ts
  -> Vercel Node.js serverless handlers
  -> Prisma 5
  -> Neon PostgreSQL
```

The Vercel TypeScript API and `prisma/schema.prisma` are the production sources of truth. The Express backend is retained only as a reference implementation and is not in the production request path.

## Core Domains

- Authentication and role-based access for administrators and receptionists.
- Students, parents, teachers, classes, enrollments, and enrollment history.
- Class sessions, monthly plans, attendance periods, and make-up sessions.
- Per-class monthly fee lines, receipts, expenses, and reconciliation.
- Receipt/payment templates and PDF generation.
- Financial, attendance, risk, and student-progress reporting.
- Backup/restore, activity audit, rate limiting, and scheduled operations.

## Repository Map

| Path | Responsibility |
| --- | --- |
| `api/router.ts` | Vercel API entrypoint and route dispatch |
| `server/api/` | Production API handlers |
| `lib/` | Shared domain, auth, persistence, PDF, and validation services |
| `prisma/schema.prisma` | Database source of truth |
| `prisma/migrations/` | Ordered production migrations |
| `frontend/` | React application |
| `backend/` | Reference-only Express implementation |
| `tests/` | Unit and integration contract tests |
| `frontend/tests/` | Browser and frontend tests |

## Environment Contract

Production and local serverless execution require environment variables. Values must be supplied by the deployment platform or a local untracked environment file; credentials and connection strings must never be committed.

Required runtime variables include:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `BLOB_READ_WRITE_TOKEN`

Operational scripts document their own required credential environment variables in `--help` output.

## Verification Commands

```powershell
npx prisma validate
npx tsc --noEmit
npm --prefix frontend run lint -- --max-warnings=0
npm run test:unit
npm run build
```

Database migrations are applied with `npm run db:migrate` only after backup and release approval.

## Security Boundaries

- Passwords are stored as bcrypt hashes.
- JWTs are validated against stateful user/session data.
- Protected handlers enforce role checks server-side.
- Production credentials are managed outside Git.
- Operational scripts have no built-in usernames or passwords.

## Current Status

The platform is live and under active remediation. Completion claims must be based on current automated gates and production smoke evidence, not historical page or task counts.
