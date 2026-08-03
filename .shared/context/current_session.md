# EDU MANAGER V2 - Shared Session Context

> Refreshed: 2026-08-03
> Purpose: compact architecture handoff for tools that read `.shared/context`

## Current Runtime

- Production URL: https://edu-manager-gules.vercel.app
- Frontend: React 19, React Router 7, Vite 7, Tailwind CSS v4.
- API: Vercel TypeScript handlers dispatched through `api/router.ts`.
- Database: Neon PostgreSQL through Prisma 5.
- Reference backend: `backend/` is not in the production flow.

## Working Rules

- Read `KANBAN.md` and `memory/memory-bank/activeContext.md` for live task state; this file is not the operational board.
- Treat `prisma/schema.prisma` as the database source of truth.
- Use `npm run dev:vercel` for production-shaped local development.
- Never assume or document a default account.
- Supply database, JWT, storage, and operator credentials through environment variables or the deployment secret store.
- Do not run migrations, resets, seeds, or restores without selecting the target environment and verifying a backup.

## Core Checks

```powershell
npx prisma validate
npx tsc --noEmit
npm --prefix frontend run lint -- --max-warnings=0
npm run test:unit
npm run build
```

For the exact current objective, modified files, pending validations, and known risks, use the canonical workspace session files under `memory/sessions/`.
