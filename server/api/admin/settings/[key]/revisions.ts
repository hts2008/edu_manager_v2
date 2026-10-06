import type { VercelResponse } from "../../../../../lib/vercel-types.js";
import { errorResponse, successResponse, type AuthedRequest } from "../../../../../lib/auth.js";
import { sendApiError } from "../../../../../lib/api-utils.js";
import { assertRequestPermission, requirePermission } from "../../../../../lib/require-permission.js";
import { getSettingDefinition } from "../../../../../lib/settings-registry.js";
import { getSettingHistory } from "../../../../../lib/settings.js";
import { getPagination, getSettingKey, requireTenantId } from "../api-helpers.js";

export async function handler(req: AuthedRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }
  try {
    const pagination = getPagination(req);
    const key = getSettingKey(req);
    const definition = getSettingDefinition(key);
    await assertRequestPermission(req,
      key === "organization.ui_copy.vi" || key === "organization.ui_theme"
        ? "console.experience.view" : definition.permission);
    return successResponse(res, await getSettingHistory(req.db, {
      tenantId: requireTenantId(req),
      key,
      ...pagination,
    }));
  } catch (error) {
    return sendApiError(res, error, "SETTING_HISTORY_ERROR");
  }
}

export default requirePermission("console.access", handler);
