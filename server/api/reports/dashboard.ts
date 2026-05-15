import type { VercelRequest, VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  handleCors,
  verifyAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  const authUser = verifyAuth(req);
  if (!authUser) {
    return errorResponse(res, "UNAUTHORIZED", "Authentication required", 401);
  }

  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  try {
    // Get counts
    const [totalStudents, activeStudents, totalClasses, totalTeachers] =
      await Promise.all([
        prisma.student.count(),
        prisma.student.count({ where: { status: "active" } }),
        prisma.class.count({ where: { status: "active" } }),
        prisma.teacher.count({ where: { status: "active" } }),
      ]);

    // Get current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get financial summary
    const [receiptsSum, paymentsSum] = await Promise.all([
      prisma.receipt.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: startOfMonth, lte: endOfMonth } },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: startOfMonth, lte: endOfMonth } },
      }),
    ]);

    // Get recent transactions
    const [recentReceipts, recentPayments] = await Promise.all([
      prisma.receipt.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          student: { select: { fullName: true } },
        },
      }),
      prisma.payment.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Combine and sort transactions
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

    return successResponse(res, {
      stats: {
        total_students: totalStudents,
        active_students: activeStudents,
        total_classes: totalClasses,
        total_teachers: totalTeachers,
        month_revenue: receiptsSum._sum.amount || 0,
        month_expenses: paymentsSum._sum.amount || 0,
      },
      recent_transactions: recentTransactions,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
  }
}
