import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  errorResponse,
  handleCors,
  requireAuth,
  successResponse,
} from "../../../lib/auth.js";
import { getString, sendApiError } from "../../../lib/api-utils.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateOnly(date: Date) {
  return date.toISOString().split("T")[0];
}

function parseBoundary(value: string | undefined, fallback: Date, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
}

function createEmptyDay(date: string) {
  return {
    date,
    total: 0,
    present: 0,
    absent_with_fee: 0,
    absent_no_fee: 0,
    holiday: 0,
    make_up: 0,
    attendance_rate: 0,
  };
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  try {
    const today = new Date();
    const defaultFrom = new Date(today.getTime() - 364 * DAY_MS);
    const from = parseBoundary(getString(req.query.from), defaultFrom);
    const to = parseBoundary(getString(req.query.to), today, true);
    const cappedTo =
      to.getTime() - from.getTime() > 370 * DAY_MS
        ? new Date(from.getTime() + 370 * DAY_MS)
        : to;
    const studentId = getString(req.query.student_id);
    const classId = getString(req.query.class_id);

    const where: any = {
      attendanceDate: {
        gte: from,
        lte: cappedTo,
      },
    };
    if (studentId) where.studentId = studentId;
    if (classId) where.classId = classId;

    const records = await prisma.attendance.findMany({
      where,
      select: {
        attendanceDate: true,
        status: true,
        isMakeUp: true,
      },
      orderBy: { attendanceDate: "asc" },
    });

    const dayMap = new Map<string, ReturnType<typeof createEmptyDay>>();
    for (
      let cursor = new Date(`${toDateOnly(from)}T00:00:00.000Z`);
      cursor <= cappedTo;
      cursor = new Date(cursor.getTime() + DAY_MS)
    ) {
      const key = toDateOnly(cursor);
      dayMap.set(key, createEmptyDay(key));
    }

    for (const record of records) {
      const key = toDateOnly(record.attendanceDate);
      const day = dayMap.get(key) || createEmptyDay(key);
      day.total += 1;
      day[record.status] += 1;
      if (record.isMakeUp) day.make_up += 1;
      day.attendance_rate = day.total ? Math.round((day.present / day.total) * 100) : 0;
      dayMap.set(key, day);
    }

    const days = Array.from(dayMap.values());
    const summary = days.reduce(
      (acc, day) => {
        acc.total_records += day.total;
        acc.present += day.present;
        acc.absent_with_fee += day.absent_with_fee;
        acc.absent_no_fee += day.absent_no_fee;
        acc.holiday += day.holiday;
        acc.make_up += day.make_up;
        return acc;
      },
      {
        total_days: days.length,
        total_records: 0,
        present: 0,
        absent_with_fee: 0,
        absent_no_fee: 0,
        holiday: 0,
        make_up: 0,
        attendance_rate: 0,
      }
    );

    summary.attendance_rate = summary.total_records
      ? Math.round((summary.present / summary.total_records) * 100)
      : 0;

    return successResponse(res, {
      from: toDateOnly(from),
      to: toDateOnly(cappedTo),
      student_id: studentId || null,
      class_id: classId || null,
      days,
      summary,
    });
  } catch (error) {
    return sendApiError(res, error, "ATTENDANCE_INSIGHTS_ERROR");
  }
}

export default requireAuth(handler);
