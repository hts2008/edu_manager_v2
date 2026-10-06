import type { VercelRequest, VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import { errorResponse, handleCors, successResponse } from "../../../lib/auth.js";
import { ApiError, sendApiError } from "../../../lib/api-utils.js";
import { normalizePhone, signParentToken, toDateOnly } from "../../../lib/parent-auth.js";
import { validateParentPortalLogin } from "../../../lib/auth-validation.js";
import { getClientIp, setRateLimitHeaders } from "../../../lib/rate-limit.js";
import {
  checkDistributedRateLimit,
  getLoginRateLimitConfig,
} from "../../../lib/distributed-rate-limit.js";
import { getTenancyMode, resolveLoginTenantSlug } from "../../../lib/tenancy.js";
import {
  assertParentPortalEnabled,
  resolveFeatureRuntime,
} from "../../../lib/feature-flags.js";

function parentToDto(parent: any) {
  return {
    id: parent.id,
    full_name: parent.fullName,
    phone: parent.phone,
    email: parent.email,
    relationship: parent.relationship,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }

  try {
    const payload = validateParentPortalLogin(req.body);
    const phone = normalizePhone(payload.phone);
    const dateOfBirth = payload.dateOfBirth;
    let tenantSlug: string | null;
    try {
      tenantSlug = resolveLoginTenantSlug(
        typeof req.body?.tenant_slug === "string" ? req.body.tenant_slug : undefined,
        getTenancyMode(),
      );
    } catch (error) {
      throw new ApiError(
        "TENANT_REQUIRED",
        error instanceof Error ? error.message : "Tenant identity is required",
        400,
      );
    }

    const limit = await checkDistributedRateLimit(
      `parent-login:${getClientIp(req)}:${phone}`,
      getLoginRateLimitConfig(process.env, "PARENT_LOGIN_RATE_LIMIT"),
    );
    setRateLimitHeaders(res, limit);
    if (!limit.allowed) {
      throw new ApiError("RATE_LIMITED", "Too many login attempts. Please try again later.", 429);
    }

    const tenant = tenantSlug
      ? await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
      : null;
    if (tenantSlug && (!tenant || tenant.status !== "active")) {
      throw new ApiError("PARENT_PORTAL_LOGIN_FAILED", "Invalid parent credentials", 401);
    }
    if (!tenant) {
      throw new ApiError("TENANT_REQUIRED", "Tenant identity is required", 400);
    }
    assertParentPortalEnabled(await resolveFeatureRuntime(prisma, tenant.id));

    const parent = await prisma.parent.findUnique({
      where: {
        tenantId_phoneNormalized: {
          tenantId: tenant.id,
          phoneNormalized: phone,
        },
      },
      include: { students: { where: { deletedAt: null } } },
    });
    if (!parent || parent.deletedAt) {
      throw new ApiError("PARENT_PORTAL_LOGIN_FAILED", "Invalid parent credentials", 401);
    }
    if (!parent.tenantId) {
      throw new ApiError(
        "PARENT_TENANT_UNAVAILABLE",
        "Parent portal tenant is unavailable",
        503,
      );
    }

    const matchingStudent = parent.students.find(
      (student: any) => toDateOnly(student.dateOfBirth) === dateOfBirth,
    );
    if (!matchingStudent) {
      throw new ApiError("PARENT_PORTAL_LOGIN_FAILED", "Invalid parent credentials", 401);
    }

    return successResponse(res, {
      token: await signParentToken(parent.id, parent.tokenVersion, parent.tenantId),
      parent: parentToDto(parent),
      students: parent.students.map((student: any) => ({
        id: student.id,
        full_name: student.fullName,
        date_of_birth: toDateOnly(student.dateOfBirth),
        status: student.status,
      })),
    });
  } catch (error) {
    return sendApiError(res, error, "PARENT_PORTAL_LOGIN_ERROR");
  }
}
