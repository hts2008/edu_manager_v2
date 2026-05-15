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

  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  const authUser = verifyAuth(req);
  if (!authUser) {
    return errorResponse(res, "UNAUTHORIZED", "Authentication required", 401);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
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
