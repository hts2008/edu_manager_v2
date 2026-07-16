import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  isStudentEligibleOnDate,
  resolveEnrollmentCorrection,
  resolveEnrollmentCorrectionStudents,
  validateEnrollmentCorrectionResult,
} from "../frontend/src/utils/attendanceEnrollmentCorrection.js";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const attendancePage = source("frontend/src/pages/AttendancePage.jsx");
const enrollmentCorrectionModal = source(
  "frontend/src/components/attendance/AttendanceEnrollmentCorrectionModal.jsx",
);
const classesPage = source("frontend/src/pages/ClassesPage.jsx");
const attendanceApi = source("server/api/attendance/index.ts");
const classesApi = source("server/api/classes/index.ts");

describe("historical attendance UI and schedule guards", () => {
  it("anchors enrollment correction to the first regular class session, not the calendar row start", () => {
    const correction = resolveEnrollmentCorrection({
      weekDates: [
        { dateStr: "2026-07-13", isScheduleDay: true },
        { dateStr: "2026-07-14", isScheduleDay: true },
        { dateStr: "2026-07-15", isScheduleDay: true },
        { dateStr: "2026-07-17", isScheduleDay: true },
      ],
      ledgerSessions: [
        { date: "2026-07-15", kind: "regular", status: "held" },
        { date: "2026-07-17", kind: "regular", status: "planned" },
      ],
      students: [
        {
          id: "eligible-from-first-session",
          enrollment_status: "active",
          enrollment_date: "2026-07-15",
          enrollment_periods: [
            { started_at: "2026-07-15", ended_at: null },
          ],
        },
        {
          id: "starts-after-first-session",
          enrollment_status: "active",
          enrollment_date: "2026-07-16",
          enrollment_periods: [
            { started_at: "2026-07-16", ended_at: null },
          ],
        },
      ],
    });

    assert.equal(correction.effectiveDate, "2026-07-15");
    assert.equal(correction.suggestedEffectiveDate, "2026-07-15");
    assert.equal(correction.effectiveDateSource, "ledger");
    assert.deepEqual(
      correction.students.map((student) => student.id),
      ["starts-after-first-session"],
    );
  });

  it("offers an explicit admin-confirmed correction date without treating makeup or cancelled sessions as authoritative", () => {
    const weekDates = [
      { dateStr: "2026-07-13", isScheduleDay: true },
      { dateStr: "2026-07-14", isScheduleDay: true },
      { dateStr: "2026-07-15", isScheduleDay: true },
    ];
    const students = [
      {
        id: "future-enrollment",
        enrollment_status: "active",
        enrollment_date: "2026-07-20",
        enrollment_periods: [{ started_at: "2026-07-20", ended_at: null }],
      },
    ];

    const correction = resolveEnrollmentCorrection({
      weekDates,
      students,
      ledgerSessions: [
        { date: "2026-07-14", kind: "makeup", status: "held" },
        { date: "2026-07-15", kind: "regular", status: "cancelled" },
      ],
    });

    assert.equal(correction.effectiveDate, "");
    assert.equal(correction.suggestedEffectiveDate, "2026-07-13");
    assert.equal(correction.effectiveDateSource, "week_selection");
    assert.deepEqual(correction.students.map((student) => student.id), [
      "future-enrollment",
    ]);
  });

  it("keeps the correction action available when a historical week has no session ledger yet", () => {
    const correction = resolveEnrollmentCorrection({
      weekDates: [
        { dateStr: "2026-06-01", isScheduleDay: true },
        { dateStr: "2026-06-02", isScheduleDay: false },
      ],
      ledgerSessions: [],
      students: [
        {
          id: "future-enrollment",
          enrollment_status: "active",
          enrollment_date: "2026-07-15",
          enrollment_periods: [{ started_at: "2026-07-15", ended_at: null }],
        },
      ],
    });

    assert.equal(correction.effectiveDate, "");
    assert.equal(correction.suggestedEffectiveDate, "2026-06-01");
    assert.equal(correction.effectiveDateSource, "week_selection");
    assert.deepEqual(correction.students.map((student) => student.id), [
      "future-enrollment",
    ]);
  });

  it("recomputes the correction cohort when the admin changes the effective date", () => {
    const students = [
      {
        id: "starts-june-03",
        enrollment_status: "active",
        enrollment_periods: [{ started_at: "2026-06-03", ended_at: null }],
      },
      {
        id: "starts-july-15",
        enrollment_status: "active",
        enrollment_periods: [{ started_at: "2026-07-15", ended_at: null }],
      },
    ];

    assert.deepEqual(
      resolveEnrollmentCorrectionStudents(students, "2026-06-01").map(
        (student) => student.id,
      ),
      ["starts-june-03", "starts-july-15"],
    );
    assert.deepEqual(
      resolveEnrollmentCorrectionStudents(students, "2026-06-04").map(
        (student) => student.id,
      ),
      ["starts-july-15"],
    );
  });

  it("keeps the correction action visible when the suggested date has no affected students but a later week date does", () => {
    const correction = resolveEnrollmentCorrection({
      weekDates: [
        { dateStr: "2026-06-01", isScheduleDay: true },
        { dateStr: "2026-06-04", isScheduleDay: true },
      ],
      ledgerSessions: [],
      students: [
        {
          id: "re-enrolled",
          enrollment_status: "active",
          enrollment_periods: [
            { started_at: "2026-06-01", ended_at: "2026-06-03" },
            { started_at: "2026-07-15", ended_at: null },
          ],
        },
      ],
    });

    assert.equal(correction.suggestedEffectiveDate, "2026-06-01");
    assert.deepEqual(correction.students.map((student) => student.id), [
      "re-enrolled",
    ]);
  });

  it("wires the selected weeks authoritative sessions into enrollment correction", () => {
    assert.match(attendancePage, /selectedWeekLedgerSessions/);
    assert.match(
      attendancePage,
      /ledgerSessions:\s*selectedWeekLedgerSessions/,
    );
  });

  it("rejects partial or no-op enrollment correction responses", () => {
    assert.deepEqual(
      validateEnrollmentCorrectionResult(
        { adjusted: 2, skipped: 0 },
        2,
      ),
      { complete: true, adjusted: 2, skipped: 0 },
    );
    assert.deepEqual(
      validateEnrollmentCorrectionResult(
        { adjusted: 1, skipped: 1 },
        2,
      ),
      { complete: false, adjusted: 1, skipped: 1 },
    );
  });

  it("uses the shared focus-safe modal for enrollment corrections", () => {
    assert.match(enrollmentCorrectionModal, /import Modal from "\.\.\/ui\/Modal"/);
    assert.match(enrollmentCorrectionModal, /<Modal/);
    assert.match(enrollmentCorrectionModal, /confirmOnClose/);
    assert.match(enrollmentCorrectionModal, /type="date"/);
    assert.match(enrollmentCorrectionModal, /min=\{minDate\}/);
    assert.match(enrollmentCorrectionModal, /max=\{maxDate\}/);
    assert.match(enrollmentCorrectionModal, /onConfirm\(\{[\s\S]*effectiveDate:\s*correctionDate,/);
    assert.match(enrollmentCorrectionModal, /studentIds:\s*affectedStudents\.map/);
  });

  it("asks for an audit reason when creating a class with historical enrollment", () => {
    assert.match(
      classesPage,
      /\{\(classData \|\| requiresBackdateReason\) && \(/,
    );
    assert.match(classesPage, /Lý do ghi danh hồi tố \*/);
    assert.match(classesPage, /enrollment_backdate_reason/);
  });

  it("uses authoritative half-open enrollment periods in the attendance grid", () => {
    const student = {
      enrollment_status: "active",
      enrollment_date: "2026-06-01",
      enrollment_periods: [
        { started_at: "2026-06-10", ended_at: "2026-06-20" },
      ],
    };
    assert.equal(isStudentEligibleOnDate(student, "2026-06-09"), false);
    assert.equal(isStudentEligibleOnDate(student, "2026-06-10"), true);
    assert.equal(isStudentEligibleOnDate(student, "2026-06-19"), true);
    assert.equal(isStudentEligibleOnDate(student, "2026-06-20"), false);
  });

  it("exposes every calendar week as an explicit past or future selection target", () => {
    assert.match(attendancePage, /aria-label=\{`Chọn tuần \$\{formatWeekRangeLabel\(weekRange\)\}`\}/);
    assert.match(
      attendancePage,
      /tabIndex=\{attendanceControlsDisabled \? -1 : 0\}/,
    );
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
    assert.match(attendancePage, /suggestedEffectiveDate/);
    assert.match(attendancePage, /handleEnrollmentCorrection = async \(\{ effectiveDate, reason \}\)/);
    assert.match(attendancePage, /resolveEnrollmentCorrectionStudents\(students, effectiveDate\)/);
    assert.match(attendancePage, /minDate=\{enrollmentCorrectionMinDate\}/);
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
