import type { VercelResponse } from "./vercel-types.js";
import {
  errorResponse,
  requireAuth,
  type AuthedRequest,
  type AuthUser,
} from "./auth.js";
import {
  assertPermissionKey,
  type PermissionKey,
} from "./permissions-catalog.js";
import { resolvePermissions } from "./permissions.js";
import { ApiError } from "./api-utils.js";

type PermissionHandler = (
  req: AuthedRequest,
  res: VercelResponse,
  user: AuthUser,
) => Promise<void | VercelResponse> | void | VercelResponse;

export function requirePermission(
  permission: PermissionKey,
  handler: PermissionHandler,
) {
  const permissionKey = assertPermissionKey(permission);

  return requireAuth(async (req, res, user) => {
    if (!user.tenantId) {
      return errorResponse(
        res,
        "TENANT_CONTEXT_REQUIRED",
        "Tenant context is required",
        403,
      );
    }

    const permissions = await resolvePermissions(
      req.db,
      user.tenantId,
      user.role,
    );
    if (!permissions.includes(permissionKey)) {
      return errorResponse(
        res,
        "PERMISSION_DENIED",
        "Permission denied",
        403,
        { permission_key: permissionKey },
      );
    }

    return handler(req, res, user);
  });
}

export async function assertRequestPermission(
  req: AuthedRequest,
  permission: PermissionKey,
) {
  const permissionKey = assertPermissionKey(permission);
  const tenantId = req.user.tenantId;
  if (!tenantId) {
    throw new ApiError("TENANT_CONTEXT_REQUIRED", "Tenant context is required", 403);
  }
  const permissions = await resolvePermissions(req.db, tenantId, req.user.role);
  if (!permissions.includes(permissionKey)) {
    throw new ApiError("PERMISSION_DENIED", "Permission denied", 403, {
      permission_key: permissionKey,
    });
  }
}
