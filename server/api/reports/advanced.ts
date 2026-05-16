import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  errorResponse,
  handleCors,
  requireAuth,
  successResponse,
} from "../../../lib/auth.js";
import { ApiError, getString, sendApiError, toDateOnly } from "../../../lib/api-utils.js";

type GroupBy = "day" | "week" | "month" | "year";

function normalizeGroupBy(value?: string): GroupBy {
  if (value === "daily" || value === "day") return "day";
  if (value === "weekly" || value === "week") return "week";
  if (value === "yearly" || value === "year") return "year";
  return "month";
}

function parseDate(value: string | undefined, fallback: Date, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function periodKey(date: Date, groupBy: GroupBy) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  if (groupBy === "year") return String(year);
  if (groupBy === "month") return `${year}-${month}`;
  if (groupBy === "week") {
    const firstDay = new Date(year, 0, 1);
    const pastDays = Math.floor((date.getTime() - firstDay.getTime()) / 86400000);
    const week = String(Math.ceil((pastDays + firstDay.getDay() + 1) / 7)).padStart(2, "0");
    return `${year}-W${week}`;
  }
  return `${year}-${month}-${day}`;
}

function ensurePeriod(
  map: Map<string, { period: string; total_receipts: number; total_payments: number; net_revenue: number }>,
  period: string
) {
  const existing = map.get(period);
  if (existing) return existing;
  const created = { period, total_receipts: 0, total_payments: 0, net_revenue: 0 };
  map.set(period, created);
  return created;
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  try {
    const today = new Date();
    const defaultFrom = new Date(today.getFullYear(), today.getMonth() - 11, 1);
    const from = parseDate(getString(req.query.from || req.query.start_date), defaultFrom);
    const to = parseDate(getString(req.query.to || req.query.end_date), today, true);
    const groupBy = normalizeGroupBy(
      getString(req.query.group_by || req.query.groupBy || req.query.period || req.query.type)
    );

    if (from > to) {
      throw new ApiError("INVALID_DATE_RANGE", "from must be before to", 400);
    }

    const dateWindow = { gte: from, lte: to };
    const [receipts, payments, classes, attendance, students] = await Promise.all([
      prisma.receipt.findMany({
        where: { createdAt: dateWindow, deletedAt: null },
        select: { amount: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.payment.findMany({
        where: { createdAt: dateWindow, deletedAt: null },
        select: { amount: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.class.findMany({
        where: { status: "active" },
        include: {
          teacher: { select: { id: true, fullName: true } },
          studentClasses: {
            where: { status: "active" },
            select: { studentId: true },
          },
        },
        orderBy: { className: "asc" },
      }),
      prisma.attendance.findMany({
        where: { attendanceDate: dateWindow },
        select: { classId: true, status: true },
      }),
      prisma.student.findMany({
        where: { enrollmentDate: dateWindow, deletedAt: null },
        select: { id: true, enrollmentDate: true, status: true },
      }),
    ]);

    const revenueMap = new Map<
      string,
      { period: string; total_receipts: number; total_payments: number; net_revenue: number }
    >();
    for (const receipt of receipts) {
      const item = ensurePeriod(revenueMap, periodKey(receipt.createdAt, groupBy));
      item.total_receipts += receipt.amount;
      item.net_revenue = item.total_receipts - item.total_payments;
    }
    for (const payment of payments) {
      const item = ensurePeriod(revenueMap, periodKey(payment.createdAt, groupBy));
      item.total_payments += payment.amount;
      item.net_revenue = item.total_receipts - item.total_payments;
    }

    const attendanceByClass = new Map<
      string,
      {
        total_sessions: number;
        present_sessions: number;
        absent_with_fee: number;
        absent_no_fee: number;
        holiday: number;
      }
    >();
    for (const record of attendance) {
      const current =
        attendanceByClass.get(record.classId) ||
        {
          total_sessions: 0,
          present_sessions: 0,
          absent_with_fee: 0,
          absent_no_fee: 0,
          holiday: 0,
        };
      current.total_sessions += 1;
      if (record.status === "present") current.present_sessions += 1;
      if (record.status === "absent_with_fee") current.absent_with_fee += 1;
      if (record.status === "absent_no_fee") current.absent_no_fee += 1;
      if (record.status === "holiday") current.holiday += 1;
      attendanceByClass.set(record.classId, current);
    }

    const teacherMap = new Map<
      string,
      {
        teacher_id: string | null;
        teacher_name: string;
        active_classes: number;
        active_students: number;
        total_sessions: number;
        present_sessions: number;
        absent_with_fee: number;
        absent_no_fee: number;
        holiday: number;
        utilization_rate: number;
      }
    >();
    for (const classItem of classes) {
      const teacherId = classItem.teacher?.id || "unassigned";
      const current =
        teacherMap.get(teacherId) ||
        {
          teacher_id: classItem.teacher?.id || null,
          teacher_name: classItem.teacher?.fullName || "Chua phan cong",
          active_classes: 0,
          active_students: 0,
          total_sessions: 0,
          present_sessions: 0,
          absent_with_fee: 0,
          absent_no_fee: 0,
          holiday: 0,
          utilization_rate: 0,
        };
      const classAttendance =
        attendanceByClass.get(classItem.id) ||
        {
          total_sessions: 0,
          present_sessions: 0,
          absent_with_fee: 0,
          absent_no_fee: 0,
          holiday: 0,
        };
      current.active_classes += 1;
      current.active_students += classItem.studentClasses.length;
      current.total_sessions += classAttendance.total_sessions;
      current.present_sessions += classAttendance.present_sessions;
      current.absent_with_fee += classAttendance.absent_with_fee;
      current.absent_no_fee += classAttendance.absent_no_fee;
      current.holiday += classAttendance.holiday;
      current.utilization_rate = current.total_sessions
        ? Math.round((current.present_sessions / current.total_sessions) * 100)
        : 0;
      teacherMap.set(teacherId, current);
    }

    const cohortMap = new Map<
      string,
      {
        cohort: string;
        total_students: number;
        active_students: number;
        inactive_students: number;
        graduated_students: number;
        retention_rate: number;
      }
    >();
    for (const student of students) {
      const cohort = periodKey(student.enrollmentDate, "month");
      const current =
        cohortMap.get(cohort) ||
        {
          cohort,
          total_students: 0,
          active_students: 0,
          inactive_students: 0,
          graduated_students: 0,
          retention_rate: 0,
        };
      current.total_students += 1;
      if (student.status === "active") current.active_students += 1;
      if (student.status === "inactive") current.inactive_students += 1;
      if (student.status === "graduated") current.graduated_students += 1;
      current.retention_rate = current.total_students
        ? Math.round((current.active_students / current.total_students) * 100)
        : 0;
      cohortMap.set(cohort, current);
    }

    const revenueTrend = Array.from(revenueMap.values()).sort((a, b) =>
      a.period.localeCompare(b.period)
    );
    const teacherUtilization = Array.from(teacherMap.values()).sort(
      (a, b) => b.active_classes - a.active_classes || a.teacher_name.localeCompare(b.teacher_name)
    );
    const retentionCohort = Array.from(cohortMap.values()).sort((a, b) =>
      a.cohort.localeCompare(b.cohort)
    );
    const totalReceipts = receipts.reduce((sum, item) => sum + item.amount, 0);
    const totalPayments = payments.reduce((sum, item) => sum + item.amount, 0);

    return successResponse(res, {
      from: toDateOnly(from),
      to: toDateOnly(to),
      group_by: groupBy,
      revenue_trend: revenueTrend,
      teacher_utilization: teacherUtilization,
      retention_cohort: retentionCohort,
      summary: {
        total_receipts: totalReceipts,
        total_payments: totalPayments,
        net_revenue: totalReceipts - totalPayments,
        receipt_count: receipts.length,
        payment_count: payments.length,
        active_teacher_count: teacherUtilization.filter((item) => item.teacher_id).length,
        active_class_count: classes.length,
        cohort_student_count: students.length,
      },
    });
  } catch (error) {
    return sendApiError(res, error, "ADVANCED_REPORT_ERROR");
  }
}

export default requireAuth(handler, ["admin"]);
