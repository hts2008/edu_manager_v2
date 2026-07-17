import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const attendancePage = readFileSync(
  new URL("../src/pages/AttendancePage.jsx", import.meta.url),
  "utf8",
);
const monthPlanEditor = readFileSync(
  new URL("../src/components/attendance/AttendanceMonthPlanEditor.jsx", import.meta.url),
  "utf8",
);
const modal = readFileSync(
  new URL("../src/components/ui/Modal.jsx", import.meta.url),
  "utf8",
);

describe("attendance page interaction contracts", () => {
  it("gates every month-plan entry point and the editor itself to admins", () => {
    assert.match(attendancePage, /const canManageMonthPlan = isAdmin\(\);/);
    assert.match(attendancePage, /canManageMonthPlan && \([\s\S]*?Chỉnh kế hoạch tháng/);
    assert.match(attendancePage, /canManageMonthPlan && monthPlanEditorMonth/);
  });

  it("disables calendar selection only while class data is loading or saving, not during week refresh", () => {
    assert.match(attendancePage, /const weekSelectionDisabled = Boolean\(loading \|\| saving\);/);
    assert.match(attendancePage, /const attendanceControlsDisabled = Boolean\(loading \|\| weekLoading \|\| saving\);/);
    assert.match(attendancePage, /disabled=\{weekSelectionDisabled\}/);
    assert.match(attendancePage, /aria-disabled=\{weekSelectionDisabled\}/);
  });

  it("guards manual loads and saves against stale editor contexts", () => {
    assert.match(monthPlanEditor, /requestContextRef/);
    assert.match(monthPlanEditor, /loadRequestRef/);
    assert.match(monthPlanEditor, /saveRequestRef/);
    assert.match(monthPlanEditor, /isCurrentRequest/);
    assert.match(attendancePage, /const attendanceContextRef/);
    assert.match(attendancePage, /const saveContext = \{/);
    assert.match(attendancePage, /if \(!isAttendanceContextCurrent\(saveContext\)\) return;/);
    assert.match(attendancePage, /loadClassData\(\s*saveContext\.classId/);
    assert.match(attendancePage, /loadWeekAttendance\(\s*saveContext\.classId,\s*saveContext\.week/);
  });

  it("allows a fully loaded month without a period to draft attendance and creates the open period before saving", () => {
    const readiness = readFileSync(
      new URL("../src/components/attendance/attendanceReadiness.js", import.meta.url),
      "utf8",
    );
    assert.match(readiness, /return !period \|\| period\.status === "open"/);
    assert.match(attendancePage, /if \(!savePeriods\[monthKey\]\) \{/);
    assert.match(attendancePage, /attendancePeriodsService\.create\(\{/);
    assert.match(attendancePage, /savePeriods\[monthKey\]\?\.status !== "open"/);
    assert.match(attendancePage, /if \(!isAttendanceContextCurrent\(saveContext\)\) return;/);
  });

  it("provides accessible names and state for mode, weekday, date, retry, and save controls", () => {
    assert.match(monthPlanEditor, /aria-label="Chọn lịch cố định"/);
    assert.match(monthPlanEditor, /aria-label=\{`Chọn ngày học \$\{formatSessionDate\(item\.date\)\}`\}/);
    assert.match(monthPlanEditor, /aria-live="polite"/);
    assert.match(monthPlanEditor, /aria-busy=\{status === "saving"/);
    assert.match(attendancePage, /role="status" aria-live="polite" aria-busy="true"/);
    assert.match(attendancePage, /role="alert"/);
  });

  it("does not let keyboard activation of nested controls select their calendar row", () => {
    const calendarRows = attendancePage.indexOf("calendar.map((week, wi)");
    const calendarKeyboardHandler = attendancePage.slice(
      attendancePage.indexOf("onKeyDown={(event) =>", calendarRows),
      attendancePage.indexOf("tabIndex={weekSelectionDisabled", calendarRows),
    );

    assert.match(calendarKeyboardHandler, /event\.target !== event\.currentTarget/);
  });

  it("counts the selected week's actual regular ledger sessions across month boundaries", () => {
    const weekLimitBranch = attendancePage.slice(
      attendancePage.indexOf("const weekSessionLimit"),
      attendancePage.indexOf("// Calculate fee summary per student"),
    );

    assert.match(weekLimitBranch, /selectedWeekLedgerSessions/);
    assert.match(weekLimitBranch, /session\.kind === "regular"/);
    assert.match(weekLimitBranch, /selectedWeekDateKeys\.has/);
    assert.doesNotMatch(weekLimitBranch, /activeFeeMonth/);
  });

  it("exposes each attendance cell's student, date, status, and pressed state", () => {
    assert.match(attendancePage, /aria-label=\{`Điểm danh \$\{student\.full_name\}, ngày \$\{dateStr\}, trạng thái \$\{attendanceStatusLabel\}`\}/);
    assert.match(attendancePage, /aria-pressed=\{Boolean\(status\)\}/);
  });

  it("guards button-driven month-plan changes on every modal close path", () => {
    assert.match(monthPlanEditor, /const hasUnsavedChanges = Boolean\(initialEditorSnapshot\)/);
    assert.match(monthPlanEditor, /hasUnsavedChanges=\{hasUnsavedChanges\}/);
    assert.match(monthPlanEditor, /data-modal-close/);
    assert.match(modal, /hasUnsavedChanges,/);
    assert.match(modal, /hasUnsavedChangesRef\.current/);
    assert.match(modal, /onClick=\{handleClose\}/);
    assert.match(modal, /if \(e\.key === 'Escape'\) \{[\s\S]*?handleClose\(\)/);
  });

  it("uses the edited weekday cadence and exposes exact fee and conflict previews", () => {
    assert.match(monthPlanEditor, /sessionsPerWeek: weekdays\.length/);
    assert.match(monthPlanEditor, /buildMonthPlanFeePreview/);
    assert.match(monthPlanEditor, /findMonthPlanDateConflicts/);
    assert.match(monthPlanEditor, /buildMonthPlanPatchRequest/);
    assert.match(monthPlanEditor, /classSessionsService\.patchMonthPlan/);
    assert.match(monthPlanEditor, /findMonthPlanDateConflicts\(plan\?\.sessions\)[\s\S]*?filter\(\(date\) => previewDates\.includes\(date\)\)/);
    assert.match(monthPlanEditor, /Học phí gói tháng/);
    assert.match(monthPlanEditor, /Thiếu chính sách hoặc mức học phí của lớp/);
    assert.match(monthPlanEditor, /Không thể lưu kế hoạch tháng/);
  });

  it("re-reads backend schedule authority before reporting a PATCH save as successful", () => {
    assert.match(monthPlanEditor, /await classSessionsService\.patchMonthPlan\(payload\)/);
    assert.match(monthPlanEditor, /await classSessionsService\.getMonthPlan\(classId, month,[\s\S]*?cache: "no-store"[\s\S]*?skipCache: true/);
    assert.match(monthPlanEditor, /matchesMonthPlanScheduleAuthority\([\s\S]*?setStatus\("success"\)/);
    assert.doesNotMatch(monthPlanEditor, /payload\.add_sessions\.length === 0[\s\S]*?setStatus\("success"\)/);
  });

  it("refreshes attendance state after a successful month-plan save", () => {
    assert.match(attendancePage, /onSaved=\{async \(\) => \{[\s\S]*?isAttendanceContextCurrent\(refreshContext\)[\s\S]*?await loadClassData\(refreshContext\.classId, refreshContext\.monthsWindow\);[\s\S]*?\}\}/);
  });
});
