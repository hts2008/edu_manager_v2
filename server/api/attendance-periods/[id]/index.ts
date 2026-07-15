import type { VercelResponse } from "../../../../lib/vercel-types.js";
import prisma from "../../../../lib/prisma.js";
import {
  AuthedRequest,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../../lib/auth.js";
import {
  acquireClassMonthRosterAdvisoryLocks,
  isAttendanceLockTimeout,
  lockAttendancePeriodAndSyncFees,
} from "../../../../lib/attendance-lock-transaction.js";
import { ApiError, getString, sendApiError } from "../../../../lib/api-utils.js";
import { getRequestId } from "../../../../lib/observability.js";
import { reopenAttendancePeriod } from "../../../../lib/attendance-lock.js";
import { runSerializableTransaction } from "../../../../lib/serializable-transaction.js";
import {
  assertAttendancePeriodReady,
  getAttendancePeriodReadiness,
} from "../../../../lib/attendance-period-readiness.js";
import {
  ensureClassMonthPlan,
  freezeClassMonthPlan,
} from "../../../../lib/class-month-plan.js";
import { scheduleSnapshotForWrite } from "../../../../lib/class-month-schedule-snapshot.js";

function attendanceMonthRange(periodMonth: string) {
  const [year, month] = periodMonth.split("-").map(Number);
  return {
    startDate: new Date(Date.UTC(year, month - 1, 1)),
    nextMonthStart: new Date(Date.UTC(year, month, 1)),
  };
}

export async function calculatePeriodStats(db: any, classId: string, periodMonth: string) {
  const { startDate, nextMonthStart } = attendanceMonthRange(periodMonth);
  const [stats, totalSessions] = await Promise.all([
    db.attendance.groupBy({
      by: ["status"],
      where: {
        classId,
        attendanceDate: { gte: startDate, lt: nextMonthStart },
      },
      _count: { status: true },
    }),
    db.classSession.count({
      where: { classId, billingMonth: periodMonth, kind: "regular" },
    }),
  ]);

  const totals = {
    totalSessions,
    totalPresent: 0,
    totalAbsentFee: 0,
    totalAbsentNoFee: 0,
    totalHoliday: 0,
  };
  for (const row of stats) {
    const count = row._count.status;
    if (row.status === "present") totals.totalPresent = count;
    else if (row.status === "absent_with_fee") totals.totalAbsentFee = count;
    else if (row.status === "absent_no_fee") totals.totalAbsentNoFee = count;
    else if (row.status === "holiday") totals.totalHoliday = count;
  }
  return totals;
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  // Get id from query param (Vercel dynamic route)
  const { id, action, view } = req.query;

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

    if (view === "lock-preflight") {
      const readiness = await getAttendancePeriodReadiness(prisma, {
        classId: period.classId,
        month: period.periodMonth,
      });
      return successResponse(res, {
        period: {
          id: period.id,
          class_id: period.classId,
          period_month: period.periodMonth,
          status: period.status,
        },
        ready_to_lock: readiness.ready,
        ...readiness,
      });
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

        const totals = await runSerializableTransaction(prisma, async (tx) => {
          await acquireClassMonthRosterAdvisoryLocks(
            tx,
            [period.classId],
            [period.periodMonth],
          );
          const current = await tx.attendancePeriod.findUnique({ where: { id } });
          if (!current || current.status !== "open") {
            throw new ApiError(
              "ATTENDANCE_PERIOD_STATE_CONFLICT",
              "Attendance period changed while submitting",
              409,
            );
          }
          assertAttendancePeriodReady(
            await getAttendancePeriodReadiness(tx, {
              classId: period.classId,
              month: period.periodMonth,
            }),
          );
          const classSchedule = await tx.class.findUnique({
            where: { id: period.classId },
            select: { scheduleDays: true, sessionsPerWeek: true },
          });
          if (!classSchedule) {
            throw new ApiError("CLASS_NOT_FOUND", "Class not found while submitting", 404);
          }
          const scheduleSnapshot = await scheduleSnapshotForWrite(
            tx,
            period.classId,
            period.periodMonth,
            classSchedule,
          );
          const plan = await ensureClassMonthPlan(tx, {
            classId: period.classId,
            billingMonth: period.periodMonth,
            attendancePeriodStatus: "open",
            actorId: req.user.id,
            snapshot: { attendance_period_id: id, ...scheduleSnapshot },
          });
          const nextTotals = await calculatePeriodStats(
            tx,
            period.classId,
            period.periodMonth,
          );
          await freezeClassMonthPlan(tx, {
            planId: plan.id,
            expectedRevision: plan.revision,
            actorId: req.user.id,
            reason: "attendance_period_submitted",
            snapshot: {
              attendance_period_id: id,
              ...scheduleSnapshot,
              totals: nextTotals,
            },
          });
          const updated = await tx.attendancePeriod.updateMany({
            where: { id, status: "open" },
            data: {
              status: "submitted",
              submittedById: req.user.id,
              submittedAt: new Date(),
              ...nextTotals,
            },
          });
          if (updated.count !== 1) {
            throw new ApiError(
              "ATTENDANCE_PERIOD_STATE_CONFLICT",
              "Attendance period changed while submitting",
              409,
            );
          }
          return nextTotals;
        }, {
          transactionOptions: { maxWait: 5_000, timeout: 15_000 },
        });

        return successResponse(res, {
          message: "Period submitted for approval",
          stats: {
            total_sessions: totals.totalSessions,
            total_present: totals.totalPresent,
            total_absent_fee: totals.totalAbsentFee,
            total_absent_no_fee: totals.totalAbsentNoFee,
            total_holiday: totals.totalHoliday,
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

        await runSerializableTransaction(prisma, async (tx) => {
          await acquireClassMonthRosterAdvisoryLocks(
            tx,
            [period.classId],
            [period.periodMonth],
          );
          const current = await tx.attendancePeriod.findUnique({ where: { id } });
          if (!current || current.status !== "submitted") {
            throw new ApiError(
              "ATTENDANCE_PERIOD_STATE_CONFLICT",
              "Attendance period changed while approving",
              409,
            );
          }
          assertAttendancePeriodReady(
            await getAttendancePeriodReadiness(tx, {
              classId: period.classId,
              month: period.periodMonth,
            }),
          );
          await ensureClassMonthPlan(tx, {
            classId: period.classId,
            billingMonth: period.periodMonth,
            attendancePeriodStatus: "submitted",
            actorId: req.user.id,
            snapshot: { attendance_period_id: id },
          });
          const updated = await tx.attendancePeriod.updateMany({
            where: { id, status: "submitted" },
            data: {
              status: "approved",
              approvedById: req.user.id,
              approvedAt: new Date(),
            },
          });
          if (updated.count !== 1) {
            throw new ApiError(
              "ATTENDANCE_PERIOD_STATE_CONFLICT",
              "Attendance period changed while approving",
              409,
            );
          }
        }, {
          transactionOptions: { maxWait: 5_000, timeout: 15_000 },
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

        const result = await runSerializableTransaction(
          prisma,
          (tx) =>
            lockAttendancePeriodAndSyncFees(tx, {
              periodId: id,
              classId: period.classId,
              month: period.periodMonth,
              userId: req.user.id,
            }),
          { transactionOptions: { maxWait: 5_000, timeout: 15_000 } },
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

        const reason = getString(req.body?.reason)?.trim();
        if (!reason) {
          return errorResponse(
            res,
            "REOPEN_REASON_REQUIRED",
            "A non-empty reason is required to reopen attendance",
            400,
          );
        }

        const reopenedPeriod = await runSerializableTransaction(
          prisma,
          (tx) => reopenAttendancePeriod(tx, {
            periodId: id,
            classId: period.classId,
            month: period.periodMonth,
            userId: req.user.id,
            reason,
            ipAddress:
              getString(req.headers["x-forwarded-for"]) ||
              getString(req.headers["x-real-ip"]),
            userAgent: getString(req.headers["user-agent"]),
            allowedStatuses: ["locked"],
          }),
        );

        return successResponse(res, {
          message: "Attendance period reopened for correction",
          period: reopenedPeriod,
        });
      }

      case "reopen-for-correction": {
        if (req.user.role !== "admin") {
          return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
        }
        if (!["submitted", "approved", "locked"].includes(period.status)) {
          return errorResponse(
            res,
            "INVALID_STATUS",
            `Cannot reopen: current status is ${period.status}`,
            400,
          );
        }
        const reason = getString(req.body?.reason)?.trim();
        if (!reason) {
          return errorResponse(
            res,
            "REOPEN_REASON_REQUIRED",
            "A non-empty reason is required to reopen attendance",
            400,
          );
        }
        const reopenedPeriod = await runSerializableTransaction(
          prisma,
          (tx) => reopenAttendancePeriod(tx, {
            periodId: id,
            classId: period.classId,
            month: period.periodMonth,
            userId: req.user.id,
            reason,
            ipAddress:
              getString(req.headers["x-forwarded-for"]) ||
              getString(req.headers["x-real-ip"]),
            userAgent: getString(req.headers["user-agent"]),
            allowedStatuses: ["submitted", "approved", "locked"],
          }),
        );
        return successResponse(res, {
          message: "Attendance period reopened for correction",
          period: reopenedPeriod,
        });
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

        const reason = getString(req.body?.reason)?.trim() || "Attendance submission rejected";
        await runSerializableTransaction(prisma, (tx) =>
          reopenAttendancePeriod(tx, {
            periodId: id,
            classId: period.classId,
            month: period.periodMonth,
            userId: req.user.id,
            reason,
            ipAddress:
              getString(req.headers["x-forwarded-for"]) ||
              getString(req.headers["x-real-ip"]),
            userAgent: getString(req.headers["user-agent"]),
            allowedStatuses: ["submitted"],
          }),
        );

        return successResponse(res, {
          message: "Period returned to teacher for revision",
          reason,
        });
      }

      default:
        return errorResponse(
          res,
          "INVALID_ACTION",
          `Invalid action: ${actionType}. Valid actions: submit, approve, lock, unlock, reopen-for-correction, reject`,
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
