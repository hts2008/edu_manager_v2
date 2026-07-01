import type { VercelResponse } from "../../../../lib/vercel-types.js";
import prisma from "../../../../lib/prisma.js";
import {
  AuthedRequest,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../../lib/auth.js";
import {
  isAttendanceLockTimeout,
  lockAttendancePeriodAndSyncFees,
} from "../../../../lib/attendance-lock-transaction.js";
import { sendApiError } from "../../../../lib/api-utils.js";
import { getRequestId } from "../../../../lib/observability.js";

async function handler(req: AuthedRequest, res: VercelResponse) {
  // Get id from query param (Vercel dynamic route)
  const { id, action } = req.query;

  if (!id || typeof id !== "string") {
    return errorResponse(res, "MISSING_ID", "Period ID is required", 400);
  }

  // Handle GET - return period details with student-grouped attendance
  if (req.method === "GET") {
    const period = await prisma.attendancePeriod.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!period) {
      return errorResponse(res, "NOT_FOUND", "Period not found", 404);
    }

    // Get attendance for this period
    const [year, month] = period.periodMonth.split("-");
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);

    const attendance = await prisma.attendance.findMany({
      where: {
        classId: period.classId,
        attendanceDate: { gte: startDate, lte: endDate },
      },
      include: { student: true },
      orderBy: [{ studentId: "asc" }, { attendanceDate: "asc" }],
    });

    // Group attendance by student for review modal
    const studentMap = new Map<
      string,
      {
        id: string;
        name: string;
        present: number;
        absentWithFee: number;
        absentNoFee: number;
        holiday: number;
        total: number;
      }
    >();

    attendance.forEach((att) => {
      const student = att.student;
      if (!studentMap.has(student.id)) {
        studentMap.set(student.id, {
          id: student.id,
          name: student.fullName,
          present: 0,
          absentWithFee: 0,
          absentNoFee: 0,
          holiday: 0,
          total: 0,
        });
      }
      const s = studentMap.get(student.id)!;
      s.total++;
      if (att.status === "present") s.present++;
      else if (att.status === "absent_with_fee") s.absentWithFee++;
      else if (att.status === "absent_no_fee") s.absentNoFee++;
      else if (att.status === "holiday") s.holiday++;
    });

    const students = Array.from(studentMap.values());

    // Calculate summary
    const summary = {
      totalStudents: students.length,
      totalRecords: attendance.length,
      totalPresent: students.reduce((sum, s) => sum + s.present, 0),
      totalAbsentWithFee: students.reduce((sum, s) => sum + s.absentWithFee, 0),
      totalAbsentNoFee: students.reduce((sum, s) => sum + s.absentNoFee, 0),
      totalHoliday: students.reduce((sum, s) => sum + s.holiday, 0),
    };

    return successResponse(res, { period, summary, students, attendance });
  }

  // Handle POST - actions
  if (req.method !== "POST") {
    return errorResponse(
      res,
      "METHOD_NOT_ALLOWED",
      "Only GET and POST allowed",
      405,
    );
  }

  // Determine action from query param or default to submit
  const actionType = (action as string) || "submit";

  try {
    // Get period
    const period = await prisma.attendancePeriod.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!period) {
      return errorResponse(res, "NOT_FOUND", "Period not found", 404);
    }

    switch (actionType) {
      case "submit": {
        if (period.status !== "open") {
          return errorResponse(
            res,
            "INVALID_STATUS",
            `Cannot submit: current status is ${period.status}`,
            400,
          );
        }

        // Calculate stats
        const [year, month] = period.periodMonth.split("-");
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);

        const stats = await prisma.attendance.groupBy({
          by: ["status"],
          where: {
            classId: period.classId,
            attendanceDate: { gte: startDate, lte: endDate },
          },
          _count: { status: true },
        });

        let totalSessions = 0,
          totalPresent = 0,
          totalAbsentFee = 0,
          totalAbsentNoFee = 0,
          totalHoliday = 0;
        stats.forEach((s) => {
          const count = s._count.status;
          totalSessions += count;
          if (s.status === "present") totalPresent = count;
          else if (s.status === "absent_with_fee") totalAbsentFee = count;
          else if (s.status === "absent_no_fee") totalAbsentNoFee = count;
          else if (s.status === "holiday") totalHoliday = count;
        });

        await prisma.attendancePeriod.update({
          where: { id },
          data: {
            status: "submitted",
            submittedById: req.user.id,
            submittedAt: new Date(),
            totalSessions,
            totalPresent,
            totalAbsentFee,
            totalAbsentNoFee,
            totalHoliday,
          },
        });

        return successResponse(res, {
          message: "Period submitted for approval",
          stats: {
            total_sessions: totalSessions,
            total_present: totalPresent,
            total_absent_fee: totalAbsentFee,
            total_absent_no_fee: totalAbsentNoFee,
            total_holiday: totalHoliday,
          },
        });
      }

      case "approve": {
        if (req.user.role !== "admin") {
          return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
        }

        if (period.status !== "submitted") {
          return errorResponse(
            res,
            "INVALID_STATUS",
            `Cannot approve: current status is ${period.status}. Only 'submitted' periods can be approved.`,
            400,
          );
        }

        await prisma.attendancePeriod.update({
          where: { id },
          data: {
            status: "approved",
            approvedById: req.user.id,
            approvedAt: new Date(),
          },
        });

        return successResponse(res, { message: "Period approved" });
      }

      case "lock": {
        if (req.user.role !== "admin") {
          return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
        }

        if (period.status !== "approved") {
          return errorResponse(
            res,
            "INVALID_STATUS",
            `Cannot lock: current status is ${period.status}`,
            400,
          );
        }

        const result = await prisma.$transaction(
          (tx) =>
            lockAttendancePeriodAndSyncFees(tx, {
              periodId: id,
              classId: period.classId,
              month: period.periodMonth,
              userId: req.user.id,
            }),
          {
            maxWait: 5_000,
            timeout: 15_000,
          },
        );

        return successResponse(res, {
          message: "Period locked and fee records created",
          studentsProcessed: result.students_processed,
          fees_created: result.fees_created,
          fees_updated: result.fees_updated,
          fees_skipped: result.fees_preserved,
          fee_sync: result,
        });
      }

      case "unlock": {
        if (req.user.role !== "admin") {
          return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
        }

        if (period.status !== "locked") {
          return errorResponse(
            res,
            "INVALID_STATUS",
            `Cannot unlock: current status is ${period.status}`,
            400,
          );
        }

        await prisma.attendancePeriod.update({
          where: { id },
          data: {
            status: "approved",
            lockedById: null,
            lockedAt: null,
          },
        });

        return successResponse(res, { message: "Period unlocked" });
      }

      case "reject": {
        // VI: Trả lại điểm danh cho giáo viên
        if (req.user.role !== "admin") {
          return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
        }

        if (period.status !== "submitted") {
          return errorResponse(
            res,
            "INVALID_STATUS",
            `Cannot reject: current status is ${period.status}. Only 'submitted' periods can be rejected.`,
            400,
          );
        }

        const { reason } = req.body || {};

        await prisma.attendancePeriod.update({
          where: { id },
          data: {
            status: "open",
            submittedById: null,
            submittedAt: null,
            // Reset stats so teacher can recalculate
            totalSessions: 0,
            totalPresent: 0,
            totalAbsentFee: 0,
            totalAbsentNoFee: 0,
            totalHoliday: 0,
          },
        });

        return successResponse(res, {
          message: "Period returned to teacher for revision",
          reason: reason || null,
        });
      }

      default:
        return errorResponse(
          res,
          "INVALID_ACTION",
          `Invalid action: ${actionType}. Valid actions: submit, approve, lock, unlock, reject`,
          400,
        );
    }
  } catch (error) {
    if (actionType === "lock" && isAttendanceLockTimeout(error)) {
      const requestId = getRequestId(req);
      return res.status(503).json({
        success: false,
        error: {
          code: "ATTENDANCE_LOCK_TIMEOUT",
          message: "Attendance lock timed out; retry the request",
          retryable: true,
          request_id: requestId,
        },
      });
    }
    return sendApiError(res, error, "ATTENDANCE_PERIOD_ACTION_ERROR");
  }
}

export default requireAuth(handler);
