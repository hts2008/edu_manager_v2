# 2026-05-27 Performance Production Closeout

## Scope

Continue the approved production-live performance plan after the modal scroll closeout. The goal was to reduce perceived slowness and API overfetch while preserving current EDU_MANAGER_V2 product flows.

## Implementation

- Added route-level `React.lazy` + `Suspense` so page modules are split instead of loaded in the first app bundle.
- Added Vite manual chunks for React, router, Framer Motion, charts, Fabric, and icons.
- Reduced page transition cost by removing blur and shortening the transition duration.
- Added GET-only API in-flight dedupe and 15s response cache in `frontend/src/services/api.js`; mutations and 401 clear the cache.
- Removed a duplicate DB lookup from `/api/auth/me` by expanding the DB-backed `requireAuth()` user payload.
- Added `/api/students?fields=options` and `parent_id` filtering for slim lookup use cases.
- Changed `/classes` to load only classes + teachers on page open; active student options load only when the class form opens.
- Added read-only `/api/monthly-fees/workbench` and wired Fee Workbench to load active students + monthly fees in one request.
- Optimized unpaid-students attendance counting with Prisma `groupBy`.
- Added production-oriented Prisma composite indexes for attendance, attendance periods, enrollments, monthly fees, receipts, and payments.
- Added `scripts/perf-smoke.mjs` and `npm run test:perf` for Chrome route/API timing, read-only mutation guard, JSON/Markdown reports.

## Verification

### Static / Build

- `git diff --check` passed.
- `npx prisma validate` passed.
- `node --check scripts/perf-smoke.mjs` passed.
- `npx tsc --noEmit` passed.
- `npm run test:unit` passed 39/39.
- `npm --prefix frontend run lint -- --max-warnings=0` passed.
- `npm run build` passed.

### Database / Deploy

- `npx prisma db push` synced the Neon schema with the new additive indexes.
- The post-push generate step initially hit a Windows DLL lock because the local smoke server was running; after stopping the local server, `npx prisma generate` passed.
- Implementation commit `5c761ba` was pushed to `origin/main`.
- Vercel production deployment `dpl_A4LV7b5BR7g6SmVmirRAusA1Y69B` is Ready and aliased to `https://edu-manager-gules.vercel.app`.

### Local Browser / Chrome

- `npm run test:perf -- --base http://127.0.0.1:3000` passed 10/10 routes and 25/25 API calls.
- Local perf report: `receipts/perf/perf-smoke-2026-05-27T06-11-33-159Z.md`.
- Local UX smoke passed 11/11.
- Local Phase-B smoke passed 17/17.

### Production Browser / Chrome

- `npm run test:perf -- --base https://edu-manager-gules.vercel.app` passed 10/10 routes and 25/25 API calls.
- Production perf report: `receipts/perf/perf-smoke-2026-05-27T06-17-57-458Z.md`.
- Production perf summary: route failures 0/10, API failures 0/25, read-only violations 0, route p95 7278.1ms, API p95 4262.2ms.
- Production `/classes` now loads 3 API calls in perf smoke and does not load `/api/students` on initial page open.
- Production `/fee-collection` uses `/api/monthly-fees/workbench?month=2026-05&limit=500`.
- Production UX smoke passed 11/11.
- Production Phase-B smoke passed 17/17.

## Notes

- Live SMS/Zalo sending remains intentionally disabled.
- No seed or destructive production data mutation was run.
- The schema sync was additive index/schema alignment only.
- Subagent spawning was attempted per user approval, but new subagents hit runtime usage-limit errors; work continued inline under `ck:team` fallback.
