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

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return errorResponse(
        res,
        "MISSING_DATES",
        "dates array is required",
        400
      );
    }

    // Allow empty records (user cleared all attendance for the week)
    const recordsArray = records || [];
    const validStatuses = ["present", "absent_with_fee", "absent_no_fee", "holiday"];
    const classRecord = await prisma.class.findUnique({
      where: { id: class_id },
      select: { scheduleDays: true, sessionsPerWeek: true },
    });
    if (!classRecord) {
      return errorResponse(res, "CLASS_NOT_FOUND", "Class not found", 404);
    }

    // Filter and transform valid records
    const validRecords = recordsArray
      .filter(
        (r: any) =>
          r.status &&
          validStatuses.includes(r.status) &&
          r.student_id &&
          r.class_id === class_id &&
          r.attendance_date
      )
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
          attendanceDate: new Date(r.attendance_date),
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
    const dateObjects = dates.map((d: string) => new Date(d));
    // Use transaction for atomic delete + insert
    await prisma.$transaction(async (tx) => {
      await assertAttendanceDatesEditable(class_id, dateObjects, tx as typeof prisma);
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
        const session = await tx.classSession.upsert({
          where: {
            classId_sessionDate: {
              classId: class_id,
              sessionDate: new Date(`${date}T00:00:00.000Z`),
            },
          },
          create: {
            classId: class_id,
            sessionDate: new Date(`${date}T00:00:00.000Z`),
            billingMonth: date.slice(0, 7),
            kind: isMakeUp ? "makeup" : "regular",
            status: allHoliday ? "holiday" : "held",
            source: "attendance_bulk",
            createdById: req.user.userId,
            updatedById: req.user.userId,
          },
          update: {
            kind: isMakeUp ? "makeup" : "regular",
            status: allHoliday ? "holiday" : "held",
            updatedById: req.user.userId,
            version: { increment: 1 },
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
        await tx.classSession.updateMany({
          where: { classId: class_id, sessionDate: { in: clearedDates } },
          data: {
            status: "planned",
            updatedById: req.user.userId,
            version: { increment: 1 },
          },
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
    }, { isolationLevel: "Serializable" });

    return successResponse(res, {
      message:
        validRecords.length > 0
          ? `Saved ${validRecords.length} attendance records`
          : `Cleared attendance for ${dates.length} dates`,
      count: validRecords.length,
    });
  } catch (error) {
    return sendApiError(res, error, "ATTENDANCE_BULK_ERROR");
  }
}

export default requireAuth(handler);
