import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  errorResponse,
  handleCors,
  requireAuth,
  successResponse,
} from "../../../lib/auth.js";
import { getNumber, getString, sendApiError } from "../../../lib/api-utils.js";

function parseDateRange(from?: string, to?: string) {
  const range: Record<string, Date> = {};
  if (from) range.gte = new Date(`${from}T00:00:00`);
  if (to) range.lte = new Date(`${to}T23:59:59.999`);
  return Object.keys(range).length ? range : undefined;
}

function activityLogToDto(log: any) {
  return {
    id: log.id,
    user_id: log.userId,
    user_name: log.user?.fullName || log.user?.username || null,
    username: log.user?.username || null,
    user_role: log.user?.role || null,
    action: log.action,
    entity_type: log.entityType,
    entity_id: log.entityId,
    ip_address: log.ipAddress,
    user_agent: log.userAgent,
    created_at: log.createdAt,
  };
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  if (req.user.role !== "admin") {
    return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
  }

  try {
    const limit = Math.min(Math.max(getNumber(req.query.limit) || 50, 1), 100);
    const offset = Math.max(getNumber(req.query.offset) || 0, 0);
    const userId = getString(req.query.user_id);
    const action = getString(req.query.action);
    const entityType = getString(req.query.entity_type);
    const from = getString(req.query.from || req.query.start_date);
    const to = getString(req.query.to || req.query.end_date);

    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = { contains: action, mode: "insensitive" };
    if (entityType) where.entityType = entityType;
    const createdAt = parseDateRange(from, to);
    if (createdAt) where.createdAt = createdAt;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.activityLog.count({ where }),
    ]);

    return successResponse(res, {
      logs: logs.map(activityLogToDto),
      total,
      limit,
      offset,
      filters: {
        user_id: userId || null,
        action: action || null,
        entity_type: entityType || null,
        from: from || null,
        to: to || null,
      },
    });
  } catch (error) {
    return sendApiError(res, error, "ACTIVITY_LOGS_ERROR");
  }
}

export default requireAuth(handler, ["admin"]);
