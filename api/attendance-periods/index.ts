import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../../lib/prisma.js";
import {
  handleCors,
  verifyAuth,
  errorResponse,
  successResponse,
} from "../../lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  const authUser = verifyAuth(req);
  if (!authUser) {
    return errorResponse(res, "UNAUTHORIZED", "Authentication required", 401);
  }

  // GET - List attendance periods
  if (req.method === "GET") {
    try {
      const { class_id, month, status } = req.query;

      const where: any = {};
      if (class_id) where.classId = class_id as string;
      if (month) where.periodMonth = month as string;
      if (status) where.status = status as string;

      const periods = await prisma.attendancePeriod.findMany({
        where,
        include: {
          class: {
            select: {
              id: true,
              className: true,
              feePerDay: true,
            },
          },
        },
        orderBy: [{ periodMonth: "desc" }, { class: { className: "asc" } }],
      });

      // Transform to snake_case for frontend
      const result = periods.map((p) => ({
        id: p.id,
        class_id: p.classId,
        period_month: p.periodMonth,
        status: p.status,
        total_sessions: p.totalSessions,
        total_present: p.totalPresent,
        total_absent_fee: p.totalAbsentFee,
        total_absent_no_fee: p.totalAbsentNoFee,
        submitted_by: p.submittedById,
        submitted_at: p.submittedAt,
        approved_by: p.approvedById,
        approved_at: p.approvedAt,
        locked_by: p.lockedById,
        locked_at: p.lockedAt,
        class_name: p.class.className,
        fee_per_day: p.class.feePerDay,
      }));

      return successResponse(res, { periods: result });
    } catch (error) {
      console.error("Attendance periods list error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  // POST - Create or get existing period
  if (req.method === "POST") {
    try {
      const { class_id, month } = req.body;

      if (!class_id || !month) {
        return errorResponse(
          res,
          "MISSING_FIELDS",
          "class_id and month are required",
          400
        );
      }

      // Check if period exists
      let period = await prisma.attendancePeriod.findUnique({
        where: {
          classId_periodMonth: {
            classId: class_id,
            periodMonth: month,
          },
        },
        include: {
          class: { select: { className: true, feePerDay: true } },
        },
      });

      // Create if not exists
      if (!period) {
        period = await prisma.attendancePeriod.create({
          data: {
            classId: class_id,
            periodMonth: month,
            status: "open",
          },
          include: {
            class: { select: { className: true, feePerDay: true } },
          },
        });
      }

      // Transform to snake_case
      const result = {
        id: period.id,
        class_id: period.classId,
        period_month: period.periodMonth,
        status: period.status,
        total_sessions: period.totalSessions,
        total_present: period.totalPresent,
        total_absent_fee: period.totalAbsentFee,
        total_absent_no_fee: period.totalAbsentNoFee,
        class_name: period.class.className,
        fee_per_day: period.class.feePerDay,
      };

      return successResponse(res, { period: result });
    } catch (error) {
      console.error("Create attendance period error:", error);
      return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
    }
  }

  return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
}
