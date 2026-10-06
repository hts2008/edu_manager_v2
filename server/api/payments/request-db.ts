import type { AuthedRequest } from "../../../lib/auth.js";
import { ApiError, getString } from "../../../lib/api-utils.js";

export async function resolvePaymentTemplateId(
  db: AuthedRequest["db"],
  templateId?: string | null,
) {
  const useDefault = !templateId || templateId === "TPL_DEFAULT_PAYMENT";
  if (!useDefault) {
    const template = await db.template.findUnique({
      where: { id: templateId },
      select: { id: true, type: true },
    });
    if (!template || template.type !== "payment") {
      throw new ApiError("TEMPLATE_NOT_FOUND", "Template not found", 404);
    }
    return template.id;
  }

  const template = await db.template.findFirst({
    where: { type: "payment", isDefault: true },
    select: { id: true },
  });
  if (!template) {
    throw new ApiError(
      "TEMPLATE_NOT_CONFIGURED",
      "Default payment template is not configured",
      500,
    );
  }
  return template.id;
}

export async function logPaymentActivity(
  req: AuthedRequest,
  action: string,
  entityId: string,
) {
  await req.db.activityLog.create({
    data: {
      tenantId: req.user.tenantId!,
      userId: req.user.id,
      action,
      entityType: "payment",
      entityId,
      ipAddress:
        getString(req.headers["x-forwarded-for"]) ||
        getString(req.headers["x-real-ip"]),
      userAgent: getString(req.headers["user-agent"]),
    },
  });
}
