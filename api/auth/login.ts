import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../../lib/prisma.js";
import { handleCors, errorResponse, successResponse } from "../../lib/auth.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return errorResponse(
      res,
      "MISSING_FIELDS",
      "Username and password required",
      400
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
