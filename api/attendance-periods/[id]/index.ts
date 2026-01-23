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

  // Get id from query param (Vercel dynamic route)
  const { id, action } = req.query;

  if (!id || typeof id !== "string") {
    return errorResponse(res, "MISSING_ID", "Period ID is required", 400);
  }

  // Handle GET - return period details
  if (req.method === "GET") {
    const period = await prisma.attendancePeriod.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!period) {
      return errorResponse(res, "NOT_FOUND", "Period not found", 404);
    }

    // Get attendance for this period
    const [year, month] = period.periodMonth.split("-");
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);

    const attendance = await prisma.attendance.findMany({
      where: {
        classId: period.classId,
        attendanceDate: { gte: startDate, lte: endDate },
      },
      include: { student: true },
    });

    return successResponse(res, { period, attendance });
  }

  // Handle POST - actions
  if (req.method !== "POST") {
    return errorResponse(
      res,
      "METHOD_NOT_ALLOWED",
      "Only GET and POST allowed",
      405,
    );
  }

  // Determine action from query param or default to submit
  const actionType = (action as string) || "submit";

  try {
    // Get period
    const period = await prisma.attendancePeriod.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!period) {
      return errorResponse(res, "NOT_FOUND", "Period not found", 404);
    }

    switch (actionType) {
      case "submit": {
        if (period.status !== "open") {
          return errorResponse(
            res,
            "INVALID_STATUS",
            `Cannot submit: current status is ${period.status}`,
            400,
          );
        }

        // Calculate stats
        const [year, month] = period.periodMonth.split("-");
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);

        const stats = await prisma.attendance.groupBy({
          by: ["status"],
          where: {
            classId: period.classId,
            attendanceDate: { gte: startDate, lte: endDate },
          },
          _count: { status: true },
        });

        let totalSessions = 0,
          totalPresent = 0,
          totalAbsentFee = 0,
          totalAbsentNoFee = 0,
          totalHoliday = 0;
        stats.forEach((s) => {
          const count = s._count.status;
          totalSessions += count;
          if (s.status === "present") totalPresent = count;
          else if (s.status === "absent_with_fee") totalAbsentFee = count;
          else if (s.status === "absent_no_fee") totalAbsentNoFee = count;
          else if (s.status === "holiday") totalHoliday = count;
        });

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
            totalHoliday,
          },
        });

        return successResponse(res, {
          message: "Period submitted for approval",
          stats: {
            total_sessions: totalSessions,
            total_present: totalPresent,
            total_absent_fee: totalAbsentFee,
            total_absent_no_fee: totalAbsentNoFee,
            total_holiday: totalHoliday,
          },
        });
      }

      case "approve": {
        if (authUser.role !== "admin") {
          return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
        }

        if (period.status !== "submitted") {
          return errorResponse(
            res,
            "INVALID_STATUS",
            `Cannot approve: current status is ${period.status}. Only 'submitted' periods can be approved.`,
            400,
          );
        }

        await prisma.attendancePeriod.update({
          where: { id },
          data: {
            status: "approved",
            approvedById: authUser.userId,
            approvedAt: new Date(),
          },
        });

        return successResponse(res, { message: "Period approved" });
      }

      case "lock": {
        if (authUser.role !== "admin") {
          return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
        }

        if (period.status !== "approved") {
          return errorResponse(
            res,
            "INVALID_STATUS",
            `Cannot lock: current status is ${period.status}`,
            400,
          );
        }

        await prisma.attendancePeriod.update({
          where: { id },
          data: {
            status: "locked",
            lockedById: authUser.userId,
            lockedAt: new Date(),
          },
        });

        // Create monthly fees for students
        const studentClasses = await prisma.studentClass.findMany({
          where: { classId: period.classId, status: "active" },
        });

        for (const sc of studentClasses) {
          const existing = await prisma.monthlyFee.findFirst({
            where: { studentId: sc.studentId, month: period.periodMonth },
          });

          if (!existing) {
            const [year, month] = period.periodMonth.split("-");
            const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
            const endDate = new Date(parseInt(year), parseInt(month), 0);

            const count = await prisma.attendance.count({
              where: {
                studentId: sc.studentId,
                classId: period.classId,
                attendanceDate: { gte: startDate, lte: endDate },
                status: { in: ["present", "absent_with_fee"] },
              },
            });

            await prisma.monthlyFee.create({
              data: {
                studentId: sc.studentId,
                month: period.periodMonth,
                totalAmount: count * (period.class.feePerDay || 0),
                status: "ready",
              },
            });
          }
        }

        return successResponse(res, {
          message: "Period locked and fee records created",
          studentsProcessed: studentClasses.length,
        });
      }

      case "unlock": {
        if (authUser.role !== "admin") {
          return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
        }

        if (period.status !== "locked") {
          return errorResponse(
            res,
            "INVALID_STATUS",
            `Cannot unlock: current status is ${period.status}`,
            400,
          );
        }

        await prisma.attendancePeriod.update({
          where: { id },
          data: {
            status: "approved",
            lockedById: null,
            lockedAt: null,
          },
        });

        return successResponse(res, { message: "Period unlocked" });
      }

      default:
        return errorResponse(
          res,
          "INVALID_ACTION",
          `Invalid action: ${actionType}. Valid actions: submit, approve, lock, unlock`,
          400,
        );
    }
  } catch (error) {
    console.error("Period action error:", error);
    return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
  }
}
