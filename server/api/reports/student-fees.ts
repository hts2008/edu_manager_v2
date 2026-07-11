import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  handleCors,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";
import { getBusinessMonthKey, getString, sendApiError } from "../../../lib/api-utils.js";
import {
  detectMonthlyFeeAnomaly,
  detectReceiptAnomaly,
} from "../../../lib/finance-corrections.js";
import type { FinanceAnomalyCode } from "../../../lib/finance-corrections.js";

type StudentFeeAnomalyCode = FinanceAnomalyCode | "RECEIPT_FEE_MISMATCH";

function monthRange(from: string, to: string) {
  const months: string[] = [];
  const [fromYear, fromMonth] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);
  const cursor = new Date(Date.UTC(fromYear, fromMonth - 1, 1));
  const end = new Date(Date.UTC(toYear, toMonth - 1, 1));
  while (cursor <= end) {
    months.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

function normalizeMonth(value: string | undefined, fallback: string) {
  return /^\d{4}-\d{2}$/.test(value || "") ? value! : fallback;
}

export function classLineToDto(line: any) {
  const amount = Number(line.amount || 0);
  const paid = line.status === "paid";
  return {
    id: line.id,
    monthly_fee_line_id: line.id,
    monthly_fee_id: line.monthlyFeeId,
    class_id: line.classId,
    class_name: line.classNameSnapshot || line.class?.className || null,
    teacher_name: line.teacherNameSnapshot || line.class?.teacher?.fullName || null,
    charged_sessions: line.chargedSessions,
    expected_sessions: line.expectedSessions,
    fee_per_session: line.feePerSession,
    expected_amount: amount,
    paid_amount: paid ? amount : 0,
    outstanding_amount: paid ? 0 : amount,
    status: line.status,
    receipt_id: line.receiptId,
    paid_at: line.paidAt,
  };
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  try {
    const currentMonth = getBusinessMonthKey();
    const from = normalizeMonth(getString(req.query.from), `${currentMonth.slice(0, 4)}-01`);
    const to = normalizeMonth(getString(req.query.to), currentMonth);
    const months = monthRange(from, to);

    const students = await prisma.student.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        fullName: true,
        parent: { select: { fullName: true, phone: true } },
        studentClasses: {
          where: { status: "active" },
          select: { class: { select: { className: true } } },
        },
        monthlyFees: {
          where: { month: { in: months } },
          select: {
            id: true,
            month: true,
            status: true,
            totalDays: true,
            totalAmount: true,
            receiptId: true,
            paidAt: true,
            lines: {
              select: {
                id: true,
                monthlyFeeId: true,
                classId: true,
                classNameSnapshot: true,
                teacherNameSnapshot: true,
                chargedSessions: true,
                expectedSessions: true,
                feePerSession: true,
                amount: true,
                status: true,
                receiptId: true,
                paidAt: true,
                createdAt: true,
                class: { select: { className: true, teacher: { select: { fullName: true } } } },
              },
              orderBy: [{ classNameSnapshot: "asc" }, { createdAt: "asc" }],
            },
          },
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
    });

    const rows = students.map((student: any) => {
      const monthlyFeeByMonth = new Map(
        student.monthlyFees.map((fee: any) => [fee.month, fee])
      );
      const receiptsByMonth = new Map<string, any[]>();
      for (const receipt of student.receipts) {
        const list = receiptsByMonth.get(receipt.month) || [];
        list.push(receipt);
        receiptsByMonth.set(receipt.month, list);
      }

      const monthRows = months.map((month) => {
        const fee: any = monthlyFeeByMonth.get(month) || null;
        const receipts = receiptsByMonth.get(month) || [];
        const receiptAmount = receipts.reduce(
          (sum, receipt) => sum + Number(receipt.amount || 0),
          0
        );
        const anomalousReceipt = receipts.find((receipt) => detectReceiptAnomaly(receipt));
        const receiptDays = receipts.reduce(
          (sum, receipt) => sum + Number(receipt.daysCount || 0),
          0
        );
        const paidAmount =
          receiptAmount || (fee?.status === "paid" ? Number(fee.totalAmount || 0) : 0);
        const expectedAmount = Number(fee?.totalAmount || 0);
        let anomaly: StudentFeeAnomalyCode | null = anomalousReceipt
          ? detectReceiptAnomaly(anomalousReceipt)
          : null;
        if (!anomaly) {
          anomaly = detectMonthlyFeeAnomaly(fee);
        }
        if (
          !anomaly &&
          receiptAmount &&
          fee &&
          Math.round(receiptAmount) !== Math.round(expectedAmount)
        ) {
          anomaly = "RECEIPT_FEE_MISMATCH";
        }
        const anomalyDetail = anomaly
          ? {
              code: anomaly,
              severity: anomaly === "RECEIPT_FEE_MISMATCH" ? "warning" : "critical",
              message:
                anomaly === "RECEIPT_WITH_ZERO_DAYS"
                  ? "Receipt has positive amount but zero chargeable sessions"
                  : anomaly === "PAID_WITH_ZERO_DAYS"
                  ? "Monthly fee is marked paid with positive amount but zero chargeable sessions"
                  : "Receipt amount differs from current monthly fee",
              receipt_ids: receipts.map((receipt) => receipt.id),
              monthly_fee_id: fee?.id || null,
              expected_days: Number(fee?.totalDays || 0),
              expected_amount: expectedAmount,
              paid_days: receiptDays || Number(fee?.totalDays || 0),
              paid_amount: paidAmount,
              can_correct: Boolean(
                anomaly !== "RECEIPT_FEE_MISMATCH" &&
                  (anomalousReceipt?.id || fee?.receiptId)
              ),
              recommended_action:
                anomaly === "RECEIPT_FEE_MISMATCH"
                  ? "review_monthly_fee_and_receipts"
                  : "void_receipt_and_recalculate",
            }
          : null;

        return {
          month,
          status: fee?.status || (paidAmount > 0 ? "paid" : "none"),
          total_days: fee?.totalDays || 0,
          expected_amount: expectedAmount,
          paid_amount: paidAmount,
          receipt_ids: receipts.map((receipt) => receipt.id),
          monthly_fee_id: fee?.id || null,
          anomaly,
          anomaly_detail: anomalyDetail,
          lines: (fee?.lines || []).map(classLineToDto),
        };
      });

      const totalPaid = monthRows.reduce((sum, item) => sum + item.paid_amount, 0);
      const totalExpected = monthRows.reduce(
        (sum, item) => sum + item.expected_amount,
        0
      );

      return {
        student_id: student.id,
        student_name: student.fullName,
        parent_name: student.parent?.fullName || null,
        parent_phone: student.parent?.phone || null,
        class_names: student.studentClasses
          .map((studentClass: any) => studentClass.class.className)
          .join(", "),
        months: monthRows,
        months_paid: monthRows.filter((item) => item.paid_amount > 0).length,
        total_paid: totalPaid,
        total_expected: totalExpected,
        outstanding_amount: Math.max(0, totalExpected - totalPaid),
        anomalies: monthRows.filter((item) => item.anomaly).map((item) => item.anomaly),
      };
    });

    return successResponse(res, {
      from,
      to,
      months,
      students: rows,
      summary: {
        student_count: rows.length,
        total_paid: rows.reduce((sum, row) => sum + row.total_paid, 0),
        total_expected: rows.reduce((sum, row) => sum + row.total_expected, 0),
        outstanding_amount: rows.reduce((sum, row) => sum + row.outstanding_amount, 0),
        anomaly_count: rows.reduce((sum, row) => sum + row.anomalies.length, 0),
      },
    });
  } catch (error) {
    return sendApiError(res, error, "STUDENT_FEES_REPORT_ERROR");
  }
}

export default requireAuth(handler, ["admin"]);
