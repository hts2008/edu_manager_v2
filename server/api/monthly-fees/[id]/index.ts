import type { VercelResponse } from "../../../../lib/vercel-types.js";
import prisma from "../../../../lib/prisma.js";
import {
  AuthedRequest,
  handleCors,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../../lib/auth.js";
import {
  ApiError,
  getRequiredString,
  sendApiError,
} from "../../../../lib/api-utils.js";

export function requirePersistedMonthlyFeeLines<T>(lines: T[], monthlyFeeId: string): T[] {
  if (lines.length === 0) {
    throw new ApiError(
      "MONTHLY_FEE_LINES_MISSING",
      "Monthly fee detail is unavailable because its persisted class lines are missing",
      409,
      { monthly_fee_id: monthlyFeeId },
    );
  }
  return lines;
}

export function monthlyFeeLineToBreakdown(line: any) {
  return {
    monthly_fee_line_id: line.id,
    class_id: line.classId,
    class_name: line.classNameSnapshot,
    teacher_name: line.teacherNameSnapshot,
    fee_per_day: line.feePerSession,
    fee_per_session: line.feePerSession,
    days_count: line.chargedSessions,
    charged_sessions: line.chargedSessions,
    expected_sessions: line.expectedSessions,
    make_up_sessions: line.makeUpSessions,
    extra_sessions: line.extraSessions,
    billing_mode: line.billingMode,
    schedule_mode: line.scheduleMode,
    monthly_tuition: line.monthlyTuition,
    amount: line.amount,
    status: line.status,
    receipt_id: line.receiptId,
    paid_at: line.paidAt,
    allocation_confidence: line.allocationConfidence,
    contract_sessions: line.contractSessions,
    eligible_sessions: line.eligibleSessions,
    delivered_sessions: line.deliveredSessions,
    center_credit_sessions: line.centerCreditSessions,
    student_waived_sessions: line.studentWaivedSessions,
    calculation_version: line.calculationVersion,
    calculation_snapshot: line.calculationSnapshot,
  };
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  try {
    const id = getRequiredString(req.query.id, "id");
    const fee = await prisma.monthlyFee.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            parent: { select: { fullName: true, phone: true } },
          },
        },
        receipt: true,
        lines: { orderBy: [{ classNameSnapshot: "asc" }, { createdAt: "asc" }] },
      },
    });

    if (!fee) throw new ApiError("NOT_FOUND", "Monthly fee not found", 404);

    const breakdown = requirePersistedMonthlyFeeLines(fee.lines, fee.id).map(
      monthlyFeeLineToBreakdown,
    );

    return successResponse(res, {
      fee: {
        id: fee.id,
        student_id: fee.studentId,
        student_name: fee.student.fullName,
        parent_name: fee.student.parent?.fullName || null,
        parent_phone: fee.student.parent?.phone || null,
        month: fee.month,
        total_days: fee.totalDays,
        total_amount: fee.totalAmount,
        status: fee.status,
        receipt_id: fee.receiptId,
        paid_at: fee.paidAt,
        notes: fee.notes,
        created_at: fee.createdAt,
        updated_at: fee.updatedAt,
      },
      breakdown,
    });
  } catch (error) {
    return sendApiError(res, error, "MONTHLY_FEE_GET_ERROR");
  }
}

export default requireAuth(handler);
