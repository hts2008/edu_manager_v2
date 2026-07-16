import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { replaceBulkAttendanceRows } from "../server/api/attendance/bulk.js";
import {
  buildScheduleSnapshot,
  scheduleSnapshotFromRevision,
} from "../server/api/class-sessions/month-plan.js";
import { loadPersistedScheduleSnapshot } from "../lib/class-month-schedule-snapshot.js";
import {
  countMonthBoundedWeeklySessions,
  countScheduleDaysInMonth,
} from "../frontend/src/utils/dateKeys.js";
import { calculateTuitionSessionFee } from "../frontend/src/utils/tuitionV3.js";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const attendancePage = source("frontend/src/pages/AttendancePage.jsx");
const attendanceApi = source("server/api/attendance/index.ts");
const bulkAttendanceApi = source("server/api/attendance/bulk.ts");
const calculateFeeApi = source("server/api/attendance/calculate-fee.ts");
const monthPlanApi = source("server/api/class-sessions/month-plan.ts");
const scheduleSnapshotHelper = source("lib/class-month-schedule-snapshot.ts");
const attendancePeriodApi = source("server/api/attendance-periods/[id]/index.ts");
const attendanceLockHelper = source("lib/attendance-lock-transaction.ts");
const classesApi = source("server/api/classes/index.ts");
const enrollmentHelper = source("lib/enrollment.ts");
const teachersApi = source("server/api/teachers/index.ts");
const parentsApi = source("server/api/parents/index.ts");
const progressPanel = source("frontend/src/components/student-progress/ProgressInputPanel.jsx");
const dailyProgressEditor = source(
  "frontend/src/components/student-progress/DailyProgressEditor.jsx"
);
const progressReportApi = source("server/api/reports/student-progress.ts");
const classesPage = source("frontend/src/pages/ClassesPage.jsx");

function loadAttendancePlannedSessionResolver() {
  const start = attendancePage.indexOf("function resolvePlannedSessionsForMonth(");
  const end = attendancePage.indexOf("\n\nexport default function AttendancePage", start);
  assert.ok(start >= 0 && end > start, "AttendancePage must expose its month denominator resolver");
  const resolverSource = attendancePage.slice(start, end);
  return Function(
    "countScheduleDaysInMonth",
    "countMonthBoundedWeeklySessions",
    `${resolverSource}; return resolvePlannedSessionsForMonth;`,
  )(countScheduleDaysInMonth, countMonthBoundedWeeklySessions);
}

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
    assert.match(attendancePeriodApi, /lockAttendancePeriodAndSyncFees/);
    assert.match(attendanceLockHelper, /monthlyFeeLine\.createMany/);
    assert.match(attendanceLockHelper, /makeUpSessions/);
    assert.match(attendanceLockHelper, /teacherNameSnapshot/);
    assert.doesNotMatch(attendanceLockHelper, /syncMonthlyFeeLines/);
    assert.doesNotMatch(attendanceLockHelper, /refreshMonthlyFeeAggregateFromLines/);
  });

  it("shows explicit loading feedback while the class filter is loading", () => {
    assert.match(attendancePage, /import SelectField/);
    assert.match(attendancePage, /classListLoading/);
    assert.match(attendancePage, /Dang tai danh sach lop|Đang tải danh sách lớp/);
    assert.match(attendancePage, /state=\{classFilterState\}/);
    assert.match(attendancePage, /onRetry=\{loadClasses\}/);
  });

  it("calculates attendance fees from the authoritative month ledger", () => {
    assert.match(calculateFeeApi, /calculateStudentMonthlyFee/);
    assert.doesNotMatch(calculateFeeApi, /calculateTuitionForClass/);
    assert.doesNotMatch(calculateFeeApi, /sessionsPerWeek/);
  });

  it("keeps monthly-prorated denominators calendar-based while a month ledger is empty or partial", () => {
    const resolvePlannedSessionsForMonth = loadAttendancePlannedSessionResolver();
    const fixedWeekdaysClass = {
      billing_policy: "monthly_prorated",
      sessions_per_week: 2,
    };
    const mondayWednesday = [1, 3];
    const emptyLedgerDenominator = resolvePlannedSessionsForMonth({
      classSchedule: fixedWeekdaysClass,
      monthKey: "2026-06",
      scheduleDayNumbers: mondayWednesday,
      ledgerSessions: [],
    });

    assert.equal(
      calculateTuitionSessionFee({
        billingPolicy: "monthly_prorated",
        feeAmount: 900_000,
        plannedSessions: emptyLedgerDenominator,
      }),
      100_000,
      "an empty ledger with a known schedule must not render tuition as 0đ",
    );

    for (const ledgerCount of [0, 1, 8, 9]) {
      assert.equal(
        resolvePlannedSessionsForMonth({
          classSchedule: fixedWeekdaysClass,
          monthKey: "2026-06",
          scheduleDayNumbers: mondayWednesday,
          ledgerSessions: Array.from({ length: ledgerCount }, (_, index) => ({
            id: `june-${index}`,
            kind: "regular",
          })),
        }),
        9,
      );
    }

    assert.equal(
      resolvePlannedSessionsForMonth({
        classSchedule: fixedWeekdaysClass,
        monthKey: "2026-07",
        scheduleDayNumbers: mondayWednesday,
        ledgerSessions: [{ id: "july-week-one", kind: "regular" }],
      }),
      9,
      "a cross-month week must use July's own calendar denominator",
    );
  });

  it("uses month-bounded weekly cadence without changing legacy or per-session behavior", () => {
    const resolvePlannedSessionsForMonth = loadAttendancePlannedSessionResolver();
    const partialLedger = [
      { id: "regular-1", kind: "regular" },
      { id: "makeup-1", kind: "makeup" },
    ];

    assert.equal(
      resolvePlannedSessionsForMonth({
        classSchedule: {
          billing_policy: "monthly_prorated",
          sessions_per_week: 2,
        },
        monthKey: "2026-05",
        scheduleDayNumbers: [],
        ledgerSessions: partialLedger,
      }),
      10,
    );
    assert.equal(
      resolvePlannedSessionsForMonth({
        classSchedule: { billing_policy: "per_session", sessions_per_week: 2 },
        monthKey: "2026-05",
        scheduleDayNumbers: [],
        ledgerSessions: partialLedger,
      }),
      1,
    );
    assert.equal(
      resolvePlannedSessionsForMonth({
        classSchedule: { billing_policy: "monthly_prorated" },
        monthKey: "2026-05",
        scheduleDayNumbers: [],
        ledgerSessions: partialLedger,
      }),
      1,
    );
  });

  it("uses the persisted month-plan denominator after the current class schedule changes", () => {
    const resolvePlannedSessionsForMonth = loadAttendancePlannedSessionResolver();
    const persistedMonthPlan = { expected_regular_sessions: 10 };
    const partialLedger = [
      { id: "regular-1", kind: "regular" },
      { id: "makeup-1", kind: "makeup" },
    ];

    assert.equal(
      resolvePlannedSessionsForMonth({
        classSchedule: {
          billing_policy: "monthly_prorated",
          sessions_per_week: 3,
        },
        monthKey: "2026-05",
        scheduleDayNumbers: [1, 3, 5],
        ledgerSessions: partialLedger,
        monthPlan: persistedMonthPlan,
      }),
      10,
    );
    assert.equal(
      resolvePlannedSessionsForMonth({
        classSchedule: { billing_policy: "per_session", sessions_per_week: 3 },
        monthKey: "2026-05",
        scheduleDayNumbers: [1, 3, 5],
        ledgerSessions: partialLedger,
        monthPlan: persistedMonthPlan,
      }),
      1,
    );
  });

  it("persists and reads immutable schedule denominators in month-plan revision payloads", () => {
    assert.match(scheduleSnapshotHelper, /expectedSessionsForClass/);
    assert.match(scheduleSnapshotHelper, /classMonthPlanRevision\.findUnique/);
    assert.match(scheduleSnapshotHelper, /expected_regular_sessions/);
    assert.match(monthPlanApi, /class-month-schedule-snapshot/);
    assert.match(monthPlanApi, /resolveAuthoritativeRegularPlan/);
    assert.match(monthPlanApi, /version:\s*aggregate\?\.revision\s*\?\?\s*0/);

    assert.match(monthPlanApi, /buildScheduleSnapshot/);
    assert.match(attendanceApi, /scheduleSnapshotForWrite/);
    assert.match(bulkAttendanceApi, /scheduleSnapshotForWrite/);
    const singleSession = attendanceApi.indexOf(
      "const session = await tx.classSession.upsert",
    );
    const singleAttendance = attendanceApi.indexOf(
      "const attendance = await tx.attendance.upsert",
    );
    const singleSnapshot = attendanceApi.indexOf(
      "const scheduleSnapshot = await scheduleSnapshotForWrite",
    );
    const singleRevision = attendanceApi.indexOf(
      "await recordClassMonthPlanWrite",
    );
    assert.ok(singleSession >= 0);
    assert.ok(singleSession < singleAttendance);
    assert.ok(singleAttendance < singleSnapshot);
    assert.ok(singleSnapshot < singleRevision);

    const bulkReplace = bulkAttendanceApi.indexOf(
      "const { clearedDates } = await replaceBulkAttendanceRows",
    );
    const bulkReconcile = bulkAttendanceApi.indexOf(
      "await reconcileClearedAttendanceSessions",
    );
    const bulkSnapshot = bulkAttendanceApi.indexOf(
      "const scheduleSnapshot = await scheduleSnapshotForWrite",
    );
    const bulkRevision = bulkAttendanceApi.indexOf(
      "await recordClassMonthPlanWrite",
    );
    assert.ok(bulkReplace >= 0);
    assert.ok(bulkReplace < bulkReconcile);
    assert.ok(bulkReconcile < bulkSnapshot);
    assert.ok(bulkSnapshot < bulkRevision);

    assert.deepEqual(
      scheduleSnapshotFromRevision({
        payload: {
          schedule_days: [1, 3, 5],
          sessions_per_week: 3,
          expected_regular_sessions: 13,
        },
      }),
      {
        schedule_days: [1, 3, 5],
        sessions_per_week: 3,
        expected_regular_sessions: 13,
      },
    );
    assert.equal(
      buildScheduleSnapshot(
        { scheduleDays: [2, 4, 6], sessionsPerWeek: 3 },
        "2026-05",
      ).expected_regular_sessions,
      13,
    );
  });

  it("retains the latest valid denominator across later freeze and reopen revisions", async () => {
    const snapshot = await loadPersistedScheduleSnapshot(
      {
        classMonthPlanRevision: {
          findUnique: async () => ({
            snapshot: { payload: { attendance_period: "open" } },
          }),
          findMany: async () => [
            { snapshot: { payload: { attendance_period: "open" } } },
            {
              snapshot: {
                payload: {
                  schedule_days: [1, 3],
                  sessions_per_week: 2,
                  expected_regular_sessions: 9,
                },
              },
            },
          ],
        },
      },
      { id: "plan-1", revision: 3 },
    );

    assert.deepEqual(snapshot, {
      schedule_days: [1, 3],
      sessions_per_week: 2,
      expected_regular_sessions: 9,
    });
  });

  it("queries an attendance month as a UTC half-open range", () => {
    const monthBranch = attendanceApi.slice(
      attendanceApi.indexOf("if (month)"),
      attendanceApi.indexOf("const records = await prisma.attendance.findMany"),
    );
    assert.match(monthBranch, /Date\.UTC\(/);
    assert.match(monthBranch, /const nextMonthStart\s*=\s*new Date\(Date\.UTC\(/);
    assert.match(monthBranch, /attendanceDate\s*=\s*\{\s*gte:\s*startDate,\s*lt:\s*nextMonthStart\s*\}/);
    assert.doesNotMatch(monthBranch, /\blte\s*:/);
  });

  it("preserves historical attendance for a departed and re-enrolled student omitted from the replacement payload", async () => {
    const attendanceDate = new Date("2026-07-06T00:00:00.000Z");
    const rows = [
      {
        studentId: "student-departed-reenrolled",
        classId: "class-1",
        attendanceDate,
        status: "present",
      },
      {
        studentId: "student-active",
        classId: "class-1",
        attendanceDate,
        status: "absent_no_fee",
      },
    ];
    const tx = {
      attendance: {
        deleteMany: async ({ where }: any) => {
          const scopedCells = new Set(
            where.OR.map(
              (cell: any) =>
                `${cell.studentId}:${cell.attendanceDate.toISOString()}`,
            ),
          );
          let deleted = 0;
          for (let index = rows.length - 1; index >= 0; index -= 1) {
            const row = rows[index];
            if (
              row.classId === where.classId &&
              scopedCells.has(`${row.studentId}:${row.attendanceDate.toISOString()}`)
            ) {
              rows.splice(index, 1);
              deleted += 1;
            }
          }
          return { count: deleted };
        },
        createMany: async ({ data }: any) => {
          rows.push(...data);
          return { count: data.length };
        },
        findMany: async () => [],
      },
    };

    await replaceBulkAttendanceRows(tx, {
      classId: "class-1",
      dateObjects: [attendanceDate],
      validRecords: [
        {
          studentId: "student-active",
          classId: "class-1",
          attendanceDate,
          status: "present",
        },
      ],
      replacementScope: [
        { studentId: "student-active", attendanceDate },
      ],
      sessionIdsByDate: new Map([["2026-07-06", "session-1"]]),
    });

    assert.equal(rows.length, 2);
    assert.equal(
      rows.find((row) => row.studentId === "student-departed-reenrolled")?.status,
      "present",
    );
    assert.equal(
      rows.find((row) => row.studentId === "student-active")?.status,
      "present",
    );
  });

  it("does not mutate attendance when the bulk replacement payload is empty", async () => {
    const failOnCall = async () => {
      assert.fail("empty attendance payload must not call persistence methods");
    };
    const tx = {
      attendance: {
        deleteMany: failOnCall,
        createMany: failOnCall,
        findMany: failOnCall,
      },
    };

    const result = await replaceBulkAttendanceRows(tx, {
      classId: "class-1",
      dateObjects: [new Date("2026-07-06T00:00:00.000Z")],
      validRecords: [],
      sessionIdsByDate: new Map(),
    });

    assert.deepEqual(result, { clearedDates: [] });
    const emptyPayloadGuardIndex = bulkAttendanceApi.indexOf(
      "recordsArray.length === 0 &&",
    );
    const transactionIndex = bulkAttendanceApi.indexOf(
      "runSerializableTransaction(prisma,",
    );
    assert.ok(emptyPayloadGuardIndex >= 0);
    assert.ok(emptyPayloadGuardIndex < transactionIndex);
  });

  it("clears every explicitly scoped cell even when no replacement row remains", async () => {
    const attendanceDate = new Date("2026-07-06T00:00:00.000Z");
    const rows = [{
      studentId: "student-active",
      classId: "class-1",
      attendanceDate,
      status: "present",
    }];
    const tx = {
      attendance: {
        deleteMany: async ({ where }: any) => {
          const keys = new Set(
            where.OR.map(
              (cell: any) => `${cell.studentId}:${cell.attendanceDate.toISOString()}`,
            ),
          );
          for (let index = rows.length - 1; index >= 0; index -= 1) {
            const row = rows[index];
            if (keys.has(`${row.studentId}:${row.attendanceDate.toISOString()}`)) {
              rows.splice(index, 1);
            }
          }
          return { count: 1 };
        },
        createMany: async () => assert.fail("clear-all must not insert rows"),
        findMany: async () => [],
      },
    };

    const result = await replaceBulkAttendanceRows(tx, {
      classId: "class-1",
      dateObjects: [attendanceDate],
      validRecords: [],
      replacementScope: [{ studentId: "student-active", attendanceDate }],
      sessionIdsByDate: new Map(),
    });

    assert.equal(rows.length, 0);
    assert.deepEqual(result, { clearedDates: [attendanceDate] });
  });

  it("does not accept an invalid replacement scope as a successful empty write", () => {
    assert.match(
      bulkAttendanceApi,
      /replacement_scope === undefined[\s\S]*Array\.isArray\(replacement_scope\)/,
    );
    assert.doesNotMatch(
      bulkAttendanceApi,
      /!Array\.isArray\(replacement_scope\) \|\| replacement_scope\.length === 0/,
    );
  });

  it("serializes submit and approve with roster, schedule, and fee writers", () => {
    for (const action of ["case \"submit\"", "case \"approve\""]) {
      const start = attendancePeriodApi.indexOf(action);
      const nextCase = attendancePeriodApi.indexOf("case \"", start + action.length);
      const branch = attendancePeriodApi.slice(
        start,
        nextCase === -1 ? attendancePeriodApi.length : nextCase,
      );
      assert.ok(
        branch.indexOf("acquireClassMonthRosterAdvisoryLocks") <
          branch.indexOf("getAttendancePeriodReadiness"),
      );
    }
  });

  it("locks monthly fee changes once attendance or the class-month plan is protected", () => {
    const impactFields = classesApi.slice(
      classesApi.indexOf("CLASS_MONTH_ROSTER_IMPACT_FIELDS"),
      classesApi.indexOf("export function hasClassMonthRosterImpact"),
    );
    assert.match(impactFields, /"fee_per_day"/);
    assert.match(
      classesApi,
      /await assertClassDefinitionWritable\(tx, \[id\]\)/,
    );
  });

  it("keeps class editing enrollment-neutral unless the operator changes the roster", () => {
    assert.match(classesApi, /const hasEnrollmentMutation\s*=\s*body\.student_ids !== undefined/);
    assert.match(classesApi, /if \(hasEnrollmentMutation\) \{\s*assertHistoricalEnrollmentAllowed/);
    assert.match(classesPage, /const effectiveDate = defaultEnrollmentDate/);
    assert.match(
      classesPage,
      /const addedStudentIds = selectedStudentIds\.filter/,
    );
    assert.match(classesPage, /const hasRosterAdditions = addedStudentIds\.length > 0/);
    assert.match(classesPage, /if \(hasRosterAdditions \|\| formData\.adjust_existing_enrollment_start\)/);
    assert.match(classesPage, /payload = Object\.fromEntries/);
  });
});

describe("archive delete regressions", () => {
  it("archives classes and hides inactive classes by default instead of hard-blocking delete", () => {
    assert.match(classesApi, /status && status !== "all"/);
    assert.match(classesApi, /where\.status = "active"/);
    assert.match(classesApi, /deactivateEnrollmentPeriods/);
    assert.match(enrollmentHelper, /tx\.studentClass\.updateMany/);
    assert.match(enrollmentHelper, /tx\.enrollmentPeriod\.updateMany/);
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
    assert.match(progressPanel, /DailyProgressEditor/);
    assert.match(dailyProgressEditor, /attendanceDates/);
    assert.match(dailyProgressEditor, /onDateChange\(date\)/);
    assert.match(progressPanel, /Theo ngày điểm danh|Theo ngay diem danh/);
  });
});
