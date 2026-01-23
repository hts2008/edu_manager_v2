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

  // Only admin can lock
  if (authUser.role !== "admin") {
    return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
  }

  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return errorResponse(res, "MISSING_ID", "Period ID is required", 400);
    }

    // Get period with class info
    const period = await prisma.attendancePeriod.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!period) {
      return errorResponse(res, "NOT_FOUND", "Period not found", 404);
    }

    if (period.status !== "approved") {
      return errorResponse(
        res,
        "INVALID_STATUS",
        `Cannot lock: current status is ${period.status}. Only 'approved' periods can be locked.`,
        400,
      );
    }

    // Update period status to locked
    await prisma.attendancePeriod.update({
      where: { id },
      data: {
        status: "locked",
        lockedById: authUser.userId,
        lockedAt: new Date(),
      },
    });

    // Get all active students in this class
    const studentClasses = await prisma.studentClass.findMany({
      where: {
        classId: period.classId,
        status: "active",
      },
    });

    // Create monthly fee records for each student
    for (const sc of studentClasses) {
      // Check if fee record already exists
      const existing = await prisma.monthlyFee.findFirst({
        where: {
          studentId: sc.studentId,
          month: period.periodMonth,
        },
      });

      if (!existing) {
        // Calculate fee based on attendance
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
  } catch (error) {
    console.error("Lock period error:", error);
    return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
  }
}
