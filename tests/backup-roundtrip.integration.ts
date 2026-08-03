import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { PrismaClient } from "@prisma/client";
import { createDatabaseSnapshot, restoreDatabaseBackup } from "../lib/backup.js";
import { resetDatabase } from "../prisma/reset-database.js";

const databaseUrl = process.env.TEST_DATABASE_URL;

describe("Audit V2 backup round-trip", { skip: !databaseUrl }, () => {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  const reset = () => resetDatabase(prisma, {
    databaseUrl,
    confirmation: "RESET_EDU_MANAGER",
    nodeEnv: "test",
  });

  before(async () => {
    await reset();
    await prisma.user.create({
      data: { id: "audit-user", username: "audit-admin", passwordHash: "test-only", role: "admin", fullName: "Audit Admin" },
    });
    await prisma.parent.create({
      data: { id: "audit-parent", fullName: "Audit Parent", phone: "0900000001", relationship: "father" },
    });
    await prisma.student.create({
      data: {
        id: "audit-student",
        fullName: "Audit Student",
        dateOfBirth: new Date("2014-01-01T00:00:00.000Z"),
        gender: "male",
        parentId: "audit-parent",
        enrollmentDate: new Date("2026-06-01T00:00:00.000Z"),
      },
    });
    await prisma.class.create({
      data: {
        id: "audit-class",
        className: "Audit Class",
        sessionsPerWeek: 2,
        startTime: "18:00",
        endTime: "19:30",
        feePerDay: 100_000,
        billingPolicy: "monthly_prorated",
      },
    });
    await prisma.studentClass.create({
      data: { studentId: "audit-student", classId: "audit-class", enrollmentDate: new Date("2026-06-01T00:00:00.000Z") },
    });
    await prisma.enrollmentPeriod.create({
      data: { id: "audit-enrollment", studentId: "audit-student", classId: "audit-class", startedAt: new Date("2026-06-01T00:00:00.000Z"), source: "audit-v2" },
    });
    await prisma.classSession.createMany({ data: [
      { id: "audit-session-1", classId: "audit-class", sessionDate: new Date("2026-06-03T00:00:00.000Z"), billingMonth: "2026-06", createdById: "audit-user" },
      { id: "audit-session-2", classId: "audit-class", sessionDate: new Date("2026-06-05T00:00:00.000Z"), billingMonth: "2026-06", createdById: "audit-user" },
    ] });
    await prisma.classMonthPlan.create({
      data: { id: "audit-plan", classId: "audit-class", billingMonth: "2026-06", state: "frozen", revision: 1, createdById: "audit-user", frozenById: "audit-user", frozenAt: new Date("2026-06-30T00:00:00.000Z") },
    });
    await prisma.classMonthPlanRevision.create({
      data: { id: "audit-plan-revision", planId: "audit-plan", revision: 1, state: "frozen", eventType: "freeze", reason: "audit", snapshot: { sessions: 2 }, actorId: "audit-user" },
    });
    await prisma.attendance.create({
      data: { id: "audit-attendance", studentId: "audit-student", classId: "audit-class", classSessionId: "audit-session-1", attendanceDate: new Date("2026-06-03T00:00:00.000Z"), status: "present", createdById: "audit-user" },
    });
    await prisma.monthlyFee.create({
      data: { id: "audit-fee", studentId: "audit-student", month: "2026-06", totalDays: 2, totalAmount: 200_000, status: "ready" },
    });
    await prisma.monthlyFeeLine.create({
      data: { id: "audit-line", monthlyFeeId: "audit-fee", studentId: "audit-student", classId: "audit-class", allocationKey: "class:audit-class", month: "2026-06", expectedSessions: 2, chargedSessions: 2, feePerSession: 100_000, monthlyTuition: 200_000, amount: 200_000, status: "ready" },
    });
    await prisma.monthlyFeeLineRevision.create({
      data: { id: "audit-line-revision", monthlyFeeLineId: "audit-line", revisionNumber: 1, runId: "audit-run", eventType: "calculated", reason: "audit", afterSnapshot: { amount: 200_000 }, actorId: "audit-user" },
    });
  });

  after(async () => {
    await reset();
    await prisma.$disconnect();
  });

  it("restores Tuition V3 rows and re-enables immutable revision triggers", async () => {
    const backup = await createDatabaseSnapshot(prisma);
    assert.equal(backup.counts.classSessions, 2);
    assert.equal(backup.counts.classMonthPlans, 1);
    assert.equal(backup.counts.classMonthPlanRevisions, 1);
    assert.equal(backup.counts.monthlyFeeLineRevisions, 1);

    await reset();
    assert.equal(await prisma.classSession.count(), 0);

    await restoreDatabaseBackup(prisma, backup, {
      databaseUrl,
      confirmation: "RESTORE_EDU_MANAGER",
      nodeEnv: "test",
    });

    const restoredAttendance = await prisma.attendance.findUnique({ where: { id: "audit-attendance" } });
    assert.equal(restoredAttendance?.classSessionId, "audit-session-1");
    assert.equal(await prisma.classMonthPlanRevision.count(), 1);
    assert.equal(await prisma.monthlyFeeLineRevision.count(), 1);
    assert.deepEqual(
      await prisma.classMonthPlan.findUnique({
        where: { id: "audit-plan" },
        select: { state: true, revision: true },
      }),
      { state: "frozen", revision: 1 },
    );
    assert.equal(
      await prisma.classMonthPlanRevision.count({
        where: { planId: "audit-plan", revision: 2 },
      }),
      0,
    );

    await assert.rejects(
      prisma.$executeRawUnsafe("UPDATE class_month_plan_revisions SET reason = 'mutated' WHERE id = 'audit-plan-revision'"),
      /immutable/,
    );
    await assert.rejects(
      prisma.$executeRawUnsafe("UPDATE monthly_fee_line_revisions SET reason = 'mutated' WHERE id = 'audit-line-revision'"),
      /immutable/,
    );

    await assert.rejects(
      prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          "SELECT set_config('app.allow_class_month_plan_reopen', '1', true)",
        );
        await tx.classMonthPlan.update({
          where: { id: "audit-plan" },
          data: { state: "open", revision: { increment: 1 } },
        });
        await tx.$executeRawUnsafe(
          'SET CONSTRAINTS "class_month_plan_reopen_revision_guard" IMMEDIATE',
        );
      }),
      /matching audit revision/,
    );

    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        "SELECT set_config('app.allow_class_month_plan_reopen', '1', true)",
      );
      const reopened = await tx.classMonthPlan.update({
        where: { id: "audit-plan" },
        data: { state: "open", revision: { increment: 1 } },
      });
      await tx.classMonthPlanRevision.create({
        data: {
          planId: reopened.id,
          revision: reopened.revision,
          state: "open",
          eventType: "reopen",
          reason: "verified controlled reopen",
          snapshot: { audit: true },
          actorId: "audit-user",
        },
      });
      await tx.$executeRawUnsafe(
        'SET CONSTRAINTS "class_month_plan_reopen_revision_guard" IMMEDIATE',
      );
    });
    assert.equal((await prisma.classMonthPlan.findUnique({ where: { id: "audit-plan" } }))?.state, "open");
  });
});
