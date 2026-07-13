import { ApiError } from "./api-utils.js";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ATTENDANCE_STATUSES = new Set([
  "present",
  "absent_with_fee",
  "absent_no_fee",
  "holiday",
]);

export type ValidatedBulkAttendanceRecord = Record<string, unknown> & {
  student_id: string;
  class_id: string;
  attendance_date: string;
  status: "present" | "absent_with_fee" | "absent_no_fee" | "holiday";
};

export type BulkAttendanceDateScope = {
  dates: string[];
  dateObjects: Date[];
};

export function parseAttendanceDate(value: unknown, field: string, index: number) {
  const match = typeof value === "string" ? DATE_ONLY_PATTERN.exec(value) : null;
  if (!match) {
    throw new ApiError(
      "INVALID_ATTENDANCE_DATE",
      `${field} must be YYYY-MM-DD`,
      400,
      { field, index },
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new ApiError(
      "INVALID_ATTENDANCE_DATE",
      `${field} must be a real calendar date`,
      400,
      { field, index },
    );
  }

  return date;
}

export function validateBulkAttendanceDateScope(
  declaredDates: unknown,
  records: unknown,
): BulkAttendanceDateScope {
  if (!Array.isArray(declaredDates) || declaredDates.length === 0) {
    throw new ApiError("MISSING_DATES", "dates array is required", 400);
  }
  if (records !== undefined && records !== null && !Array.isArray(records)) {
    throw new ApiError(
      "INVALID_ATTENDANCE_RECORDS",
      "records must be an array",
      400,
    );
  }

  const dates: string[] = [];
  const dateObjects: Date[] = [];
  const declaredDateSet = new Set<string>();
  for (const [index, value] of declaredDates.entries()) {
    const date = parseAttendanceDate(value, "dates[]", index);
    const dateOnly = date.toISOString().slice(0, 10);
    if (declaredDateSet.has(dateOnly)) {
      throw new ApiError(
        "DUPLICATE_ATTENDANCE_DATE",
        `dates contains duplicate date ${dateOnly}`,
        400,
        { date: dateOnly, index },
      );
    }
    declaredDateSet.add(dateOnly);
    dates.push(dateOnly);
    dateObjects.push(date);
  }

  for (const [index, record] of (records || []).entries()) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new ApiError(
        "INVALID_ATTENDANCE_RECORDS",
        "each attendance record must be an object",
        400,
        { index },
      );
    }
    const recordDate = parseAttendanceDate(
      (record as { attendance_date?: unknown }).attendance_date,
      "records[].attendance_date",
      index,
    ).toISOString().slice(0, 10);
    if (!declaredDateSet.has(recordDate)) {
      throw new ApiError(
        "ATTENDANCE_DATE_OUT_OF_SCOPE",
        `record attendance_date ${recordDate} is not included in dates`,
        400,
        { date: recordDate, index },
      );
    }
  }

  return { dates, dateObjects };
}

export function validateBulkAttendanceRecords(
  records: unknown,
  expectedClassId: string,
): ValidatedBulkAttendanceRecord[] {
  if (records === undefined || records === null) return [];
  if (!Array.isArray(records)) {
    throw new ApiError(
      "INVALID_ATTENDANCE_RECORDS",
      "records must be an array",
      400,
    );
  }

  return records.map((record, index) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new ApiError(
        "INVALID_ATTENDANCE_RECORDS",
        "each attendance record must be an object",
        400,
        { index },
      );
    }

    const row = record as Record<string, unknown>;
    if (typeof row.status !== "string" || !ATTENDANCE_STATUSES.has(row.status)) {
      throw new ApiError(
        "INVALID_ATTENDANCE_STATUS",
        `unsupported attendance status at records[${index}]`,
        400,
        { index, status: row.status },
      );
    }
    if (typeof row.student_id !== "string" || row.student_id.trim() === "") {
      throw new ApiError(
        "MISSING_STUDENT_ID",
        `student_id is required at records[${index}]`,
        400,
        { index },
      );
    }
    if (row.class_id !== expectedClassId) {
      throw new ApiError(
        "ATTENDANCE_CLASS_MISMATCH",
        `class_id must match the bulk request at records[${index}]`,
        400,
        { index, class_id: row.class_id, expected_class_id: expectedClassId },
      );
    }

    return row as ValidatedBulkAttendanceRecord;
  });
}

export async function assertBulkAttendanceDateScopeEditable(
  scope: BulkAttendanceDateScope,
  checkEditable: (dates: Date[]) => Promise<void>,
) {
  await checkEditable(scope.dateObjects);
}

const ATTENDANCE_GENERATED_SOURCES = new Set([
  "attendance_bulk",
  "attendance_single",
]);

export function isAttendanceGeneratedSession(session: {
  source?: string | null;
  replacementSessions?: unknown[];
}) {
  return ATTENDANCE_GENERATED_SOURCES.has(session.source || "") &&
    (session.replacementSessions?.length || 0) === 0;
}

export function buildAttendanceSessionUpdate(
  session: { source?: string | null; replacementSessions?: unknown[] },
  input: {
    inferredKind: "regular" | "makeup";
    status: "held" | "holiday";
    userId: string;
  },
) {
  const update: {
    kind?: "regular" | "makeup";
    status: "held" | "holiday";
    updatedById: string;
    version: { increment: number };
  } = {
    status: input.status,
    updatedById: input.userId,
    version: { increment: 1 },
  };
  if (isAttendanceGeneratedSession(session)) {
    update.kind = input.inferredKind;
  }
  return update;
}

export async function reconcileClearedAttendanceSessions(
  tx: any,
  input: {
    classId: string;
    dates: Date[];
    userId: string;
  },
) {
  if (input.dates.length === 0) return { deleted: 0, retained: 0 };

  const sessions = await tx.classSession.findMany({
    where: {
      classId: input.classId,
      sessionDate: { in: input.dates },
    },
    select: {
      id: true,
      source: true,
      replacementSessions: { select: { id: true }, take: 1 },
    },
  });
  const generatedIds = sessions
    .filter(isAttendanceGeneratedSession)
    .map((session: any) => session.id);
  const retainedIds = sessions
    .filter((session: any) => !generatedIds.includes(session.id))
    .map((session: any) => session.id);

  const deleted = generatedIds.length > 0
    ? await tx.classSession.deleteMany({
        where: {
          id: { in: generatedIds },
          attendance: { none: {} },
          replacementSessions: { none: {} },
        },
      })
    : { count: 0 };

  if (retainedIds.length > 0) {
    await tx.classSession.updateMany({
      where: { id: { in: retainedIds } },
      data: {
        status: "planned",
        updatedById: input.userId,
        version: { increment: 1 },
      },
    });
  }

  return { deleted: deleted.count, retained: retainedIds.length };
}
