import type { VercelResponse } from "../../../lib/vercel-types.js";
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
  getString,
  logActivity,
  parseJsonConfig,
  sendApiError,
  templateToDto,
} from "../../../lib/api-utils.js";

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method === "GET") {
    try {
      const type = getString(req.query.type);
      const where: any = {};
      if (type && type !== "all") where.type = type;

      const templates = await prisma.template.findMany({
        where,
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      });

      return successResponse(res, {
        templates: templates.map((template) => templateToDto(template, false)),
      });
    } catch (error) {
      return sendApiError(res, error, "TEMPLATES_LIST_ERROR");
    }
  }

  if (req.method === "POST") {
    if (req.user.role !== "admin") {
      return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
    }

    try {
      const templateName = getRequiredString(
        req.body?.template_name || req.body?.templateName,
        "template_name"
      );
      const type = getRequiredString(req.body?.type, "type") as "receipt" | "payment";
      const paperSize = getRequiredString(
        req.body?.paper_size || req.body?.paperSize,
        "paper_size"
      ) as "a4" | "a5" | "letter" | "thermal_80mm";
      const orientation = getRequiredString(req.body?.orientation, "orientation") as
        | "portrait"
        | "landscape";

      if (!["receipt", "payment"].includes(type)) {
        throw new ApiError("INVALID_TYPE", "Invalid template type", 400);
      }

      const template = await prisma.template.create({
        data: {
          templateName,
          type,
          paperSize,
          orientation,
          jsonConfig: parseJsonConfig(req.body?.json_config || req.body?.jsonConfig),
          createdById: req.user.id,
        },
      });

      await logActivity(req, req.user.id, "CREATE_TEMPLATE", "template", template.id);
      return successResponse(res, templateToDto(template), 201);
    } catch (error) {
      return sendApiError(res, error, "TEMPLATE_CREATE_ERROR");
    }
  }

  return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

export default requireAuth(handler);
