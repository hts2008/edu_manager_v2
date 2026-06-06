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
  getString,
  logActivity,
  parseJsonConfig,
  sendApiError,
  templateToDto,
} from "../../../../lib/api-utils.js";

const DB_PAPER_SIZES = new Set(["a4", "a5", "letter", "thermal_80mm"]);

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  try {
    const id = getRequiredString(req.query.id, "id");

    if (req.method === "GET") {
      const template = await prisma.template.findUnique({ where: { id } });
      if (!template) throw new ApiError("NOT_FOUND", "Template not found", 404);
      return successResponse(res, { template: templateToDto(template) });
    }

    if (req.method === "PUT") {
      if (req.user.role !== "admin") {
        return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
      }

      const existing = await prisma.template.findUnique({ where: { id } });
      if (!existing) throw new ApiError("NOT_FOUND", "Template not found", 404);

      const data: any = {};
      const templateName = getString(req.body?.template_name || req.body?.templateName);
      const paperSize = getString(req.body?.paper_size || req.body?.paperSize);
      const orientation = getString(req.body?.orientation);
      const type = getString(req.body?.type);

      if (templateName) data.templateName = templateName;
      if (paperSize && DB_PAPER_SIZES.has(paperSize)) data.paperSize = paperSize;
      if (orientation) data.orientation = orientation;
      if (type) data.type = type;
      if (req.body?.json_config !== undefined || req.body?.jsonConfig !== undefined) {
        data.jsonConfig = parseJsonConfig(req.body?.json_config || req.body?.jsonConfig);
      }

      const template = await prisma.template.update({
        where: { id },
        data,
      });

      await logActivity(req, req.user.id, "UPDATE_TEMPLATE", "template", id);
      return successResponse(res, { template: templateToDto(template) });
    }

    if (req.method === "DELETE") {
      if (req.user.role !== "admin") {
        return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
      }

      const [receiptCount, paymentCount] = await Promise.all([
        prisma.receipt.count({ where: { templateId: id } }),
        prisma.payment.count({ where: { templateId: id } }),
      ]);

      if (receiptCount || paymentCount) {
        throw new ApiError(
          "TEMPLATE_IN_USE",
          "Cannot delete template used by receipts or payments",
          400
        );
      }

      await prisma.template.delete({ where: { id } });
      await logActivity(req, req.user.id, "DELETE_TEMPLATE", "template", id);
      return successResponse(res, { message: "Template deleted" });
    }

    return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
  } catch (error) {
    return sendApiError(res, error, "TEMPLATE_DETAIL_ERROR");
  }
}

export default requireAuth(handler);
