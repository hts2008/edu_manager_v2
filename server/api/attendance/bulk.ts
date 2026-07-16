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
import {
  assertBulkAttendanceDateScopeEditable,
  buildAttendanceSessionUpdate,
  parseAttendanceDate,
  reconcileClearedAttendanceSessions,
  validateBulkAttendanceRecords,
  validateBulkAttendanceDateScope,
} from "../../../lib/attendance-session-lifecycle.js";
import { recordClassMonthPlanWrite } from "../../../lib/class-month-plan.js";
import { runSerializableTransaction } from "../../../lib/serializable-transaction.js";
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

type AttendanceReplacementCell = {
  studentId: string;
  attendanceDate: Date;
};

function replacementCellKey(cell: AttendanceReplacementCell) {
  return `${cell.studentId}:${cell.attendanceDate.toISOString().slice(0, 10)}`;
}

function validateReplacementScope(
  value: unknown,
  validRecords: AttendanceReplacementCell[],
  allowedDates: Set<string>,
) {
  const scope = value === undefined
    ? validRecords.map(({ studentId, attendanceDate }) => ({ studentId, attendanceDate }))
    : (() => {
        if (!Array.isArray(value)) {
          throw new ApiError(
            "INVALID_REPLACEMENT_SCOPE",
            "replacement_scope must be an array",
            400,
          );
        }
        return value.map((row: any, index) => {
          if (!row || typeof row.student_id !== "string" || !row.student_id.trim()) {
            throw new ApiError(
              "INVALID_REPLACEMENT_SCOPE",
              `replacement_scope[${index}].student_id is required`,
              400,
            );
          }
          const attendanceDate = parseAttendanceDate(
            row.attendance_date,
            "replacement_scope.attendance_date",
            index,
          );
          const dateKey = attendanceDate.toISOString().slice(0, 10);
          if (!allowedDates.has(dateKey)) {
            throw new ApiError(
              "INVALID_REPLACEMENT_SCOPE",
              `replacement_scope date ${dateKey} is outside dates`,
              400,
            );
          }
          return { studentId: row.student_id.trim(), attendanceDate };
        });
      })();
  const deduped = [...new Map(scope.map((cell) => [replacementCellKey(cell), cell])).values()];
  const scopeKeys = new Set(deduped.map(replacementCellKey));
  for (const record of validRecords) {
    if (!scopeKeys.has(replacementCellKey(record))) {
      throw new ApiError(
        "INVALID_REPLACEMENT_SCOPE",
        "Every attendance record must be included in replacement_scope",
        400,
      );
    }
  }
  return deduped;
}

export async function handler(req: AuthedRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }

  try {
    const { records, class_id, dates, replacement_scope } = req.body;

    // Validate required fields
    if (!class_id) {
      return errorResponse(
        res,
        "MISSING_CLASS_ID",
        "class_id is required",
        400
      );
    }

    // Validate the declared scope even when the replacement payload is empty.
    const dateScope = validateBulkAttendanceDateScope(dates, records);
    const recordsArray = validateBulkAttendanceRecords(records, class_id);
    const classRecord = await prisma.class.findUnique({
      where: { id: class_id },
      select: { scheduleDays: true, sessionsPerWeek: true },
    });
    if (!classRecord) {
      return errorResponse(res, "CLASS_NOT_FOUND", "Class not found", 404);
    }
    if (
      recordsArray.length === 0 &&
      (replacement_scope === undefined ||
        (Array.isArray(replacement_scope) && replacement_scope.length === 0))
    ) {
      return successResponse(res, {
        message: "No attendance changes requested",
        count: 0,
      });
    }

    const buildValidRecords = (classSnapshot: typeof classRecord) =>
      recordsArray.map((r: any) => {
        const sessionPolicy = resolveAttendanceSessionPolicy(
          classSnapshot,
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
          createdById: req.user.userId,
        };
      });

    // Convert ALL dates to Date objects for deletion (not just from records)
    const dateObjects = dateScope.dateObjects;
    // Use transaction for atomic delete + insert
    let savedCount = 0;
    await runSerializableTransaction(prisma, async (tx) => {
      const touchedMonths = [
        ...new Set(dateScope.dates.map((date) => date.slice(0, 7))),
      ];
      await acquireClassMonthRosterAdvisoryLocks(
        tx,
        [class_id],
        touchedMonths,
      );
      const lockedClassRecord = await tx.class.findUnique({
        where: { id: class_id },
        select: { scheduleDays: true, sessionsPerWeek: true },
      });
      if (!lockedClassRecord) {
        throw new ApiError("CLASS_NOT_FOUND", "Class not found", 404);
      }
      const validRecords = buildValidRecords(lockedClassRecord);
      const replacementScope = validateReplacementScope(
        replacement_scope,
        validRecords,
        new Set(dateScope.dates),
      );
      savedCount = validRecords.length;
      await assertBulkAttendanceDateScopeEditable(dateScope, (touchedDates) =>
        assertAttendanceDatesEditable(class_id, touchedDates, tx as typeof prisma)
      );
      await assertAttendanceWriteEnrollment(tx, {
        classId: class_id,
        records: replacementScope,
      });
      const datesByMonth = new Map<string, string[]>();
      for (const date of dateScope.dates) {
        const month = date.slice(0, 7);
        const monthDates = datesByMonth.get(month) || [];
        monthDates.push(date);
        datesByMonth.set(month, monthDates);
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
      const { clearedDates } = await replaceBulkAttendanceRows(tx, {
        classId: class_id,
        dateObjects,
        validRecords,
        replacementScope,
        sessionIdsByDate,
      });
      if (clearedDates.length > 0) {
        await reconcileClearedAttendanceSessions(tx, {
          classId: class_id,
          dates: clearedDates,
          userId: req.user.userId,
        });
      }
      for (const [month, monthDates] of datesByMonth) {
        const scheduleSnapshot = await scheduleSnapshotForWrite(
          tx,
          class_id,
          month,
          lockedClassRecord,
        );
        await recordClassMonthPlanWrite(tx, {
          classId: class_id,
          billingMonth: month,
          actorId: req.user.userId,
          eventType: "attendance_bulk",
          snapshot: { dates: monthDates, ...scheduleSnapshot },
        });
      }
    });

    return successResponse(res, {
      message: `Saved ${savedCount} attendance records`,
      count: savedCount,
    });
  } catch (error) {
    return sendApiError(res, error, "ATTENDANCE_BULK_ERROR");
  }
}

export default requireAuth(handler);

export async function replaceBulkAttendanceRows(
  tx: any,
  input: {
    classId: string;
    dateObjects: Date[];
    validRecords: Array<{
      studentId: string;
      attendanceDate: Date;
      [key: string]: unknown;
    }>;
    replacementScope?: AttendanceReplacementCell[];
    sessionIdsByDate: Map<string, string>;
  },
) {
  const replacementScope = input.replacementScope || input.validRecords;
  if (replacementScope.length === 0) {
    return { clearedDates: [] as Date[] };
  }

  await tx.attendance.deleteMany({
    where: {
      classId: input.classId,
      OR: replacementScope.map((cell) => ({
        studentId: cell.studentId,
        attendanceDate: cell.attendanceDate,
      })),
    },
  });
  if (input.validRecords.length > 0) {
    await tx.attendance.createMany({
      data: input.validRecords.map((record) => ({
        ...record,
        classSessionId: input.sessionIdsByDate.get(
          record.attendanceDate.toISOString().slice(0, 10),
        ),
      })),
    });
  }

  const populatedDates = new Set(
    input.validRecords.map((record) =>
      record.attendanceDate.toISOString().slice(0, 10),
    ),
  );
  const potentiallyClearedDates = input.dateObjects.filter(
    (date) => !populatedDates.has(date.toISOString().slice(0, 10)),
  );
  if (potentiallyClearedDates.length === 0) {
    return { clearedDates: [] as Date[] };
  }

  const remainingRows = await tx.attendance.findMany({
    where: {
      classId: input.classId,
      attendanceDate: { in: potentiallyClearedDates },
    },
    select: { attendanceDate: true },
    distinct: ["attendanceDate"],
  });
  const remainingDates = new Set(
    remainingRows.map((row: { attendanceDate: Date }) =>
      row.attendanceDate.toISOString().slice(0, 10),
    ),
  );

  return {
    clearedDates: potentiallyClearedDates.filter(
      (date) => !remainingDates.has(date.toISOString().slice(0, 10)),
    ),
  };
}
