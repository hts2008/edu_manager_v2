import type { VercelResponse } from "../../../../../lib/vercel-types.js";
import {
  errorResponse,
  successResponse,
  type AuthedRequest,
} from "../../../../../lib/auth.js";
import { ApiError, sendApiError } from "../../../../../lib/api-utils.js";
import { requirePermission } from "../../../../../lib/require-permission.js";
import { sendIntegrationTest } from "../../integrations.js";

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

export async function handler(req: AuthedRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
    }
    return successResponse(
      res,
      await sendIntegrationTest(req, res, req.query.kind),
    );
  } catch (error) {
    return sendApiError(res, error, "INTEGRATION_TEST_ERROR");
  }
}

export default requirePermission("console.integrations.edit", handler);
