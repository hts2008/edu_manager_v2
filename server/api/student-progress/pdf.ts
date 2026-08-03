import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import { type AuthedRequest, errorResponse, handleCors, requireAuth } from "../../../lib/auth.js";
import { ApiError, getString, sendApiError } from "../../../lib/api-utils.js";
import { renderPdfDefinition } from "../../../lib/pdf.js";
import { buildStudentProgressPdfDefinition } from "../../../lib/student-progress-pdf.js";
import {
  buildStudentProgressTimeline,
  MAX_PROGRESS_RANGE_DAYS,
} from "../../../lib/student-progress-timeline.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: string, field: string) {
  if (!DATE_PATTERN.test(value)) throw new ApiError("VALIDATION_ERROR", `${field} must use YYYY-MM-DD`, 400);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ApiError("VALIDATION_ERROR", `${field} is invalid`, 400);
  }
  return date;
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  try {
    const studentId = getString(req.query.student_id || req.query.studentId);
    const classId = getString(req.query.class_id || req.query.classId);
    const from = getString(req.query.from);
    const to = getString(req.query.to);
    if (!studentId || !classId || !from || !to) {
      throw new ApiError("VALIDATION_ERROR", "student_id, class_id, from, and to are required", 400);
    }
    const startDate = parseDate(from, "from");
    const inclusiveEndDate = parseDate(to, "to");
    if (inclusiveEndDate < startDate) throw new ApiError("VALIDATION_ERROR", "to must not be before from", 400);
    const rangeDays = Math.floor((inclusiveEndDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
    if (rangeDays > MAX_PROGRESS_RANGE_DAYS) {
      throw new ApiError("VALIDATION_ERROR", `PDF range cannot exceed ${MAX_PROGRESS_RANGE_DAYS} days`, 400);
    }
    const endDate = new Date(inclusiveEndDate);
    endDate.setUTCDate(endDate.getUTCDate() + 1);

    const [months, center] = await Promise.all([
      prisma.studentProgressMonth.findMany({
        where: { studentId, classId, month: { gte: from.slice(0, 7), lte: to.slice(0, 7) } },
        include: {
          student: { select: { fullName: true, parent: { select: { fullName: true, phone: true } } } },
          class: { select: { className: true } },
          dailyEntries: {
            where: { entryDate: { gte: startDate, lt: endDate } },
            include: { gradedByTeacher: { select: { id: true, fullName: true } } },
            orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
          },
        },
        orderBy: { month: "asc" },
      }),
      prisma.centerSettings.findUnique({ where: { id: 1 } }),
    ]);
    const timeline = buildStudentProgressTimeline(months, from, to);
    const identity = months[0];
    const latest = months.at(-1);
    const definition = buildStudentProgressPdfDefinition({
      center: { name: center?.centerName, address: center?.centerAddress, phone: center?.centerPhone },
      student: {
        name: identity?.student?.fullName,
        parent_name: identity?.student?.parent?.fullName,
        parent_phone: identity?.student?.parent?.phone,
      },
      class: { name: identity?.class?.className, track_key: identity?.trackKey },
      ...timeline,
      teacher_note: latest?.teacherNote,
      parent_summary: latest?.parentSummary,
      printed_by: req.user.fullName || req.user.username || req.user.id,
    });
    const buffer = await renderPdfDefinition(definition);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="student-progress-${studentId}-${from}-${to}.pdf"`);
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).send(buffer);
  } catch (error) {
    return sendApiError(res, error, "STUDENT_PROGRESS_PDF_ERROR");
  }
}

export default requireAuth(handler, ["admin", "receptionist"]);
