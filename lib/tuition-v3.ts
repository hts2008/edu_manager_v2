export type TuitionBillingPlan =
  | { mode: "monthly_prorated"; monthlyAmount: number }
  | { mode: "per_session"; sessionAmount: number };

export type TuitionSlotKind = "regular" | "makeup" | "extra";
export type TuitionSlotStatus =
  | "present"
  | "absent_with_fee"
  | "absent_no_fee"
  | "center_cancelled"
  | "holiday";

export type TuitionSlot = {
  id: string;
  date: string;
  kind: TuitionSlotKind;
  status: TuitionSlotStatus;
  replacesSlotId?: string;
  originalRegularDate?: string;
  extraFeeMode?: "included" | "surcharge";
};

export type TuitionEnrollmentWindow = {
  startDate?: string;
  endDate?: string;
};

export type TuitionEnrollment = TuitionEnrollmentWindow & {
  periods?: TuitionEnrollmentWindow[];
};

export type TuitionV3Input = {
  month: string;
  plan: TuitionBillingPlan;
  slots: TuitionSlot[];
  enrollment?: TuitionEnrollment;
  extraSurchargePerSlot?: number;
};

export type TuitionLedgerDisposition =
  | "charged"
  | "charged_replaced_same_month"
  | "waived_absence"
  | "credited_center_cancelled"
  | "credited_holiday"
  | "ineligible"
  | "replacement_makeup"
  | "cross_month_makeup"
  | "included_makeup"
  | "included_extra"
  | "surcharged_extra"
  | "not_chargeable";

export type TuitionLedgerRow = TuitionSlot & {
  originalEligibilityDate: string;
  eligible: boolean;
  disposition: TuitionLedgerDisposition;
  amount: number;
};

export type TuitionV3Success = {
  ok: true;
  month: string;
  billingMode: TuitionBillingPlan["mode"];
  currency: "VND";
  summary: {
    plannedRegularSlots: number;
    eligibleRegularSlots: number;
    deliveredRegularSlots: number;
    chargedRegularSlots: number;
    centerCreditSlots: number;
    studentWaivedSlots: number;
    makeupSlots: number;
    includedExtraSlots: number;
    chargedExtraSlots: number;
  };
  unroundedTotalAmount: number;
  totalAmount: number;
  ledger: TuitionLedgerRow[];
};

export type TuitionV3Failure = {
  ok: false;
  error: {
    code: "ZERO_PLANNED_REGULAR_SLOTS";
    message: string;
    month: string;
  };
};

export type TuitionV3Result = TuitionV3Success | TuitionV3Failure;

const CHARGEABLE_STATUSES = new Set<TuitionSlotStatus>([
  "present",
  "absent_with_fee",
]);

function isInMonth(date: string, month: string) {
  return date.slice(0, 7) === month;
}

export function isEnrollmentEligible(
  date: string,
  enrollment: TuitionV3Input["enrollment"],
): boolean {
  if (enrollment?.periods?.length) {
    return enrollment.periods.some((period) =>
      isEnrollmentEligible(date, period),
    );
  }
  if (enrollment?.startDate && date < enrollment.startDate.slice(0, 10)) return false;
  if (enrollment?.endDate && date >= enrollment.endDate.slice(0, 10)) return false;
  return true;
}

function regularDisposition(status: TuitionSlotStatus): TuitionLedgerDisposition {
  if (status === "absent_no_fee") return "waived_absence";
  if (status === "center_cancelled") return "credited_center_cancelled";
  if (status === "holiday") return "credited_holiday";
  return CHARGEABLE_STATUSES.has(status) ? "charged" : "not_chargeable";
}

function compareLedgerRows(a: TuitionLedgerRow, b: TuitionLedgerRow) {
  return a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
}

export function calculateTuitionV3(input: TuitionV3Input): TuitionV3Result {
  const monthSlots = input.slots.filter((slot) => isInMonth(slot.date, input.month));
  const regularSlots = monthSlots.filter((slot) => slot.kind === "regular");

  if (input.plan.mode === "monthly_prorated" && regularSlots.length === 0) {
    return {
      ok: false,
      error: {
        code: "ZERO_PLANNED_REGULAR_SLOTS",
        message: "monthly_prorated requires at least one regular slot in the billing month",
        month: input.month,
      },
    };
  }

  const regularById = new Map(regularSlots.map((slot) => [slot.id, slot]));
  const validReplacementIds = new Set<string>();

  for (const slot of monthSlots) {
    if (slot.kind !== "makeup" || !CHARGEABLE_STATUSES.has(slot.status)) continue;
    if (!slot.replacesSlotId) continue;
    const original = regularById.get(slot.replacesSlotId);
    if (!original || !isInMonth(original.date, input.month)) continue;
    if (CHARGEABLE_STATUSES.has(original.status)) continue;
    if (!isEnrollmentEligible(original.date, input.enrollment)) continue;
    validReplacementIds.add(original.id);
  }

  const regularSlotAmounts = new Map<string, number>();
  if (input.plan.mode === "monthly_prorated") {
    const monthlyAmount = Math.max(0, Math.round(input.plan.monthlyAmount));
    const sortedRegularSlots = [...regularSlots].sort((a, b) =>
      a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
    );
    const baseAmount = Math.floor(monthlyAmount / sortedRegularSlots.length);
    const remainder = monthlyAmount % sortedRegularSlots.length;
    sortedRegularSlots.forEach((slot, index) => {
      regularSlotAmounts.set(slot.id, baseAmount + (index < remainder ? 1 : 0));
    });
  }
  const perSessionAmount = input.plan.mode === "per_session"
    ? Math.max(0, input.plan.sessionAmount)
    : 0;
  const surcharge = Math.max(0, input.extraSurchargePerSlot ?? 0);
  let eligibleRegularSlots = 0;
  let deliveredRegularSlots = 0;
  let chargedRegularSlots = 0;
  let centerCreditSlots = 0;
  let studentWaivedSlots = 0;
  let makeupSlots = 0;
  let includedExtraSlots = 0;
  let chargedExtraSlots = 0;

  const ledger = monthSlots.map<TuitionLedgerRow>((slot) => {
    const original = slot.replacesSlotId
      ? regularById.get(slot.replacesSlotId)
      : undefined;
    const originalEligibilityDate =
      slot.kind === "makeup"
        ? original?.date ?? slot.originalRegularDate ?? slot.date
        : slot.date;
    const eligible = isEnrollmentEligible(originalEligibilityDate, input.enrollment);
    let disposition: TuitionLedgerDisposition;
    let amount = 0;

    if (!eligible) {
      disposition = "ineligible";
    } else if (slot.kind === "regular") {
      eligibleRegularSlots += 1;
      if (CHARGEABLE_STATUSES.has(slot.status)) {
        deliveredRegularSlots += 1;
        disposition = "charged";
        amount = input.plan.mode === "monthly_prorated"
          ? regularSlotAmounts.get(slot.id) || 0
          : perSessionAmount;
        chargedRegularSlots += 1;
      } else if (validReplacementIds.has(slot.id)) {
        deliveredRegularSlots += 1;
        disposition = "charged_replaced_same_month";
        amount = input.plan.mode === "monthly_prorated"
          ? regularSlotAmounts.get(slot.id) || 0
          : perSessionAmount;
        chargedRegularSlots += 1;
      } else {
        disposition = regularDisposition(slot.status);
        if (slot.status === "center_cancelled" || slot.status === "holiday") {
          centerCreditSlots += 1;
        } else if (slot.status === "absent_no_fee") {
          studentWaivedSlots += 1;
        }
      }
    } else if (slot.kind === "makeup") {
      makeupSlots += 1;
      if (!CHARGEABLE_STATUSES.has(slot.status)) {
        disposition = "not_chargeable";
      } else if (original) {
        disposition = "replacement_makeup";
      } else if (slot.originalRegularDate && !isInMonth(slot.originalRegularDate, input.month)) {
        disposition = "cross_month_makeup";
      } else {
        disposition = "included_makeup";
      }
    } else if (!CHARGEABLE_STATUSES.has(slot.status)) {
      disposition = "not_chargeable";
    } else if (slot.extraFeeMode === "surcharge" && surcharge > 0) {
      disposition = "surcharged_extra";
      amount = surcharge;
      chargedExtraSlots += 1;
    } else {
      disposition = "included_extra";
      includedExtraSlots += 1;
    }

    return {
      ...slot,
      originalEligibilityDate,
      eligible,
      disposition,
      amount,
    };
  }).sort(compareLedgerRows);

  const unroundedTotalAmount = ledger.reduce((sum, row) => sum + row.amount, 0);

  return {
    ok: true,
    month: input.month,
    billingMode: input.plan.mode,
    currency: "VND",
    summary: {
      plannedRegularSlots: regularSlots.length,
      eligibleRegularSlots,
      deliveredRegularSlots,
      chargedRegularSlots,
      centerCreditSlots,
      studentWaivedSlots,
      makeupSlots,
      includedExtraSlots,
      chargedExtraSlots,
    },
    unroundedTotalAmount,
    totalAmount: Math.round(unroundedTotalAmount),
    ledger,
  };
}
