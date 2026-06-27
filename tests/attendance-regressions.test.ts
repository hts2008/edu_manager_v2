import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const attendancePage = source("frontend/src/pages/AttendancePage.jsx");
const attendancePeriodApi = source("server/api/attendance-periods/[id]/index.ts");
const classesApi = source("server/api/classes/index.ts");
const teachersApi = source("server/api/teachers/index.ts");
const parentsApi = source("server/api/parents/index.ts");
const progressPanel = source("frontend/src/components/student-progress/ProgressInputPanel.jsx");
const progressReportApi = source("server/api/reports/student-progress.ts");

describe("attendance workflow regressions", () => {
  it("selects the exact visible calendar row instead of remapping Sunday rows to the previous Monday week", () => {
    assert.match(attendancePage, /function getCalendarRowWeekRange\(weekStart,\s*weekEnd\)/);
    assert.match(attendancePage, /handleWeekClick\(weekStart,\s*weekEnd\)/);
    assert.doesNotMatch(
      attendancePage,
      /const weekRange = weekStart\s*\?\s*getAttendanceWeekRange\(weekStart\)/
    );
  });

  it("creates class-level monthly fee lines when locking an approved attendance period", () => {
    assert.match(attendancePeriodApi, /syncMonthlyFeeLines/);
    assert.match(attendancePeriodApi, /refreshMonthlyFeeAggregateFromLines/);
    assert.match(attendancePeriodApi, /makeUpSessions/);
    assert.match(attendancePeriodApi, /teacherNameSnapshot|teacher_name/);
  });

  it("shows explicit loading feedback while the class filter is loading", () => {
    assert.match(attendancePage, /classFilterLoading/);
    assert.match(attendancePage, /Dang tai danh sach lop|Đang tải danh sách lớp/);
    assert.match(attendancePage, /disabled=\{classFilterLoading\}/);
  });
});

describe("archive delete regressions", () => {
  it("archives classes and hides inactive classes by default instead of hard-blocking delete", () => {
    assert.match(classesApi, /status && status !== "all"/);
    assert.match(classesApi, /where\.status = "active"/);
    assert.match(classesApi, /tx\.studentClass\.updateMany/);
    assert.match(classesApi, /tx\.class\.update/);
    assert.doesNotMatch(classesApi, /Cannot delete class with enrolled students/);
    assert.doesNotMatch(classesApi, /prisma\.class\.delete/);
  });

  it("archives teachers and unassigns classes instead of hard-blocking delete", () => {
    assert.match(teachersApi, /status && status !== "all"/);
    assert.match(teachersApi, /where\.status = "active"/);
    assert.match(teachersApi, /tx\.class\.updateMany/);
    assert.match(teachersApi, /tx\.teacher\.update/);
    assert.doesNotMatch(teachersApi, /Cannot delete teacher with assigned classes/);
    assert.doesNotMatch(teachersApi, /prisma\.teacher\.delete/);
  });

  it("soft-deletes parents without blocking on existing children because Student.parentId is required", () => {
    assert.match(parentsApi, /data:\s*\{\s*deletedAt:\s*new Date\(\)\s*\}/);
    assert.doesNotMatch(parentsApi, /Cannot delete parent with registered children/);
  });
});

describe("student progress daily entry regressions", () => {
  it("exposes attendance dates in the progress report and lets teachers add daily entries from attendance days", () => {
    assert.match(progressReportApi, /attendance_dates/);
    assert.match(progressPanel, /attendanceDates/);
    assert.match(progressPanel, /addEntryForDate/);
    assert.match(progressPanel, /Theo ngày điểm danh|Theo ngay diem danh/);
  });
});
