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

  // Only admin can approve
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

    if (period.status !== "submitted") {
      return errorResponse(
        res,
        "INVALID_STATUS",
        `Cannot approve: current status is ${period.status}. Only 'submitted' periods can be approved.`,
        400,
      );
    }

    // Update period status to approved
    await prisma.attendancePeriod.update({
      where: { id },
      data: {
        status: "approved",
        approvedById: authUser.userId,
        approvedAt: new Date(),
      },
    });

    return successResponse(res, {
      message: "Period approved",
    });
  } catch (error) {
    console.error("Approve period error:", error);
    return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
  }
}
