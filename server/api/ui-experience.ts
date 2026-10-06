import { z } from "zod";
import type { VercelResponse } from "../../lib/vercel-types.js";
import { requireAuth, successResponse, errorResponse, type AuthedRequest } from "../../lib/auth.js";
import { ApiError, sendApiError } from "../../lib/api-utils.js";
import { assertRequestPermission } from "../../lib/require-permission.js";
import { getSettings, updateSetting, type SettingsDatabase } from "../../lib/settings.js";
import { UI_COPY_SCHEMA, UI_THEME_SCHEMA, resolveUiExperience } from "../../lib/ui-experience.js";

const COPY_KEY = "organization.ui_copy.vi";
const THEME_KEY = "organization.ui_theme";
const publishSchema = z.object({
  copy: UI_COPY_SCHEMA,
  theme: UI_THEME_SCHEMA,
  expected_config_version: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER - 2),
}).strict();

export async function readExperience(db: SettingsDatabase, tenantId: string) {
  const snapshot = await getSettings(db, { tenantId, group: "organization" });
  const resolved = resolveUiExperience({
    copy: snapshot.settings.find(item => item.key === COPY_KEY)?.value,
    theme: snapshot.settings.find(item => item.key === THEME_KEY)?.value,
  });
  return { copy: resolved.overrides, theme: resolved.theme, config_version: snapshot.configVersion };
}

export async function publishExperience(db: SettingsDatabase, tenantId: string, actorId: string, body: unknown) {
  const parsed = publishSchema.safeParse(body);
  if (!parsed.success) throw new ApiError("INVALID_EXPERIENCE", "Invalid copy, theme or configuration version", 400);
  const input = parsed.data;
  return db.$transaction(async (tx: SettingsDatabase) => {
    // Reuse settings validation/revisions/audit inside the same outer transaction.
    // Never inherit from Prisma proxies: assigning $transaction can mutate their source client.
    const settingsDb = {
      tenant: tx.tenant,
      settingValue: tx.settingValue,
      settingRevision: tx.settingRevision,
      activityLog: tx.activityLog,
      $transaction: (run: (client: SettingsDatabase) => Promise<unknown>) => run(tx),
    };
    await updateSetting(settingsDb, { tenantId, actorId, key: COPY_KEY, value: input.copy,
      expectedConfigVersion: input.expected_config_version });
    await updateSetting(settingsDb, { tenantId, actorId, key: THEME_KEY, value: input.theme,
      expectedConfigVersion: input.expected_config_version + 1 });
    return readExperience(tx, tenantId);
  }, { isolationLevel: "Serializable" });
}

export async function handler(req: AuthedRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "GET" && req.method !== "PUT") {
    res.setHeader("Allow", "GET, PUT");
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET and PUT allowed", 405);
  }
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new ApiError("TENANT_CONTEXT_REQUIRED", "Tenant context is required", 403);
    if (req.method === "PUT") {
      await assertRequestPermission(req, "console.experience.edit");
      return successResponse(res, await publishExperience(req.db, tenantId, req.user.id, req.body));
    }
    return successResponse(res, await req.db.$transaction(
      tx => readExperience(tx, tenantId), { isolationLevel: "Serializable" },
    ));
  } catch (error) {
    if ((error as { code?: string })?.code === "P2034") {
      return errorResponse(res, "SETTING_CONFIG_CONFLICT", "Configuration changed; reload before publishing", 409);
    }
    return sendApiError(res, error, "UI_EXPERIENCE_ERROR");
  }
}

export default requireAuth(handler);
