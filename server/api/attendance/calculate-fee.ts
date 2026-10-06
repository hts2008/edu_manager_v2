import type { VercelResponse } from "../../../lib/vercel-types.js";
import {
  AuthedRequest,
  handleCors,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";
import {
  ApiError,
  getRequiredString,
  sendApiError,
} from "../../../lib/api-utils.js";
import { calculateStudentMonthlyFee } from "../../../lib/finance-corrections.js";
import { loadTuitionSettings } from "../../../lib/tuition-settings.js";

function requireTenantId(req: AuthedRequest) {
  if (!req.user.tenantId) {
    throw new ApiError(
      "TENANT_CONTEXT_REQUIRED",
      "A tenant-scoped session is required to calculate tuition",
      409,
    );
  }
  return req.user.tenantId;
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  try {
    const db = req.db;
    const studentId = getRequiredString(req.query.student_id, "student_id");
    const month = getRequiredString(req.query.month, "month");
    const tenantId = requireTenantId(req);
    const settings = await loadTuitionSettings(db, {
      tenantId: requireTenantId(req),
      effectiveMonth: month,
    });
    const calculated = await calculateStudentMonthlyFee(db, studentId, month, {
      tenantId,
      settings,
    });
    const items = calculated.breakdown.map((line: any) => {
      const chargedDays = Number(line.days_count || 0);
      const presentDays = Number(line.present_days || 0);
      const absentFeeDays = Number(line.absent_fee_days || 0);
      return {
        class_id: line.class_id,
        classId: line.class_id,
        class_name: line.class_name,
        className: line.class_name,
        present_days: presentDays,
        presentDays,
        absent_fee_days: absentFeeDays,
        absentFeeDays,
        charged_days: chargedDays,
        chargedDays,
        expected_sessions: line.expected_sessions,
        expectedSessions: line.expected_sessions,
        billing_mode: line.billing_mode,
        billingMode: line.billing_mode,
        monthly_tuition: line.monthly_tuition,
        monthlyTuition: line.monthly_tuition,
        fee_per_day: line.fee_per_day,
        feePerDay: line.fee_per_day,
        fee_amount: line.amount,
        feeAmount: line.amount,
      };
    });

    const totalDays = calculated.totalDays;
    const totalFee = calculated.totalAmount;

    return successResponse(res, {
      items,
      total: totalFee,
      days_count: totalDays,
      fee_per_day: items[0]?.fee_per_day || 0,
      total_fee: totalFee,
    });
  } catch (error) {
    return sendApiError(res, error, "CALCULATE_FEE_ERROR");
  }
}

export default requireAuth(handler);
