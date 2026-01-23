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
    const { id, action } = req.query;

    if (!id || typeof id !== "string") {
      return errorResponse(res, "MISSING_ID", "Period ID is required", 400);
    }

    if (!action || typeof action !== "string") {
      return errorResponse(res, "MISSING_ACTION", "Action is required", 400);
    }

    // Get period
    const period = await prisma.attendancePeriod.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!period) {
      return errorResponse(res, "NOT_FOUND", "Period not found", 404);
    }

    switch (action) {
      case "approve": {
        // Only admin can approve
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
        // Only admin can lock
        if (authUser.role !== "admin") {
          return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
        }

        if (period.status !== "approved") {
          return errorResponse(
            res,
            "INVALID_STATUS",
            `Cannot lock: current status is ${period.status}. Only 'approved' periods can be locked.`,
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

        // Create monthly fee records for students
        const studentClasses = await prisma.studentClass.findMany({
          where: {
            classId: period.classId,
            status: "active",
          },
        });

        for (const sc of studentClasses) {
          const existing = await prisma.monthlyFee.findFirst({
            where: {
              studentId: sc.studentId,
              month: period.periodMonth,
            },
          });

          if (!existing) {
            const [year, month] = period.periodMonth.split("-");
            const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
            const endDate = new Date(parseInt(year), parseInt(month), 0);

            const attendanceCount = await prisma.attendance.count({
              where: {
                studentId: sc.studentId,
                classId: period.classId,
                attendanceDate: {
                  gte: startDate,
                  lte: endDate,
                },
                status: { in: ["present", "absent_with_fee"] },
              },
            });

            const feeAmount = attendanceCount * (period.class.feePerDay || 0);

            await prisma.monthlyFee.create({
              data: {
                studentId: sc.studentId,
                month: period.periodMonth,
                totalAmount: feeAmount,
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
        // Only admin can unlock
        if (authUser.role !== "admin") {
          return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
        }

        if (period.status !== "locked") {
          return errorResponse(
            res,
            "INVALID_STATUS",
            `Cannot unlock: current status is ${period.status}. Only 'locked' periods can be unlocked.`,
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
          `Invalid action: ${action}. Valid actions are: approve, lock, unlock`,
          400,
        );
    }
  } catch (error) {
    console.error("Period action error:", error);
    return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
  }
}
