import type { VercelRequest, VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import { errorResponse, handleCors, successResponse } from "../../../lib/auth.js";
import { getString, sendApiError } from "../../../lib/api-utils.js";
import { assertCronRequest, getCronAuthorization } from "../../../lib/cron.js";
import { currentMonth, generateMonthlyFees } from "../../../lib/monthly-fee-generator.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== "GET" && req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET and POST allowed", 405);
  }
  if (!getCronAuthorization()) {
    return errorResponse(res, "CRON_NOT_CONFIGURED", "CRON_SECRET is not configured", 503);
  }
  if (!assertCronRequest(req)) {
    return errorResponse(res, "FORBIDDEN", "Invalid cron request", 403);
  }

  try {
    const month = getString(req.query.month || req.body?.month) || currentMonth();
    const dryRun = getString(req.query.dry_run || req.body?.dry_run) === "true";
    const result = await generateMonthlyFees(prisma, { month, dryRun });
    return successResponse(res, { job: "monthly-fees", ...result });
  } catch (error) {
    return sendApiError(res, error, "CRON_MONTHLY_FEES_ERROR");
  }
}
