import { PrismaClient } from "@prisma/client";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the Audit V2 fixture`);
  return value;
}

const databaseUrl = required("DATABASE_URL");
const testDatabaseUrl = required("TEST_DATABASE_URL");

if (databaseUrl !== testDatabaseUrl) {
  throw new Error("Audit V2 fixture requires DATABASE_URL === TEST_DATABASE_URL");
}

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

const CLASS_ID = "audit-v2-class";
const PARENT_ID = "audit-v2-parent";
const TEACHER_ID = "audit-v2-teacher";
const STUDENT_IDS = ["audit-v2-student-1", "audit-v2-student-2"];
const ENROLLMENT_START = new Date("2026-08-01T00:00:00.000Z");
const SESSION_DATES = [
  "2026-08-03",
  "2026-08-05",
  "2026-08-10",
  "2026-08-12",
  "2026-08-17",
  "2026-08-19",
  "2026-08-24",
  "2026-08-26",
  "2026-08-31",
];

try {
  await prisma.$transaction(async (tx) => {
    const admin = await tx.user.findFirst({
      where: { role: "admin", status: "active" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!admin) throw new Error("Audit V2 fixture requires a bootstrapped active admin");

    await tx.parent.upsert({
      where: { id: PARENT_ID },
      update: { deletedAt: null },
      create: {
        id: PARENT_ID,
        fullName: "Phu huynh Audit V2",
        phone: "0900000099",
        relationship: "father",
      },
    });
    await tx.teacher.upsert({
      where: { id: TEACHER_ID },
      update: { status: "active" },
      create: {
        id: TEACHER_ID,
        fullName: "Giao vien Audit V2",
        phone: "0900000088",
        salaryType: "hourly",
        salaryAmount: 200000,
      },
    });
    await tx.class.upsert({
      where: { id: CLASS_ID },
      update: {
        status: "active",
        scheduleDays: [2, 4],
        sessionsPerWeek: 2,
        billingPolicy: "monthly_prorated",
        feePerDay: 900000,
      },
      create: {
        id: CLASS_ID,
        className: "Audit V2 English",
        scheduleDays: [2, 4],
        scheduleRequired: false,
        sessionsPerWeek: 2,
        sessionRequired: false,
        billingPolicy: "monthly_prorated",
        startTime: "18:00",
        endTime: "19:30",
        feePerDay: 900000,
        maxStudents: 20,
        teacherId: TEACHER_ID,
      },
    });

    for (const [index, studentId] of STUDENT_IDS.entries()) {
      await tx.student.upsert({
        where: { id: studentId },
        update: { status: "active", deletedAt: null },
        create: {
          id: studentId,
          fullName: `Hoc vien Audit V2 ${index + 1}`,
          dateOfBirth: new Date(`201${index}-01-01T00:00:00.000Z`),
          gender: index === 0 ? "male" : "female",
          parentId: PARENT_ID,
          enrollmentDate: ENROLLMENT_START,
        },
      });
      await tx.studentClass.upsert({
        where: { studentId_classId: { studentId, classId: CLASS_ID } },
        update: { status: "active", enrollmentDate: ENROLLMENT_START },
        create: {
          studentId,
          classId: CLASS_ID,
          enrollmentDate: ENROLLMENT_START,
          status: "active",
        },
      });
      await tx.enrollmentPeriod.deleteMany({
        where: { studentId, classId: CLASS_ID, source: "audit-v2-e2e" },
      });
      await tx.enrollmentPeriod.create({
        data: {
          studentId,
          classId: CLASS_ID,
          startedAt: ENROLLMENT_START,
          source: "audit-v2-e2e",
        },
      });
    }

    const plan = await tx.classMonthPlan.upsert({
      where: { classId_billingMonth: { classId: CLASS_ID, billingMonth: "2026-08" } },
      update: {},
      create: {
        id: "audit-v2-month-plan",
        classId: CLASS_ID,
        billingMonth: "2026-08",
        state: "open",
        revision: 1,
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
    await tx.classMonthPlanRevision.upsert({
      where: { planId_revision: { planId: plan.id, revision: 1 } },
      update: {},
      create: {
        id: "audit-v2-month-plan-revision",
        planId: plan.id,
        revision: 1,
        state: "open",
        eventType: "fixture_publish",
        reason: "Audit V2 isolated fixture",
        snapshot: { dates: SESSION_DATES, sessions_per_week: 2 },
        actorId: admin.id,
      },
    });
    for (const sessionDate of SESSION_DATES) {
      await tx.classSession.upsert({
        where: {
          classId_sessionDate: {
            classId: CLASS_ID,
            sessionDate: new Date(`${sessionDate}T00:00:00.000Z`),
          },
        },
        update: { status: "planned", kind: "regular" },
        create: {
          classId: CLASS_ID,
          sessionDate: new Date(`${sessionDate}T00:00:00.000Z`),
          billingMonth: "2026-08",
          kind: "regular",
          status: "planned",
          source: "audit-v2-e2e",
          createdById: admin.id,
          updatedById: admin.id,
        },
      });
    }
  });

  console.info(
    JSON.stringify({ class_id: CLASS_ID, student_ids: STUDENT_IDS, month: "2026-08" })
  );
} finally {
  await prisma.$disconnect();
}
