import { VercelRequest, VercelResponse } from "@vercel/node";
import jwt from "jsonwebtoken";
import prisma from "./prisma.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export interface AuthUser {
  userId: string;
  id: string;
  username?: string;
  role: "admin" | "receptionist";
}

export interface AuthedRequest extends VercelRequest {
  user: AuthUser;
}

type JwtPayload = {
  userId?: string;
  id?: string;
  username?: string;
  role?: "admin" | "receptionist";
};

type AuthFailure = {
  code: "UNAUTHORIZED" | "TOKEN_INVALID" | "TOKEN_EXPIRED";
  message: string;
};

type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: AuthFailure };

function getBearerToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.split(" ")[1];
}

export function verifyAuth(req: VercelRequest): AuthUser | null {
  const token = getBearerToken(req);
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const userId = decoded.userId || decoded.id;
    if (!userId || !decoded.role) return null;
    return {
      userId,
      id: userId,
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
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const userId = decoded.userId || decoded.id;

    if (!userId || !decoded.role) {
      return {
        ok: false,
        error: { code: "TOKEN_INVALID", message: "Invalid token payload" },
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true, status: true },
    });

    if (!user || user.status !== "active") {
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
        role: user.role,
      },
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
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
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
  status = 400
) {
  return res.status(status).json({
    success: false,
    error: { code, message },
  });
}

// Success response helper
export function successResponse(res: VercelResponse, data: any, status = 200) {
  return res.status(status).json({ success: true, data });
}
