import { ApiError } from "./api-utils.js";

export type AttendancePeriodPlanStatus = "open" | "submitted" | "approved" | "locked";
export type ClassMonthPlanState = "open" | "frozen";

type PlanRecord = {
  id: string;
  classId: string;
  billingMonth: string;
  state: ClassMonthPlanState;
  revision: number;
  createdById?: string | null;
  updatedById?: string | null;
  frozenById?: string | null;
  frozenAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type RevisionInput = {
  planId: string;
  expectedRevision: number;
  actorId?: string | null;
  reason?: string | null;
  snapshot: unknown;
};

type ClaimInput = RevisionInput & {
  eventType?: string;
  targetState?: ClassMonthPlanState;
};

export class ClassMonthPlanError extends ApiError {
  statusCode: number;

  constructor(code: string, message: string, statusCode: number, details?: unknown) {
    super(code, message, statusCode, details);
    this.name = "ClassMonthPlanError";
    this.statusCode = statusCode;
  }
}

function inTransaction<T>(db: any, work: (tx: any) => Promise<T>): Promise<T> {
  return typeof db.$transaction === "function" ? db.$transaction(work) : work(db);
}

export function mapAttendancePeriodStatusToPlanState(
  status: AttendancePeriodPlanStatus,
): ClassMonthPlanState {
  if (status === "open") return "open";
  if (status === "submitted" || status === "approved" || status === "locked") {
    return "frozen";
  }
  throw new ClassMonthPlanError(
    "CLASS_MONTH_PLAN_INVALID_PERIOD_STATUS",
    "Attendance period status is invalid",
    400,
  );
}

function assertExpectedRevision(expectedRevision: number) {
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
    throw new ClassMonthPlanError(
      "CLASS_MONTH_PLAN_INVALID_REVISION",
      "expectedRevision must be a positive integer",
      400,
    );
  }
}

function revisionSnapshot(plan: PlanRecord, payload: unknown) {
  return {
    schema_version: 1,
    class_id: plan.classId,
    billing_month: plan.billingMonth,
    state: plan.state,
    revision: plan.revision,
    payload: payload ?? null,
  };
}

async function loadClaimFailure(tx: any, input: ClaimInput): Promise<never> {
  const current = await tx.classMonthPlan.findUnique({ where: { id: input.planId } });
  if (!current) {
    throw new ClassMonthPlanError(
      "CLASS_MONTH_PLAN_NOT_FOUND",
      "Class month plan was not found",
      404,
    );
  }
  if (current.state === "frozen") {
    throw new ClassMonthPlanError(
      "CLASS_MONTH_PLAN_FROZEN",
      "Class month plan is frozen",
      409,
      { current_revision: current.revision },
    );
  }
  throw new ClassMonthPlanError(
    "CLASS_MONTH_PLAN_REVISION_CONFLICT",
    "Class month plan changed; reload it before retrying",
    409,
    {
      expected_revision: input.expectedRevision,
      current_revision: current.revision,
    },
  );
}

async function claimInTransaction(
  tx: any,
  input: ClaimInput,
  mutation?: (tx: any, claimedPlan: PlanRecord) => Promise<void> | void,
) {
  assertExpectedRevision(input.expectedRevision);
  const targetState = input.targetState ?? "open";
  const now = new Date();
  const claimed = await tx.classMonthPlan.updateMany({
    where: {
      id: input.planId,
      revision: input.expectedRevision,
      state: "open",
    },
    data: {
      revision: { increment: 1 },
      state: targetState,
      updatedById: input.actorId ?? null,
      updatedAt: now,
      ...(targetState === "frozen"
        ? { frozenById: input.actorId ?? null, frozenAt: now }
        : {}),
    },
  });
  if (claimed.count !== 1) return loadClaimFailure(tx, input);

  const plan = await tx.classMonthPlan.findUnique({ where: { id: input.planId } });
  if (!plan) {
    throw new ClassMonthPlanError(
      "CLASS_MONTH_PLAN_NOT_FOUND",
      "Claimed class month plan disappeared inside its transaction",
      409,
    );
  }

  await mutation?.(tx, plan);
  await tx.classMonthPlanRevision.create({
    data: {
      planId: plan.id,
      revision: plan.revision,
      state: plan.state,
      eventType: input.eventType || "claim",
      reason: input.reason?.trim() || null,
      snapshot: revisionSnapshot(plan, input.snapshot),
      actorId: input.actorId ?? null,
    },
  });
  return plan as PlanRecord;
}

export async function ensureClassMonthPlan(
  db: any,
  input: {
    classId: string;
    billingMonth: string;
    attendancePeriodStatus: AttendancePeriodPlanStatus;
    actorId?: string | null;
    snapshot?: unknown;
  },
) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.billingMonth)) {
    throw new ClassMonthPlanError(
      "CLASS_MONTH_PLAN_INVALID_MONTH",
      "billingMonth must be YYYY-MM",
      400,
    );
  }
  const desiredState = mapAttendancePeriodStatusToPlanState(input.attendancePeriodStatus);
  return inTransaction(db, async (tx: any) => {
    const now = new Date();
    const plan = await tx.classMonthPlan.upsert({
      where: {
        classId_billingMonth: {
          classId: input.classId,
          billingMonth: input.billingMonth,
        },
      },
      create: {
        classId: input.classId,
        billingMonth: input.billingMonth,
        state: desiredState,
        revision: 1,
        createdById: input.actorId ?? null,
        updatedById: input.actorId ?? null,
        frozenById: desiredState === "frozen" ? input.actorId ?? null : null,
        frozenAt: desiredState === "frozen" ? now : null,
        revisions: {
          create: {
            revision: 1,
            state: desiredState,
            eventType: "ensure",
            snapshot: {
              schema_version: 1,
              class_id: input.classId,
              billing_month: input.billingMonth,
              state: desiredState,
              revision: 1,
              payload: input.snapshot ?? null,
            },
            actorId: input.actorId ?? null,
          },
        },
      },
      update: {},
    });

    if (desiredState === "frozen" && plan.state === "open") {
      return claimInTransaction(tx, {
        planId: plan.id,
        expectedRevision: plan.revision,
        actorId: input.actorId,
        eventType: "ensure_frozen",
        targetState: "frozen",
        snapshot: input.snapshot ?? null,
      });
    }
    return plan as PlanRecord;
  });
}

export async function claimClassMonthPlan(
  db: any,
  input: ClaimInput,
  mutation?: (tx: any, claimedPlan: PlanRecord) => Promise<void> | void,
) {
  return inTransaction(db, (tx: any) => claimInTransaction(tx, input, mutation));
}

export async function bumpClassMonthPlan(db: any, input: RevisionInput) {
  return claimClassMonthPlan(db, { ...input, eventType: "bump", targetState: "open" });
}

export async function freezeClassMonthPlan(db: any, input: RevisionInput) {
  return claimClassMonthPlan(db, { ...input, eventType: "freeze", targetState: "frozen" });
}

export async function recordClassMonthPlanWrite(
  tx: any,
  input: {
    classId: string;
    billingMonth: string;
    actorId?: string | null;
    eventType: string;
    reason?: string | null;
    snapshot: unknown;
  },
) {
  const existing = await tx.classMonthPlan.findUnique({
    where: {
      classId_billingMonth: {
        classId: input.classId,
        billingMonth: input.billingMonth,
      },
    },
  });
  if (!existing) {
    return ensureClassMonthPlan(tx, {
      classId: input.classId,
      billingMonth: input.billingMonth,
      attendancePeriodStatus: "open",
      actorId: input.actorId,
      snapshot: input.snapshot,
    });
  }
  return claimInTransaction(tx, {
    planId: existing.id,
    expectedRevision: existing.revision,
    actorId: input.actorId,
    eventType: input.eventType,
    reason: input.reason,
    targetState: "open",
    snapshot: input.snapshot,
  });
}

export async function reopenClassMonthPlan(
  tx: any,
  input: {
    classId: string;
    billingMonth: string;
    actorId?: string | null;
    reason: string;
  },
) {
  const plan = await tx.classMonthPlan.findUnique({
    where: {
      classId_billingMonth: {
        classId: input.classId,
        billingMonth: input.billingMonth,
      },
    },
  });
  if (!plan) return null;
  const updated = await tx.classMonthPlan.updateMany({
    where: { id: plan.id, revision: plan.revision, state: "frozen" },
    data: {
      revision: { increment: 1 },
      state: "open",
      updatedById: input.actorId ?? null,
      frozenById: null,
      frozenAt: null,
    },
  });
  if (updated.count !== 1) {
    throw new ClassMonthPlanError(
      "CLASS_MONTH_PLAN_REVISION_CONFLICT",
      "Class month plan changed while reopening attendance",
      409,
      { expected_revision: plan.revision },
    );
  }
  const current = await tx.classMonthPlan.findUnique({ where: { id: plan.id } });
  if (!current) {
    throw new ClassMonthPlanError(
      "CLASS_MONTH_PLAN_NOT_FOUND",
      "Reopened class month plan disappeared inside its transaction",
      409,
    );
  }
  await tx.classMonthPlanRevision.create({
    data: {
      planId: plan.id,
      revision: current.revision,
      state: "open",
      eventType: "reopen",
      reason: input.reason,
      snapshot: revisionSnapshot(current, { attendance_period: "open" }),
      actorId: input.actorId ?? null,
    },
  });
  return current;
}
