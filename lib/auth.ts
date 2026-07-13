import type { VercelRequest, VercelResponse } from "./vercel-types.js";
import jwt from "jsonwebtoken";
import prisma from "./prisma.js";
import { setSecurityHeaders } from "./observability.js";
import {
  getActiveSession,
  verifySessionToken,
  type SessionTokenPayload,
} from "./auth-session.js";

export interface AuthUser {
  userId: string;
  id: string;
  username?: string;
  fullName?: string;
  email?: string | null;
  phone?: string | null;
  role: "admin" | "receptionist";
  status?: "active" | "inactive";
  lastLogin?: Date | null;
}

export interface AuthedRequest extends VercelRequest {
  user: AuthUser;
  authToken: SessionTokenPayload;
}

type AuthFailure = {
  code: "UNAUTHORIZED" | "TOKEN_INVALID" | "TOKEN_EXPIRED";
  message: string;
};

type AuthResult =
  | { ok: true; user: AuthUser; token: SessionTokenPayload }
  | { ok: false; error: AuthFailure };

export function getBearerToken(req: VercelRequest): string | null {
  const rawAuthHeader = req.headers.authorization;
  const authHeader = Array.isArray(rawAuthHeader)
    ? rawAuthHeader[0]
    : rawAuthHeader;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.split(" ")[1];
}

export function verifyAuth(req: VercelRequest): AuthUser | null {
  const token = getBearerToken(req);
  if (!token) return null;

  try {
    const decoded = verifySessionToken(token, "user");
    if (!decoded.role) return null;
    return {
      userId: decoded.sub,
      id: decoded.sub,
      username: decoded.username,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}

async function authenticate(req: VercelRequest): Promise<AuthResult> {
  const token = getBearerToken(req);
  if (!token) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    };
  }

  try {
    const decoded = verifySessionToken(token, "user");
    if (!decoded.role) {
      return {
        ok: false,
        error: { code: "TOKEN_INVALID", message: "Invalid token payload" },
      };
    }

    const [session, user] = await Promise.all([
      getActiveSession(decoded),
      prisma.user.findUnique({
        where: { id: decoded.sub },
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          lastLogin: true,
          tokenVersion: true,
        },
      }),
    ]);

    if (
      !session ||
      !user ||
      user.status !== "active" ||
      user.tokenVersion !== decoded.ver
    ) {
      return {
        ok: false,
        error: { code: "TOKEN_INVALID", message: "Invalid token" },
      };
    }

    return {
      ok: true,
      user: {
        userId: user.id,
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        lastLogin: user.lastLogin,
      },
      token: decoded,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        ok: false,
        error: { code: "TOKEN_EXPIRED", message: "Token expired" },
      };
    }

    return {
      ok: false,
      error: { code: "TOKEN_INVALID", message: "Invalid token" },
    };
  }
}

export function requireAuth(
  handler: (
    req: AuthedRequest,
    res: VercelResponse,
    user: AuthUser
  ) => Promise<void | VercelResponse> | void | VercelResponse,
  allowedRoles?: AuthUser["role"][]
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    if (handleCors(req, res)) return;

    const result = await authenticate(req);
    if (!result.ok) {
      return errorResponse(
        res,
        result.error.code,
        result.error.message,
        401
      );
    }

    if (allowedRoles?.length && !allowedRoles.includes(result.user.role)) {
      return errorResponse(res, "FORBIDDEN", "Forbidden", 403);
    }

    const authedReq = req as AuthedRequest;
    authedReq.user = result.user;
    authedReq.authToken = result.token;
    return handler(authedReq, res, result.user);
  };
}

export function requireAdmin(
  handler: (
    req: AuthedRequest,
    res: VercelResponse,
    user: AuthUser
  ) => Promise<void | VercelResponse> | void | VercelResponse
) {
  return requireAuth(handler, ["admin"]);
}

// CORS handler for OPTIONS requests
export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  setSecurityHeaders(res);
  const origin = Array.isArray(req.headers.origin)
    ? req.headers.origin[0]
    : req.headers.origin;
  const configured = (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const development =
    process.env.NODE_ENV === "production"
      ? []
      : ["http://localhost:3000", "http://localhost:5173"];
  if (origin && [...configured, ...development].includes(origin)) {
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true;
  }
  return false;
}

// Error response helper
export function errorResponse(
  res: VercelResponse,
  code: string,
  message: string,
  status = 400,
  details?: unknown,
) {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  });
}

// Success response helper
export function successResponse(res: VercelResponse, data: any, status = 200) {
  return res.status(status).json({ success: true, data });
}
