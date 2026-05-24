import prisma from "./prisma.js";
import { ApiError } from "./api-utils.js";

type PrismaLike = typeof prisma;

function monthFromDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError("INVALID_DATE", "attendance_date is invalid", 400);
  }
  return date.toISOString().slice(0, 7);
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
      status: "locked",
    },
    select: {
      id: true,
      periodMonth: true,
    },
  });

  if (lockedPeriods.length > 0) {
    throw new ApiError(
      "ATTENDANCE_PERIOD_LOCKED",
      `Attendance period ${lockedPeriods[0].periodMonth} is locked`,
      409
    );
  }
}
