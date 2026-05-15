import type { VercelRequest, VercelResponse } from "../../../lib/vercel-types.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../../../lib/prisma.js";
import { handleCors, errorResponse, successResponse } from "../../../lib/auth.js";
import {
  checkRateLimit,
  getClientIp,
  setRateLimitHeaders,
} from "../../../lib/rate-limit.js";
import { loginSchema, validateBody } from "../../../lib/validation.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const LOGIN_WINDOW_MS = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 900000);
const LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_RATE_LIMIT_MAX || 10);

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

  const limit = checkRateLimit(
    `login:${getClientIp(req)}:${username.toLowerCase() || "unknown"}`,
    {
      windowMs: LOGIN_WINDOW_MS,
      max: LOGIN_MAX_ATTEMPTS,
    }
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

  try {
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

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate token
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "8h",
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
    console.error("Login error:", error);
    return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
  }
}
