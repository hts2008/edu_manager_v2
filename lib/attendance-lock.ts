import prisma from "./prisma.js";
import { ApiError, toDateOnly } from "./api-utils.js";
import { acquireAttendanceFeeAdvisoryLocks } from "./attendance-lock-transaction.js";

type PrismaLike = typeof prisma;

type AttendanceReopenDb = Pick<
  PrismaLike,
  "attendance" | "attendancePeriod" | "monthlyFeeLine" | "activityLog" | "$queryRaw"
>;

export const ATTENDANCE_REOPEN_FINANCIAL_CONFLICT =
  "ATTENDANCE_REOPEN_FINANCIAL_CONFLICT";

function monthFromDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError("INVALID_DATE", "attendance_date is invalid", 400);
  }
  const dateOnly = typeof value === "string" ? value.slice(0, 10) : toDateOnly(date);
  return dateOnly?.slice(0, 7) || date.toISOString().slice(0, 7);
}

export async function assertAttendanceDatesEditable(
  classId: string,
  dates: Array<Date | string>,
  db: PrismaLike = prisma
) {
  const months = Array.from(new Set(dates.map(monthFromDate)));
  if (months.length === 0) return;

  const lockedPeriods = await db.attendancePeriod.findMany({
    where: {
      classId,
      periodMonth: { in: months },
      status: { in: ["submitted", "approved", "locked"] },
    },
    select: {
      id: true,
      periodMonth: true,
      status: true,
    },
  });

  if (lockedPeriods.length > 0) {
    throw new ApiError(
      "ATTENDANCE_PERIOD_LOCKED",
      `Attendance period ${lockedPeriods[0].periodMonth} is ${lockedPeriods[0].status} and cannot be edited`,
      409
    );
  }
}

export async function assertAttendancePeriodReopenSafe(
  classId: string,
  month: string,
  db: Pick<AttendanceReopenDb, "monthlyFeeLine"> = prisma,
) {
  const protectedLine = await db.monthlyFeeLine.findFirst({
    where: {
      classId,
      month,
      OR: [
        { status: { in: ["confirmed", "paid"] } },
        { receiptId: { not: null } },
        { paidAt: { not: null } },
        { receiptLines: { some: {} } },
        { monthlyFee: { status: { in: ["confirmed", "paid"] } } },
        { monthlyFee: { receiptId: { not: null } } },
        { monthlyFee: { paidAt: { not: null } } },
      ],
    },
    select: { id: true },
  });

  if (protectedLine) {
    throw new ApiError(
      ATTENDANCE_REOPEN_FINANCIAL_CONFLICT,
      "Cannot reopen attendance because confirmed or paid tuition depends on this period",
      409,
    );
  }
}

export async function reopenAttendancePeriod(
  db: AttendanceReopenDb,
  input: {
    periodId: string;
    classId: string;
    month: string;
    userId: string;
    reason: string;
    ipAddress?: string;
    userAgent?: string;
  },
) {
  const [year, monthNumber] = input.month.split("-").map(Number);
  const startDate = new Date(Date.UTC(year, monthNumber - 1, 1));
  const endDate = new Date(Date.UTC(year, monthNumber, 0, 23, 59, 59, 999));
  const attendanceStudents = await db.attendance.findMany({
    where: {
      classId: input.classId,
      attendanceDate: { gte: startDate, lte: endDate },
    },
    distinct: ["studentId"],
    select: { studentId: true },
  });
  await acquireAttendanceFeeAdvisoryLocks(
    db,
    attendanceStudents.map((row) => row.studentId),
    input.month,
  );
  await assertAttendancePeriodReopenSafe(input.classId, input.month, db);

  const updated = await db.attendancePeriod.updateMany({
    where: { id: input.periodId, status: "locked" },
    data: {
      status: "open",
      submittedById: null,
      submittedAt: null,
      approvedById: null,
      approvedAt: null,
      lockedById: null,
      lockedAt: null,
    },
  });
  if (updated.count !== 1) {
    throw new ApiError("ATTENDANCE_REOPEN_STATE_CONFLICT", "Attendance period changed while reopening", 409);
  }
  const period = await db.attendancePeriod.findUniqueOrThrow({
    where: { id: input.periodId },
  });

  await db.activityLog.create({
    data: {
      userId: input.userId,
      action: `REOPEN_ATTENDANCE_PERIOD: ${input.reason}`,
      entityType: "attendance_period",
      entityId: input.periodId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });

  return period;
}
