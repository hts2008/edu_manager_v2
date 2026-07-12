import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import { type AuthedRequest, errorResponse, requireAuth, successResponse } from "../../../lib/auth.js";
import { ApiError, getRequiredString, sendApiError } from "../../../lib/api-utils.js";
import {
  assertMonthMutable,
  billingMonthForDate,
  CLASS_SESSION_KINDS,
  CLASS_SESSION_STATUSES,
  classSessionToDto,
  ClassSessionError,
  dateOnly,
  enumValue,
  EXTRA_FEE_MODES,
  normalizeClassSessionError,
  parseDateOnly,
  validateMakeupDate,
} from "../../../lib/class-sessions.js";

async function getExisting(id: string) {
  const session = await prisma.classSession.findUnique({ where: { id } });
  if (!session) throw new ApiError("SESSION_NOT_FOUND", "Class session not found", 404);
  return session;
}

async function getSession(id: string, res: VercelResponse) {
  return successResponse(res, { session: classSessionToDto(await getExisting(id)) });
}

async function patchSession(req: AuthedRequest, id: string, res: VercelResponse) {
  const body = req.body || {};
  if (!Number.isInteger(body.version) || body.version < 0) {
    throw new ClassSessionError("VERSION_REQUIRED", "version must be a non-negative integer", 400);
  }
  const existing: any = await getExisting(id);
  const originalMonth = dateOnly(existing.sessionDate).slice(0, 7);
  await assertMonthMutable(prisma, existing.classId, originalMonth);
  const nextDate = body.session_date ? parseDateOnly(body.session_date) : existing.sessionDate;
  const nextMonth = dateOnly(nextDate).slice(0, 7);
  if (nextMonth !== originalMonth) {
    throw new ClassSessionError("SESSION_DATE_OUTSIDE_MONTH", "A session cannot be moved to another month", 400);
  }
  const billingMonth = billingMonthForDate(nextDate, body.billing_month ?? existing.billingMonth);
  const nextKind = enumValue(body.kind, CLASS_SESSION_KINDS, "kind", existing.kind as any);
  const nextStatus = enumValue(body.status, CLASS_SESSION_STATUSES, "status", existing.status as any);
  const nextExtraFeeMode = enumValue(body.extra_fee_mode, EXTRA_FEE_MODES, "extra_fee_mode", existing.extraFeeMode as any);
  let replacementForSessionId = body.replacement_for_id === undefined
    ? existing.replacementForId
    : body.replacement_for_id || null;
  if (nextKind === "makeup") {
    replacementForSessionId = getRequiredString(replacementForSessionId, "replacement_for_id");
    const original = await prisma.classSession.findUnique({ where: { id: replacementForSessionId } });
    if (!original || original.classId !== existing.classId || original.kind !== "regular") {
      throw new ClassSessionError("INVALID_REPLACEMENT_SESSION", "replacement_for_session_id must reference a regular session in this class", 400);
    }
    validateMakeupDate(original.sessionDate, nextDate);
  } else if (body.replacement_for_id !== undefined) {
    replacementForSessionId = null;
  }

  const updated = await (prisma.classSession as any).updateMany({
    where: { id, version: body.version },
    data: {
      ...(body.session_date !== undefined && { sessionDate: nextDate }),
      billingMonth,
      kind: nextKind,
      status: nextStatus,
      extraFeeMode: nextExtraFeeMode,
      ...(body.notes !== undefined && { notes: body.notes || null }),
      replacementForId: replacementForSessionId,
      version: { increment: 1 },
      updatedById: req.user.userId,
    },
  });
  if (updated.count !== 1) {
    throw new ClassSessionError("VERSION_CONFLICT", "The class session changed; reload and retry", 409);
  }
  return successResponse(res, { session: classSessionToDto(await getExisting(id)) });
}

async function deleteSession(req: AuthedRequest, id: string, res: VercelResponse) {
  const version = Number(req.query.version ?? req.body?.version);
  if (!Number.isInteger(version) || version < 0) {
    throw new ClassSessionError("VERSION_REQUIRED", "version must be a non-negative integer", 400);
  }
  const existing = await getExisting(id);
  await assertMonthMutable(prisma, existing.classId, dateOnly(existing.sessionDate).slice(0, 7));
  const attendanceCount = await prisma.attendance.count({ where: { classSessionId: id } });
  if (attendanceCount > 0) {
    throw new ClassSessionError("SESSION_HAS_ATTENDANCE", "A session with attendance cannot be deleted", 409);
  }
  const deleted = await prisma.classSession.deleteMany({ where: { id, version } });
  if (deleted.count !== 1) {
    throw new ClassSessionError("VERSION_CONFLICT", "The class session changed; reload and retry", 409);
  }
  return successResponse(res, { deleted: true, id });
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  try {
    const id = getRequiredString(req.query.id, "id");
    if (req.method === "GET") return await getSession(id, res);
    if (req.method === "PATCH") return await patchSession(req, id, res);
    if (req.method === "DELETE") return await deleteSession(req, id, res);
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET, PATCH, and DELETE are allowed", 405);
  } catch (error) {
    return sendApiError(res, normalizeClassSessionError(error), "CLASS_SESSION_ERROR");
  }
}

export default requireAuth(handler);
