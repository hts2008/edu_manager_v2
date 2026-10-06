import type { AuthedRequest } from "../../../lib/auth.js";
import { ApiError, getString } from "../../../lib/api-utils.js";

type TemplateType = "receipt" | "payment";

export async function resolveTemplateId(
  db: AuthedRequest["db"],
  type: TemplateType,
  templateId?: string | null,
) {
  const useDefault =
    !templateId ||
    templateId === "TPL_DEFAULT_RECEIPT" ||
    templateId === "TPL_DEFAULT_PAYMENT";

  if (!useDefault) {
    const template = await db.template.findUnique({
      where: { id: templateId },
      select: { id: true, type: true },
    });
    if (!template || template.type !== type) {
      throw new ApiError("TEMPLATE_NOT_FOUND", "Template not found", 404);
    }
    return template.id;
  }

  const defaultTemplate = await db.template.findFirst({
    where: { type, isDefault: true },
    select: { id: true },
  });
  if (!defaultTemplate) {
    throw new ApiError(
      "TEMPLATE_NOT_CONFIGURED",
      `Default ${type} template is not configured`,
      500,
    );
  }
  return defaultTemplate.id;
}

export async function logActivity(
  req: AuthedRequest,
  action: string,
  entityType?: string,
  entityId?: string,
) {
  await req.db.activityLog.create({
    data: {
      tenantId: req.user.tenantId!,
      userId: req.user.id,
      action,
      entityType,
      entityId,
      ipAddress:
        getString(req.headers["x-forwarded-for"]) ||
        getString(req.headers["x-real-ip"]),
      userAgent: getString(req.headers["user-agent"]),
    },
  });
}
