import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  type AuthedRequest,
  errorResponse,
  handleCors,
  requireAuth,
  successResponse,
} from "../../../lib/auth.js";
import { ApiError, getString, sendApiError } from "../../../lib/api-utils.js";
import {
  buildStudentProgressComparison,
  buildStudentProgressTimeline,
  MAX_PROGRESS_RANGE_DAYS,
} from "../../../lib/student-progress-timeline.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: string, field: string) {
  if (!DATE_PATTERN.test(value)) {
    throw new ApiError("VALIDATION_ERROR", `${field} must use YYYY-MM-DD`, 400);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ApiError("VALIDATION_ERROR", `${field} is not a valid date`, 400);
  }
  return parsed;
}

function nextDate(value: Date) {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + 1);
  return result;
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  try {
    const studentId = getString(req.query.student_id || req.query.studentId);
    const classId = getString(req.query.class_id || req.query.classId);
    const from = getString(req.query.from);
    const to = getString(req.query.to);
    if (!studentId || !classId || !from || !to) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "student_id, class_id, from, and to are required",
        400
      );
    }
    const startDate = parseDate(from, "from");
    const inclusiveEndDate = parseDate(to, "to");
    if (inclusiveEndDate < startDate) {
      throw new ApiError("VALIDATION_ERROR", "to must not be before from", 400);
    }
    const rangeDays =
      Math.floor((inclusiveEndDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
    if (rangeDays > MAX_PROGRESS_RANGE_DAYS) {
      throw new ApiError(
        "VALIDATION_ERROR",
        `timeline range cannot exceed ${MAX_PROGRESS_RANGE_DAYS} days`,
        400
      );
    }
    const endDate = nextDate(inclusiveEndDate);
    const previousEndDate = new Date(startDate);
    previousEndDate.setUTCDate(previousEndDate.getUTCDate() - 1);
    const previousStartDate = new Date(previousEndDate);
    previousStartDate.setUTCDate(previousStartDate.getUTCDate() - rangeDays + 1);
    const previousFrom = previousStartDate.toISOString().slice(0, 10);
    const previousTo = previousEndDate.toISOString().slice(0, 10);

    const months = await prisma.studentProgressMonth.findMany({
      where: {
        studentId,
        classId,
        month: { gte: previousFrom.slice(0, 7), lte: to.slice(0, 7) },
      },
      include: {
        student: {
          select: {
            fullName: true,
            parent: { select: { fullName: true, phone: true } },
          },
        },
        class: { select: { className: true } },
        dailyEntries: {
          where: { entryDate: { gte: previousStartDate, lt: endDate } },
          include: { gradedByTeacher: { select: { id: true, fullName: true } } },
          orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
        },
      },
      orderBy: { month: "asc" },
    });

    const timeline = buildStudentProgressTimeline(months, from, to);
    const previousTimeline = buildStudentProgressTimeline(months, previousFrom, previousTo);
    const identity = months.find((month) => month.month >= from.slice(0, 7)) || months[0];
    return successResponse(res, {
      student: {
        id: studentId,
        name: identity?.student?.fullName || null,
        parent_name: identity?.student?.parent?.fullName || null,
        parent_phone: identity?.student?.parent?.phone || null,
      },
      class: {
        id: classId,
        name: identity?.class?.className || null,
        track_key: identity?.trackKey || "unknown",
      },
      ...timeline,
      comparison: {
        previous_from: previousFrom,
        previous_to: previousTo,
        ...buildStudentProgressComparison(timeline, previousTimeline),
      },
    });
  } catch (error) {
    return sendApiError(res, error, "STUDENT_PROGRESS_TIMELINE_ERROR");
  }
}

export default requireAuth(handler, ["admin", "receptionist"]);
