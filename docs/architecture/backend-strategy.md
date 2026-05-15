# Backend Strategy

**Date**: 2026-05-15

## Decision
Production backend truth for EDU_MANAGER_V2 is the Vercel API layer backed by Prisma and Neon Postgres.

The Express + SQLite backend under `backend/` remains a local reference and development comparison target only. It is useful for behavior recovery, parity checks, and historical context, but it must not be treated as the production runtime or source of truth for new production behavior.

## Why
- Phase A production parity was completed in `server/api/*` and exposed through the single Vercel router `api/router.ts`.
- Production data now lives in Neon Postgres through Prisma.
- Vercel Hobby function limits require the consolidated router design.
- Keeping Express as production-equivalent would create two divergent backend contracts.

## Working Rules
- New production endpoints go under `server/api/*`.
- `api/router.ts` must be updated when a new production endpoint is added.
- API responses must preserve the frontend boundary contract: `{ success, data|error }` and snake_case fields where existing UI expects them.
- Express reference behavior can be consulted, but Vercel + Prisma tests and smoke checks decide production readiness.
- Do not migrate, seed, or mutate production databases without explicit approval.
