# Attendance Month-Ledger Correction - Production Closeout

Date: 2026-07-14  
Production: https://edu-manager-gules.vercel.app  
Application commit: `5627779`  
Vercel deployment: `dpl_8EyP7uK3AgWhkm7uyR4U8cHe1FVj`

## Scope

Close `ATLC-2026-07-13-01..05`: remove phantom attendance sessions, make month readiness explicit before submit/approve/lock, preserve monthly-package tuition through an actual-date ClassSession ledger, add monotonic ClassMonthPlan revisions, repair affected production history, and verify the real operator workflow in Chrome.

## Root Cause And Decision

- The UI groups dates by calendar week, but tuition is owned by a billing month. Treating a cross-month week or `sessions_per_week` heuristic as the fee denominator created incomplete month totals and phantom planned sessions.
- Attendance flows could advance state before proving that every regular month session had a complete attendance matrix.
- Historical enrollment start dates and one generated phantom session made the Flyer VB3 June ledger internally inconsistent.
- Durable rule: each regular ClassSession belongs to the month of its actual date. A monthly package is allocated in whole VND over those sessions. `sessions_per_week` is cadence guidance only.
- Confirmed, paid, receipt-linked and receipt-line-linked finance rows remain immutable and are excluded from repair/recalculation.

## Implementation

- Added typed readiness diagnostics and fail-before-mutation preflight for attendance submit, approve and lock.
- Added explicit reopen/correction handling and routed fee generation through the Tuition V3 ledger.
- Added monotonic ClassMonthPlan state/revision guards with immutable revision snapshots.
- Added operator loading, readiness and correction states to the attendance UI.
- Hardened finance/enrollment write paths and protected-row invariants.

## Production Data Operations

- Deployed additive migration `20260713_zz_class_month_plan_revision_state_guard`.
- Backfilled 23 ClassMonthPlans. Final dry-run: 23 candidates, 25 existing plans, 0 plans to create.
- Reconciled Flyer VB3 (`cmrileeoq0002sbiyc95xlc25`) for June 2026 in run `attendance-month-ledger-2026-06-ce009c9d-4863-4d0f-9108-e996b1df5b73`.
- Deleted phantom session `cmriwhxu2000473zinzv4vqx3` dated 2026-06-01.
- Corrected three enrollment-period starts to 2026-06-03 and wrote four audit rows.
- Post-repair dry-run: zero phantom, enrollment and unresolved findings.
- Protected finance fingerprint remained `58ab3cae7a6eac983a8610f863324ef9` across 30 immutable rows before and after repair/backfill/production smoke.

## Quality Gates

| Gate | Result |
| --- | --- |
| Unit | PASS - 306/306 tests, 110 top-level tests, 56 suites |
| TypeScript | PASS - `npx tsc --noEmit` |
| Frontend lint | PASS - zero warnings |
| Prisma | PASS - validate and production migration status current |
| Build | PASS - 2960 modules transformed |
| Dependency audit | PASS - root and frontend, 0 vulnerabilities |
| Diff hygiene | PASS - `git diff --check` |
| Integration | Guarded skip - local `TEST_DATABASE_URL` is not configured; command exited 0 |

## Authenticated Chrome Acceptance

1. Logged into production as admin.
2. Confirmed the class selector exposes a visible loading state.
3. Selected Flyer VB3 and June 2026.
4. Verified monthly tuition `1.000.000đ`, 8 regular sessions and `125.000đ/buổi`.
5. Opened readiness: 8 required, 8 processed, 3 students, 0 missing.
6. Executed the real `Chốt để thu học phí` mutation; state changed to `Đã chốt - Sẵn sàng thu phí` without an Internal server error.
7. Opened Fee Workbench and verified three independent Flyer VB3 class lines, each 8 sessions and 1.000.000 VND.
8. Browser console errors/warnings: 0. Horizontal overflow: false (`scrollWidth=clientWidth=2560`).

Screenshot: [Fee Workbench production result](./artifacts/tuition-v3-production-closeout-fee-workbench.png)

## Release And Rollback

- Deployment inspector: https://vercel.com/hts2008s-projects/edu-manager/8EyP7uK3AgWhkm7uyR4U8cHe1FVj
- Production alias points to the READY deployment.
- Code rollback: redeploy the preceding known-good Vercel deployment. Do not reverse the additive migration while ClassMonthPlan data exists.
- Data rollback must be operator-reviewed from the four audit rows; never bulk-rewrite protected finance rows.

## Residual Risk

- The isolated real-router integration suite needs a dedicated local/CI `TEST_DATABASE_URL`; it was not executed against production.
- Rotate documented default admin credentials before external production operation.
- No SMS/Zalo provider delivery was enabled; that feature remains intentionally disabled.
- Context+ and EDU-scoped Neural Memory/MCPProxy were unavailable in this callable tool palette, so workspace markdown memory is the session record.
