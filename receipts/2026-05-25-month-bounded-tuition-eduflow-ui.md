# 2026-05-25 — Month-Bounded Tuition + EduFlow UI Production Closeout

## Scope
- Continue the approved production-live goal from the current dirty tree.
- Fix the month/session tuition defect behind the Phuc example and the May/June attendance confusion.
- Make receipt creation use MonthlyFee calculation instead of stale attendance-only estimates.
- Normalize the EduFlow shell after the dark dashboard drift and verify all menu routes.
- Use bounded subagents and close them after completion.

## Root Cause Summary
- `sessions_per_week` expected sessions were still derived from calendar rows times weekly frequency. For May 2026 this produced `2/week = 12`, while month-bounded class slots are `10`.
- Frontend receipt creation called `attendanceService.calculateFee`, then posted direct receipt data without a `monthly_fee_id`, allowing stale paid rows to diverge from current MonthlyFee logic.
- Month defaults used `toISOString()` in several places, which can drift under local timezone boundaries.
- Payment modal had a real runtime crash: `ArrowDownRight` was used but not imported.
- Phase-B smoke still asserted older English/copy labels after the UI was localized and redesigned.

## Implementation
- Added month-bounded session counting in `lib/tuition.ts` and `frontend/src/utils/dateKeys.js`.
- Updated tuition tests: May 2026 `2/week = 10`, `3/week = 14`, prorated monthly tuition, and extra-session flag.
- Hardened `parseMonthRange` against `YYYY-00` and `YYYY-13`; added business month key helper.
- Updated monthly-fee generator to avoid clearing paid/linked rows and to use guarded `updateMany`.
- Updated receipt creation to reject stale direct receipt totals when an eligible MonthlyFee row exists.
- Updated Receipts UI to call `monthlyFeesService.calculate`, preserve `monthly_fee_id`, use local month keys, and show the linked monthly fee.
- Routed default month helpers in fee collection, fee reminders, and reports away from UTC `toISOString()`.
- Added admin route guards for admin-only pages in `App.jsx`.
- Rebuilt dashboard back to a cohesive light EduFlow operations console using real dashboard API data and no fake line-chart history.
- Fixed payment modal crash and responsive/form copy issues.
- Added pagination clamp, modal aria-label, sidebar `aria-expanded`, and wider main content constraints.
- Updated Playwright smoke expectations for current Reports heading and Vietnamese bulk action UI.

## Design Evidence
- Stitch project: `projects/16406701261521949818`.
- Stitch screen: `projects/16406701261521949818/screens/3da9badc59d341f5ad6d7916cb2471dc`.
- Stitch model: `GEMINI_3_1_PRO`.
- Figma inspected page: `3:2 EDU_MANAGER_V2 Production UX`.
- Figma inspected node: `3:36 Desktop / Receipts Shell`; screenshot captured after `get_design_context`.

## Verification
- `git diff --check` passed; only LF/CRLF warnings.
- `npx tsc --noEmit` passed.
- `npm run test:unit` passed 38/38.
- `npm --prefix frontend run lint -- --max-warnings=0` passed.
- `npm run build` passed. Vite still reports existing chunk-size/dynamic-import warnings.
- Local Playwright `ux-redesign-smoke.spec.js` passed 7/7 against `npm run dev:smoke`.
- Local Playwright `phase-b-smoke.spec.js` passed 17/17 against `npm run dev:smoke`.
- Vercel production deploy `dpl_3AFgxEykCcXHhtC1A29jW37ZxJ9C` reached `READY`.
- Production alias: `https://edu-manager-gules.vercel.app`.
- Production Playwright `ux-redesign-smoke.spec.js` passed 7/7.
- Production Playwright `phase-b-smoke.spec.js` passed 17/17.
- Final source-synced deployment probe passed after implementation commit/push: root 200, login 200, dashboard 200, receipts 200, receipt PDF 200 `application/pdf`, PDF 17070 bytes.

## DB / Migration Note
- `npx prisma migrate status` was run read-only and returned that the current Neon database is not managed by Prisma Migrate because the repo has no `prisma/migrations` directory.
- No schema migration, seed, or destructive production DB mutation was run in this pass.

## Subagent Resource Hygiene
- Spawned and closed three bounded agents:
  - Tuition/dataflow explorer.
  - UI/menu audit explorer.
  - Verification/test worker.
- No inactive subagents were left running.

## Residual Risks
- Historical paid anomalies such as existing zero-session positive receipts were intentionally not auto-mutated. They should be handled by an explicit financial correction policy.
- Vite bundle size warnings remain technical debt for future code-splitting.
- Default production credentials and JWT secret rotation remain operational follow-up before real public operation.

