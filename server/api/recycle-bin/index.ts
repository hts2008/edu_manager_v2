import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  errorResponse,
  handleCors,
  requireAuth,
  successResponse,
} from "../../../lib/auth.js";
import { getString, logActivity, sendApiError } from "../../../lib/api-utils.js";
import {
  listDeletedItems,
  RecycleResource,
  runRecycleAction,
} from "../../../lib/recycle-bin.js";
import { recycleBinActionSchema, validateBody } from "../../../lib/validation.js";

function parseResource(value: unknown): RecycleResource | undefined {
  const resource = getString(value);
  if (!resource) return undefined;
  if (["students", "parents", "receipts", "payments"].includes(resource)) {
    return resource as RecycleResource;
  }
  return undefined;
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method === "GET") {
    try {
      const resource = parseResource(req.query.resource);
      if (req.query.resource && !resource) {
        return errorResponse(res, "INVALID_RESOURCE", "Invalid recycle-bin resource", 400);
      }
      return successResponse(res, await listDeletedItems(prisma, resource));
    } catch (error) {
      return sendApiError(res, error, "RECYCLE_BIN_LIST_ERROR");
    }
  }

  if (req.method === "POST") {
    try {
      const body = validateBody(recycleBinActionSchema, req.body);
      await runRecycleAction(prisma, body.resource, body.action, body.id);
      await logActivity(
        req,
        req.user.id,
        `RECYCLE_${body.action.toUpperCase()}_${body.resource.toUpperCase()}`,
        body.resource,
        body.id
      );
      return successResponse(res, {
        resource: body.resource,
        action: body.action,
        id: body.id,
        message: `${body.action} completed`,
      });
    } catch (error) {
      return sendApiError(res, error, "RECYCLE_BIN_ACTION_ERROR");
    }
  }

  return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

export default requireAuth(handler, ["admin"]);
