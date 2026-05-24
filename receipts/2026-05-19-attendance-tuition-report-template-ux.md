# 2026-05-19 - Attendance Tuition RCA, Reports, Template Designer, UX Smoke

## Scope
- Investigate incorrect attendance/session count and tuition calculation, including student Phuc.
- Fix monthly-tuition calculation for classes configured with `sessions_per_week`.
- Fix local date-key handling and Vietnamese weekday convention in Attendance UI.
- Add bulk student enrollment while creating/updating classes.
- Add detailed student tuition collection report.
- Upgrade Template Designer with image upload/background, layers, alignment, duplicate, lock, opacity, and richer shape/data tools.
- Apply motion-oriented operations-console UX direction and extend browser smoke evidence.

## RCA Findings
- Student Phuc (`cmpb9laze00017b2375h04484`) had paid May receipt `cmpba5sex00067b23f357bcxq` with `days_count=0` and `amount=6000000`.
- Neon data showed Phuc had 12 May attendance records and 2 June attendance records. The user expectation of 13 June sessions is not present in the current DB snapshot.
- Root cause 1: attendance-period lock generated `MonthlyFee.totalAmount = presentCount * class.feePerDay` but did not set `totalDays`.
- Root cause 2: class `fee_per_day` was being treated as per-session for `sessions_per_week` classes. For monthly tuition classes, it must be a monthly tuition package divided by expected sessions in the selected month.
- Root cause 3: Attendance UI used UTC `toISOString().split("T")[0]`, which can shift Asia/Bangkok local dates.
- Root cause 4: UI stored Vietnamese weekday numbers (`2..7`, `1=CN`) but calculation compared them as JavaScript `getDay()` values.

## Implementation
- Added shared tuition engine in `lib/tuition.ts`.
  - `sessions_per_week`: expected sessions = calendar rows in the month * sessions per week.
  - `schedule_days`: expected sessions = actual selected weekdays in the month.
  - fallback unscheduled classes remain per-session.
  - zero charged sessions always produce zero amount.
- Added regression tests in `tests/tuition.test.ts`.
- Wired tuition engine into:
  - `server/api/attendance/calculate-fee.ts`
  - `server/api/monthly-fees/calculate.ts`
  - `server/api/monthly-fees/[id]/index.ts`
  - `lib/monthly-fee-generator.ts`
  - `server/api/attendance-periods/[id]/index.ts`
  - `server/api/receipts/index.ts`
- Added local date-key helpers in `frontend/src/utils/dateKeys.js` and replaced unsafe date serialization in `AttendancePage.jsx`.
- Added class bulk enrollment via `student_ids` in class create/update and `action=bulk_enroll`.
- Added `server/api/reports/student-fees.ts`, router entry, frontend API service, and Reports UI matrix for student/month payment status.
- Reworked `TemplateDesignerPage.jsx` into a usable Fabric editor with image/background upload, layer movement, align, duplicate, lock, opacity, text/shape colors, QR placeholder, and custom metadata export.
- Added motion-grid utilities in `frontend/src/index.css`.
- Extended `frontend/e2e/ux-redesign-smoke.spec.js` to cover reports student-fees and Template Designer canvas/tools.

## Design Evidence
- Stitch project reused: `12785236930566023458`.
- Generated new Stitch screen with `modelId=GEMINI_3_1_PRO`: `projects/12785236930566023458/screens/bcc2bae4057745d4969b2b3b114ce526`.
- Stitch direction: premium SaaS operations console, KPI strip, student tuition matrix, anomaly warnings, dense table layout, subtle animated grid, no blobs/orbs.
- Figma Desktop inspection was attempted but unavailable in this Codex session: `No Figma window open`.

## Verification
- `npx tsc --noEmit` passed.
- `npm --prefix frontend run lint` passed.
- `npm run test:unit` passed: 28/28.
- `npm run build` passed.
- `npm --prefix frontend run test:e2e -- ux-redesign-smoke.spec.js` passed: 6/6 against `npm run dev:smoke` with Neon access outside sandbox.
- `git diff --check` passed.
- Generated screenshots:
  - `frontend/output/playwright/ux-redesign-desktop.png`
  - `frontend/output/playwright/ux-redesign-mobile.png`
  - `frontend/output/playwright/reports-student-fees.png`
  - `frontend/output/playwright/template-designer.png`

## Safety Notes
- No production deploy was run.
- No production migration/seed was run.
- No existing paid receipt/monthly fee was mutated automatically. Existing historical anomalies are now visible through the student-fees report and should be corrected only through an explicit financial adjustment/void/reissue policy.
- Live SMS/Zalo sending remains intentionally disabled.
- MCPProxy/Neural Memory/Context+ tools were not exposed in this Codex turn; write-back used markdown memory only.
