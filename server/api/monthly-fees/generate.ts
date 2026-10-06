import type { VercelResponse } from "../../../lib/vercel-types.js";
import {
  AuthedRequest,
  handleCors,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";
import { requirePermission } from "../../../lib/require-permission.js";
import { getString, sendApiError } from "../../../lib/api-utils.js";
import { currentMonth, generateMonthlyFees } from "../../../lib/monthly-fee-generator.js";
import { loadTuitionSettings } from "../../../lib/tuition-settings.js";

function parseDryRun(value: unknown) {
  const raw = getString(value);
  return raw === undefined ? true : raw !== "false";
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }

  try {
    const month = getString(req.body?.month || req.query.month) || currentMonth();
    const dryRun = parseDryRun(req.body?.dry_run ?? req.query.dry_run);
    const settings = await loadTuitionSettings(req.db, {
      tenantId: req.user.tenantId!,
      effectiveMonth: month,
    });
    return successResponse(
      res,
      await generateMonthlyFees(req.db, {
        month,
        dryRun,
        tenantId: req.user.tenantId!,
        settings,
      }),
    );
  } catch (error) {
    return sendApiError(res, error, "MONTHLY_FEES_GENERATE_ERROR");
  }
}

export default requirePermission("monthly_fees.generate", handler);
