import jwt from "jsonwebtoken";
import type { VercelRequest } from "./vercel-types.js";
import { ApiError } from "./api-utils.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export type ParentAuth = {
  parentId: string;
  type: "parent_portal";
};

export function normalizePhone(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/[^\d+]/g, "");
}

export function signParentToken(parentId: string) {
  return jwt.sign({ parentId, type: "parent_portal" }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyParentToken(req: VercelRequest): ParentAuth {
  const rawAuth = req.headers.authorization;
  const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new ApiError("UNAUTHORIZED", "Parent portal token is required", 401);
  }

  try {
    const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET) as Partial<ParentAuth>;
    if (decoded.type !== "parent_portal" || !decoded.parentId) {
      throw new ApiError("TOKEN_INVALID", "Invalid parent portal token", 401);
    }
    return { parentId: decoded.parentId, type: "parent_portal" };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError("TOKEN_EXPIRED", "Parent portal token expired", 401);
    }
    throw new ApiError("TOKEN_INVALID", "Invalid parent portal token", 401);
  }
}

export function toDateOnly(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().split("T")[0];
}
