import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";
import { assertAttendanceDatesEditable } from "../../../lib/attendance-lock.js";
import { sendApiError } from "../../../lib/api-utils.js";
import { resolveAttendanceSessionPolicy } from "../../../lib/tuition.js";
import {
  assertBulkAttendanceDateScopeEditable,
  buildAttendanceSessionUpdate,
  reconcileClearedAttendanceSessions,
  validateBulkAttendanceRecords,
  validateBulkAttendanceDateScope,
} from "../../../lib/attendance-session-lifecycle.js";
import { recordClassMonthPlanWrite } from "../../../lib/class-month-plan.js";
import { runSerializableTransaction } from "../../../lib/serializable-transaction.js";

function toOptionalBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }
  return null;
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }

  try {
    const { records, class_id, dates } = req.body;

    // Validate required fields
    if (!class_id) {
      return errorResponse(
        res,
        "MISSING_CLASS_ID",
        "class_id is required",
        400
      );
    }

    // Allow empty records (user cleared all attendance for the week)
    const dateScope = validateBulkAttendanceDateScope(dates, records);
    const recordsArray = validateBulkAttendanceRecords(records, class_id);
    const classRecord = await prisma.class.findUnique({
      where: { id: class_id },
      select: { scheduleDays: true, sessionsPerWeek: true },
    });
    if (!classRecord) {
      return errorResponse(res, "CLASS_NOT_FOUND", "Class not found", 404);
    }

    // Transform only after every row has passed strict request validation.
    const validRecords = recordsArray
      .map((r: any) => {
        const sessionPolicy = resolveAttendanceSessionPolicy(
          classRecord,
          r.attendance_date,
          {
            isMakeUp: toOptionalBoolean(r.is_make_up ?? r.isMakeUp),
            makeUpReason: r.make_up_reason ?? r.makeUpReason,
          }
        );

        return {
          studentId: r.student_id,
          classId: class_id,
          attendanceDate: new Date(`${r.attendance_date}T00:00:00.000Z`),
          status: r.status as
            | "present"
            | "absent_with_fee"
            | "absent_no_fee"
            | "holiday",
          reason: r.reason || null,
          isMakeUp: sessionPolicy.isMakeUp,
          makeUpReason: sessionPolicy.makeUpReason,
          createdById: req.user.id,
        };
      });

    // Convert ALL dates to Date objects for deletion (not just from records)
    const dateObjects = dateScope.dateObjects;
    // Use transaction for atomic delete + insert
    await runSerializableTransaction(prisma, async (tx) => {
      await assertBulkAttendanceDateScopeEditable(dateScope, (touchedDates) =>
        assertAttendanceDatesEditable(class_id, touchedDates, tx as typeof prisma)
      );
      const datesByMonth = new Map<string, string[]>();
      for (const date of dateScope.dates) {
        const month = date.slice(0, 7);
        const monthDates = datesByMonth.get(month) || [];
        monthDates.push(date);
        datesByMonth.set(month, monthDates);
      }
      for (const [month, monthDates] of datesByMonth) {
        await recordClassMonthPlanWrite(tx, {
          classId: class_id,
          billingMonth: month,
          actorId: req.user.userId,
          eventType: "attendance_bulk",
          snapshot: { dates: monthDates },
        });
      }
      const recordsByDate = new Map<string, typeof validRecords>();
      for (const record of validRecords) {
        const key = record.attendanceDate.toISOString().slice(0, 10);
        const rows = recordsByDate.get(key) || [];
        rows.push(record);
        recordsByDate.set(key, rows);
      }
      const sessionIdsByDate = new Map<string, string>();
      for (const [date, rows] of recordsByDate) {
        const isMakeUp = rows.some((row: any) => row.isMakeUp);
        const allHoliday = rows.every((row: any) => row.status === "holiday");
        const sessionDate = new Date(`${date}T00:00:00.000Z`);
        const existingSession = await tx.classSession.findUnique({
          where: {
            classId_sessionDate: { classId: class_id, sessionDate },
          },
          select: {
            id: true,
            source: true,
            replacementSessions: { select: { id: true }, take: 1 },
          },
        });
        const inferredKind = isMakeUp ? "makeup" : "regular";
        const status = allHoliday ? "holiday" : "held";
        const session = existingSession
          ? await tx.classSession.update({
              where: { id: existingSession.id },
              data: buildAttendanceSessionUpdate(existingSession, {
                inferredKind,
                status,
                userId: req.user.userId,
              }),
              select: { id: true },
            })
          : await tx.classSession.create({
              data: {
                classId: class_id,
                sessionDate,
                billingMonth: date.slice(0, 7),
                kind: inferredKind,
                status,
                source: "attendance_bulk",
                createdById: req.user.userId,
                updatedById: req.user.userId,
              },
              select: { id: true },
            });
        sessionIdsByDate.set(date, session.id);
      }
      // 1. Delete ALL existing records for this class and these dates
      // This ensures removed attendance cells are properly deleted
      await tx.attendance.deleteMany({
        where: {
          classId: class_id,
          attendanceDate: { in: dateObjects },
        },
      });

      const populatedDates = new Set(recordsByDate.keys());
      const clearedDates = dateObjects.filter(
        (date) => !populatedDates.has(date.toISOString().slice(0, 10)),
      );
      if (clearedDates.length > 0) {
        await reconcileClearedAttendanceSessions(tx, {
          classId: class_id,
          dates: clearedDates,
          userId: req.user.userId,
        });
      }

      // 2. Insert valid records (if any)
      if (validRecords.length > 0) {
        await tx.attendance.createMany({
          data: validRecords.map((record: any) => ({
            ...record,
            classSessionId: sessionIdsByDate.get(
              record.attendanceDate.toISOString().slice(0, 10),
            ),
          })),
        });
      }
    });

    return successResponse(res, {
      message:
        validRecords.length > 0
          ? `Saved ${validRecords.length} attendance records`
          : `Cleared attendance for ${dateScope.dates.length} dates`,
      count: validRecords.length,
    });
  } catch (error) {
    return sendApiError(res, error, "ATTENDANCE_BULK_ERROR");
  }
}

export default requireAuth(handler);
