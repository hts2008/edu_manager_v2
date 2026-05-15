import type { VercelResponse } from "@vercel/node";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  handleCors,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";
import {
  ApiError,
  getRequiredString,
  sendApiError,
  templateToDto,
} from "../../../lib/api-utils.js";

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  try {
    const type = getRequiredString(req.query.type, "type") as "receipt" | "payment";
    const template = await prisma.template.findFirst({
      where: { type, isDefault: true },
    });

    if (!template) {
      throw new ApiError(
        "TEMPLATE_NOT_CONFIGURED",
        `Default ${type} template is not configured`,
        404
      );
    }

    return successResponse(res, { template: templateToDto(template) });
  } catch (error) {
    return sendApiError(res, error, "TEMPLATE_DEFAULT_ERROR");
  }
}

export default requireAuth(handler);
