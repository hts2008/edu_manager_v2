import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";
import { assertAttendanceDatesEditable } from "../../../lib/attendance-lock.js";
import { ApiError, sendApiError } from "../../../lib/api-utils.js";
import { resolveAttendanceSessionPolicy } from "../../../lib/tuition.js";
import { recordClassMonthPlanWrite } from "../../../lib/class-month-plan.js";
import { runSerializableTransaction } from "../../../lib/serializable-transaction.js";
import {
  buildAttendanceSessionUpdate,
  parseAttendanceDate,
  validateBulkAttendanceRecords,
} from "../../../lib/attendance-session-lifecycle.js";
import { assertAttendanceWriteEnrollment } from "../../../lib/attendance-enrollment-guard.js";
import { acquireClassMonthRosterAdvisoryLocks } from "../../../lib/attendance-lock-transaction.js";
import { scheduleSnapshotForWrite } from "../../../lib/class-month-schedule-snapshot.js";

function toOptionalBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }
  return null;
}

function toAttendanceResponse(record: any) {
  return {
    id: record.id,
    student_id: record.studentId,
    class_id: record.classId,
    attendance_date: record.attendanceDate?.toISOString?.().split("T")[0],
    status: record.status,
    reason: record.reason,
    is_make_up: record.isMakeUp,
    make_up_reason: record.makeUpReason,
    created_by: record.createdById,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    student_name: record.student?.fullName,
    class_name: record.class?.className,
    student: record.student
      ? {
          id: record.student.id,
          full_name: record.student.fullName,
        }
      : undefined,
    class: record.class
      ? {
          id: record.class.id,
          class_name: record.class.className,
        }
      : undefined,
  };
}

export async function handler(req: AuthedRequest, res: VercelResponse) {
  // GET - Get attendance records
  if (req.method === "GET") {
    try {
      const { class_id, date, student_id, month } = req.query;

      const where: any = {};
      if (class_id) where.classId = class_id as string;
      if (student_id) where.studentId = student_id as string;
      if (date) where.attendanceDate = new Date(date as string);
      if (month) {
        const [year, m] = (month as string).split("-");
        const startDate = new Date(Date.UTC(parseInt(year), parseInt(m) - 1, 1));
        const nextMonthStart = new Date(Date.UTC(parseInt(year), parseInt(m), 1));
        where.attendanceDate = { gte: startDate, lt: nextMonthStart };
      }

      const records = await prisma.attendance.findMany({
        where,
        include: {
          student: { select: { id: true, fullName: true } },
          class: { select: { id: true, className: true } },
        },
        orderBy: [{ attendanceDate: "desc" }, { student: { fullName: "asc" } }],
      });

      return successResponse(res, records.map(toAttendanceResponse));
    } catch (error) {
      return sendApiError(res, error, "ATTENDANCE_LIST_ERROR");
    }
  }

  // POST - Create single attendance record
  if (req.method === "POST") {
    try {
      const { student_id, class_id, attendance_date, status, reason } = req.body;

      if (!student_id || !class_id || !attendance_date || !status) {
        return errorResponse(
          res,
          "MISSING_FIELDS",
          "Required fields missing",
          400
        );
      }

      const [validatedRecord] = validateBulkAttendanceRecords([
        {
          student_id,
          class_id,
          attendance_date,
          status,
        },
      ], class_id);
      const attendanceDate = parseAttendanceDate(attendance_date, "attendance_date", 0);
      const dateOnly = attendanceDate.toISOString().slice(0, 10);
      const billingMonth = dateOnly.slice(0, 7);

      const record = await runSerializableTransaction(prisma, async (tx) => {
        await acquireClassMonthRosterAdvisoryLocks(
          tx,
          [class_id],
          [billingMonth],
        );
        const classRecord = await tx.class.findUnique({
          where: { id: class_id },
          select: { scheduleDays: true, sessionsPerWeek: true },
        });
        if (!classRecord) {
          throw new ApiError("CLASS_NOT_FOUND", "Class not found", 404);
        }
        const sessionPolicy = resolveAttendanceSessionPolicy(
          classRecord,
          attendance_date,
          {
            isMakeUp: toOptionalBoolean(req.body.is_make_up ?? req.body.isMakeUp),
            makeUpReason: req.body.make_up_reason ?? req.body.makeUpReason,
          },
        );
        await assertAttendanceDatesEditable(class_id, [attendanceDate], tx as typeof prisma);
        await assertAttendanceWriteEnrollment(tx, {
          classId: class_id,
          records: [{ studentId: student_id, attendanceDate }],
        });
        const existingSession = await tx.classSession.findUnique({
          where: {
            classId_sessionDate: { classId: class_id, sessionDate: attendanceDate },
          },
          select: {
            source: true,
            replacementSessions: { select: { id: true }, take: 1 },
          },
        });
        const sessionUpdate = buildAttendanceSessionUpdate(
          existingSession || { source: null, replacementSessions: [] },
          {
            inferredKind: sessionPolicy.isMakeUp ? "makeup" : "regular",
            status: validatedRecord.status === "holiday" ? "holiday" : "held",
            userId: req.user.userId,
          },
        );
        const session = await tx.classSession.upsert({
          where: {
            classId_sessionDate: { classId: class_id, sessionDate: attendanceDate },
          },
          create: {
            classId: class_id,
            sessionDate: attendanceDate,
            billingMonth,
            kind: sessionPolicy.isMakeUp ? "makeup" : "regular",
            status: validatedRecord.status === "holiday" ? "holiday" : "held",
            source: "attendance_single",
            createdById: req.user.userId,
            updatedById: req.user.userId,
          },
          update: sessionUpdate,
        });
        const attendance = await tx.attendance.upsert({
          where: {
            studentId_classId_attendanceDate: {
              studentId: student_id,
              classId: class_id,
              attendanceDate,
            },
          },
          create: {
            studentId: student_id,
            classId: class_id,
            attendanceDate,
            status: validatedRecord.status,
            reason,
            isMakeUp: sessionPolicy.isMakeUp,
            makeUpReason: sessionPolicy.makeUpReason,
            classSessionId: session.id,
            createdById: req.user.id,
          },
          update: {
            status: validatedRecord.status,
            reason,
            isMakeUp: sessionPolicy.isMakeUp,
            makeUpReason: sessionPolicy.makeUpReason,
            classSessionId: session.id,
          },
        });
        const scheduleSnapshot = await scheduleSnapshotForWrite(
          tx,
          class_id,
          billingMonth,
          classRecord,
        );
        await recordClassMonthPlanWrite(tx, {
          classId: class_id,
          billingMonth,
          actorId: req.user.userId,
          eventType: "attendance_single",
          snapshot: { date: dateOnly, ...scheduleSnapshot },
        });
        return attendance;
      });

      return res.status(201).json({ success: true, data: toAttendanceResponse(record) });
    } catch (error) {
      return sendApiError(res, error, "ATTENDANCE_CREATE_ERROR");
    }
  }

  return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

export default requireAuth(handler);
