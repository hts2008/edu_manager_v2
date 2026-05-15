import type { VercelResponse } from "../../../../lib/vercel-types.js";
import prisma from "../../../../lib/prisma.js";
import {
  AuthedRequest,
  handleCors,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../../lib/auth.js";
import {
  ApiError,
  getRequiredString,
  logActivity,
  sendApiError,
} from "../../../../lib/api-utils.js";

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }
  if (req.user.role !== "admin") {
    return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
  }

  try {
    const id = getRequiredString(req.query.id, "id");
    const template = await prisma.template.findUnique({ where: { id } });
    if (!template) throw new ApiError("NOT_FOUND", "Template not found", 404);

    await prisma.$transaction([
      prisma.template.updateMany({
        where: { type: template.type },
        data: { isDefault: false },
      }),
      prisma.template.update({ where: { id }, data: { isDefault: true } }),
    ]);

    await logActivity(req, req.user.id, "SET_DEFAULT_TEMPLATE", "template", id);
    return successResponse(res, { message: "Template set as default" });
  } catch (error) {
    return sendApiError(res, error, "TEMPLATE_SET_DEFAULT_ERROR");
  }
}

export default requireAuth(handler, ["admin"]);
