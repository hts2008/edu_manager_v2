import type { VercelRequest, VercelResponse } from "../../../lib/vercel-types.js";
import { errorResponse, handleCors, successResponse } from "../../../lib/auth.js";
import { sendApiError } from "../../../lib/api-utils.js";
import { revokeSession } from "../../../lib/auth-session.js";
import { verifyParentToken } from "../../../lib/parent-auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }

  try {
    const auth = await verifyParentToken(req);
    await revokeSession(auth.token.jti);
    return successResponse(res, { message: "Logged out" });
  } catch (error) {
    return sendApiError(res, error, "PARENT_PORTAL_LOGOUT_ERROR");
  }
}
