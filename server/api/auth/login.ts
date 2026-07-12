import type { VercelRequest, VercelResponse } from "../../../lib/vercel-types.js";
import bcrypt from "bcryptjs";
import prisma from "../../../lib/prisma.js";
import { handleCors, errorResponse, successResponse } from "../../../lib/auth.js";
import {
  getClientIp,
  setRateLimitHeaders,
} from "../../../lib/rate-limit.js";
import {
  checkDistributedRateLimit,
  getLoginRateLimitConfig,
} from "../../../lib/distributed-rate-limit.js";
import { logApiError } from "../../../lib/observability.js";
import { loginSchema, validateBody } from "../../../lib/validation.js";

import { createSessionToken } from "../../../lib/auth-session.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }

  let credentials;
  try {
    credentials = validateBody(loginSchema, req.body);
  } catch (error) {
    return errorResponse(
      res,
      "VALIDATION_ERROR",
      error instanceof Error ? error.message : "Invalid request body",
      400
    );
  }
  const { username, password } = credentials;

  try {
    const limit = await checkDistributedRateLimit(
      `login:${getClientIp(req)}:${username.toLowerCase() || "unknown"}`,
      getLoginRateLimitConfig(process.env, "LOGIN_RATE_LIMIT")
    );
    setRateLimitHeaders(res, limit);
    if (!limit.allowed) {
      return errorResponse(
        res,
        "RATE_LIMITED",
        "Too many login attempts. Please try again later.",
        429
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return errorResponse(
        res,
        "INVALID_CREDENTIALS",
        "Invalid username or password",
        401
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return errorResponse(
        res,
        "INVALID_CREDENTIALS",
        "Invalid username or password",
        401
      );
    }

    if (user.status !== "active") {
      return errorResponse(res, "ACCOUNT_INACTIVE", "Account is inactive", 403);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
      select: { tokenVersion: true },
    });

    const { token } = await createSessionToken({
      subjectId: user.id,
      subjectType: "user",
      tokenVersion: updatedUser.tokenVersion,
      role: user.role,
      username: user.username,
    });

    return successResponse(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (error) {
    logApiError(error, { code: "LOGIN_ERROR" });
    return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
  }
}
