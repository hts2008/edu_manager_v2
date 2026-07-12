# Tuition V3 Session Ledger - Production Closeout

## Scope

- Replace partial-calendar-week tuition assumptions with an explicit class-session ledger per billing month.
- Preserve independent student-class-month fee lines and immutable financial history.
- Support monthly package and per-session policies, enrollment bounds, waived absences, holidays, center credits, makeups and extras.

## Production Data Actions

- Applied Prisma migration `20260712_tuition_v3_session_ledger` to Neon production.
- Backfill rerun reported 164 existing sessions, 0 missing candidates and 0 low-confidence rows; repeated dry-run proved idempotency.
- Reconciled only mutable Flyer B2 fee lines:
  - June 2026: 835,714 -> 900,000 VND.
  - July 2026: three lines 840,000 -> 900,000 VND.
  - August 2026: three lines 835,714 -> 900,000 VND.
- Follow-up dry-runs returned no changes. Confirmed, paid and receipt-linked rows were excluded.

## Verification

- `npm run test:unit`: 210/210 pass.
- `npx tsc --noEmit`: pass.
- `npm --prefix frontend run lint`: pass, zero warnings.
- `npx prisma validate`: pass.
- `npx prisma migrate status`: schema up to date.
- `npm run build`: pass.
- `frontend/e2e/tuition-v3-ui-contract.spec.js`: 2/2 pass.
- `git diff --check`: pass.
- Local authenticated Chrome: Attendance Flyer B2, Classes and Fee Workbench pass with zero console warnings/errors.

## Production Release

- Commit: `304c4e7`.
- Deployment: `dpl_Bt3mwxpAymEHBLYe2Gf756JjFoLr` (`READY`).
- Alias: `https://edu-manager-gules.vercel.app`.
- Production authenticated Chrome evidence:
  - Attendance Flyer B2: `900.000đ/tháng`, `64.286đ/buổi / 14 buổi`, July and August ledgers loaded.
  - Fee Workbench: 31 class-line results; three Flyer B2 rows at `900.000đ`.
  - Classes: Flyer B2 loaded with monthly billing unit.
  - Console warnings/errors: none on affected routes.

## Artifacts

- `receipts/artifacts/tuition-v3-local-fee-workbench.png`
- `receipts/artifacts/tuition-v3-production-fee-workbench.png`

## Boundaries

- No manual session-planner shell was shipped without an atomic save/conflict workflow. Session ledger creation is currently driven by migration, attendance writes and authenticated month-plan APIs.
- Context+ and EDU-scoped Neural Memory MCPProxy were unavailable in this Codex tool palette; workspace markdown memory and evidence files were updated instead.
