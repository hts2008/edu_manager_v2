import type { VercelResponse } from "../../../lib/vercel-types.js";
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

  return successResponse(res, {
    user: {
      id: req.user.id,
      username: req.user.username,
      fullName: req.user.fullName,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      status: req.user.status || "active",
      lastLogin: req.user.lastLogin,
    },
  });
}

export default requireAuth(handler);
