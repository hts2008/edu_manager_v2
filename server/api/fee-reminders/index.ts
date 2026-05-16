import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  errorResponse,
  handleCors,
  requireAuth,
  successResponse,
} from "../../../lib/auth.js";
import { getString, sendApiError } from "../../../lib/api-utils.js";
import { runFeeReminders } from "../../../lib/fee-reminders.js";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
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
    const source = req.method === "GET" ? req.query : req.body;
    const month = getString(source?.month) || currentMonth();
    const dryRun = req.method === "GET" ? true : parseDryRun(source?.dry_run);
    return successResponse(res, await runFeeReminders(prisma, { month, dryRun }));
  } catch (error) {
    return sendApiError(res, error, "FEE_REMINDERS_ERROR");
  }
}

export default requireAuth(handler, ["admin"]);
