import type { VercelResponse } from "../../../../lib/vercel-types.js";
import { errorResponse, successResponse, type AuthedRequest } from "../../../../lib/auth.js";
import { sendApiError } from "../../../../lib/api-utils.js";
import { assertRequestPermission, requirePermission } from "../../../../lib/require-permission.js";
import { getSettingDefinition } from "../../../../lib/settings-registry.js";
import { updateSetting, validateSettingUpdate } from "../../../../lib/settings.js";
import { getSettingKey, requireTenantId } from "./api-helpers.js";

export async function handler(req: AuthedRequest, res: VercelResponse) {
  if (req.method !== "PUT") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only PUT allowed", 405);
  }
  try {
    const key = getSettingKey(req);
    const input = {
      key,
      value: req.body?.value,
      effectiveFromMonth: req.body?.effective_from_month ?? req.body?.effectiveFromMonth,
      changeNote: req.body?.change_note ?? req.body?.changeNote,
      expectedConfigVersion: req.body?.expected_config_version !== undefined
        ? req.body.expected_config_version : req.body?.expectedConfigVersion,
    };
    validateSettingUpdate(input);
    await assertRequestPermission(req, getSettingDefinition(key).permission);
    return successResponse(res, await updateSetting(req.db, {
      tenantId: requireTenantId(req),
      actorId: req.user.id,
      ...input,
    }));
  } catch (error) {
    return sendApiError(res, error, "SETTING_UPDATE_ERROR");
  }
}

export default requirePermission("console.access", handler);
