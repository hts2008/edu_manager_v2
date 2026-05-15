# Phase B Foundation Hardening Receipt

**Date**: 2026-05-15
**Project**: EDU_MANAGER_V2
**Scope**: Phase B baseline quality, reliability, and CI work after Phase A parity.

## Implemented
- Removed tracked frontend `.backup` files and added `*.backup` to `.gitignore`.
- Added API client support for `VITE_API_BASE`, controlled GET retry, safer JSON parsing, and a clear `auth:unauthorized` event for 401 responses.
- Added a React `ErrorBoundary` around the app routes.
- Added login rate limiting with rate-limit headers and 429 response on excess attempts.
- Added unit test baseline using Node `node:test` through `tsx`.
- Added GitHub Actions CI for unit tests, TypeScript, build, and frontend lint with `--max-warnings=0`.
- Added backend strategy documentation: Vercel + Prisma + Neon is production truth; Express + SQLite is reference only.

## Verification
- `npm run test:unit` passed: 6/6 tests.
- `npx tsc --noEmit` passed.
- `cd frontend && npm run lint -- --max-warnings=0` passed.
- `npm run build` passed.
- Local browser smoke through the Codex browser passed on `/`, `/students`, `/classes`, `/receipts`, `/payments` with no ErrorBoundary fallback and zero console errors.

## Notes
- Frontend build still reports Vite chunk-size and mixed static/dynamic import warnings; build exits 0.
- Full Phase B validation, Sentry/structured logging, and Playwright E2E are not complete yet.
