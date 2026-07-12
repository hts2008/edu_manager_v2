export const BILLING_POLICIES = ["monthly_prorated", "per_session"] as const;
export type BillingPolicy = (typeof BILLING_POLICIES)[number];

export const CLASS_SESSION_KINDS = ["regular", "makeup", "extra"] as const;
export type ClassSessionKind = (typeof CLASS_SESSION_KINDS)[number];

export const CLASS_SESSION_STATUSES = ["planned", "held", "cancelled", "holiday"] as const;
export type ClassSessionStatus = (typeof CLASS_SESSION_STATUSES)[number];

export const EXTRA_FEE_MODES = ["included", "surcharge"] as const;
export type ExtraFeeMode = (typeof EXTRA_FEE_MODES)[number];

export type ClassSessionBackfillConfidence = "high" | "low";

export type ClassSessionBackfillCandidate = {
  classId: string;
  sessionDate: Date;
  billingMonth: string;
  kind: ClassSessionKind;
  status: ClassSessionStatus;
  extraFeeMode: ExtraFeeMode;
  confidence: ClassSessionBackfillConfidence;
  confidenceReasons: string[];
};
