type EnrollmentPeriodLike = {
  startedAt: Date;
  endedAt?: Date | null;
};

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
  await tx.studentClass.updateMany({
    where: { ...where, status: "active" },
    data: { status: "inactive" },
  });
  await tx.enrollmentPeriod.updateMany({
    where: { ...where, endedAt: null },
    data: { endedAt: effectiveAt },
  });
}
