# Attendance Lock, Selector UX, And Daily Progress Production Closeout

Date: 2026-07-01

## Scope

- Replaced attendance-lock N+1 fee reconciliation with deterministic advisory locks and set-based fee-line writes.
- Preserved paid, confirmed, and receipt-linked class fee lines while recalculating mutable class lines.
- Added shared class selector loading, refreshing, empty, error, retry, and accessible mobile states.
- Added date-scoped student progress GET/PUT/DELETE, daily editor/timeline, and monthly average/latest/delta/count rollups.
- Preserved missing teacher input as `null` / `missing_input`, never fabricated zero scores.
- Patched vulnerable transitive dependencies within existing semver ranges.

## Root Cause And Fix

The first production lock smoke returned HTTP 500. Vercel logs showed Prisma `P2010`: PostgreSQL `pg_advisory_xact_lock()` returns `void`, which Prisma 5.22 cannot deserialize through `$queryRaw`. The query remains parameterized and now casts the lock result to `text`. The transaction then completed successfully.

## Database

- `npx prisma validate`: passed.
- `npx prisma db push --skip-generate`: Neon schema synchronized.
- Post-push `prisma migrate diff`: empty migration.
- Additive changes only: `skill_assessment`, four daily rollup columns, and a progress-month/date index.

## Verification

- Unit: 107/107 passed.
- Focused attendance transaction: 10/10 passed.
- TypeScript: `npx tsc --noEmit` passed.
- Frontend ESLint: zero warnings.
- Production build: passed.
- `git diff --check`: passed, with only existing CRLF conversion notices.
- Root and frontend `npm audit --omit=dev`: zero vulnerabilities after patch updates.
- Local Playwright with system Chrome: 49/49 passed.
- Production Playwright with system Chrome: 29/29 passed.
- Production daily-progress read probe: success; zero entries returned as `average_score=null`.
- Production attendance mutation: July 2026 period moved from `approved` to `locked` in 7.13 seconds; 3 students processed, 3 fees updated, 3 fee lines written.
- Post-fix Vercel deployment logs: zero HTTP 500 responses.

## Deployment

- Code commits: `e907980`, `1b783fe`.
- Deployment: `dpl_eufDoj4mNuJRRMz6FxdXXoyP8YcJ`.
- Alias: `https://edu-manager-gules.vercel.app`.
- State: `READY`.

## Residual Notes

- Vercel labels Node's upstream `url.parse()` deprecation warning as an error-level log; it did not produce HTTP 500 and is outside this application code path.
- The production lock smoke intentionally finalized the previously approved July 2026 period.
