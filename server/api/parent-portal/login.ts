import type { VercelRequest, VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import { errorResponse, handleCors, successResponse } from "../../../lib/auth.js";
import { ApiError, sendApiError } from "../../../lib/api-utils.js";
import { normalizePhone, signParentToken, toDateOnly } from "../../../lib/parent-auth.js";

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
    const phone = normalizePhone(req.body?.parent_phone || req.body?.phone);
    const dateOfBirth = String(req.body?.student_date_of_birth || req.body?.date_of_birth || "").trim();
    if (!phone || !dateOfBirth) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "parent_phone and student_date_of_birth are required",
        400
      );
    }

    const parents = await prisma.parent.findMany({
      where: { deletedAt: null },
      include: { students: { where: { deletedAt: null } } },
    });
    const parent = parents.find((item: any) => normalizePhone(item.phone) === phone);
    if (!parent) {
      throw new ApiError("PARENT_PORTAL_LOGIN_FAILED", "Invalid parent credentials", 401);
    }

    const matchingStudent = parent.students.find(
      (student: any) => toDateOnly(student.dateOfBirth) === dateOfBirth
    );
    if (!matchingStudent) {
      throw new ApiError("PARENT_PORTAL_LOGIN_FAILED", "Invalid parent credentials", 401);
    }

    return successResponse(res, {
      token: signParentToken(parent.id),
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
