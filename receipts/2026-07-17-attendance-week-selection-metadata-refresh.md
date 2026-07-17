# 2026-07-17 - Attendance Week Selection Metadata Refresh Fix

## Scope

Fix the production attendance regression where operators could not reliably select a past/future month week row while weekly metadata was refreshing.

## RCA

`AttendancePage.jsx` used one disabled flag for two different concerns:

- Calendar week selection.
- Mutation controls such as cell edit, select-all and save.

That shared flag was `attendanceControlsDisabled = loading || weekLoading || saving`. During `weekLoading`, `handleWeekClick` returned early, so the calendar row click could do nothing and the weekly panel did not open. This was visible to the operator as "only current week works" or "past/future week cannot be selected."

## Implementation

- Added `weekSelectionDisabled = loading || saving`.
- Kept `attendanceControlsDisabled = loading || weekLoading || saving` for mutation safety.
- Updated `handleWeekClick`, calendar row `tabIndex`, `aria-disabled`, and row disabled styling to use `weekSelectionDisabled`.
- Added/updated source contracts so `weekLoading` cannot regress into the selection gate.

## Files Changed

- `frontend/src/pages/AttendancePage.jsx`
- `frontend/tests/attendance-page-contract.test.js`
- `tests/historical-attendance-ui-guard.test.ts`

## Verification

- `npm --prefix frontend run test:unit` passed.
- `npm --prefix frontend run lint` passed.
- `npm run test:unit` passed: `467/467`.
- `npx tsc --noEmit` passed.
- `npm run build` passed.
- `git diff --check` passed with existing CRLF warnings only.

## Production Deploy

- Commit: `2867171`
- Vercel deployment: `dpl_C9Kya8T288BGNLpRBd7V3UF8Udgn`
- Production alias: `https://edu-manager-gules.vercel.app`
- Production URL: `https://edu-manager-i3n5eupdy-hts2008s-projects.vercel.app`
- Vercel inspect: `https://vercel.com/hts2008s-projects/edu-manager/C9Kya8T288BGNLpRBd7V3UF8Udgn`

## Production Chrome Smoke

Authenticated against production with `admin / admin123`, then opened `/attendance`.

Result:

- Selected class `FLYER B6`.
- Calendar and month plans loaded for June, July and August 2026.
- Clicked `data-testid="attendance-week-2026-06-1"`.
- Weekly panel rendered `Điểm danh tuần: 1/6/2026 - 7/6/2026`.
- Metadata calls returned HTTP 200.
- After metadata loaded, the save button was enabled.
- No API 500 was observed in the smoke.

Screenshots:

- `C:/Users/haitr/AppData/Local/Temp/attendance-week-select.png`
- `C:/Users/haitr/AppData/Local/Temp/attendance-week-ready.png`

## Release Boundary

This fix only changes calendar selection gating. It does not alter month-plan authority, tuition denominator logic, enrollment guards, period locks, or finance mutation rules.
