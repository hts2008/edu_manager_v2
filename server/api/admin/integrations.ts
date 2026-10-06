import type { VercelResponse } from "../../../lib/vercel-types.js";
import {
  errorResponse,
  requireAuth,
  successResponse,
  type AuthedRequest,
} from "../../../lib/auth.js";
import { ApiError, sendApiError } from "../../../lib/api-utils.js";
import { requirePermission } from "../../../lib/require-permission.js";
import {
  checkRateLimit,
  getClientIp,
  setRateLimitHeaders,
} from "../../../lib/rate-limit.js";
import { getSetting, updateSetting } from "../../../lib/settings.js";
import {
  INTEGRATION_KINDS,
  getIntegrationConfig,
  requireIntegrationKind,
  resolveIntegrationDeliveryConfig,
  testIntegrationDelivery,
  upsertIntegrationConfig,
  type IntegrationKind,
} from "../../../lib/integration-config.js";

const INTEGRATION_KIND = "fee_reminder_webhook";
const FIELD_TO_SETTING = {
  enabled: "flags.fee_reminders_enabled",
  message_template: "finance.reminder_message_template",
} as const;

function requireTenantId(req: AuthedRequest) {
  if (!req.user.tenantId) {
    throw new ApiError(
      "TENANT_CONTEXT_REQUIRED",
      "A tenant-scoped session is required for integrations",
      409,
    );
  }
  return req.user.tenantId;
}

function requireField(value: unknown): keyof typeof FIELD_TO_SETTING {
  if (typeof value !== "string" || !(value in FIELD_TO_SETTING)) {
    throw new ApiError(
      "UNKNOWN_INTEGRATION_FIELD",
      "Only enabled and message_template can be updated",
      400,
    );
  }
  return value as keyof typeof FIELD_TO_SETTING;
}

function optionalChangeNote(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new ApiError("INVALID_CHANGE_NOTE", "change_note must be a string", 400);
  }
  return value;
}

const EMPTY_INTEGRATION_DB = {
  integrationConfig: {
    findUnique: async () => null,
    upsert: async () => {
      throw new ApiError(
        "INTEGRATION_STORAGE_UNAVAILABLE",
        "Integration configuration storage is unavailable",
        503,
      );
    },
  },
};

function integrationDb(req: AuthedRequest) {
  return (req.db as any).integrationConfig ? req.db : EMPTY_INTEGRATION_DB;
}

async function getIntegration(
  req: AuthedRequest,
  kind: IntegrationKind,
  enabledSetting?: Awaited<ReturnType<typeof getSetting>>,
  messageTemplateSetting?: Awaited<ReturnType<typeof getSetting>>,
) {
  const tenantId = requireTenantId(req);
  const [enabled, messageTemplate, stored] = await Promise.all([
    enabledSetting ??
      getSetting(req.db, { tenantId, key: FIELD_TO_SETTING.enabled }),
    messageTemplateSetting ??
      getSetting(req.db, {
        tenantId,
        key: FIELD_TO_SETTING.message_template,
      }),
    getIntegrationConfig(integrationDb(req), tenantId, kind),
  ]);
  const fallback = stored
    ? null
    : await resolveIntegrationDeliveryConfig(integrationDb(req), tenantId, kind);
  const endpointConfigured = stored
    ? Boolean(stored.config.url)
    : Boolean(fallback?.url);
  const credentialConfigured = stored
    ? stored.secret_configured
    : Boolean(fallback?.secret);
  const environmentAllowsSend = process.env.REMINDER_SEND_ENABLED === "true";
  const tenantEnabled = enabled.value === true;
  const deliveryEnabled = stored?.config.enabled ?? fallback?.enabled ?? false;

  return {
    kind,
    enabled: tenantEnabled,
    status:
      !tenantEnabled || !environmentAllowsSend || !deliveryEnabled
        ? "disabled"
        : endpointConfigured
          ? "ready"
          : "not_configured",
    endpoint_configured: endpointConfigured,
    credential_configured: credentialConfigured,
    environment_allows_send: environmentAllowsSend,
    message_template: messageTemplate.value,
    config: stored?.config ?? { url: "", enabled: deliveryEnabled },
    config_source: stored ? "database" : fallback?.source ?? "none",
    secret_configured: stored?.secret_configured ?? credentialConfigured,
    secret_masked:
      stored?.secret_masked ?? (credentialConfigured ? "••••••••" : null),
    updated_by_id: stored?.updated_by_id ?? null,
    updated_at: stored?.updated_at ?? null,
    provenance: {
      enabled: enabled.provenance,
      message_template: messageTemplate.provenance,
    },
    revision: {
      enabled: enabled.revision,
      message_template: messageTemplate.revision,
    },
    warnings: [...(enabled.warnings ?? []), ...(messageTemplate.warnings ?? [])],
  };
}

async function updateIntegration(req: AuthedRequest) {
  const kind = requireIntegrationKind(req.body?.kind);
  if (Object.hasOwn(req.body ?? {}, "config")) {
    const secret = req.body?.secret;
    if (
      secret !== undefined &&
      secret !== null &&
      typeof secret !== "string"
    ) {
      throw new ApiError(
        "INTEGRATION_SECRET_INVALID",
        "secret must be a string or null",
        400,
      );
    }
    const integration = await upsertIntegrationConfig(integrationDb(req), {
      tenantId: requireTenantId(req),
      kind,
      config: req.body?.config,
      secret,
      updatedById: req.user.id,
    });
    return { integration };
  }

  if (kind !== INTEGRATION_KIND) {
    throw new ApiError(
      "UNKNOWN_INTEGRATION_FIELD",
      "Legacy setting updates are supported only for fee_reminder_webhook",
      400,
    );
  }
  const field = requireField(req.body?.field);
  const result = await updateSetting(req.db, {
    tenantId: requireTenantId(req),
    actorId: req.user.id,
    key: FIELD_TO_SETTING[field],
    value: req.body?.value,
    changeNote: optionalChangeNote(req.body?.change_note),
  });
  const integration = await getIntegration(req, INTEGRATION_KIND);
  return {
    integration: {
      ...integration,
      [field]: result.value,
    },
  };
}

async function writeTestAudit(
  req: AuthedRequest,
  kind: IntegrationKind,
  action: "integration.test_send.requested" | "integration.test_send.rate_limited",
) {
  await req.db.activityLog.create({
    data: {
      tenantId: requireTenantId(req),
      userId: req.user.id,
      action,
      entityType: "IntegrationConfig",
      entityId: kind,
      ipAddress: getClientIp(req),
      userAgent: Array.isArray(req.headers["user-agent"])
        ? req.headers["user-agent"][0]
        : req.headers["user-agent"] ?? null,
    },
  });
}

export async function sendIntegrationTest(
  req: AuthedRequest,
  res: VercelResponse,
  kindValue: unknown,
) {
  const kind = requireIntegrationKind(kindValue);
  const tenantId = requireTenantId(req);
  const limit = checkRateLimit(
    `integration-test:${tenantId}:${req.user.id}:${kind}:${getClientIp(req)}`,
    { windowMs: 5 * 60_000, max: 5 },
  );
  setRateLimitHeaders(res, limit);
  if (!limit.allowed) {
    await writeTestAudit(req, kind, "integration.test_send.rate_limited");
    throw new ApiError(
      "INTEGRATION_TEST_RATE_LIMITED",
      "Too many integration test requests. Try again later.",
      429,
      { retry_after_seconds: limit.retryAfterSeconds },
    );
  }
  await writeTestAudit(req, kind, "integration.test_send.requested");
  return testIntegrationDelivery(integrationDb(req), {
    tenantId,
    kind,
    ...(process.env.NODE_ENV === "test"
      ? { fetchImpl: globalThis.fetch }
      : {}),
  });
}

export async function handler(req: AuthedRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const tenantId = requireTenantId(req);
      const [enabled, messageTemplate] = await Promise.all([
        getSetting(req.db, { tenantId, key: FIELD_TO_SETTING.enabled }),
        getSetting(req.db, {
          tenantId,
          key: FIELD_TO_SETTING.message_template,
        }),
      ]);
      return successResponse(res, {
        integrations: await Promise.all(
          INTEGRATION_KINDS.map((kind) =>
            getIntegration(req, kind, enabled, messageTemplate),
          ),
        ),
      });
    }
    if (req.method === "PUT") {
      return successResponse(res, await updateIntegration(req));
    }
    if (req.method === "POST") {
      return successResponse(
        res,
        await sendIntegrationTest(req, res, req.body?.kind),
      );
    }
    return errorResponse(
      res,
      "METHOD_NOT_ALLOWED",
      "Only GET, PUT and POST allowed",
      405,
    );
  } catch (error) {
    return sendApiError(res, error, "INTEGRATIONS_ERROR");
  }
}

export default requirePermission("console.integrations.edit", handler);
