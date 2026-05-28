import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";
import { getString, sendApiError } from "../../../lib/api-utils.js";

type DashboardMode = "summary" | "full";

function normalizeMode(value: string | undefined): DashboardMode {
  return value === "summary" ? "summary" : "full";
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  try {
    const mode = normalizeMode(getString(req.query.mode));
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const unpaidWhere = {
      month: currentMonth,
      status: { not: "paid" },
      student: { status: "active", deletedAt: null },
    } as const;

    const [
      totalStudents,
      activeStudents,
      totalClasses,
      totalTeachers,
      receiptsSum,
      paymentsSum,
      unpaidFeesCount,
      unpaidFeesAggregate,
      todayAttendance,
    ] = await Promise.all([
      prisma.student.count({ where: { deletedAt: null } }),
      prisma.student.count({ where: { status: "active", deletedAt: null } }),
      prisma.class.count({ where: { status: "active" } }),
      prisma.teacher.count({ where: { status: "active" } }),
      prisma.receipt.aggregate({
        _sum: { amount: true },
        where: {
          createdAt: { gte: startOfMonth, lte: endOfMonth },
          deletedAt: null,
        },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          createdAt: { gte: startOfMonth, lte: endOfMonth },
          deletedAt: null,
        },
      }),
      prisma.monthlyFee.count({ where: unpaidWhere }),
      prisma.monthlyFee.aggregate({
        _sum: { totalAmount: true },
        where: unpaidWhere,
      }),
      prisma.attendance.groupBy({
        by: ["status"],
        where: {
          attendanceDate: { gte: startOfToday, lt: endOfToday },
        },
        _count: { status: true },
      }),
    ]);

    const todayAttendanceCounts = todayAttendance.reduce(
      (acc, item) => {
        acc[item.status] = item._count.status;
        acc.total += item._count.status;
        return acc;
      },
      {
        total: 0,
        present: 0,
        absent_with_fee: 0,
        absent_no_fee: 0,
        holiday: 0,
      } as Record<string, number>
    );
    const monthRevenue = receiptsSum._sum.amount || 0;
    const monthExpenses = paymentsSum._sum.amount || 0;
    const unpaidAmount = unpaidFeesAggregate._sum.totalAmount || 0;
    const paymentCoverage = activeStudents
      ? Math.max(
          0,
          Math.round(((activeStudents - unpaidFeesCount) / activeStudents) * 100)
        )
      : 100;
    const presentRate = todayAttendanceCounts.total
      ? Math.round(
          (todayAttendanceCounts.present / todayAttendanceCounts.total) * 100
        )
      : 0;
    const attentionItems = [
      {
        id: "attendance-today",
        type: "attendance",
        title: "Điểm danh hôm nay",
        count: todayAttendanceCounts.total,
        severity: todayAttendanceCounts.total > 0 ? "info" : "warning",
        to: "/attendance",
      },
      {
        id: "unpaid-fees",
        type: "finance",
        title: "Học phí cần thu",
        count: unpaidFeesCount,
        amount: unpaidAmount,
        severity: unpaidFeesCount > 0 ? "warning" : "success",
        to: "/fee-collection",
      },
      {
        id: "cashflow",
        type: "cashflow",
        title: "Dòng tiền ròng tháng này",
        amount: monthRevenue - monthExpenses,
        severity: monthRevenue >= monthExpenses ? "success" : "danger",
        to: "/reports",
      },
    ];

    const basePayload = {
      stats: {
        total_students: totalStudents,
        active_students: activeStudents,
        total_classes: totalClasses,
        total_teachers: totalTeachers,
        month_revenue: monthRevenue,
        month_expenses: monthExpenses,
      },
      recent_transactions: [],
      unpaid_students: [],
      today_attendance: {
        total: todayAttendanceCounts.total,
        present: todayAttendanceCounts.present,
        absent_with_fee: todayAttendanceCounts.absent_with_fee,
        absent_no_fee: todayAttendanceCounts.absent_no_fee,
        holiday: todayAttendanceCounts.holiday,
        present_rate: presentRate,
      },
      attention_items: attentionItems,
      quick_metrics: {
        current_month: currentMonth,
        payment_coverage: paymentCoverage,
        unpaid_count: unpaidFeesCount,
        unpaid_amount: unpaidAmount,
        net_revenue: monthRevenue - monthExpenses,
      },
    };

    if (mode === "summary") {
      return successResponse(res, basePayload);
    }

    const [unpaidFees, recentReceipts, recentPayments] = await Promise.all([
      prisma.monthlyFee.findMany({
        where: unpaidWhere,
        take: 8,
        orderBy: [{ totalAmount: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          studentId: true,
          month: true,
          totalDays: true,
          totalAmount: true,
          status: true,
          student: {
            select: {
              id: true,
              fullName: true,
              parent: { select: { phone: true } },
              studentClasses: {
                where: { status: "active" },
                take: 1,
                select: { class: { select: { className: true } } },
              },
            },
          },
        },
      }),
      prisma.receipt.findMany({
        where: { deletedAt: null },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amount: true,
          createdAt: true,
          student: { select: { fullName: true } },
        },
      }),
      prisma.payment.findMany({
        where: { deletedAt: null },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amount: true,
          recipientName: true,
          createdAt: true,
        },
      }),
    ]);

    const recentTransactions = [
      ...recentReceipts.map((r) => ({
        id: r.id,
        type: "receipt" as const,
        amount: r.amount,
        description: `Thu tiền - ${r.student.fullName}`,
        date: r.createdAt,
      })),
      ...recentPayments.map((p) => ({
        id: p.id,
        type: "payment" as const,
        amount: p.amount,
        description: `Chi - ${p.recipientName}`,
        date: p.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    const unpaidStudents = unpaidFees.map((fee) => ({
      id: fee.studentId,
      monthly_fee_id: fee.id,
      full_name: fee.student.fullName,
      class_name: fee.student.studentClasses[0]?.class?.className || null,
      parent_phone: fee.student.parent?.phone || null,
      month: fee.month,
      days_count: fee.totalDays,
      total_amount: fee.totalAmount,
      status: fee.status,
    }));

    return successResponse(res, {
      ...basePayload,
      recent_transactions: recentTransactions,
      unpaid_students: unpaidStudents,
    });
  } catch (error) {
    return sendApiError(res, error, "DASHBOARD_ERROR");
  }
}

export default requireAuth(handler);
