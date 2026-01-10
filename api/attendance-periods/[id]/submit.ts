import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../../../lib/prisma.js";
import {
  handleCors,
  verifyAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  const authUser = verifyAuth(req);
  if (!authUser) {
    return errorResponse(res, "UNAUTHORIZED", "Authentication required", 401);
  }

  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return errorResponse(res, "MISSING_ID", "Period ID is required", 400);
    }

    // Get period
    const period = await prisma.attendancePeriod.findUnique({
      where: { id },
    });

    if (!period) {
      return errorResponse(res, "NOT_FOUND", "Period not found", 404);
    }

    if (period.status !== "open") {
      return errorResponse(
        res,
        "INVALID_STATUS",
        `Cannot submit: current status is ${period.status}`,
        400
      );
    }

    // Calculate attendance stats for this period
    const [year, month] = period.periodMonth.split("-");
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);

    const stats = await prisma.attendance.groupBy({
      by: ["status"],
      where: {
        classId: period.classId,
        attendanceDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: { status: true },
    });

    let totalSessions = 0;
    let totalPresent = 0;
    let totalAbsentFee = 0;
    let totalAbsentNoFee = 0;

    stats.forEach((s) => {
      const count = s._count.status;
      totalSessions += count;
      if (s.status === "present") totalPresent = count;
      else if (s.status === "absent_with_fee") totalAbsentFee = count;
      else if (s.status === "absent_no_fee") totalAbsentNoFee = count;
    });

    // Update period status to submitted
    await prisma.attendancePeriod.update({
      where: { id },
      data: {
        status: "submitted",
        submittedById: authUser.userId,
        submittedAt: new Date(),
        totalSessions,
        totalPresent,
        totalAbsentFee,
        totalAbsentNoFee,
      },
    });

    return successResponse(res, {
      message: "Period submitted for approval",
      stats: {
        total_sessions: totalSessions,
        total_present: totalPresent,
        total_absent_fee: totalAbsentFee,
        total_absent_no_fee: totalAbsentNoFee,
      },
    });
  } catch (error) {
    console.error("Submit period error:", error);
    return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
  }
}
