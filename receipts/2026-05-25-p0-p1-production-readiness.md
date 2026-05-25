# 2026-05-25 P0/P1 Production Readiness Receipt

## Scope
- Fix the latest observed `/classes` menu crash and prevent route regressions across the expanded menu.
- Harden attendance -> monthly fee -> receipt dataflow so new records cannot reproduce the observed zero-session/non-zero-fee defects.
- Improve dashboard aggregate correctness and Template Designer to PDF fidelity.
- Keep SMS/Zalo live sending disabled; no provider/live-send changes in this pass.

## Implementation Summary
- `frontend/src/pages/ClassesPage.jsx`: imported Motion and replaced unresolved `motion.*` usage so `/classes` no longer throws `ReferenceError: motion is not defined`.
- `frontend/e2e/ux-redesign-smoke.spec.js`: added full protected-menu traversal over 22 routes on desktop and mobile, asserting no page errors, console errors, failed same-origin API responses, or horizontal overflow.
- `server/api/attendance-periods/[id]/index.ts`: lock action now runs in a Prisma transaction, aggregates all active classes for impacted students/month, updates only collectible fee rows, and locks the period conditionally.
- `server/api/monthly-fees/calculate.ts`, `server/api/monthly-fees/[id]/confirm.ts`, `cancel.ts`, `pay.ts`: state transitions now use conditional guards so paid/linked rows are not reverted or corrupted by concurrent actions.
- `lib/validation.ts`, `server/api/receipts/index.ts`, `server/api/monthly-fees/[id]/pay.ts`: new positive tuition receipts with zero chargeable sessions are blocked with `ZERO_DAY_POSITIVE_RECEIPT`.
- `server/api/reports/student-fees.ts`: report now flags receipt-only zero-session positive anomalies as `RECEIPT_WITH_ZERO_DAYS`.
- `server/api/reports/dashboard.ts`: unpaid count/amount now comes from DB count/aggregate queries, not the truncated 8-row preview list.
- `lib/pdf.ts`, `tests/pdf.test.ts`: Fabric PDF rendering now supports text, line, rect, circle, ellipse, simple groups, and base64 PNG/JPEG images; unsupported/corrupt images are skipped/fallback-safe.
- `lib/tuition.ts`, `tests/tuition.test.ts`: shared multi-class student-month tuition aggregation remains covered.

## Local Verification
- `git diff --check` passed. Git emitted Windows CRLF normalization warnings only.
- `npx tsc --noEmit` passed.
- `npm run test:unit` passed 35/35.
- `npm --prefix frontend run lint -- --max-warnings=0` passed.
- `npm run build` passed. One first attempt failed with Windows `EPERM` while the local smoke server held Prisma's query-engine DLL; stopping the server and rerunning passed.
- `npm audit --audit-level=high` passed with 0 vulnerabilities.
- `npm --prefix frontend audit --audit-level=high` passed with 0 vulnerabilities.
- `npm --prefix frontend run test:e2e -- ux-redesign-smoke.spec.js --reporter=list` passed 7/7 against `npm run dev:smoke`.

## Team/Subagent Notes
- Used `ck:team` with a worker subagent for the bounded PDF/template fidelity slice.
- Worker touched only `lib/pdf.ts` and `tests/pdf.test.ts`; lead integrated and reran all local gates.

## Production Status
- Pending commit, production deploy, and production smoke.

## Remaining Risks
- Historical paid anomalous receipts are intentionally not auto-mutated. They must be handled by an explicit financial adjustment/void/reissue policy.
- Real SMS/Zalo delivery remains disabled until provider integration, opt-in policy, approved templates, and rate controls exist.
- Production credential/JWT rotation remains an operational follow-up before real operation.
