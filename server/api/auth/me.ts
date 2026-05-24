import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        lastLogin: true,
      },
    });

    if (!user) {
      return errorResponse(res, "USER_NOT_FOUND", "User not found", 404);
    }

    return successResponse(res, { user });
  } catch (error) {
    console.error("Me error:", error);
    return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
  }
}

export default requireAuth(handler);
