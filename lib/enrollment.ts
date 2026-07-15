import { ApiError } from "./api-utils.js";
import { acquireClassMonthRosterAdvisoryLocks } from "./attendance-lock-transaction.js";

type EnrollmentPeriodLike = {
  startedAt: Date;
  endedAt?: Date | null;
};

type StudentClassSnapshot = {
  id: string;
  classId: string;
  status?: string | null;
};

function rosterSnapshot(links: StudentClassSnapshot[]) {
  return links
    .map((link) => `${link.id}:${link.classId}:${link.status || ""}`)
    .sort();
}

function assertRosterSnapshotStable(
  before: StudentClassSnapshot[],
  after: StudentClassSnapshot[],
) {
  const beforeSnapshot = rosterSnapshot(before);
  const afterSnapshot = rosterSnapshot(after);
  if (
    beforeSnapshot.length === afterSnapshot.length &&
    beforeSnapshot.every((value, index) => value === afterSnapshot[index])
  ) {
    return;
  }

  throw new ApiError(
    "ENROLLMENT_ROSTER_CHANGED",
    "Enrollment roster changed concurrently; retry the operation",
    409,
    {
      retryable: true,
      before: beforeSnapshot,
      after: afterSnapshot,
    },
  );
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function affectedMonthKeys(effectiveAt: Date, now: Date) {
  const start = new Date(Date.UTC(effectiveAt.getUTCFullYear(), effectiveAt.getUTCMonth(), 1));
  const endSource = effectiveAt > now ? effectiveAt : now;
  const end = new Date(Date.UTC(endSource.getUTCFullYear(), endSource.getUTCMonth(), 1));
  const months: string[] = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setUTCMonth(cursor.getUTCMonth() + 1)) {
    months.push(monthKey(cursor));
  }
  return months;
}

export async function assertEnrollmentMutationWritable(
  tx: any,
  classIds: string[],
  effectiveAt = new Date(),
  now = new Date(),
) {
  const uniqueClassIds = [...new Set(classIds.filter(Boolean))];
  if (uniqueClassIds.length === 0) return;
  const months = affectedMonthKeys(effectiveAt, now);
  await acquireClassMonthRosterAdvisoryLocks(tx, uniqueClassIds, months);
  const protectedPeriod = tx.attendancePeriod?.findFirst
    ? await tx.attendancePeriod.findFirst({
    where: {
      classId: { in: uniqueClassIds },
      periodMonth: { gte: months[0], lte: months[months.length - 1] },
      status: { in: ["submitted", "approved", "locked"] },
    },
    select: { classId: true, periodMonth: true, status: true },
    orderBy: { periodMonth: "asc" },
  })
    : null;
  if (protectedPeriod) {
    throw new ApiError(
      "ENROLLMENT_PERIOD_LOCKED",
      `Enrollment cannot change because attendance ${protectedPeriod.periodMonth} is ${protectedPeriod.status}`,
      409,
      {
        class_id: protectedPeriod.classId,
        period_month: protectedPeriod.periodMonth,
        status: protectedPeriod.status,
      },
    );
  }

  const frozenPlan = tx.classMonthPlan?.findFirst
    ? await tx.classMonthPlan.findFirst({
        where: {
          classId: { in: uniqueClassIds },
          billingMonth: { gte: months[0], lte: months[months.length - 1] },
          state: "frozen",
        },
        select: { classId: true, billingMonth: true, state: true },
        orderBy: { billingMonth: "asc" },
      })
    : null;
  if (frozenPlan) {
    throw new ApiError(
      "CLASS_MONTH_PLAN_FROZEN",
      `Enrollment cannot change because class month plan ${frozenPlan.billingMonth} is frozen`,
      409,
      {
        class_id: frozenPlan.classId,
        billing_month: frozenPlan.billingMonth,
      },
    );
  }
}

export async function assertClassDefinitionWritable(
  tx: any,
  classIds: string[],
) {
  const uniqueClassIds = [...new Set(classIds.filter(Boolean))].sort();
  if (uniqueClassIds.length === 0) return;

  await acquireClassMonthRosterAdvisoryLocks(tx, uniqueClassIds, []);
  const protectedPeriod = tx.attendancePeriod?.findFirst
    ? await tx.attendancePeriod.findFirst({
        where: {
          classId: { in: uniqueClassIds },
          status: { in: ["submitted", "approved", "locked"] },
        },
        select: { classId: true, periodMonth: true, status: true },
        orderBy: { periodMonth: "asc" },
      })
    : null;
  if (protectedPeriod) {
    throw new ApiError(
      "CLASS_DEFINITION_LOCKED",
      `Class schedule or billing cannot change because attendance ${protectedPeriod.periodMonth} is ${protectedPeriod.status}`,
      409,
      {
        class_id: protectedPeriod.classId,
        period_month: protectedPeriod.periodMonth,
        status: protectedPeriod.status,
      },
    );
  }

  const frozenPlan = tx.classMonthPlan?.findFirst
    ? await tx.classMonthPlan.findFirst({
        where: { classId: { in: uniqueClassIds }, state: "frozen" },
        select: { classId: true, billingMonth: true, state: true },
        orderBy: { billingMonth: "asc" },
      })
    : null;
  if (frozenPlan) {
    throw new ApiError(
      "CLASS_DEFINITION_LOCKED",
      `Class schedule or billing cannot change because class month plan ${frozenPlan.billingMonth} is frozen`,
      409,
      {
        class_id: frozenPlan.classId,
        billing_month: frozenPlan.billingMonth,
      },
    );
  }
}

export function enrollmentOverlapsRange(
  period: EnrollmentPeriodLike,
  rangeStart: Date,
  rangeEndExclusive: Date,
) {
  return (
    period.startedAt < rangeEndExclusive &&
    (!period.endedAt || period.endedAt > rangeStart)
  );
}

type SyncEnrollmentInput = {
  studentId: string;
  desiredClassIds: string[];
  effectiveAt?: Date;
  source: string;
};

export async function syncStudentEnrollmentPeriods(
  tx: any,
  input: SyncEnrollmentInput,
) {
  const effectiveAt = input.effectiveAt || new Date();
  const desiredClassIds = [...new Set(input.desiredClassIds.filter(Boolean))];
  const desired = new Set(desiredClassIds);
  const initialLinks = await tx.studentClass.findMany({
    where: { studentId: input.studentId },
    select: {
      id: true,
      studentId: true,
      classId: true,
      status: true,
      enrollmentDate: true,
    },
  });
  await assertEnrollmentMutationWritable(
    tx,
    [...desiredClassIds, ...initialLinks.map((link: any) => link.classId)],
    effectiveAt,
  );
  const links = await tx.studentClass.findMany({
    where: { studentId: input.studentId },
    select: {
      id: true,
      studentId: true,
      classId: true,
      status: true,
      enrollmentDate: true,
    },
  });
  assertRosterSnapshotStable(initialLinks, links);
  const byClass = new Map(links.map((link: any) => [link.classId, link]));
  let activated = 0;
  let deactivated = 0;
  let unchanged = 0;

  for (const link of links as any[]) {
    if (link.status !== "active" || desired.has(link.classId)) continue;
    await tx.studentClass.update({
      where: { id: link.id },
      data: { status: "inactive" },
    });
    const openPeriod = await tx.enrollmentPeriod.findFirst({
      where: {
        studentId: input.studentId,
        classId: link.classId,
        endedAt: null,
      },
      orderBy: { startedAt: "desc" },
      select: { id: true },
    });
    if (openPeriod) {
      await tx.enrollmentPeriod.update({
        where: { id: openPeriod.id },
        data: { endedAt: effectiveAt },
      });
    }
    deactivated += 1;
  }

  for (const classId of desiredClassIds) {
    const link: any = byClass.get(classId);
    if (link?.status === "active") {
      unchanged += 1;
      const openPeriod = await tx.enrollmentPeriod.findFirst({
        where: { studentId: input.studentId, classId, endedAt: null },
        select: { id: true },
      });
      if (!openPeriod) {
        await tx.enrollmentPeriod.create({
          data: {
            studentId: input.studentId,
            classId,
            startedAt: link.enrollmentDate,
            source: "projection_backfill",
          },
        });
      }
      continue;
    }

    if (link) {
      await tx.studentClass.update({
        where: { id: link.id },
        data: { status: "active", enrollmentDate: effectiveAt },
      });
    } else {
      await tx.studentClass.create({
        data: {
          studentId: input.studentId,
          classId,
          enrollmentDate: effectiveAt,
          status: "active",
        },
      });
    }
    await tx.enrollmentPeriod.create({
      data: {
        studentId: input.studentId,
        classId,
        startedAt: effectiveAt,
        source: input.source,
      },
    });
    activated += 1;
  }

  return { activated, deactivated, unchanged };
}

export async function deactivateEnrollmentPeriods(
  tx: any,
  where: { studentId?: string; classId?: string },
  effectiveAt = new Date(),
) {
  const initialLinks = tx.studentClass?.findMany
    ? await tx.studentClass.findMany({
        where: { ...where, status: "active" },
        select: { id: true, classId: true, status: true },
      })
    : where.classId
      ? [{ id: `class:${where.classId}`, classId: where.classId, status: "active" }]
      : [];
  await assertEnrollmentMutationWritable(
    tx,
    initialLinks.map((link: { classId: string }) => link.classId),
    effectiveAt,
  );

  const currentLinks = tx.studentClass?.findMany
    ? await tx.studentClass.findMany({
        where: { ...where, status: "active" },
        select: { id: true, classId: true, status: true },
      })
    : initialLinks;
  assertRosterSnapshotStable(initialLinks, currentLinks);
  const linkIds = currentLinks
    .map((link: { id: string }) => link.id)
    .filter((id: string) => !id.startsWith("class:"));
  const classIds = [...new Set(currentLinks.map((link: { classId: string }) => link.classId))];

  if (linkIds.length > 0) {
    await tx.studentClass.updateMany({
      where: { id: { in: linkIds }, status: "active" },
      data: { status: "inactive" },
    });
  } else if (where.classId && !tx.studentClass?.findMany) {
    await tx.studentClass.updateMany({
      where: { ...where, status: "active" },
      data: { status: "inactive" },
    });
  }

  if (classIds.length === 0) return;
  await tx.enrollmentPeriod.updateMany({
    where: {
      ...where,
      classId: { in: classIds },
      endedAt: null,
    },
    data: { endedAt: effectiveAt },
  });
}
