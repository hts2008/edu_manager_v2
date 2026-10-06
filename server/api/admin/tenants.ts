import type { TenantStatus } from "@prisma/client";
import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  type AuthedRequest,
  errorResponse,
  handleCors,
  requireAuth,
  successResponse,
} from "../../../lib/auth.js";
import { ApiError, sendApiError } from "../../../lib/api-utils.js";
import { assertPlatformOwner } from "../../../lib/platform-owner.js";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type TenantRecord = {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  configVersion: number;
  createdAt: Date;
  updatedAt: Date;
};

type TenantManagementDb = {
  tenant: {
    count(args: unknown): Promise<number>;
    create(args: unknown): Promise<TenantRecord>;
    findMany(args: unknown): Promise<TenantRecord[]>;
    findUnique(args: unknown): Promise<TenantRecord | null>;
    update(args: unknown): Promise<TenantRecord>;
  };
  activityLog: {
    create(args: unknown): Promise<unknown>;
  };
  $transaction<T>(
    callback: (tx: TenantManagementDb) => Promise<T>,
    options?: { isolationLevel: "Serializable" },
  ): Promise<T>;
};

type PlatformOwnerRequest = AuthedRequest & {
  user: AuthedRequest["user"] & { isPlatformOwner?: unknown };
};

function getBodyObject(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError("INVALID_BODY", "Request body must be an object", 400);
  }
  return body as Record<string, unknown>;
}

function getRequiredText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError("INVALID_FIELD", `${field} is required`, 400, { field });
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new ApiError("INVALID_FIELD", `${field} is too long`, 400, { field });
  }
  return normalized;
}

function parseSlug(value: unknown): string {
  const slug = getRequiredText(value, "slug", 63).toLowerCase();
  if (!SLUG_PATTERN.test(slug)) {
    throw new ApiError(
      "INVALID_SLUG",
      "slug must contain lowercase letters, numbers, and single hyphens only",
      400,
    );
  }
  return slug;
}

function parseStatus(value: unknown): TenantStatus {
  if (value !== "active" && value !== "suspended") {
    throw new ApiError(
      "INVALID_STATUS",
      "status must be active or suspended",
      400,
    );
  }
  return value;
}

function tenantToDto(tenant: TenantRecord) {
  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    status: tenant.status,
    config_version: tenant.configVersion,
    created_at: tenant.createdAt.toISOString(),
    updated_at: tenant.updatedAt.toISOString(),
  };
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

async function writeAudit(
  tx: TenantManagementDb,
  actorId: string,
  tenantId: string,
  action: string,
) {
  await tx.activityLog.create({
    data: {
      tenantId,
      userId: actorId,
      action,
      entityType: "Tenant",
      entityId: tenantId,
    },
  });
}

async function createTenant(
  db: TenantManagementDb,
  actorId: string,
  body: unknown,
) {
  const payload = getBodyObject(body);
  const name = getRequiredText(payload.name, "name", 160);
  const slug = parseSlug(payload.slug);

  try {
    return await db.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: { name, slug } });
      await writeAudit(tx, actorId, tenant.id, "tenant.created");
      return tenant;
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError("TENANT_SLUG_EXISTS", "Tenant slug already exists", 409);
    }
    throw error;
  }
}

async function updateTenant(
  db: TenantManagementDb,
  actorId: string,
  body: unknown,
) {
  const payload = getBodyObject(body);
  const id = getRequiredText(payload.id, "id", 128);
  const data: { name?: string; slug?: string; status?: TenantStatus } = {};

  if (payload.name !== undefined) data.name = getRequiredText(payload.name, "name", 160);
  if (payload.slug !== undefined) data.slug = parseSlug(payload.slug);
  if (payload.status !== undefined) data.status = parseStatus(payload.status);
  if (Object.keys(data).length === 0) {
    throw new ApiError("NO_CHANGES", "At least one tenant field is required", 400);
  }

  try {
    return await db.$transaction(async (tx) => {
      const existing = await tx.tenant.findUnique({ where: { id } });
      if (!existing) throw new ApiError("TENANT_NOT_FOUND", "Tenant not found", 404);

      if (existing.status === "active" && data.status === "suspended") {
        const activeTenantCount = await tx.tenant.count({ where: { status: "active" } });
        if (activeTenantCount <= 1) {
          throw new ApiError(
            "LAST_ACTIVE_TENANT",
            "The last active tenant cannot be suspended",
            409,
          );
        }
      }

      const tenant = await tx.tenant.update({ where: { id }, data });
      await writeAudit(tx, actorId, tenant.id, "tenant.updated");
      return tenant;
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError("TENANT_SLUG_EXISTS", "Tenant slug already exists", 409);
    }
    throw error;
  }
}

export function createTenantManagementHandler(db: TenantManagementDb) {
  return async function tenantManagementHandler(
    req: PlatformOwnerRequest,
    res: VercelResponse,
  ) {
    if (handleCors(req, res)) return;

    try {
      assertPlatformOwner(req.user);

      if (req.method === "GET") {
        const tenants = await db.tenant.findMany({
          orderBy: [{ status: "asc" }, { name: "asc" }],
        });
        return successResponse(res, {
          tenants: tenants.map(tenantToDto),
          total: tenants.length,
        });
      }

      if (req.method === "POST") {
        const tenant = await createTenant(db, req.user.userId, req.body);
        return successResponse(res, { tenant: tenantToDto(tenant) }, 201);
      }

      if (req.method === "PATCH") {
        const tenant = await updateTenant(db, req.user.userId, req.body);
        return successResponse(res, { tenant: tenantToDto(tenant) });
      }

      return errorResponse(
        res,
        "METHOD_NOT_ALLOWED",
        "Only GET, POST and PATCH allowed",
        405,
      );
    } catch (error) {
      return sendApiError(res, error, "TENANTS_ERROR");
    }
  };
}

export const handler = createTenantManagementHandler(
  prisma as unknown as TenantManagementDb,
);

// Runtime remains fail-closed until authenticated users carry an explicit
// isPlatformOwner flag sourced from persistent identity data.
export default requireAuth(handler as any);
