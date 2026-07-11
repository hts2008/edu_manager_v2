# Core Ledger Remediation Production Closeout

Date: 2026-07-11

## Scope

- Attendance lock and month-bounded tuition kernel
- Immutable enrollment periods with current-state projection
- Strict class-line fee ledger
- Template image/PDF render hardening
- Router audit and isolated PostgreSQL CI gate

## Runtime Changes

- Neon schema update was additive and completed without `--accept-data-loss`.
- Backfill dry-run reported 37 active links and 37 missing periods.
- Apply created 37 open enrollment periods; inactive historical links were intentionally not fabricated.
- Vercel production deployment: `dpl_6Bw6PFpY4AQFqKvYJMMu4ZRKqPrG`.
- Canonical alias: `https://edu-manager-gules.vercel.app`.

## Verification

- `npm run test:unit`: 125/125 passed.
- `npx tsc --noEmit`: passed.
- `frontend npm run lint -- --max-warnings=0`: passed.
- `npm run build`: passed.
- Root and frontend `npm audit --audit-level=high`: 0 vulnerabilities.
- GitHub Actions run `29149776064`: verify, E2E and isolated PostgreSQL integration all succeeded.
- HTTP smoke: root 200; protected `/api/students` returns 401 without token.
- Authenticated Chrome: dashboard, attendance, fee collection, reports and templates loaded without console errors.
- Template Designer: two Fabric canvas layers visible, 13 persisted objects loaded, A5 selected, dynamic `center_name` field increased the live object count to 14. The template was not saved, so production data was not mutated by this interaction test.

## Residual Operational Constraint

The isolated PostgreSQL integration test runs in CI. Local execution skips without a local `TEST_DATABASE_URL`; it deliberately rejects remote hosts to prevent accidental production mutation.
