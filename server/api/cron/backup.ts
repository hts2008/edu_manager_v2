import type { VercelRequest, VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import { errorResponse, handleCors, successResponse } from "../../../lib/auth.js";
import { sendApiError } from "../../../lib/api-utils.js";
import { assertCronRequest, getCronAuthorization } from "../../../lib/cron.js";
import { createDatabaseBackup } from "../../../lib/backup.js";

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
    return successResponse(res, {
      job: "backup",
      ...(await createDatabaseBackup(prisma, { dryRun: false })),
    });
  } catch (error) {
    return sendApiError(res, error, "CRON_BACKUP_ERROR");
  }
}
