import type { VercelResponse } from "../../../lib/vercel-types.js";
import {
  AuthedRequest,
  errorResponse,
  handleCors,
  successResponse,
} from "../../../lib/auth.js";
import { getBusinessMonthKey, getString, sendApiError } from "../../../lib/api-utils.js";
import { runFeeReminders } from "../../../lib/fee-reminders.js";
import { resolveFeatureRuntime } from "../../../lib/feature-flags.js";
import {
  resolveIntegrationDeliveryConfig,
  resolveSafeIntegrationEndpoint,
} from "../../../lib/integration-config.js";
import { requirePermission } from "../../../lib/require-permission.js";

function currentMonth() {
  return getBusinessMonthKey();
}

function parseDryRun(value: unknown) {
  const raw = getString(value);
  return raw === undefined ? true : raw !== "false";
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== "GET" && req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET and POST allowed", 405);
  }

  try {
    if (!req.user.tenantId) {
      return errorResponse(res, "TENANT_CONTEXT_REQUIRED", "Tenant context is required", 409);
    }
    const source = req.method === "GET" ? req.query : req.body;
    const month = getString(source?.month) || currentMonth();
    const dryRun = req.method === "GET" ? true : parseDryRun(source?.dry_run);
    const [runtime, delivery] = await Promise.all([
      resolveFeatureRuntime(req.db, req.user.tenantId),
      resolveIntegrationDeliveryConfig(
        req.db,
        req.user.tenantId,
        "fee_reminder_webhook",
      ),
    ]);
    if (!dryRun && delivery.enabled && delivery.url) {
      await resolveSafeIntegrationEndpoint(delivery.url);
    }
    return successResponse(res, await runFeeReminders(req.db, {
      month,
      dryRun,
      runtime: {
        liveSendEnabled: runtime.feeReminders.liveSendEnabled,
        messageTemplate: runtime.feeReminders.messageTemplate,
        delivery: {
          url: delivery.url,
          enabled: delivery.enabled,
          secret: delivery.secret,
        },
      },
    }));
  } catch (error) {
    return sendApiError(res, error, "FEE_REMINDERS_ERROR");
  }
}

export default requirePermission("fee_reminders.send", handler);
