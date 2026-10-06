import { ApiError } from "./api-utils.js";
import {
  PERMISSION_KEYS,
  assertPermissionKey,
  assertPermissionRole,
  getDefaultPermission,
  type PermissionKey,
  type PermissionRole,
} from "./permissions-catalog.js";

export type PermissionsDatabase = any;

type CacheEntry = {
  configVersion: number;
  permissions: readonly PermissionKey[];
};

const permissionCache = new WeakMap<object, Map<string, CacheEntry>>();
const protectedAdminPermissions = new Set<PermissionKey>([
  "console.access",
  "console.access.edit",
]);

function permissionsError(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
) {
  return new ApiError(code, message, status, details);
}

function validatedRole(role: unknown): PermissionRole {
  try {
    return assertPermissionRole(role);
  } catch {
    throw permissionsError(
      "UNKNOWN_PERMISSION_ROLE",
      `Unknown permission role: ${String(role)}`,
    );
  }
}

function validatedKey(key: unknown): PermissionKey {
  try {
    return assertPermissionKey(key);
  } catch {
    throw permissionsError(
      "UNKNOWN_PERMISSION_KEY",
      `Unknown permission key: ${String(key)}`,
    );
  }
}

function cacheFor(db: object) {
  let cache = permissionCache.get(db);
  if (!cache) {
    cache = new Map<string, CacheEntry>();
    permissionCache.set(db, cache);
  }
  return cache;
}

function cacheKey(tenantId: string, role: PermissionRole) {
  return `${tenantId}:${role}`;
}

function invalidateTenant(db: object, tenantId: string) {
  const cache = permissionCache.get(db);
  if (!cache) return;
  for (const key of cache.keys()) {
    if (key.startsWith(`${tenantId}:`)) cache.delete(key);
  }
}

async function getTenantVersion(db: PermissionsDatabase, tenantId: string) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { configVersion: true },
  });
  if (!tenant) {
    throw permissionsError("TENANT_NOT_FOUND", "Tenant not found", 404);
  }
  return tenant.configVersion as number;
}

export async function resolvePermissions(
  db: PermissionsDatabase,
  tenantId: string,
  role: PermissionRole,
): Promise<PermissionKey[]> {
  const normalizedRole = validatedRole(role);
  const configVersion = await getTenantVersion(db, tenantId);
  const key = cacheKey(tenantId, normalizedRole);
  const cached = cacheFor(db).get(key);
  if (cached?.configVersion === configVersion) {
    return [...cached.permissions];
  }

  const overrides = await db.rolePermission.findMany({
    where: { tenantId, role: normalizedRole },
    select: { permissionKey: true, allowed: true },
  });
  const effective = new Map<PermissionKey, boolean>(
    PERMISSION_KEYS.map((permissionKey) => [
      permissionKey,
      getDefaultPermission(normalizedRole, permissionKey),
    ]),
  );
  for (const override of overrides as Array<{
    permissionKey: unknown;
    allowed: unknown;
  }>) {
    const permissionKey = validatedKey(override.permissionKey);
    if (typeof override.allowed !== "boolean") {
      throw permissionsError(
        "INVALID_PERMISSION_OVERRIDE",
        "Stored permission override is invalid",
        500,
        { permissionKey },
      );
    }
    effective.set(permissionKey, override.allowed);
  }

  const permissions = PERMISSION_KEYS.filter(
    (permissionKey) => effective.get(permissionKey) === true,
  );
  cacheFor(db).set(key, {
    configVersion,
    permissions: Object.freeze([...permissions]),
  });
  return [...permissions];
}

export async function updatePermissionOverride(
  db: PermissionsDatabase,
  input: {
    tenantId: string;
    role: PermissionRole;
    permissionKey: PermissionKey;
    allowed: boolean;
    actorId: string;
  },
) {
  const role = validatedRole(input.role);
  const permissionKey = validatedKey(input.permissionKey);
  if (typeof input.allowed !== "boolean") {
    throw permissionsError(
      "INVALID_PERMISSION_VALUE",
      "allowed must be a boolean",
    );
  }
  if (
    role === "admin" &&
    input.allowed === false &&
    protectedAdminPermissions.has(permissionKey)
  ) {
    throw permissionsError(
      "LOCKOUT_PREVENTED",
      `Cannot disable ${permissionKey} for admin`,
      400,
      { role, permissionKey },
    );
  }

  const defaultAllowed = getDefaultPermission(role, permissionKey);
  const result = await db.$transaction(async (tx: PermissionsDatabase) => {
    const tenant = await tx.tenant.findUnique({
      where: { id: input.tenantId },
      select: { configVersion: true },
    });
    if (!tenant) {
      throw permissionsError("TENANT_NOT_FOUND", "Tenant not found", 404);
    }

    const compoundKey = {
      tenantId: input.tenantId,
      role,
      permissionKey,
    };
    const current = await tx.rolePermission.findUnique({
      where: { tenantId_role_permissionKey: compoundKey },
    });
    const oldAllowed = current?.allowed ?? defaultAllowed;
    const shouldOverride = input.allowed !== defaultAllowed;
    if (oldAllowed === input.allowed && Boolean(current) === shouldOverride) {
      return {
        changed: false,
        allowed: input.allowed,
        isOverride: shouldOverride,
        configVersion: tenant.configVersion,
      };
    }

    if (shouldOverride) {
      await tx.rolePermission.upsert({
        where: { tenantId_role_permissionKey: compoundKey },
        create: {
          ...compoundKey,
          allowed: input.allowed,
          updatedById: input.actorId,
        },
        update: {
          allowed: input.allowed,
          updatedById: input.actorId,
        },
      });
    } else if (current) {
      await tx.rolePermission.delete({
        where: { tenantId_role_permissionKey: compoundKey },
      });
    }

    const updatedTenant = await tx.tenant.update({
      where: { id: input.tenantId },
      data: { configVersion: { increment: 1 } },
      select: { configVersion: true },
    });
    await tx.activityLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.actorId,
        action: JSON.stringify({
          type: "permission.override",
          role,
          permissionKey,
          oldAllowed,
          newAllowed: input.allowed,
          oldOverride: current?.allowed ?? null,
          newOverride: shouldOverride ? input.allowed : null,
        }),
        entityType: "role_permission",
        entityId: `${role}:${permissionKey}`,
      },
    });

    return {
      changed: true,
      allowed: input.allowed,
      isOverride: shouldOverride,
      configVersion: updatedTenant.configVersion,
    };
  });

  invalidateTenant(db, input.tenantId);
  return result;
}
