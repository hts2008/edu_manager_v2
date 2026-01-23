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

  // Only admin can unlock
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

    // Get period
    const period = await prisma.attendancePeriod.findUnique({
      where: { id },
    });

    if (!period) {
      return errorResponse(res, "NOT_FOUND", "Period not found", 404);
    }

    if (period.status !== "locked") {
      return errorResponse(
        res,
        "INVALID_STATUS",
        `Cannot unlock: current status is ${period.status}. Only 'locked' periods can be unlocked.`,
        400,
      );
    }

    // Update period status back to approved
    await prisma.attendancePeriod.update({
      where: { id },
      data: {
        status: "approved",
        lockedById: null,
        lockedAt: null,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: authUser.userId,
        action: "unlock_period",
        entityType: "attendance_period",
        entityId: id,
      },
    });

    return successResponse(res, {
      message: "Period unlocked",
    });
  } catch (error) {
    console.error("Unlock period error:", error);
    return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
  }
}
