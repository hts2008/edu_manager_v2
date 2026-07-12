import type { VercelResponse } from "../../../lib/vercel-types.js";
import {
  AuthedRequest,
  handleCors,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";
import { logActivity, sendApiError } from "../../../lib/api-utils.js";
import { revokeSession } from "../../../lib/auth-session.js";

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }

  try {
    await revokeSession(req.authToken.jti);
    await logActivity(req, req.user.id, "LOGOUT", "user", req.user.id);
    return successResponse(res, { message: "Logged out" });
  } catch (error) {
    return sendApiError(res, error, "LOGOUT_ERROR");
  }
}

export default requireAuth(handler);
