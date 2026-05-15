import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  handleCors,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";
import { getString, sendApiError } from "../../../lib/api-utils.js";

function periodKey(date: Date, groupBy: string) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  if (groupBy === "year") return String(year);
  if (groupBy === "month" || groupBy === "monthly") return `${year}-${month}`;
  if (groupBy === "week" || groupBy === "weekly") {
    const firstDay = new Date(year, 0, 1);
    const pastDays = Math.floor((date.getTime() - firstDay.getTime()) / 86400000);
    const week = String(Math.ceil((pastDays + firstDay.getDay() + 1) / 7)).padStart(2, "0");
    return `${year}-W${week}`;
  }
  return `${year}-${month}-${day}`;
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }
  if (req.user.role !== "admin") {
    return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
  }

  try {
    const from = getString(req.query.from || req.query.start_date);
    const to = getString(req.query.to || req.query.end_date);
    const groupBy = getString(req.query.groupBy || req.query.period || req.query.type) || "day";
    const where: any = {};

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(`${from}T00:00:00`);
      if (to) where.createdAt.lte = new Date(`${to}T23:59:59.999`);
    }

    const [receipts, payments] = await Promise.all([
      prisma.receipt.findMany({
        where,
        include: { student: { select: { fullName: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const mappedReceipts = receipts.map((receipt) => ({
      id: receipt.id,
      student_id: receipt.studentId,
      student_name: receipt.student.fullName,
      month: receipt.month,
      amount: receipt.amount,
      created_at: receipt.createdAt,
      period: periodKey(receipt.createdAt, groupBy),
    }));

    const mappedPayments = payments.map((payment) => ({
      id: payment.id,
      category: payment.category,
      recipient_name: payment.recipientName,
      amount: payment.amount,
      created_at: payment.createdAt,
      period: periodKey(payment.createdAt, groupBy),
    }));

    const paymentsByCategory = mappedPayments.reduce<Record<string, number>>(
      (acc, payment) => {
        acc[payment.category] = (acc[payment.category] || 0) + payment.amount;
        return acc;
      },
      {}
    );

    const byPeriod = new Map<string, { period: string; receipts: number; payments: number }>();
    for (const receipt of mappedReceipts) {
      const item = byPeriod.get(receipt.period) || {
        period: receipt.period,
        receipts: 0,
        payments: 0,
      };
      item.receipts += receipt.amount;
      byPeriod.set(receipt.period, item);
    }
    for (const payment of mappedPayments) {
      const item = byPeriod.get(payment.period) || {
        period: payment.period,
        receipts: 0,
        payments: 0,
      };
      item.payments += payment.amount;
      byPeriod.set(payment.period, item);
    }

    const totalReceipts = mappedReceipts.reduce((sum, item) => sum + item.amount, 0);
    const totalPayments = mappedPayments.reduce((sum, item) => sum + item.amount, 0);

    return successResponse(res, {
      receipts: mappedReceipts,
      payments: mappedPayments,
      paymentsByCategory: Object.entries(paymentsByCategory).map(
        ([category, total]) => ({ category, total })
      ),
      summary: {
        total_receipts: totalReceipts,
        total_payments: totalPayments,
        totalReceipts,
        totalPayments,
        balance: totalReceipts - totalPayments,
        count_receipts: mappedReceipts.length,
        count_payments: mappedPayments.length,
        avg_receipt: mappedReceipts.length ? totalReceipts / mappedReceipts.length : 0,
        avg_payment: mappedPayments.length ? totalPayments / mappedPayments.length : 0,
      },
      byPeriod: Array.from(byPeriod.values()).sort((a, b) =>
        a.period.localeCompare(b.period)
      ),
    });
  } catch (error) {
    return sendApiError(res, error, "FINANCIAL_REPORT_ERROR");
  }
}

export default requireAuth(handler, ["admin"]);
