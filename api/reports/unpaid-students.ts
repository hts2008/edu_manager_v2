import type { VercelResponse } from "@vercel/node";
import prisma from "../../lib/prisma.js";
import {
  AuthedRequest,
  handleCors,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../lib/auth.js";
import {
  getRequiredString,
  getString,
  parseMonthRange,
  sendApiError,
} from "../../lib/api-utils.js";

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  try {
    const month =
      getString(req.query.month) || new Date().toISOString().slice(0, 7);
    const { startDate, endDate } = parseMonthRange(month);
    const today = new Date();

    const fees = await prisma.monthlyFee.findMany({
      where: {
        month,
        status: { not: "paid" },
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

    const attendanceRows = await Promise.all(
      studentsWithAttendance.map(async (student: any) => {
        const daysCount = await prisma.attendance.count({
          where: {
            studentId: student.id,
            attendanceDate: { gte: startDate, lte: endDate },
            status: { in: ["present", "absent_with_fee"] },
          },
        });

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
      })
    );

    return successResponse(res, {
      month: getRequiredString(month, "month"),
      students: [...feeRows, ...attendanceRows],
    });
  } catch (error) {
    return sendApiError(res, error, "UNPAID_STUDENTS_REPORT_ERROR");
  }
}

export default requireAuth(handler);
