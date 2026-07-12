import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import { type AuthedRequest, errorResponse, requireAuth, successResponse } from "../../../lib/auth.js";
import { ApiError, getRequiredString, sendApiError } from "../../../lib/api-utils.js";
import { classSessionToDto, monthBounds, parseMonth } from "../../../lib/class-sessions.js";

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET is allowed", 405);
  }
  try {
    const classId = getRequiredString(req.query.class_id, "class_id");
    const month = getRequiredString(req.query.month, "month");
    parseMonth(month);
    const sessions = await prisma.classSession.findMany({
      where: { classId, sessionDate: monthBounds(month) },
      orderBy: [{ sessionDate: "asc" }, { id: "asc" }],
    });
    return successResponse(res, { sessions: sessions.map(classSessionToDto) });
  } catch (error) {
    return sendApiError(res, error, "CLASS_SESSIONS_LIST_ERROR");
  }
}

export default requireAuth(handler);
