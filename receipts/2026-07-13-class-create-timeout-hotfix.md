# Class Create Timeout Hotfix Receipt

Date: 2026-07-13
Task: `OPS-2026-07-13-01`
Status: `IMPLEMENTED`

## Root Cause

Production `POST /api/classes` failed with Prisma `P2028`: the default five-second interactive transaction expired while `enrollStudentsInClass` repeatedly queried and synchronized each selected student against Neon.

## Implementation

- Replaced per-student N+1 synchronization with bounded set-based writes.
- Preserved active links, reactivated inactive links, created new links, and backfilled missing open enrollment periods.
- Applied `{ maxWait: 5000, timeout: 15000 }` to class create, update and bulk-enroll transactions.
- Mapped P2028 to typed retryable `CLASS_WRITE_TIMEOUT` and preserved validation errors through `sendApiError`.
- Added `tests/class-bulk-enrollment.test.ts` to the default unit suite.

## Verification

- Focused regression: 2/2 pass.
- Full unit suite: 212/212 pass.
- `npx tsc --noEmit`: pass.
- `npm --prefix frontend run lint`: pass, zero warnings.
- `npm run build`: pass.
- `git diff --check`: pass.

## Production Evidence

- Commit: `dbb0171`.
- Deployment: `dpl_3dFiMGhd9j7jf7iXtcod4Tz9xRLr`, Ready.
- Alias: `https://edu-manager-gules.vercel.app`.
- Authenticated Chrome created `Flyer VB3` with Hoang Thi Mai, three sessions per week, 900,000 VND monthly tuition, and three selected students.
- UI changed from 10 to 11 classes and from 37 to 40 active enrollment rows.
- Vercel runtime log: `POST /api/classes` HTTP 201, duration 6188 ms; no P2028 or HTTP 500.

## Residual Observation

The successful cold request still took 6.188 seconds due to serverless/Neon latency. The correctness failure is closed; latency monitoring and connection optimization remain a separate performance concern.
