import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  handleCors,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";
import {
  getBusinessMonthKey,
  getRequiredString,
  getString,
  parseMonthRange,
  sendApiError,
} from "../../../lib/api-utils.js";

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  try {
    const month = getString(req.query.month) || getBusinessMonthKey();
    const { startDate, endDate } = parseMonthRange(month);
    const today = new Date();

    const fees = await prisma.monthlyFee.findMany({
      where: {
        month,
        status: { not: "paid" },
        student: {
          deletedAt: null,
          parent: { deletedAt: null },
        },
      },
      include: {
        student: {
          include: {
            parent: { select: { fullName: true, phone: true } },
            studentClasses: {
              where: { status: "active" },
              include: { class: { select: { className: true } } },
            },
          },
        },
      },
      orderBy: { student: { fullName: "asc" } },
    });

    const feeStudentIds = new Set(fees.map((fee) => fee.studentId));
    const studentsWithAttendance = await prisma.student.findMany({
      where: {
        status: "active",
        deletedAt: null,
        id: { notIn: Array.from(feeStudentIds) },
        attendance: {
          some: {
            attendanceDate: { gte: startDate, lte: endDate },
            status: { in: ["present", "absent_with_fee"] },
          },
        },
      },
      include: {
        parent: { select: { fullName: true, phone: true } },
        studentClasses: {
          where: { status: "active" },
          include: { class: { select: { className: true } } },
        },
      },
      orderBy: { fullName: "asc" },
    });

    const feeRows = fees.map((fee) => ({
      student_id: fee.studentId,
      studentId: fee.studentId,
      full_name: fee.student.fullName,
      fullName: fee.student.fullName,
      parent_name: fee.student.parent?.fullName || null,
      parent_phone: fee.student.parent?.phone || null,
      classes: fee.student.studentClasses
        .map((studentClass) => studentClass.class.className)
        .join(", "),
      total_amount: fee.totalAmount,
      totalAmount: fee.totalAmount,
      days_overdue: Math.max(
        0,
        Math.floor((today.getTime() - endDate.getTime()) / 86400000)
      ),
      daysOverdue: Math.max(
        0,
        Math.floor((today.getTime() - endDate.getTime()) / 86400000)
      ),
      status: fee.status,
    }));

    const attendanceStudentIds = studentsWithAttendance.map(
      (student) => student.id
    );
    const attendanceCounts =
      attendanceStudentIds.length > 0
        ? await prisma.attendance.groupBy({
            by: ["studentId"],
            where: {
              studentId: { in: attendanceStudentIds },
              attendanceDate: { gte: startDate, lte: endDate },
              status: { in: ["present", "absent_with_fee"] },
            },
            _count: { _all: true },
          })
        : [];
    const attendanceCountByStudentId = new Map(
      attendanceCounts.map((count) => [count.studentId, count._count._all])
    );

    const attendanceRows = studentsWithAttendance.map((student: any) => {
      const daysCount = attendanceCountByStudentId.get(student.id) || 0;

      return {
        student_id: student.id,
        studentId: student.id,
        full_name: student.fullName,
        fullName: student.fullName,
        parent_name: student.parent?.fullName || null,
        parent_phone: student.parent?.phone || null,
        classes: student.studentClasses
          .map((studentClass: any) => studentClass.class.className)
          .join(", "),
        total_amount: 0,
        totalAmount: 0,
        days_count: daysCount,
        days_overdue: Math.max(
          0,
          Math.floor((today.getTime() - endDate.getTime()) / 86400000)
        ),
        daysOverdue: Math.max(
          0,
          Math.floor((today.getTime() - endDate.getTime()) / 86400000)
        ),
        status: "pending",
      };
    });

    return successResponse(res, {
      month: getRequiredString(month, "month"),
      students: [...feeRows, ...attendanceRows],
    });
  } catch (error) {
    return sendApiError(res, error, "UNPAID_STUDENTS_REPORT_ERROR");
  }
}

export default requireAuth(handler);
