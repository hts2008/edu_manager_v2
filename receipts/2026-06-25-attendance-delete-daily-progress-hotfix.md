# Attendance / Delete / Daily Progress Hotfix - 2026-06-25

## Scope

Closed five operator-reported issues:

1. Attendance calendar week click selected the wrong week row.
2. Locked attendance could leave fee display at `0d`.
3. Class filter dropdown lacked visible loading feedback.
4. Classes, teachers, and parents delete flows were blocked by linked records.
5. Student progress needed per-attendance-day entry creation instead of a single monthly overwrite flow.

## Implementation

- `frontend/src/pages/AttendancePage.jsx`
  - Calendar row click now passes the visible row start/end directly.
  - Class dropdown is disabled while initial class data is loading and shows a loading label/status.
- `server/api/attendance-periods/[id]/index.ts`
  - Attendance lock now syncs class-level monthly fee lines and refreshes the aggregate monthly fee total transactionally.
- `server/api/classes/index.ts`
  - Default list hides inactive classes.
  - Delete archives classes and deactivates active student-class links.
- `server/api/teachers/index.ts`
  - Default list hides inactive teachers.
  - Delete archives teachers and unassigns their classes.
- `server/api/parents/index.ts`
  - Delete soft-deletes parents without trying to detach required child foreign keys.
- `server/api/reports/student-progress.ts`
  - Report rows now expose `attendance_dates`.
- `frontend/src/components/student-progress/ProgressInputPanel.jsx`
  - Teacher input panel can add daily progress entries from attendance dates.
  - Loading state no longer touches `form.daily_entries` before `form` exists.
- `tests/attendance-regressions.test.ts`
  - Added regression coverage for week-row selection, fee-line sync, loading copy, archive delete flows, and daily progress entry behavior.

## Verification

- `npm --prefix frontend run lint` passed.
- `npx tsx --test tests/attendance-regressions.test.ts` passed 7/7.
- `npx tsc --noEmit` passed.
- `npm run test:unit` passed 85/85.
- `npm run build` passed.
- Local Chrome smoke using Vite and mocked API contracts:
  - `/attendance` rendered without console/page errors.
  - `/classes` rendered without console/page errors.
  - `/parents` rendered without console/page errors.
  - `/teachers` rendered without console/page errors.
  - `/student-progress` rendered without console/page errors.
  - Focused student-progress smoke confirmed the `Theo ngay diem danh` panel and attendance-date buttons.
- Production deployment:
  - Commit `0fc9b80` pushed to `origin/main`.
  - Vercel deployment `dpl_DD5oAS6CoUwpySZerue1RbHXvGCU` reached `READY`.
  - Alias `https://edu-manager-gules.vercel.app` points to the new deployment.
- Production browser/API smoke:
  - Focused Playwright passed 6/6 for Fee Workbench line split, attendance/fee workspaces, attendance month navigation, modal scroll, Template Designer canvas, and receipt PDF.
  - Read-only Fee Workbench probes for `2026-05` and `2026-06` returned zero collectable rows with `total_amount = 0`.
  - The broad legacy smoke passed 22/29; the remaining failures were test-selector drift or parallel Chrome setup failures. Every affected hotfix flow was rerun serially and passed.

## Residual Risk

- Parent delete remains a soft delete because `Student.parentId` is required in the current schema; detaching children would require an explicit schema/migration plan.
- Paid or receipt-linked fee records are not recalculated automatically; financial correction remains an explicit audited operator action.
