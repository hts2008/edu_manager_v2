# EDU_MANAGER_V2 /goal: Production Live Without Known P0/P1 Bugs + Best-in-Class EduFlow UX

## Status
- Goal status: IMPLEMENTED and production-smoked.
- Current source branch: `main`.
- Production target: `https://edu-manager-gules.vercel.app`.
- Execution mode: `ck:cook --auto --parallel` with `ck:team` sidecar agents.
- Team rule: use explorer agents for code/runtime/design discovery, worker agents for independent implementation slices, and reviewer/tester agents for validation. If subagent capacity is unavailable, the lead continues inline and records the fallback.

## Summary
- Objective: make EDU_MANAGER_V2 production-live with no known P0/P1 defects after verification, and keep the EduFlow UI aligned with the design guide.
- "Without bug" means no known P0/P1 defect remains after current verification. It does not mean a mathematical guarantee that no future bug exists.
- Immediate P0/P1 findings from current evidence:
  - `/classes` crashes on production with `ReferenceError: motion is not defined`.
  - Attendance-period lock can write a one-student/month fee from one class only, which is unsafe for multi-class students and is not atomic.
  - Monthly fee confirm/cancel can race with payment because transitions are read-then-update.
  - Direct receipt creation still allows zero-day positive receipts when no monthly fee is linked.
  - Dashboard unpaid aggregates must not be derived from a truncated display list.
  - Template designer advertises Fabric objects that PDF rendering must either support or explicitly reject.

## Task Matrix

| ID | Task | Agent Strategy | Status | Evidence Required |
| --- | --- | --- | --- | --- |
| T0 | Baseline git, plan, KANBAN, memory | Lead + explorer | DONE | `git status`, plan read |
| T1 | Replace stale plan with this goal-aligned plan | Lead/docs worker | DONE | This file updated |
| T2 | Fix `/classes` production crash | Lead/frontend worker | DONE | Full menu traversal passes |
| T3 | Add full-menu desktop/mobile regression test | Lead/test worker | DONE | Playwright route traversal passes 22 protected routes desktop/mobile |
| T4 | Fee integrity: atomic attendance-period lock and multi-class monthly fee aggregation | Backend worker + reviewer | DONE | `tests/tuition.test.ts`, `tests/production-contracts.test.ts`, unit 35/35 |
| T5 | Fee state machine: conditional confirm/cancel transitions | Backend worker + reviewer | DONE | Conditional `updateMany` guards in confirm/cancel/calculate/pay; unit 35/35 |
| T6 | Receipt/report integrity: block or classify zero-day positive receipts | Backend worker + reviewer | DONE | Validation/report anomaly tests; unit 35/35 |
| T7 | Dashboard aggregate integrity | Backend/frontend worker | DONE | Dashboard contract test covers aggregate fields and `unpaid_count` |
| T8 | Template/PDF fidelity | Backend/frontend worker | DONE | PDF test covers supported Fabric objects and unsupported image fallback |
| T9 | EduFlow UX quality pass | UI worker + design reviewer | DONE | Desktop/mobile Playwright screenshots, no overflow, no console/page errors |
| T10 | Verification gates | Tester/reviewer agents | DONE | Unit, typecheck, lint, build, audit, local Playwright 7/7, production Playwright 7/7, API probes pass |
| T11 | KANBAN/memory/receipt writeback | Docs worker + lead review | DONE | Board/memory/receipt updated with deployment evidence |

## Implementation Requirements

### UI / EduFlow
- Keep Vite + React + Tailwind v4; no framework migration.
- Follow the Design Guide: Calm Productivity meets Vibrant Energy, dense operations console, purposeful motion, WCAG-aware contrast, responsive at 390/768/1440.
- Use Stitch first and Figma second for new large UX directions. For this execution slice, existing Stitch/Figma evidence can be reused unless a page is redesigned materially.
- Remove production crashes, no horizontal overflow, no console errors on menu routes.
- Prefer existing shared UI primitives: `PageHeader`, `MetricCard`, `PageState`, `DataTable`, `Modal`.

### Money / Attendance / Reports
- Attendance drives monthly fees.
- Period lock must be atomic: if fee generation fails, period must not be left locked.
- MonthlyFee is unique per student/month; any lock-time calculation must aggregate all active class attendance for that student/month.
- Paid monthly fees must not be reverted by confirm/cancel.
- Direct receipt creation must not create a paid positive amount with zero chargeable sessions unless it is explicitly treated as an adjustment with a tracked reason.
- Reports must surface receipt-only anomalies, not only MonthlyFee anomalies.
- Dashboard aggregate counts and amounts must be computed from aggregate queries, not from a truncated display list.

### Template / PDF
- PDF generation must match the designer capabilities used in production, or unsupported designer tools must be disabled/validated.
- Minimum Phase for this goal: text, line, rect, circle/ellipse, image/background, and QR placeholder are either rendered or explicitly blocked before save/use.
- Keep Unicode PDF support and `/ToUnicode` evidence.

## Test Plan
- `git diff --check`
- `npm run test:unit`
- `npx tsc --noEmit`
- `npm --prefix frontend run lint -- --max-warnings=0`
- `npm run build`
- `npm audit --audit-level=high`
- `npm --prefix frontend audit --audit-level=high`
- Playwright:
  - `ux-redesign-smoke.spec.js`
  - full menu traversal desktop/mobile
  - any new targeted regression for dataflow pages
- Production smoke after deploy:
  - root 200
  - protected API no token 401
  - cron no secret 403
  - login
  - full menu traversal
  - dashboard contract
  - receipt PDF
  - template upload/PDF path where applicable

## Acceptance Criteria
- No known P0/P1 defect remains in current audit scope.
- `/classes` and all protected menu routes load without page errors, console errors, 404/500 API errors, or horizontal overflow on desktop/mobile.
- Fee/receipt/report paths prevent or surface known anomaly classes.
- Static/build/test/audit gates pass.
- Production smoke passes after deploy.
- This plan, `KANBAN.md`, memory files, and a receipt are updated with evidence.

## Remaining Risks
- Real SMS/Zalo sending remains intentionally disabled until provider, opt-in policy, templates, and rate controls are approved.
- Production credential rotation remains an operational follow-up.
- Broad "best-in-class" UX is an ongoing standard; completion for this goal is based on verified P0/P1 closure and Design Guide-aligned screens in the current product surface.

## Local Verification Snapshot - 2026-05-25
- `npx tsc --noEmit` passed.
- `npm run test:unit` passed 35/35.
- `npm --prefix frontend run lint -- --max-warnings=0` passed.
- `npm run build` passed after stopping the local smoke server that held Prisma's Windows query-engine DLL.
- `npm audit --audit-level=high` passed with 0 vulnerabilities.
- `npm --prefix frontend audit --audit-level=high` passed with 0 vulnerabilities.
- `git diff --check` passed; only Git CRLF normalization warnings were reported.
- `npm --prefix frontend run test:e2e -- ux-redesign-smoke.spec.js --reporter=list` passed 7/7 against `npm run dev:smoke`.

## Production Verification Snapshot - 2026-05-25
- Implementation commit `d2e19df` and docs closeout commit `5b2b568` pushed to `origin/main`.
- Final Vercel production deployment `dpl_2gi9iJBPBnMAKRJb1ZsZs365DGcL` is Ready and aliased to `https://edu-manager-gules.vercel.app`.
- `npm --prefix frontend run test:e2e -- ux-redesign-smoke.spec.js --reporter=list` passed 7/7 against production.
- Production probes passed: root 200, no-token `/api/auth/me` 401, no-secret cron 403, login 200, dashboard fields present with `quick_metrics.unpaid_count`, student-fees report 200 with anomaly count, receipts list 200, receipt PDF 200 `application/pdf` with `%PDF` and 17070 bytes.
