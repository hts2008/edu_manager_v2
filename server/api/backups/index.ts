import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  errorResponse,
  handleCors,
  requireAuth,
  successResponse,
} from "../../../lib/auth.js";
import {
  createDatabaseBackup,
  fetchDatabaseBackup,
  openBackupEnvelope,
  restoreDatabaseBackup,
  verifyDatabaseBackup,
} from "../../../lib/backup.js";
import { getString, sendApiError } from "../../../lib/api-utils.js";

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
    const action = getString(req.body?.action || req.query.action) || "run";
    if (action === "verify") {
      const url = getString(req.body?.url || req.query.url);
      if (!url) return errorResponse(res, "URL_REQUIRED", "backup url is required", 400);
      return successResponse(res, await verifyDatabaseBackup(url));
    }
    if (action === "restore") {
      const confirmation = getString(req.body?.confirmation);
      const backup = req.body?.envelope
        ? openBackupEnvelope(req.body.envelope)
        : await fetchDatabaseBackup(getString(req.body?.url) || "");
      return successResponse(
        res,
        await restoreDatabaseBackup(prisma, backup, {
          databaseUrl: process.env.DATABASE_URL,
          confirmation,
          nodeEnv: process.env.NODE_ENV,
        })
      );
    }

    const dryRun = parseDryRun(req.body?.dry_run ?? req.query.dry_run);
    return successResponse(res, await createDatabaseBackup(prisma, { dryRun }));
  } catch (error) {
    return sendApiError(res, error, "BACKUP_ERROR");
  }
}

export default requireAuth(handler, ["admin"]);
