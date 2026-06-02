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
import {
  detectMonthlyFeeAnomaly,
  detectReceiptAnomaly,
} from "../../../lib/finance-corrections.js";

type GroupBy = "day" | "week" | "month" | "year";
type ClassLine = {
  class_id: string;
  class_name: string | null;
  expected_amount: number;
  paid_amount: number;
  outstanding_amount: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  salary: "Luong giao vien",
  utility: "Dien/Nuoc",
  office: "Van phong pham",
  other: "Khac",
};

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

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(from: Date, to: Date) {
  const months: string[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cursor <= end) {
    months.push(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

function monthToPeriod(month: string, groupBy: GroupBy) {
  const [year, monthNumber] = month.split("-").map(Number);
  return periodKey(new Date(year, monthNumber - 1, 1), groupBy);
}

function ensureTrend(
  map: Map<
    string,
    {
      period: string;
      revenue: number;
      expenses: number;
      net: number;
      receipt_count: number;
      payment_count: number;
      expected_collection: number;
      collected_tuition: number;
      outstanding_amount: number;
    }
  >,
  period: string
) {
  const existing = map.get(period);
  if (existing) return existing;
  const created = {
    period,
    revenue: 0,
    expenses: 0,
    net: 0,
    receipt_count: 0,
    payment_count: 0,
    expected_collection: 0,
    collected_tuition: 0,
    outstanding_amount: 0,
  };
  map.set(period, created);
  return created;
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function safeJson(value: unknown) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function extractClassLines(fee: any) {
  const noteJson = safeJson(fee?.notes);
  const candidates = [
    fee?.classLines,
    fee?.class_lines,
    fee?.lineItems,
    fee?.line_items,
    fee?.breakdown,
    fee?.items,
    noteJson?.class_lines,
    noteJson?.classLines,
    noteJson?.line_items,
    noteJson?.lineItems,
    noteJson?.breakdown,
  ];

  for (const candidate of candidates) {
    const lines = asArray(candidate)
      .map((line: any): ClassLine | null => {
        const classId = line.class_id || line.classId || line.id || null;
        if (!classId) return null;
        const expectedAmount = Number(
          line.expected_amount ?? line.total_amount ?? line.amount ?? line.fee_amount ?? 0
        );
        const paidAmount = Number(line.paid_amount ?? line.collected_amount ?? 0);
        return {
          class_id: String(classId),
          class_name: line.class_name || line.className || null,
          expected_amount: Number.isFinite(expectedAmount) ? expectedAmount : 0,
          paid_amount: Number.isFinite(paidAmount) ? paidAmount : 0,
          outstanding_amount: Math.max(
            0,
            Number(line.outstanding_amount ?? expectedAmount - paidAmount) || 0
          ),
        };
      })
      .filter((line): line is ClassLine => Boolean(line));

    if (lines.length) return lines;
  }

  return [];
}

function updateClassBucket(
  map: Map<
    string,
    {
      class_id: string | null;
      class_name: string;
      student_ids: Set<string>;
      expected_amount: number;
      paid_amount: number;
      outstanding_amount: number;
      source: "class_lines" | "student_enrollment_fallback";
    }
  >,
  input: {
    class_id: string | null;
    class_name: string;
    student_id: string;
    expected_amount: number;
    paid_amount: number;
    outstanding_amount: number;
    source: "class_lines" | "student_enrollment_fallback";
  }
) {
  const key = input.class_id || "unassigned";
  const current =
    map.get(key) ||
    {
      class_id: input.class_id,
      class_name: input.class_name,
      student_ids: new Set<string>(),
      expected_amount: 0,
      paid_amount: 0,
      outstanding_amount: 0,
      source: input.source,
    };
  current.student_ids.add(input.student_id);
  current.expected_amount += input.expected_amount;
  current.paid_amount += input.paid_amount;
  current.outstanding_amount += input.outstanding_amount;
  if (input.source === "class_lines") current.source = "class_lines";
  map.set(key, current);
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
    const today = new Date();
    const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1);
    const from = parseDate(getString(req.query.from || req.query.start_date), defaultFrom);
    const to = parseDate(getString(req.query.to || req.query.end_date), today, true);
    const groupBy = normalizeGroupBy(
      getString(req.query.group_by || req.query.groupBy || req.query.period || req.query.type)
    );

    if (from > to) {
      throw new ApiError("INVALID_DATE_RANGE", "from must be before to", 400);
    }

    const months = monthRange(from, to);
    const dateWindow = { gte: from, lte: to };
    const [receipts, payments, students, activeClasses] = await Promise.all([
      prisma.receipt.findMany({
        where: { createdAt: dateWindow, deletedAt: null },
        select: {
          id: true,
          studentId: true,
          month: true,
          amount: true,
          daysCount: true,
          createdAt: true,
          student: { select: { fullName: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.payment.findMany({
        where: { createdAt: dateWindow, deletedAt: null },
        select: {
          id: true,
          category: true,
          amount: true,
          recipientName: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.student.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          fullName: true,
          parent: { select: { fullName: true, phone: true } },
          studentClasses: {
            where: { status: "active" },
            select: { classId: true, class: { select: { className: true } } },
          },
          monthlyFees: {
            where: { month: { in: months } },
            select: {
              id: true,
              month: true,
              totalDays: true,
              totalAmount: true,
              status: true,
              receiptId: true,
              paidAt: true,
              notes: true,
              receipt: { select: { id: true, amount: true, daysCount: true, deletedAt: true } },
              lines: {
                select: {
                  id: true,
                  classId: true,
                  classNameSnapshot: true,
                  amount: true,
                  status: true,
                  receiptId: true,
                  receipt: { select: { id: true, deletedAt: true } },
                  class: { select: { className: true } },
                },
              },
            },
            orderBy: { month: "asc" },
          },
          receipts: {
            where: { month: { in: months }, deletedAt: null },
            select: {
              id: true,
              month: true,
              amount: true,
              daysCount: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { fullName: "asc" },
      }),
      prisma.class.findMany({
        where: { status: "active" },
        select: {
          id: true,
          className: true,
          studentClasses: {
            where: { status: "active" },
            select: { studentId: true },
          },
        },
        orderBy: { className: "asc" },
      }),
    ]);

    const trend = new Map<
      string,
      {
        period: string;
        revenue: number;
        expenses: number;
        net: number;
        receipt_count: number;
        payment_count: number;
        expected_collection: number;
        collected_tuition: number;
        outstanding_amount: number;
      }
    >();
    const paymentsByCategory = new Map<string, { category: string; total_amount: number; count: number }>();

    for (const receipt of receipts) {
      const item = ensureTrend(trend, periodKey(receipt.createdAt, groupBy));
      item.revenue += receipt.amount;
      item.net = item.revenue - item.expenses;
      item.receipt_count += 1;
    }

    for (const payment of payments) {
      const item = ensureTrend(trend, periodKey(payment.createdAt, groupBy));
      item.expenses += payment.amount;
      item.net = item.revenue - item.expenses;
      item.payment_count += 1;

      const category = payment.category || "other";
      const bucket = paymentsByCategory.get(category) || {
        category,
        total_amount: 0,
        count: 0,
      };
      bucket.total_amount += payment.amount;
      bucket.count += 1;
      paymentsByCategory.set(category, bucket);
    }

    const classBuckets = new Map<
      string,
      {
        class_id: string | null;
        class_name: string;
        student_ids: Set<string>;
        expected_amount: number;
        paid_amount: number;
        outstanding_amount: number;
        source: "class_lines" | "student_enrollment_fallback";
      }
    >();
    const drilldown: any[] = [];
    let expectedCollection = 0;
    let collectedTuition = 0;
    let outstandingAmount = 0;
    let paidFeeCount = 0;
    let unpaidFeeCount = 0;
    let anomalyCount = 0;
    let classLineCount = 0;

    for (const student of students) {
      const receiptsByMonth = new Map<string, any[]>();
      for (const receipt of student.receipts) {
        const list = receiptsByMonth.get(receipt.month) || [];
        list.push(receipt);
        receiptsByMonth.set(receipt.month, list);
      }

      let studentExpected = 0;
      let studentPaid = 0;
      let studentOutstanding = 0;
      let studentAnomalyCount = 0;
      let monthsUnpaid = 0;

      const monthRows = months.map((month) => {
        const fee: any = student.monthlyFees.find((item: any) => item.month === month) || null;
        const monthReceipts = receiptsByMonth.get(month) || [];
        const receiptAmount = monthReceipts.reduce(
          (sum, receipt) => sum + Number(receipt.amount || 0),
          0
        );
        const paidAmount =
          receiptAmount || (fee?.status === "paid" ? Number(fee.totalAmount || 0) : 0);
        const expectedAmount = Number(fee?.totalAmount || 0);
        const outstanding = Math.max(0, expectedAmount - paidAmount);
        const anomalousReceipt = monthReceipts.find((receipt) => detectReceiptAnomaly(receipt));
        const anomaly = anomalousReceipt ? detectReceiptAnomaly(anomalousReceipt) : detectMonthlyFeeAnomaly(fee);
        const classLines = fee?.lines?.length
          ? fee.lines.map((line: any) => {
              const expectedLineAmount = Number(line.amount || 0);
              const paidLineAmount =
                line.status === "paid" || (line.receiptId && !line.receipt?.deletedAt)
                  ? expectedLineAmount
                  : 0;
              return {
                class_id: line.classId || "unassigned",
                class_name: line.classNameSnapshot || line.class?.className || "Chua co lop",
                expected_amount: expectedLineAmount,
                paid_amount: paidLineAmount,
                outstanding_amount: Math.max(0, expectedLineAmount - paidLineAmount),
              };
            })
          : extractClassLines(fee);
        const activeStudentClasses = student.studentClasses.length
          ? student.studentClasses
          : [{ classId: null, class: { className: "Chua co lop" } }];

        expectedCollection += expectedAmount;
        collectedTuition += paidAmount;
        outstandingAmount += outstanding;
        if (fee?.status === "paid" || paidAmount >= expectedAmount) paidFeeCount += fee ? 1 : 0;
        if (outstanding > 0 || (fee && fee.status !== "paid")) unpaidFeeCount += fee ? 1 : 0;
        if (anomaly) {
          anomalyCount += 1;
          studentAnomalyCount += 1;
        }

        const trendItem = ensureTrend(trend, monthToPeriod(month, groupBy));
        trendItem.expected_collection += expectedAmount;
        trendItem.collected_tuition += paidAmount;
        trendItem.outstanding_amount += outstanding;

        if (classLines.length) {
          classLineCount += classLines.length;
          for (const line of classLines) {
            updateClassBucket(classBuckets, {
              class_id: line.class_id,
              class_name: line.class_name || line.class_id,
              student_id: student.id,
              expected_amount: line.expected_amount,
              paid_amount: line.paid_amount,
              outstanding_amount: line.outstanding_amount,
              source: "class_lines",
            });
          }
        } else if (expectedAmount || paidAmount || outstanding) {
          const divisor = activeStudentClasses.length || 1;
          for (const enrollment of activeStudentClasses) {
            updateClassBucket(classBuckets, {
              class_id: enrollment.classId,
              class_name: enrollment.class?.className || "Chua co lop",
              student_id: student.id,
              expected_amount: expectedAmount / divisor,
              paid_amount: paidAmount / divisor,
              outstanding_amount: outstanding / divisor,
              source: "student_enrollment_fallback",
            });
          }
        }

        studentExpected += expectedAmount;
        studentPaid += paidAmount;
        studentOutstanding += outstanding;
        if (outstanding > 0) monthsUnpaid += 1;

        return {
          month,
          monthly_fee_id: fee?.id || null,
          receipt_ids: monthReceipts.map((receipt) => receipt.id),
          status: fee?.status || (paidAmount > 0 ? "paid" : "none"),
          expected_amount: expectedAmount,
          paid_amount: paidAmount,
          outstanding_amount: outstanding,
          total_days: Number(fee?.totalDays || 0),
          anomaly,
        };
      });

      drilldown.push({
        student_id: student.id,
        student_name: student.fullName,
        parent_name: student.parent?.fullName || null,
        parent_phone: student.parent?.phone || null,
        class_names: student.studentClasses
          .map((item) => item.class.className)
          .join(", "),
        expected_amount: studentExpected,
        paid_amount: studentPaid,
        outstanding_amount: studentOutstanding,
        months_unpaid: monthsUnpaid,
        anomaly_count: studentAnomalyCount,
        months: monthRows,
      });
    }

    const totalRevenue = receipts.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = payments.reduce((sum, item) => sum + item.amount, 0);
    const paymentCategoryRows = Array.from(paymentsByCategory.values())
      .map((item) => ({
        ...item,
        category_label: CATEGORY_LABELS[item.category] || item.category,
        percentage: percent(item.total_amount, totalExpenses),
      }))
      .sort((a, b) => b.total_amount - a.total_amount);
    const classRows = Array.from(classBuckets.values())
      .map((item) => ({
        class_id: item.class_id,
        class_name: item.class_name,
        student_count: item.student_ids.size,
        expected_amount: Math.round(item.expected_amount),
        paid_amount: Math.round(item.paid_amount),
        outstanding_amount: Math.round(item.outstanding_amount),
        source: item.source,
      }))
      .sort((a, b) => b.outstanding_amount - a.outstanding_amount || a.class_name.localeCompare(b.class_name));
    const activeClassRows = activeClasses.map((classItem) => ({
      class_id: classItem.id,
      class_name: classItem.className,
      active_student_count: classItem.studentClasses.length,
    }));

    return successResponse(res, {
      from: toDateOnly(from),
      to: toDateOnly(to),
      group_by: groupBy,
      months,
      summary: {
        total_revenue: totalRevenue,
        total_receipts: totalRevenue,
        total_expenses: totalExpenses,
        total_payments: totalExpenses,
        net_revenue: totalRevenue - totalExpenses,
        balance: totalRevenue - totalExpenses,
        receipt_count: receipts.length,
        payment_count: payments.length,
        expected_collection: expectedCollection,
        collected_tuition: collectedTuition,
        outstanding_amount: outstandingAmount,
        collection_rate: percent(Math.min(collectedTuition, expectedCollection), expectedCollection),
        anomaly_count: anomalyCount,
        active_student_count: students.filter((student) => student.studentClasses.length > 0).length,
        active_class_count: activeClasses.length,
      },
      revenue_expense_trend: Array.from(trend.values())
        .map((item) => ({ ...item, net: item.revenue - item.expenses }))
        .sort((a, b) => a.period.localeCompare(b.period)),
      payments_by_category: paymentCategoryRows,
      collection_summary: {
        months,
        expected_amount: expectedCollection,
        paid_amount: collectedTuition,
        outstanding_amount: outstandingAmount,
        paid_fees: paidFeeCount,
        unpaid_fees: unpaidFeeCount,
        collection_rate: percent(Math.min(collectedTuition, expectedCollection), expectedCollection),
        anomaly_count: anomalyCount,
      },
      outstanding_by_class: classRows,
      active_classes: activeClassRows,
      student_fee_drilldown: drilldown.sort(
        (a, b) =>
          b.outstanding_amount - a.outstanding_amount ||
          b.anomaly_count - a.anomaly_count ||
          a.student_name.localeCompare(b.student_name)
      ),
      meta: {
        has_class_line_data: classLineCount > 0,
        outstanding_by_class_source:
          classLineCount > 0 ? "class_lines" : "student_enrollment_fallback",
        class_line_count: classLineCount,
      },
    });
  } catch (error) {
    return sendApiError(res, error, "FINANCE_DASHBOARD_REPORT_ERROR");
  }
}

export default requireAuth(handler, ["admin"]);
