# Phase A Closeout Attempt - Runtime/Config Verification

**Date:** 2026-05-14 23:23 +07:00
**Workspace:** `C:\Users\haitr\OneDrive\0. GAU DATA\0.APP\EDU_MANAGER_V2`
**Scope:** Phase A closeout verification for production API parity.
**Result:** Phase A remains blocked on deploy/config/runtime smoke; no production mutation was performed.

## Changes Made
- Updated `lib/storage.ts` so Supabase Storage bucket resolves from `SUPABASE_BUCKET` with fallback `template-images`.
- Updated `.env.example` to include `SUPABASE_BUCKET="template-images"`.

## Static Gates
- `npx tsc --noEmit` - PASS.
- `npm run build` - PASS; Vite reported existing chunk-size/dynamic-import warnings.
- `cd frontend && npm run lint` - PASS with 26 warnings, 0 errors.
- `node --check scripts\parity-test.mjs` - PASS.
- `git diff --check` - PASS.

## Runtime / Config Findings
- Process/User/Machine env did not have `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_BUCKET`, or `NODE_ENV` loaded.
- Local `.env` declares only `DATABASE_URL`, `DIRECT_URL`, and `JWT_SECRET`; it does not declare Supabase Storage keys.
- `npx prisma migrate status` loaded `.env` but failed against Supabase pooler with tenant/user not found. No migration or seed was run.
- A process-only retry using a Supabase direct host shape (`db.<project-ref>.supabase.co:5432`) reached the expected direct host but failed with `P1001: Can't reach database server`; no file was changed and no migration was run.
- `npm run dev -- --listen 3000` could not start local Vercel dev because Vercel CLI has no credentials/token.
- Browser production login at `https://edu-manager-delta.vercel.app/login` with `admin/admin123` shows `Internal server error`; direct `POST /api/auth/login` returns HTTP 500 with no usable response body.
- Vercel project overview shows the current Production Deployment is commit `fc400eb` (`feat(attendance): add review modal before approving`) from Jan 24. The Phase A code is local/uncommitted and has not been deployed to Vercel.
- Vercel Environment Variables page shows only `JWT_SECRET`, `DIRECT_URL`, and `DATABASE_URL`; `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and `SUPABASE_BUCKET` are missing. Vercel marks `JWT_SECRET` and `DATABASE_URL` as `Needs Attention`.
- Vercel runtime logs for `/api/auth/login` show Prisma initialization failure: `FATAL: (ENOTFOUND) tenant/user postgres.rdtqbivfnrdcureoazbh not found`.

## Production No-Token Probe
Non-mutating GET checks against `https://edu-manager-delta.vercel.app`:

| Path | Status |
| --- | --- |
| `/api/auth/me` | 401 |
| `/api/receipts` | 404 |
| `/api/payments` | 404 |
| `/api/templates` | 404 |
| `/api/reports/financial` | 404 |
| `/api/reports/unpaid-students` | 404 |
| `/api/monthly-fees?month=2026-05` | 404 |
| `/api/attendance/calculate-fee?student_id=missing&month=2026-05` | 404 |

## Local Reference Browser Smoke
- Rebuilt local `backend/node_modules/better-sqlite3` with `npm rebuild better-sqlite3` because the existing native module was compiled for a different Node ABI.
- Started Express reference backend on port 5000 and Vite frontend on port 3000.
- Browser login at `http://127.0.0.1:3000/login` with `admin/admin123` succeeded and reached the dashboard.
- Browser navigation through Phase A UI pages showed no visible Network/404/Internal error and no browser console error on:
  - `/receipts`
  - `/fee-collection`
  - `/payments`
  - `/templates`
  - `/reports`
  - `/attendance`
- Express reference backend logs show HTTP 200 for:
  - `/api/receipts`
  - `/api/payments`
  - `/api/templates`
  - `/api/reports/financial`
  - `/api/reports/unpaid-students`
  - `/api/monthly-fees?month=2026-05`
  - `/api/attendance/calculate-fee?student_id=missing&month=2026-05`

## Conclusion
The local Phase A code still builds and the UI works against the Express reference backend, but the live production target is not usable: login returns 500 and the new Phase A routes still return 404. Root causes are now isolated to production deployment/config: Vercel is still serving old commit `fc400eb`, and `DATABASE_URL` points to a Supabase pooler tenant/user that Vercel runtime cannot resolve. A12, A13, and A15 should remain blocked until Vercel env/storage, database connection, and deployment target are corrected.
