import type { VercelResponse } from "../../../lib/vercel-types.js";
import {
  AuthedRequest,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";
import { resolvePermissions } from "../../../lib/permissions.js";

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  const permissions = req.user.tenantId
    ? await resolvePermissions(req.db, req.user.tenantId, req.user.role)
    : [];

  return successResponse(res, {
    user: {
      id: req.user.id,
      username: req.user.username,
      fullName: req.user.fullName,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      status: req.user.status || "active",
      lastLogin: req.user.lastLogin,
      tenant_id: req.user.tenantId ?? null,
      is_platform_owner: req.user.isPlatformOwner,
      permissions,
    },
  });
}

export default requireAuth(handler);
