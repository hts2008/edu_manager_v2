import type { VercelResponse } from "../../../../lib/vercel-types.js";
import {
  AuthedRequest,
  handleCors,
  errorResponse,
  successResponse,
} from "../../../../lib/auth.js";
import { requirePermission } from "../../../../lib/require-permission.js";
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
  try {
    const id = getRequiredString(req.query.id, "id");
    const template = await req.db.template.findUnique({ where: { id } });
    if (!template) throw new ApiError("NOT_FOUND", "Template not found", 404);

    await req.db.$transaction(async (tx) => {
      await tx.template.updateMany({
        where: { type: template.type },
        data: { isDefault: false },
      });
      await tx.template.update({ where: { id }, data: { isDefault: true } });
    });

    await logActivity(req, req.user.id, "SET_DEFAULT_TEMPLATE", "template", id);
    return successResponse(res, { message: "Template set as default" });
  } catch (error) {
    return sendApiError(res, error, "TEMPLATE_SET_DEFAULT_ERROR");
  }
}

export default requirePermission("templates.manage", handler);
