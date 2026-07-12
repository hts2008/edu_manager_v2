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
    const limit = await checkDistributedRateLimit(
      `parent-login:${getClientIp(req)}:${phone}`,
      getLoginRateLimitConfig(process.env, "PARENT_LOGIN_RATE_LIMIT")
    );
    setRateLimitHeaders(res, limit);
    if (!limit.allowed) {
      throw new ApiError("RATE_LIMITED", "Too many login attempts. Please try again later.", 429);
    }

    const parent = await prisma.parent.findUnique({
      where: { phoneNormalized: phone },
      include: { students: { where: { deletedAt: null } } },
    });
    if (!parent || parent.deletedAt) {
      throw new ApiError("PARENT_PORTAL_LOGIN_FAILED", "Invalid parent credentials", 401);
    }

    const matchingStudent = parent.students.find(
      (student: any) => toDateOnly(student.dateOfBirth) === dateOfBirth
    );
    if (!matchingStudent) {
      throw new ApiError("PARENT_PORTAL_LOGIN_FAILED", "Invalid parent credentials", 401);
    }

    return successResponse(res, {
      token: await signParentToken(parent.id, parent.tokenVersion),
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
