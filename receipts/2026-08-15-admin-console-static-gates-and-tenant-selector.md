# Admin Console Static Gates + Tenant Selector Checkpoint - 2026-08-15

## Scope

Continue the Admin Console / multi-tenant control-plane rollout from the latest checkpoint, with emphasis on the failing monthly-fee tenancy regression and current release evidence state.

## Root Cause

`generateMonthlyFees` received a `tenantId`, but the Prisma transaction client did not expose tenant context to shared tenant selectors. As a result, `monthlyFeeUniqueWhere(tx, studentId, month)` could fall back to the legacy unique selector `{ studentId_month }` instead of the tenant-safe composite selector `{ tenantId_studentId_month }`.

## Fix

- Added a local tenant-marking proxy in `lib/monthly-fee-generator.ts` so read clients and transaction clients expose `$tenantId` without mutating Prisma internals.
- Kept the shared `monthlyFeeUniqueWhere` path as the canonical selector for monthly-fee reads/writes.
- Updated stale source-contract tests so they assert the current fail-closed tenant-aware API and permission contracts instead of old single-tenant assumptions.

## Verification

Passed:

- `.\node_modules\.bin\tsx.cmd --test tests\class-month-plan.test.ts tests\historical-attendance-ui-guard.test.ts tests\production-contracts.test.ts tests\report-denominator-endpoints.test.ts tests\strict-class-line-ledger.test.ts tests\student-progress-api.test.ts tests\student-progress-daily-api.test.ts tests\student-progress-finalization.test.ts tests\student-progress-timeline.test.ts tests\tuition-v3-migration.test.ts` -> `93/93`
- `.\node_modules\.bin\tsx.cmd --test tests\admin-console-cron-monthly-fees-tenancy.test.ts` -> `3/3`
- `npm run test:admin-console` -> `216/216`
- `npm run test:unit` -> `530/530`
- `npx tsc --noEmit` -> exit `0`
- `npm --prefix frontend run lint` -> exit `0`
- `npm run build` -> exit `0`
- `git diff --check` -> exit `0`
- `.\node_modules\.bin\tsx.cmd scripts\audit-tenant-runtime.ts` -> `PASS (0 finding(s), 7 exception(s))`
- Tenant runtime audit JSON summary: `84` API files, `70` protected handlers, `69` request-db handlers, `7` reviewed direct-Prisma exceptions, `0` raw SQL handlers, `0` stale allowlist entries.

## Release Verdict

**NO-GO for production Admin Console closeout.**

Static and focused code gates are green, and the source-level tenant runtime audit currently passes. Production release still remains blocked until these are proven:

- Dataful Neon rehearsal on a production-like branch.
- Backup v4, v3 compatibility restore, rollback and PITR evidence.
- Fresh schema-diff and migration status evidence.
- Dataful tenant isolation rehearsal beyond the source-level runtime audit.
- Auth/session tenant revocation and suspended-tenant browser/API evidence.
- Canonical production deploy and smoke after the above gates.

## Notes

Do not mark the Admin Console track `IMPLEMENTED` from this receipt alone. This receipt only closes the static selector/test stabilization checkpoint.
