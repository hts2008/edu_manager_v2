import { VercelRequest, VercelResponse } from "@vercel/node";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export interface AuthUser {
  userId: string;
  role: "admin" | "receptionist";
}

export function verifyAuth(req: VercelRequest): AuthUser | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch {
    return null;
  }
}

export function requireAuth(
  handler: (
    req: VercelRequest,
    res: VercelResponse,
    user: AuthUser
  ) => Promise<void>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const user = verifyAuth(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }
    return handler(req, res, user);
  };
}

export function requireAdmin(
  handler: (
    req: VercelRequest,
    res: VercelResponse,
    user: AuthUser
  ) => Promise<void>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const user = verifyAuth(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }
    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Admin access required" },
      });
    }
    return handler(req, res, user);
  };
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
export function successResponse(res: VercelResponse, data: any) {
  return res.status(200).json({ success: true, data });
}
