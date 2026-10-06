import type { VercelResponse } from "../../../../../lib/vercel-types.js";
import { errorResponse, successResponse, type AuthedRequest } from "../../../../../lib/auth.js";
import { ApiError, getString, sendApiError } from "../../../../../lib/api-utils.js";
import { assertRequestPermission, requirePermission } from "../../../../../lib/require-permission.js";
import { getSettingDefinition } from "../../../../../lib/settings-registry.js";
import { rollbackSetting } from "../../../../../lib/settings.js";
import { getSettingKey, requireTenantId } from "../api-helpers.js";

export async function handler(req: AuthedRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }
  try {
    const key = getSettingKey(req);
    const revisionId = getString(req.body?.revision_id ?? req.body?.revisionId);
    if (!revisionId) {
      throw new ApiError("REVISION_REQUIRED", "revision_id is required", 400);
    }
    await assertRequestPermission(req, getSettingDefinition(key).permission);
    return successResponse(res, await rollbackSetting(req.db, {
      tenantId: requireTenantId(req),
      actorId: req.user.id,
      key,
      revisionId,
      changeNote: getString(req.body?.change_note ?? req.body?.changeNote),
    }));
  } catch (error) {
    return sendApiError(res, error, "SETTING_ROLLBACK_ERROR");
  }
}

export default requirePermission("console.access", handler);
