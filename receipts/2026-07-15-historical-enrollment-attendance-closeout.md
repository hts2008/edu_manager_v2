# Historical Enrollment / Attendance Closeout

**Date:** 2026-07-15
**Track:** `ENRT-2026-07-14-01..04`
**Code commit:** `bb5168e`
**Production:** `https://edu-manager-gules.vercel.app`
**Vercel deployment:** `dpl_5Q4GBfkMNPyDEXazExe6WiqxwKk4` (`READY`, production)

## Objective

Prevent a newly created class from exposing historical attendance that falls before the students' enrollment period, preserve the month-ledger tuition invariant, and verify the complete production workflow from class enrollment through fee readiness.

## Root Cause

Class creation previously stamped enrollment with server request time. Attendance navigation independently allowed historical months. The UI could therefore show historical class sessions while the domain had no valid student membership for those dates. Submission then failed late with repeated `outside the student's enrollment period` diagnostics.

The durable correction is temporal, not a bypass: historical class membership must be explicitly backdated and auditable before attendance can be written.

## Changes

- Added explicit enrollment effective date plus required historical-change reason to class create/update API and UI.
- Updated `EnrollmentPeriod` and current `StudentClass` projection atomically; added enrollment audit evidence.
- Added one shared half-open enrollment guard used before attendance mutation.
- Added typed corrective errors so invalid historical attendance fails before partial writes.
- Persisted and restored legacy/V3 month-plan session denominators without null-to-zero coercion.
- Hardened attendance lock/reconciliation with serializable retries and deterministic roster/finance advisory-lock ordering.
- Ensured reconciliation obtains canonical finance locks before protected-row fingerprint, preflight and mutation.
- Expanded regression coverage for historical workflows, audit, UI guard, schedule snapshots, readiness, locking and reconciliation.

## Verification

| Gate | Result |
| --- | --- |
| Unit | `377/377`, 61 suites, 0 failures |
| TypeScript | `npx tsc --noEmit` passed |
| Frontend lint | `cd frontend && npm run lint` passed with zero warnings |
| Build | `npm run build` passed; 2960 modules transformed |
| Dependency audit | `npm audit --omit=dev --audit-level=high` reported 0 vulnerabilities |
| Diff hygiene | `git diff --check` passed; only line-ending notices |

## Production Lifecycle Evidence

Controlled class: `QA HIST 20260715 A` (`cmrkzqbof00028havdu0endd2`).

1. Created the class with student `Bùi Hoàng Cường` and explicit enrollment start `2026-06-01` plus a correction reason.
2. Verified June 2026 planned 10 regular sessions for the 900,000 VND monthly package.
3. Verified an incomplete submit was rejected with expected/found readiness diagnostics.
4. Saved all five June weeks / 10 sessions.
5. Completed reopen → submit → approve → lock without an Internal server error.
6. Verified Fee Workbench kept the class as one independent class line at `10 buổi / 900.000đ`; July remained `0 / 0đ` because no July attendance was submitted.

The final release deployment was then opened in authenticated Google Chrome. Attendance showed monthly fee `900.000đ`, applied fee/session `90.000đ / 10 buổi trong tháng`, June status `Đã chốt`, and `Sẵn sàng thu phí`. Fee Workbench showed the exact June row at `10 buổi / 900.000đ`. Chrome console errors: `0`.

## Review Findings Closed

- Global roster advisory locks are acquired before sorted class-month roster locks.
- Reconciliation computes affected student-month finance lock keys after roster locks and acquires those locks before finance fingerprint/preflight/mutation.
- Relocking a class does not double-append the target class aggregate line.
- Legacy and V3 schedule snapshots preserve a stable denominator instead of silently deriving zero.

## Acceptance Boundary

The full stateful production lifecycle and final authenticated release readback passed. Locally, the real-router integration command remains explicitly guarded because `TEST_DATABASE_URL` is not configured; therefore there is not yet one isolated PostgreSQL test that drives every HTTP handler in a single test case. Focused transaction/workflow tests plus the production lifecycle cover the accepted release scope. No current blocker was observed in that scope.

## Tooling Degradation

Context+ and EDU-scoped Neural Memory/MCPProxy were not exposed in the callable tool palette. Manual blast-radius inspection, workspace memory, tests and runtime evidence were used; gates were not relaxed.
