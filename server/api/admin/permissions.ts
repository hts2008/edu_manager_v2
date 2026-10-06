import type { VercelResponse } from "../../../lib/vercel-types.js";
import {
  errorResponse,
  requireAuth,
  successResponse,
  type AuthedRequest,
} from "../../../lib/auth.js";
import { ApiError, sendApiError } from "../../../lib/api-utils.js";
import { requirePermission } from "../../../lib/require-permission.js";
import {
  PERMISSION_CATALOG,
  PERMISSION_ROLES,
  assertPermissionKey,
  assertPermissionRole,
  type PermissionKey,
  type PermissionRole,
} from "../../../lib/permissions-catalog.js";
import {
  resolvePermissions,
  updatePermissionOverride,
} from "../../../lib/permissions.js";

function requireTenantId(req: AuthedRequest) {
  if (!req.user.tenantId) {
    throw new ApiError(
      "TENANT_CONTEXT_REQUIRED",
      "Tenant context is required",
      409,
    );
  }
  return req.user.tenantId;
}

function getRole(value: unknown): PermissionRole {
  try {
    return assertPermissionRole(value);
  } catch {
    throw new ApiError(
      "UNKNOWN_PERMISSION_ROLE",
      `Unknown permission role: ${String(value)}`,
      400,
    );
  }
}

function getPermissionKey(value: unknown): PermissionKey {
  try {
    return assertPermissionKey(value);
  } catch {
    throw new ApiError(
      "UNKNOWN_PERMISSION_KEY",
      `Unknown permission key: ${String(value)}`,
      400,
    );
  }
}

function getAllowed(value: unknown) {
  if (typeof value !== "boolean") {
    throw new ApiError(
      "INVALID_PERMISSION_VALUE",
      "allowed must be a boolean",
      400,
    );
  }
  return value;
}

async function getPermissionMatrix(req: AuthedRequest, tenantId: string) {
  const overrides = await req.db.rolePermission.findMany({
    where: { tenantId },
    select: { role: true, permissionKey: true, allowed: true },
  });
  const overrideMap = new Map(
    overrides.map((override) => [
      `${override.role}:${override.permissionKey}`,
      override.allowed,
    ]),
  );

  const effectiveEntries = await Promise.all(
    PERMISSION_ROLES.map(async (role) => [
      role,
      new Set(await resolvePermissions(req.db, tenantId, role)),
    ] as const),
  );
  const effectiveByRole = new Map(effectiveEntries);

  return {
    roles: [...PERMISSION_ROLES],
    catalog: PERMISSION_CATALOG.map((permission) => ({
      key: permission.key,
      domain: permission.domain,
      label_vi: permission.labelVi,
      description_vi: permission.descriptionVi,
      surfaces: [...permission.surfaces],
      defaults: { ...permission.defaults },
    })),
    effective_matrix: Object.fromEntries(
      PERMISSION_ROLES.map((role) => [
        role,
        Object.fromEntries(
          PERMISSION_CATALOG.map((permission) => {
            const override = overrideMap.get(`${role}:${permission.key}`);
            return [
              permission.key,
              {
                allowed: effectiveByRole.get(role)?.has(permission.key) === true,
                default_allowed: permission.defaults[role],
                is_override: override !== undefined,
                override: override ?? null,
              },
            ];
          }),
        ),
      ]),
    ),
  };
}

export async function handler(req: AuthedRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "PUT") {
    return errorResponse(
      res,
      "METHOD_NOT_ALLOWED",
      "Only GET and PUT allowed",
      405,
    );
  }

  try {
    const tenantId = requireTenantId(req);
    if (req.method === "GET") {
      return successResponse(res, await getPermissionMatrix(req, tenantId));
    }

    const role = getRole(req.body?.role);
    const permissionKey = getPermissionKey(
      req.body?.permission_key ?? req.body?.permissionKey,
    );
    const result = await updatePermissionOverride(req.db, {
      tenantId,
      role,
      permissionKey,
      allowed: getAllowed(req.body?.allowed),
      actorId: req.user.id,
    });
    return successResponse(res, {
      role,
      permission_key: permissionKey,
      ...result,
    });
  } catch (error) {
    return sendApiError(res, error, "PERMISSIONS_API_ERROR");
  }
}

export default requirePermission("console.access.edit", handler);
