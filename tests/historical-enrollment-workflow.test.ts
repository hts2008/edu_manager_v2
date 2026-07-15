import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { assertAttendanceWriteEnrollment } from "../lib/attendance-enrollment-guard.js";
import * as validation from "../lib/validation.js";
import {
  buildHistoricalClassRoster,
  enrollStudentsInClass,
  resolveEnrollmentEffectiveAt,
} from "../server/api/classes/index.js";

const { classCreateSchema, classUpdateSchema } = validation;
const classesApiSource = readFileSync(
  new URL("../server/api/classes/index.ts", import.meta.url),
  "utf8",
);

type StudentClassRow = {
  id: string;
  studentId: string;
  classId: string;
  status: string;
  enrollmentDate: Date;
};

type EnrollmentPeriodRow = {
  id: string;
  studentId: string;
  classId: string;
  startedAt: Date;
  endedAt: Date | null;
  source: string;
};

type AttendanceRecord = { studentId: string; attendanceDate: Date };

type HarnessInput = {
  classId?: string;
  studentIds?: string[];
  studentClasses?: StudentClassRow[];
  enrollmentPeriods?: EnrollmentPeriodRow[];
};

function createEnrollmentHarness(input: HarnessInput = {}) {
  const classId = input.classId || "class-historical";
  const studentIds = input.studentIds || ["student-1"];
  const studentClasses = [...(input.studentClasses || [])];
  const enrollmentPeriods = [...(input.enrollmentPeriods || [])];
  const mutations: Array<{ op: string; args: any }> = [];

  const tx: any = {
    class: {
      findUnique: async () => ({ id: classId, maxStudents: 20 }),
    },
    student: {
      findMany: async ({ where }: any) => studentIds.filter(
        (studentId) => where.id.in.includes(studentId),
      ).map((id) => ({ id })),
    },
    studentClass: {
      findMany: async ({ where }: any) => studentClasses.filter((row) => (
        row.classId === where.classId && where.studentId.in.includes(row.studentId)
      )).map((row) => ({ ...row, student: { status: "active" } })),
      count: async ({ where }: any) => studentClasses.filter((row) => (
        row.classId === where.classId && row.status === where.status
      )).length,
      createMany: async (args: any) => {
        for (const data of args.data) {
          studentClasses.push({
            id: `student-class-${studentClasses.length + 1}`,
            ...data,
          });
        }
        mutations.push({ op: "studentClass.createMany", args });
        return { count: args.data.length };
      },
      updateMany: async (args: any) => {
        const selectedIds = args.where.studentId?.in || [];
        let count = 0;
        for (const row of studentClasses) {
          const matches = row.classId === args.where.classId && selectedIds.includes(row.studentId) &&
            (!args.where.status || row.status === args.where.status) &&
            (!args.where.enrollmentDate?.gt || row.enrollmentDate > args.where.enrollmentDate.gt);
          if (!matches) continue;
          Object.assign(row, args.data);
          count += 1;
        }
        mutations.push({ op: "studentClass.updateMany", args });
        return { count };
      },
    },
    enrollmentPeriod: {
      findMany: async ({ where }: any) => enrollmentPeriods.filter((row) => {
        const matchesStudent = !where.studentId?.in || where.studentId.in.includes(row.studentId);
        const matchesOpen = !("endedAt" in where) || row.endedAt === where.endedAt;
        return row.classId === where.classId && matchesStudent && matchesOpen;
      }),
      findFirst: async () => null,
      createMany: async (args: any) => {
        for (const data of args.data) {
          enrollmentPeriods.push({
            id: `enrollment-period-${enrollmentPeriods.length + 1}`,
            endedAt: null,
            ...data,
          });
        }
        mutations.push({ op: "enrollmentPeriod.createMany", args });
        return { count: args.data.length };
      },
      updateMany: async (args: any) => {
        const selectedIds = args.where.id?.in || [];
        let count = 0;
        for (const row of enrollmentPeriods) {
          const matches = selectedIds.includes(row.id) &&
            (!args.where.startedAt?.gt || row.startedAt > args.where.startedAt.gt);
          if (!matches) continue;
          Object.assign(row, args.data);
          count += 1;
        }
        mutations.push({ op: "enrollmentPeriod.updateMany", args });
        return { count };
      },
    },
    activityLog: {
      createMany: async (args: any) => {
        mutations.push({ op: "activityLog.createMany", args });
        return { count: args.data.length };
      },
    },
  };

  return { classId, enrollmentPeriods, mutations, studentClasses, tx };
}

async function writeAttendance(tx: any, classId: string, record: AttendanceRecord, writes: AttendanceRecord[]) {
  await assertAttendanceWriteEnrollment(tx, { classId, records: [record] });
  writes.push(record);
}

function assertErrorCode(error: unknown, code: string) {
  assert.equal((error as { code?: string }).code, code);
  return true;
}

describe("historical enrollment workflow", () => {
  it("does not inject enrollment or class defaults into a partial class update", () => {
    assert.deepEqual(classUpdateSchema.parse({ class_name: "Renamed class" }), {
      class_name: "Renamed class",
    });
  });
  it("returns all immutable periods for departed and re-enrolled students", () => {
    const student = {
      id: "student-1",
      fullName: "Learner One",
      dateOfBirth: null,
      gender: "other",
      phone: null,
      parentId: null,
    };
    const roster = buildHistoricalClassRoster(
      [{
        studentId: student.id,
        status: "active",
        enrollmentDate: new Date("2026-07-01T00:00:00.000Z"),
        student,
      }],
      [
        {
          studentId: student.id,
          startedAt: new Date("2026-05-01T00:00:00.000Z"),
          endedAt: new Date("2026-06-01T00:00:00.000Z"),
          student,
        },
        {
          studentId: student.id,
          startedAt: new Date("2026-07-01T00:00:00.000Z"),
          endedAt: null,
          student,
        },
      ],
    );

    assert.deepEqual(roster[0].enrollment_periods, [
      { started_at: "2026-05-01", ended_at: "2026-06-01" },
      { started_at: "2026-07-01", ended_at: null },
    ]);
  });
  it("creates enrollment at an explicit historical date and permits attendance inside it", async () => {
    const payload = classCreateSchema.parse({
      class_name: "Historical English",
      start_time: "18:00",
      end_time: "19:30",
      fee_per_day: 900_000,
      student_ids: ["student-1"],
      enrollment_effective_date: "2026-06-01",
    });
    const effectiveAt = resolveEnrollmentEffectiveAt(
      payload.enrollment_effective_date,
      new Date("2026-07-14T00:00:00.000Z"),
    );
    const harness = createEnrollmentHarness();
    const attendanceWrites: AttendanceRecord[] = [];

    const result = await enrollStudentsInClass(
      harness.tx, harness.classId, payload.student_ids, effectiveAt,
      {
        actorId: "admin-1",
        actorRole: "admin",
        backdateReason: "Imported June enrollment",
      },
    );
    await writeAttendance(
      harness.tx,
      harness.classId,
      { studentId: "student-1", attendanceDate: new Date("2026-06-15T00:00:00.000Z") },
      attendanceWrites,
    );

    assert.deepEqual(result, {
      requested: 1,
      enrolled: 1,
      reactivated: 0,
      adjusted: 0,
      skipped: 0,
    });
    assert.equal(harness.studentClasses[0].enrollmentDate.toISOString(), "2026-06-01T00:00:00.000Z");
    assert.equal(harness.enrollmentPeriods[0].startedAt.toISOString(), "2026-06-01T00:00:00.000Z");
    assert.equal(attendanceWrites.length, 1);
  });

  it("rejects attendance before enrollment starts without reaching mutation", async () => {
    const harness = createEnrollmentHarness({
      studentClasses: [{
        id: "student-class-1",
        studentId: "student-1",
        classId: "class-historical",
        status: "active",
        enrollmentDate: new Date("2026-06-01T00:00:00.000Z"),
      }],
      enrollmentPeriods: [{
        id: "enrollment-period-1",
        studentId: "student-1",
        classId: "class-historical",
        startedAt: new Date("2026-06-01T00:00:00.000Z"),
        endedAt: null,
        source: "class_bulk_enroll",
      }],
    });
    const attendanceWrites: AttendanceRecord[] = [];
    const mutationsBeforeWrite = harness.mutations.length;

    await assert.rejects(
      writeAttendance(
        harness.tx,
        harness.classId,
        { studentId: "student-1", attendanceDate: new Date("2026-05-31T00:00:00.000Z") },
        attendanceWrites,
      ),
      (error) => assertErrorCode(error, "ATTENDANCE_OUTSIDE_ENROLLMENT"),
    );

    assert.equal(attendanceWrites.length, 0);
    assert.equal(harness.mutations.length, mutationsBeforeWrite);
  });

  it("requires an explicit reason before correcting an existing enrollment start", async () => {
    const harness = createEnrollmentHarness({
      studentClasses: [{
        id: "student-class-1",
        studentId: "student-1",
        classId: "class-historical",
        status: "active",
        enrollmentDate: new Date("2026-07-14T00:00:00.000Z"),
      }],
      enrollmentPeriods: [{
        id: "enrollment-period-1",
        studentId: "student-1",
        classId: "class-historical",
        startedAt: new Date("2026-07-14T00:00:00.000Z"),
        endedAt: null,
        source: "class_bulk_enroll",
      }],
    });
    const correctedStart = new Date("2026-06-01T00:00:00.000Z");

    await assert.rejects(
      enrollStudentsInClass(
        harness.tx,
        harness.classId,
        ["student-1"],
        correctedStart,
        {
          adjustExistingEnrollmentStart: true,
          actorId: "admin-1",
          actorRole: "admin",
        },
      ),
      (error) => assertErrorCode(error, "BACKDATE_REASON_REQUIRED"),
    );
    assert.equal(harness.mutations.length, 0);

    const result = await enrollStudentsInClass(
      harness.tx, harness.classId, ["student-1"], correctedStart,
      {
        adjustExistingEnrollmentStart: true,
        backdateReason: "Imported signed June attendance register",
        actorId: "admin-1",
        actorRole: "admin",
      },
    );

    assert.equal(result.adjusted, 1);
    assert.equal(harness.studentClasses[0].enrollmentDate.toISOString(), correctedStart.toISOString());
    assert.equal(harness.enrollmentPeriods[0].startedAt.toISOString(), correctedStart.toISOString());
    assert.equal(harness.enrollmentPeriods[0].source, "class_bulk_backdate");
  });

  it("keeps actor, reason, before, and after in the correction audit", async () => {
    const harness = createEnrollmentHarness({
      studentClasses: [{
        id: "student-class-1",
        studentId: "student-1",
        classId: "class-historical",
        status: "active",
        enrollmentDate: new Date("2026-07-14T00:00:00.000Z"),
      }],
      enrollmentPeriods: [{
        id: "enrollment-period-1",
        studentId: "student-1",
        classId: "class-historical",
        startedAt: new Date("2026-07-14T00:00:00.000Z"),
        endedAt: null,
        source: "class_bulk_enroll",
      }],
    });
    const reason = "Imported signed June attendance register";

    await enrollStudentsInClass(
      harness.tx,
      harness.classId,
      ["student-1"],
      new Date("2026-06-01T00:00:00.000Z"),
      {
        adjustExistingEnrollmentStart: true,
        backdateReason: reason,
        actorId: "admin-1",
        actorRole: "admin",
      } as any,
    );

    const audit = harness.mutations.find((mutation) => mutation.op === "activityLog.createMany");
    assert.ok(audit, "historical correction must create a transactional audit row");
    const [auditRow] = audit.args.data;
    assert.equal(auditRow.userId ?? auditRow.actorId, "admin-1");
    const payload = JSON.stringify(auditRow);
    assert.match(payload, new RegExp(reason));
    assert.match(payload, /2026-07-14T00:00:00\.000Z/);
    assert.match(payload, /2026-06-01T00:00:00\.000Z/);
  });

  it("uses a dedicated action schema and never coerces string false to true", () => {
    const actionSchema = (validation as any).classEnrollmentActionSchema;
    assert.ok(actionSchema, "classEnrollmentActionSchema must be exported separately");
    const payload = {
      action: "bulk_enroll",
      student_ids: ["student-1"],
      enrollment_effective_date: "2026-06-01",
      adjust_existing_enrollment_start: false,
    };
    assert.equal(actionSchema.safeParse(payload).success, true);
    assert.equal(
      actionSchema.safeParse({ ...payload, adjust_existing_enrollment_start: "false" }).success,
      false,
    );
    assert.match(classesApiSource, /validateBody\(classEnrollmentActionSchema,/);
  });

  it("rejects an enrollment effective date after the current business date", () => {
    assert.throws(
      () => resolveEnrollmentEffectiveAt(
        "2026-07-15",
        new Date("2026-07-14T12:00:00.000Z"),
      ),
      (error) => assertErrorCode(error, "ENROLLMENT_EFFECTIVE_DATE_IN_FUTURE"),
    );
  });

  it("forbids receptionist historical enrollment and correction requests", () => {
    assert.match(classesApiSource, /export function assertHistoricalEnrollmentAllowed/);
    assert.match(classesApiSource, /role\s*!==\s*["']admin["']/);
    assert.match(classesApiSource, /assertHistoricalEnrollmentAllowed\(\s*req\.user\.role,/);
    assert.match(classesApiSource, /Only administrators can backdate or correct enrollment periods/);
    assert.match(classesApiSource, /adjust_existing_enrollment_start/);
    assert.match(classesApiSource, /enrollment_effective_date/);
  });

  it("treats endedAt as an exclusive attendance boundary", async () => {
    const harness = createEnrollmentHarness({
      studentClasses: [{
        id: "student-class-1",
        studentId: "student-1",
        classId: "class-historical",
        status: "active",
        enrollmentDate: new Date("2026-06-01T00:00:00.000Z"),
      }],
      enrollmentPeriods: [{
        id: "enrollment-period-1",
        studentId: "student-1",
        classId: "class-historical",
        startedAt: new Date("2026-06-01T00:00:00.000Z"),
        endedAt: new Date("2026-07-01T00:00:00.000Z"),
        source: "class_bulk_enroll",
      }],
    });
    const attendanceWrites: AttendanceRecord[] = [];

    await writeAttendance(
      harness.tx,
      harness.classId,
      { studentId: "student-1", attendanceDate: new Date("2026-06-30T00:00:00.000Z") },
      attendanceWrites,
    );
    await assert.rejects(
      writeAttendance(
        harness.tx,
        harness.classId,
        { studentId: "student-1", attendanceDate: new Date("2026-07-01T00:00:00.000Z") },
        attendanceWrites,
      ),
      (error) => assertErrorCode(error, "ATTENDANCE_OUTSIDE_ENROLLMENT"),
    );

    assert.equal(attendanceWrites.length, 1);
    assert.equal(attendanceWrites[0].attendanceDate.toISOString(), "2026-06-30T00:00:00.000Z");
  });
});
