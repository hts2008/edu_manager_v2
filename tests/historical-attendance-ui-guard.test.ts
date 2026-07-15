import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const attendancePage = source("frontend/src/pages/AttendancePage.jsx");
const classesPage = source("frontend/src/pages/ClassesPage.jsx");
const attendanceApi = source("server/api/attendance/index.ts");
const classesApi = source("server/api/classes/index.ts");

describe("historical attendance UI and schedule guards", () => {
  it("asks for an audit reason when creating a class with historical enrollment", () => {
    assert.match(
      classesPage,
      /\{\(classData \|\| requiresBackdateReason\) && \(/,
    );
    assert.match(classesPage, /Lý do ghi danh hồi tố \*/);
    assert.match(classesPage, /enrollment_backdate_reason/);
  });

  it("uses authoritative half-open enrollment periods in the attendance grid", () => {
    assert.match(attendancePage, /Array\.isArray\(periods\) && periods\.length > 0/);
    assert.match(attendancePage, /period\.started_at <= dateStr/);
    assert.match(attendancePage, /dateStr < period\.ended_at/);
    assert.match(
      attendancePage,
      /student\?\.enrollment_status && student\.enrollment_status !== "active"/,
    );
  });

  it("exposes every calendar week as an explicit past or future selection target", () => {
    assert.match(attendancePage, /aria-label=\{`Chọn tuần \$\{formatWeekRangeLabel\(weekRange\)\}`\}/);
    assert.match(attendancePage, /tabIndex=\{0\}/);
    assert.match(attendancePage, /onKeyDown=\{\(event\) =>/);

    const weekClickBranch = attendancePage.slice(
      attendancePage.indexOf("const handleWeekClick"),
      attendancePage.indexOf("const handleCellClick"),
    );
    assert.doesNotMatch(weekClickBranch, /today|new Date\(\)/);
  });

  it("lets an admin backdate enrollment with an audited reason instead of writing outside enrollment", () => {
    assert.match(attendancePage, /adjust_existing_enrollment_start: true/);
    assert.match(attendancePage, /enrollment_backdate_reason:/);
    assert.match(attendancePage, /classesService\.update\(/);
    assert.match(attendancePage, /Hiệu chỉnh ngày ghi danh/);
    assert.match(attendancePage, /isAdmin\(\)/);
    assert.match(attendancePage, /period\.status !== "open"/);
  });

  it("does not create a period or ledger scope when no student is eligible", () => {
    const saveBranch = attendancePage.slice(
      attendancePage.indexOf("const handleSave"),
      attendancePage.indexOf("const handleSubmit"),
    );
    assert.match(saveBranch, /eligibleDates\.length === 0/);
    assert.match(saveBranch, /if \(!eligibleMonthKeys\.has\(monthKey\)\) continue/);
    assert.match(saveBranch, /const allDates = eligibleDates\.map/);
    assert.match(saveBranch, /replacementScope\.push/);
    assert.match(saveBranch, /attendanceService\.bulkCreate\([\s\S]*replacementScope/);

    const submitBranch = attendancePage.slice(
      attendancePage.indexOf("const handleSubmit"),
      attendancePage.indexOf("const handleApprove"),
    );
    assert.match(submitBranch, /isStudentEligibleInMonth/);
    assert.match(submitBranch, /Không thể tạo hoặc nộp kỳ điểm danh/);
  });

  it("reads the class schedule only after acquiring the class-month lock", () => {
    const transactionStart = attendanceApi.indexOf(
      "const record = await runSerializableTransaction",
    );
    const transactionBranch = attendanceApi.slice(
      transactionStart,
      attendanceApi.indexOf("assertAttendanceDatesEditable", transactionStart),
    );
    assert.ok(
      transactionBranch.indexOf("acquireClassMonthRosterAdvisoryLocks") <
        transactionBranch.indexOf("tx.class.findUnique"),
    );
    assert.match(transactionBranch, /resolveAttendanceSessionPolicy/);
  });

  it("connects immutable enrollment history to the class detail response", () => {
    const classDetailBranch = classesApi.slice(
      classesApi.indexOf("const classData = await prisma.class.findUnique"),
      classesApi.indexOf("// List all classes"),
    );
    assert.match(classDetailBranch, /enrollmentPeriods:/);
    assert.match(classDetailBranch, /buildHistoricalClassRoster\(/);
    assert.doesNotMatch(
      classDetailBranch,
      /studentClasses:\s*\{\s*where:\s*\{\s*status:\s*"active"/,
    );
  });
});
