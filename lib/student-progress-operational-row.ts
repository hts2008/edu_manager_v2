import type { AuthedRequest } from "./auth.js";
import { ApiError, parseMonthRange } from "./api-utils.js";
import { buildReportCube } from "./report-cube.js";

export async function loadProgressOperationalRow(
  db: Pick<AuthedRequest["db"], "enrollmentPeriod" | "studentClass" | "attendance" | "monthlyFeeLine" | "monthlyFee" | "classMonthPlan" | "classSession">,
  studentId: string,
  classId: string,
  month: string
) {
  const { startDate, endDate } = parseMonthRange(month);
  const enrollmentPeriod = await db.enrollmentPeriod.findFirst({
    where: {
      studentId,
      classId,
      startedAt: { lt: endDate },
      OR: [{ endedAt: null }, { endedAt: { gt: startDate } }],
      student: { deletedAt: null },
    },
    select: {
      startedAt: true,
      endedAt: true,
      student: { select: { fullName: true } },
      class: {
        select: {
          className: true,
          feePerDay: true,
          scheduleDays: true,
          sessionsPerWeek: true,
        },
      },
    },
    orderBy: { startedAt: "desc" },
  });
  const legacyEnrollment = enrollmentPeriod
    ? null
    : await db.studentClass.findFirst({
        where: {
          studentId,
          classId,
          student: { deletedAt: null },
        },
        include: {
          student: { select: { fullName: true } },
          class: {
            select: {
              className: true,
              feePerDay: true,
              scheduleDays: true,
              sessionsPerWeek: true,
            },
          },
        },
      });
  const enrollment = enrollmentPeriod
    ? {
        enrollmentDate: enrollmentPeriod.startedAt,
        enrollmentEndDate: enrollmentPeriod.endedAt,
        student: enrollmentPeriod.student,
        class: enrollmentPeriod.class,
      }
    : legacyEnrollment
      ? { ...legacyEnrollment, enrollmentEndDate: null }
      : null;

  if (!enrollment) {
    throw new ApiError("ENROLLMENT_NOT_FOUND", "Student is not enrolled in this class", 404);
  }

  const [
    attendanceRows,
    feeLineRows,
    monthlyFeeRows,
    classMonthPlanRows,
    classSessionRows,
  ] = await Promise.all([
    db.attendance.findMany({
      where: {
        studentId,
        classId,
        attendanceDate: { gte: startDate, lt: endDate },
      },
      select: {
        studentId: true,
        classId: true,
        attendanceDate: true,
        status: true,
        isMakeUp: true,
      },
    }),
    db.monthlyFeeLine.findMany({
      where: { studentId, classId, month },
      select: {
        id: true,
        monthlyFeeId: true,
        studentId: true,
        classId: true,
        month: true,
        expectedSessions: true,
        calculationSnapshot: true,
        amount: true,
        status: true,
        allocationConfidence: true,
      },
    }),
    db.monthlyFee.findMany({
      where: { studentId, month },
      select: {
        id: true,
        studentId: true,
        month: true,
        totalDays: true,
        totalAmount: true,
        status: true,
        receiptId: true,
        paidAt: true,
      },
    }),
    db.classMonthPlan.findMany({
      where: { classId, billingMonth: month },
      select: {
        classId: true,
        billingMonth: true,
        revisions: {
          orderBy: { revision: "desc" },
          select: { revision: true, snapshot: true },
        },
      },
    }),
    db.classSession.findMany({
      where: { classId, billingMonth: month, kind: "regular" },
      select: {
        classId: true,
        billingMonth: true,
        sessionDate: true,
        kind: true,
        status: true,
      },
    }),
  ]);

  const cube = buildReportCube({
    months: [month],
    enrollments: [
      {
        studentId,
        studentName: enrollment.student.fullName,
        classId,
        className: enrollment.class.className,
        enrollmentDate: enrollment.enrollmentDate,
        enrollmentEndDate: enrollment.enrollmentEndDate,
        feePerDay: enrollment.class.feePerDay,
        scheduleDays: enrollment.class.scheduleDays,
        sessionsPerWeek: enrollment.class.sessionsPerWeek,
      },
    ],
    attendance: attendanceRows,
    feeLines: feeLineRows,
    monthlyFees: monthlyFeeRows,
    classMonthPlans: classMonthPlanRows.map((row) => ({
      classId: row.classId,
      billingMonth: row.billingMonth,
      revisions: row.revisions,
    })),
    classSessions: classSessionRows,
  });

  const row = cube.students.find(
    (item) => item.student_id === studentId && item.class_id === classId && item.month === month
  );
  if (!row) {
    throw new ApiError(
      "PROGRESS_MONTH_OUT_OF_ENROLLMENT",
      "Progress month is before the enrollment month",
      400
    );
  }
  return row;
}

