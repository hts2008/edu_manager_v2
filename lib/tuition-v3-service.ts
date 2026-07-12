import { ApiError } from "./api-utils.js";
import { calculateTuitionV3, type TuitionSlot, type TuitionSlotStatus } from "./tuition-v3.js";

export const TUITION_V3_CALCULATION_VERSION = "tuition-v3-session-ledger";

type ClassData = {
  id: string;
  className?: string | null;
  billingPolicy?: string | null;
  feePerDay?: number | null;
  teacher?: { fullName?: string | null } | null;
};

type SessionRow = {
  id: string;
  classId: string;
  sessionDate: Date | string;
  kind: string;
  status: string;
  extraFeeMode?: string | null;
  replacementForId?: string | null;
};

type AttendanceRow = {
  classSessionId?: string | null;
  attendanceDate: Date | string;
  status: string;
};

function dateOnly(value: Date | string) {
  return (value instanceof Date ? value : new Date(value)).toISOString().slice(0, 10);
}

function attendanceStatus(session: SessionRow, attendance?: AttendanceRow): TuitionSlotStatus {
  if (session.status === "holiday") return "holiday";
  if (session.status === "cancelled") return "center_cancelled";
  if (!attendance) {
    throw new ApiError(
      "ATTENDANCE_INCOMPLETE",
      `Missing attendance for class session ${session.id}`,
      409,
    );
  }
  if (["present", "absent_with_fee", "absent_no_fee", "holiday"].includes(attendance.status)) {
    return attendance.status as TuitionSlotStatus;
  }
  throw new ApiError("ATTENDANCE_STATUS_INVALID", "Unsupported attendance status", 409);
}

export function buildStudentTuitionV3(input: {
  month: string;
  classData: ClassData;
  enrollment: { startedAt?: Date | string | null; endedAt?: Date | string | null };
  sessions: SessionRow[];
  attendance: AttendanceRow[];
}) {
  const attendanceBySession = new Map(
    input.attendance.filter((row) => row.classSessionId).map((row) => [row.classSessionId, row]),
  );
  const slots: TuitionSlot[] = input.sessions.map((session) => ({
    id: session.id,
    date: dateOnly(session.sessionDate),
    kind: session.kind as TuitionSlot["kind"],
    status: attendanceStatus(session, attendanceBySession.get(session.id)),
    replacesSlotId: session.replacementForId || undefined,
    extraFeeMode: session.extraFeeMode === "surcharge" ? "surcharge" : "included",
  }));
  const billingPolicy = input.classData.billingPolicy || "per_session";
  const amount = Number(input.classData.feePerDay || 0);
  const regularSlotCount = slots.filter((slot) => slot.kind === "regular").length;
  const extraSurchargePerSlot = billingPolicy === "monthly_prorated"
    ? (regularSlotCount > 0 ? amount / regularSlotCount : 0)
    : amount;
  const result = calculateTuitionV3({
    month: input.month,
    plan: billingPolicy === "monthly_prorated"
      ? { mode: "monthly_prorated", monthlyAmount: amount }
      : { mode: "per_session", sessionAmount: amount },
    slots,
    enrollment: {
      startDate: input.enrollment.startedAt ? dateOnly(input.enrollment.startedAt) : undefined,
      endDate: input.enrollment.endedAt ? dateOnly(input.enrollment.endedAt) : undefined,
    },
    extraSurchargePerSlot,
  });
  if (!result.ok) throw new ApiError(result.error.code, result.error.message, 409);
  return {
    classId: input.classData.id,
    className: input.classData.className || null,
    teacherName: input.classData.teacher?.fullName || null,
    amount: result.totalAmount,
    feePerSession: billingPolicy === "monthly_prorated" && result.summary.plannedRegularSlots > 0
      ? Math.round(amount / result.summary.plannedRegularSlots)
      : amount,
    billingMode: result.billingMode,
    scheduleMode: "class_session_ledger",
    monthlyTuition: billingPolicy === "monthly_prorated" ? amount : 0,
    contractSessions: result.summary.plannedRegularSlots,
    eligibleSessions: result.summary.eligibleRegularSlots,
    deliveredSessions: result.summary.deliveredRegularSlots,
    chargedSessions: result.summary.chargedRegularSlots + result.summary.chargedExtraSlots,
    centerCreditSessions: result.summary.centerCreditSlots,
    studentWaivedSessions: result.summary.studentWaivedSlots,
    makeUpSessions: result.summary.makeupSlots,
    extraSessions: result.summary.includedExtraSlots + result.summary.chargedExtraSlots,
    calculationVersion: TUITION_V3_CALCULATION_VERSION,
    calculationSnapshot: result,
  };
}
