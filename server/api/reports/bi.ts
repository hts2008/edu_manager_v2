import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  errorResponse,
  handleCors,
  requireAuth,
  successResponse,
} from "../../../lib/auth.js";
import { parseMonthRange, sendApiError } from "../../../lib/api-utils.js";
import {
  buildReportCharts,
  buildReportCube,
  filterReportRows,
  parseReportBiQuery,
  summarizeReportRows,
} from "../../../lib/report-cube.js";

function evidenceKey(studentId: string, classId: string) {
  return `${studentId}\u0000${classId}`;
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  try {
    const query = parseReportBiQuery(req.query);
    const rangeStart = parseMonthRange(query.from).startDate;
    const rangeEnd = parseMonthRange(query.to).endDate;
    const enrollmentWhere: Record<string, unknown> = {
      enrollmentDate: { lte: rangeEnd },
      student: { deletedAt: null },
    };
    if (query.student_id) enrollmentWhere.studentId = query.student_id;

    const enrollmentRows = await prisma.studentClass.findMany({
      where: enrollmentWhere,
      select: {
        studentId: true,
        classId: true,
        enrollmentDate: true,
        status: true,
        student: { select: { fullName: true } },
        class: {
          select: {
            className: true,
            feePerDay: true,
            scheduleDays: true,
            sessionsPerWeek: true,
          },
        },
      },
      orderBy: [
        { student: { fullName: "asc" } },
        { class: { className: "asc" } },
      ],
    });

    const studentIds = [...new Set(enrollmentRows.map((row) => row.studentId))];
    const classIds = [...new Set(enrollmentRows.map((row) => row.classId))];
    const [attendanceRows, feeLineRows, monthlyFeeRows] =
      studentIds.length && classIds.length
        ? await Promise.all([
            prisma.attendance.findMany({
              where: {
                studentId: { in: studentIds },
                classId: { in: classIds },
                attendanceDate: { gte: rangeStart, lte: rangeEnd },
              },
              select: {
                studentId: true,
                classId: true,
                attendanceDate: true,
                status: true,
                isMakeUp: true,
              },
            }),
            prisma.monthlyFeeLine.findMany({
              where: {
                studentId: { in: studentIds },
                classId: { in: classIds },
                month: { in: query.months },
              },
              select: {
                id: true,
                monthlyFeeId: true,
                studentId: true,
                classId: true,
                month: true,
                expectedSessions: true,
                amount: true,
                status: true,
                allocationConfidence: true,
              },
            }),
            prisma.monthlyFee.findMany({
              where: {
                studentId: { in: studentIds },
                month: { in: query.months },
              },
              select: {
                id: true,
                studentId: true,
                month: true,
                totalDays: true,
                totalAmount: true,
                status: true,
                receiptId: true,
                paidAt: true,
              },
            }),
          ])
        : [[], [], []];
    const evidenceByEnrollment = new Set<string>();
    for (const record of attendanceRows) {
      evidenceByEnrollment.add(evidenceKey(record.studentId, record.classId));
    }
    for (const line of feeLineRows) {
      if (line.classId) evidenceByEnrollment.add(evidenceKey(line.studentId, line.classId));
    }
    const reportEnrollmentRows = enrollmentRows.filter(
      (row) =>
        row.status === "active" ||
        evidenceByEnrollment.has(evidenceKey(row.studentId, row.classId))
    );

    const cube = buildReportCube({
      months: query.months,
      enrollments: reportEnrollmentRows.map((row) => ({
        studentId: row.studentId,
        studentName: row.student.fullName,
        classId: row.classId,
        className: row.class.className,
        enrollmentDate: row.enrollmentDate,
        feePerDay: row.class.feePerDay,
        scheduleDays: row.class.scheduleDays,
        sessionsPerWeek: row.class.sessionsPerWeek,
      })),
      attendance: attendanceRows,
      feeLines: feeLineRows,
      monthlyFees: monthlyFeeRows,
    });
    const classes = Array.from(
      new Map(
        cube.students.map((row) => [
          row.class_id,
          {
            id: row.class_id,
            name: row.class_name,
          },
        ])
      ).values()
    ).sort((a, b) => a.name.localeCompare(b.name));
    const filteredRows = filterReportRows(cube.students, query);
    const totalItems = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / query.page_size));
    const page = Math.min(Math.max(1, query.page), totalPages);
    const offset = (page - 1) * query.page_size;
    const students = filteredRows.slice(offset, offset + query.page_size);

    return successResponse(res, {
      summary: summarizeReportRows(filteredRows),
      charts: buildReportCharts(filteredRows),
      students,
      pagination: {
        page,
        page_size: query.page_size,
        total_items: totalItems,
        total_pages: totalPages,
      },
      meta: {
        from: query.from,
        to: query.to,
        month_count: query.months.length,
        cube_grain: "student_class_month",
        classes,
        filters: {
          mode: query.mode,
          class_id: query.class_id,
          student_id: query.student_id,
          q: query.q,
          risk_only: query.risk_only,
        },
        metric_definitions: {
          actual_present_rate:
            "present / non_holiday_attendance_records",
          chargeable_rate:
            "(present + absent_with_fee) / expected_sessions",
          record_completion_rate:
            "attendance_records / expected_sessions",
        },
        fee_policy: {
          primary: "monthly_fee_line_per_class",
          single_class_fallback: "monthly_fee_requires_review",
          multi_class_fallback: "unallocated_no_amount_requires_review",
        },
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    return sendApiError(res, error, "BI_REPORT_ERROR");
  }
}

export default requireAuth(handler, ["admin"]);
