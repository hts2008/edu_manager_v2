import type { VercelResponse } from "../../../lib/vercel-types.js";
import {
  errorResponse,
  requireAuth,
  successResponse,
  type AuthedRequest,
} from "../../../lib/auth.js";
import { ApiError, sendApiError } from "../../../lib/api-utils.js";
import { requirePermission } from "../../../lib/require-permission.js";
import { getSettings, updateSetting } from "../../../lib/settings.js";

const FEATURE_KEYS = [
  "flags.fee_reminders_enabled",
  "flags.parent_portal_enabled",
] as const;

function requireTenantId(req: AuthedRequest) {
  if (!req.user.tenantId) {
    throw new ApiError(
      "TENANT_CONTEXT_REQUIRED",
      "A tenant-scoped session is required for feature flags",
      409,
    );
  }
  return req.user.tenantId;
}

function featureKey(value: unknown): (typeof FEATURE_KEYS)[number] {
  if (typeof value !== "string" || !(FEATURE_KEYS as readonly string[]).includes(value)) {
    throw new ApiError("UNKNOWN_FEATURE_FLAG", "Unknown feature flag", 400);
  }
  return value as (typeof FEATURE_KEYS)[number];
}

function featureValue(value: unknown) {
  if (typeof value !== "boolean") {
    throw new ApiError(
      "INVALID_FEATURE_FLAG_VALUE",
      "enabled must be a boolean",
      400,
    );
  }
  return value;
}

function optionalChangeNote(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new ApiError("INVALID_CHANGE_NOTE", "change_note must be a string", 400);
  }
  return value;
}

function toFeature(setting: any) {
  return {
    key: setting.key,
    enabled: setting.value,
    label_vi: setting.definition?.labelVi ?? null,
    description_vi: setting.definition?.descriptionVi ?? null,
    provenance: setting.provenance,
    revision: setting.revision,
    updated_by_id: setting.updatedById ?? null,
    updated_at: setting.updatedAt ?? null,
    warnings: setting.warnings ?? [],
  };
}

async function listFeatures(req: AuthedRequest) {
  const result = await getSettings(req.db, {
    tenantId: requireTenantId(req),
    group: "flags",
  });
  const byKey = new Map(result.settings.map((setting) => [setting.key, setting]));
  return {
    config_version: result.configVersion,
    features: FEATURE_KEYS.map((key) => toFeature(byKey.get(key))),
  };
}

async function updateFeature(req: AuthedRequest) {
  const key = featureKey(req.body?.key);
  const enabled = featureValue(req.body?.enabled);
  const result = await updateSetting(req.db, {
    tenantId: requireTenantId(req),
    actorId: req.user.id,
    key,
    value: enabled,
    changeNote: optionalChangeNote(req.body?.change_note),
  });
  return {
    feature: {
      key: result.key,
      enabled: result.value,
      provenance: result.provenance,
      revision: result.revision,
    },
  };
}

export async function handler(req: AuthedRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") return successResponse(res, await listFeatures(req));
    if (req.method === "PUT") return successResponse(res, await updateFeature(req));
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET and PUT allowed", 405);
  } catch (error) {
    return sendApiError(res, error, "FEATURE_FLAGS_ERROR");
  }
}

export default requirePermission("console.integrations.edit", handler);
