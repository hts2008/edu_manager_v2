import { createHash } from "node:crypto";

type FeeStatus = "pending" | "ready" | "confirmed" | "paid";

export const MAX_BULK_FEE_PAYMENT_LINES = 500;

export type CanonicalBulkFeePayment = {
  line_ids: string[];
  month: string;
  payment_method: "cash" | "transfer";
  template_id: string | null;
  notes: string | null;
};

export function canonicalizeBulkFeePayment(input: any): CanonicalBulkFeePayment {
  const sourceIds = Array.isArray(input?.line_ids) ? input.line_ids : [];
  const lineIds = [
    ...new Set<string>(
      sourceIds.map((value: unknown) => String(value).trim()).filter(Boolean)
    ),
  ].sort();
  if (!lineIds.length) throw new Error("line_ids is required");
  if (lineIds.length > MAX_BULK_FEE_PAYMENT_LINES) {
    throw new Error(`line_ids supports at most ${MAX_BULK_FEE_PAYMENT_LINES} unique values`);
  }

  return {
    line_ids: lineIds,
    month: String(input?.month || "").trim(),
    payment_method: String(input?.payment_method || "").trim() as "cash" | "transfer",
    template_id: String(input?.template_id || "").trim() || null,
    notes: String(input?.notes || "").trim() || null,
  };
}

export function hashBulkFeePaymentPayload(payload: CanonicalBulkFeePayment) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export type MonthlyFeeLineInput = {
  class_id?: string | null;
  class_name?: string | null;
  teacher_name?: string | null;
  fee_per_day?: number | null;
  days_count?: number | null;
  expected_sessions?: number | null;
  make_up_sessions?: number | null;
  extra_sessions?: number | null;
  billing_mode?: string | null;
  schedule_mode?: string | null;
  monthly_tuition?: number | null;
  amount?: number | null;
  period_status?: string | null;
};

function numberOrZero(value: unknown) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function intOrZero(value: unknown) {
  return Math.max(0, Math.round(numberOrZero(value)));
}

export function feeLineAllocationKey(classId?: string | null) {
  return classId ? `class:${classId}` : "legacy_unallocated";
}

export function monthlyFeeLineToDto(line: any, student?: any) {
  return {
    id: line.id,
    line_id: line.id,
    monthly_fee_id: line.monthlyFeeId,
    student_id: line.studentId,
    student_name: student?.fullName || line.student?.fullName || null,
    parent_name: student?.parent?.fullName || line.student?.parent?.fullName || null,
    parent_phone: student?.parent?.phone || line.student?.parent?.phone || null,
    class_id: line.classId,
    class_name: line.classNameSnapshot || line.class?.className || null,
    teacher_name: line.teacherNameSnapshot || line.class?.teacher?.fullName || null,
    allocation_key: line.allocationKey,
    month: line.month,
    total_days: line.chargedSessions,
    days_count: line.chargedSessions,
    charged_sessions: line.chargedSessions,
    expected_sessions: line.expectedSessions,
    make_up_sessions: line.makeUpSessions,
    extra_sessions: line.extraSessions,
    fee_per_day: line.feePerSession,
    fee_per_session: line.feePerSession,
    monthly_tuition: line.monthlyTuition,
    total_amount: line.amount,
    amount: line.amount,
    billing_mode: line.billingMode,
    schedule_mode: line.scheduleMode,
    status: line.status,
    receipt_id: line.receiptId,
    paid_at: line.paidAt,
    allocation_confidence: line.allocationConfidence,
    notes: line.notes,
    created_at: line.createdAt,
    updated_at: line.updatedAt,
  };
}

export async function syncMonthlyFeeLines(
  client: any,
  fee: any,
  breakdown: MonthlyFeeLineInput[]
) {
  const activeKeys = new Set<string>();
  const lines = [];

  for (const item of breakdown) {
    const allocationKey = feeLineAllocationKey(item.class_id);
    activeKeys.add(allocationKey);
    const chargedSessions = intOrZero(item.days_count);
    const expectedSessions = intOrZero(item.expected_sessions);
    const makeUpSessions = intOrZero(item.make_up_sessions);
    const amount = numberOrZero(item.amount);
    const feePerSession = numberOrZero(item.fee_per_day);

    const existing = await client.monthlyFeeLine.findUnique({
      where: {
        studentId_month_allocationKey: {
          studentId: fee.studentId,
          month: fee.month,
          allocationKey,
        },
      },
    });

    if (existing?.status === "paid" || existing?.receiptId || existing?.paidAt) {
      lines.push(existing);
      continue;
    }

    const data = {
      monthlyFeeId: fee.id,
      studentId: fee.studentId,
      classId: item.class_id || null,
      allocationKey,
      month: fee.month,
      classNameSnapshot: item.class_name || null,
      teacherNameSnapshot: item.teacher_name || null,
      expectedSessions,
      chargedSessions,
      makeUpSessions,
      extraSessions: intOrZero(item.extra_sessions ?? Math.max(0, chargedSessions - expectedSessions)),
      feePerSession,
      monthlyTuition: numberOrZero(item.monthly_tuition),
      amount,
      billingMode: item.billing_mode || null,
      scheduleMode: item.schedule_mode || null,
      status: amount > 0 ? "ready" : "pending",
      allocationConfidence: item.class_id ? "calculated" : "legacy_unallocated",
      notes: null,
    };

    const line = existing
      ? await client.monthlyFeeLine.update({
          where: { id: existing.id },
          data,
        })
      : await client.monthlyFeeLine.create({ data });
    lines.push(line);
  }

  await client.monthlyFeeLine.deleteMany({
    where: {
      monthlyFeeId: fee.id,
      status: { not: "paid" },
      receiptId: null,
      allocationKey: { notIn: [...activeKeys] },
    },
  });

  return lines;
}

export async function refreshMonthlyFeeAggregateFromLines(client: any, feeId: string) {
  const lines = await client.monthlyFeeLine.findMany({
    where: { monthlyFeeId: feeId },
    orderBy: [{ classNameSnapshot: "asc" }, { createdAt: "asc" }],
  });

  if (!lines.length) {
    return client.monthlyFee.findUnique({ where: { id: feeId } });
  }

  const totalDays = lines.reduce(
    (sum: number, line: any) => sum + Number(line.chargedSessions || 0),
    0
  );
  const totalAmount = lines.reduce(
    (sum: number, line: any) => sum + Number(line.amount || 0),
    0
  );
  const allPaid = lines.every((line: any) => line.status === "paid");
  const anyConfirmed = lines.some((line: any) => line.status === "confirmed");
  const anyReady = lines.some((line: any) => line.status === "ready");
  const firstReceiptId = lines.find((line: any) => line.receiptId)?.receiptId || null;
  const paidAt = allPaid
    ? lines
        .map((line: any) => line.paidAt)
        .filter(Boolean)
        .sort()
        .at(-1) || new Date()
    : null;
  const status: FeeStatus = allPaid
    ? "paid"
    : anyConfirmed
    ? "confirmed"
    : anyReady
    ? "ready"
    : "pending";

  return client.monthlyFee.update({
    where: { id: feeId },
    data: {
      totalDays,
      totalAmount,
      status,
      receiptId: allPaid && lines.length === 1 ? firstReceiptId : null,
      paidAt,
    },
  });
}

export function receiptLineDataFromMonthlyFeeLine(line: any, receiptId: string) {
  return {
    receiptId,
    monthlyFeeLineId: line.id,
    classId: line.classId,
    classNameSnapshot: line.classNameSnapshot,
    teacherNameSnapshot: line.teacherNameSnapshot,
    daysCount: line.chargedSessions,
    expectedSessions: line.expectedSessions,
    feePerDay: line.feePerSession,
    amount: line.amount,
    notes: line.notes,
  };
}
