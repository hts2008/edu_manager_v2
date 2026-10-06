import type { VercelResponse } from "../../../../lib/vercel-types.js";
import { errorResponse, successResponse, type AuthedRequest } from "../../../../lib/auth.js";
import { sendApiError } from "../../../../lib/api-utils.js";
import { assertRequestPermission, requirePermission } from "../../../../lib/require-permission.js";
import { getSettings } from "../../../../lib/settings.js";
import type { SettingGroup } from "../../../../lib/settings-registry.js";
import { getEffectiveMonth, getSettingGroup, requireTenantId } from "./api-helpers.js";

const SETTING_GROUP_READ_PERMISSIONS: Record<SettingGroup, string> = {
  finance: "console.finance.edit",
  academic: "console.academic.edit",
  access: "console.access.edit",
  integrations: "console.integrations.edit",
  organization: "console.organization.view",
  flags: "console.integrations.edit",
};

export async function handler(req: AuthedRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }
  try {
    const group = getSettingGroup(req.query.group);
    const effectiveMonth = getEffectiveMonth(req.query.effective_month);
    if (group) await assertRequestPermission(req, SETTING_GROUP_READ_PERMISSIONS[group] as any);
    return successResponse(res, await getSettings(req.db, {
      tenantId: requireTenantId(req),
      group,
      effectiveMonth,
    }));
  } catch (error) {
    return sendApiError(res, error, "SETTINGS_LIST_ERROR");
  }
}

export default requirePermission("console.access", handler);
