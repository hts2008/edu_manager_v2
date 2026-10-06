import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the Student Progress E2E fixture`);
  return value;
}

const FIXTURE_CONFIRMATION = "student-progress-local-test";

function assertSafeFixtureDatabase(databaseUrl: string, testDatabaseUrl: string) {
  if (process.env.E2E_FIXTURE_ALLOW_MUTATION !== FIXTURE_CONFIRMATION) {
    throw new Error(
      `E2E_FIXTURE_ALLOW_MUTATION must equal ${FIXTURE_CONFIRMATION} to run the Student Progress E2E fixture`,
    );
  }
  if (databaseUrl !== testDatabaseUrl) {
    throw new Error("Student Progress E2E fixture requires DATABASE_URL === TEST_DATABASE_URL");
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("Student Progress E2E fixture requires a valid PostgreSQL test database URL");
  }

  const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  const isPostgres = parsed.protocol === "postgres:" || parsed.protocol === "postgresql:";
  const isTestDatabase = /(?:^|[_-])(test|e2e)(?:$|[_-])/i.test(databaseName);

  if (!isPostgres || !loopbackHosts.has(parsed.hostname) || !isTestDatabase) {
    throw new Error(
      "Student Progress E2E fixture is restricted to a loopback PostgreSQL database whose name contains test or e2e",
    );
  }
}

const databaseUrl = required("DATABASE_URL");
const testDatabaseUrl = required("TEST_DATABASE_URL");
assertSafeFixtureDatabase(databaseUrl, testDatabaseUrl);

if (process.argv.includes("--check-guard-only")) {
  console.info("Student Progress E2E fixture guard passed");
  process.exit(0);
}

const receptionistPassword = required("E2E_RECEPTIONIST_PASSWORD");
if (receptionistPassword.length < 12) {
  throw new Error("E2E_RECEPTIONIST_PASSWORD must contain at least 12 characters");
}

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const ids = {
  parent: "e2e-spd-parent",
  student: "e2e-spd-student",
  class: "e2e-spd-class",
};
const enrollmentStart = new Date("2026-08-01T00:00:00.000Z");
const tenantId = "tenant_default";

try {
  const result = await prisma.$transaction(async (tx) => {
    const admin = await tx.user.findFirst({
      where: { tenantId, username: "admin", role: "admin", status: "active", tenant: { status: "active" } },
      orderBy: { createdAt: "asc" },
      select: { id: true, passwordHash: true },
    });
    if (!admin) throw new Error("Student Progress E2E fixture requires a bootstrapped admin");

    const receptionist = await tx.user.upsert({
      where: { tenantId_username: { tenantId, username: "spd-receptionist" } },
      update: {
        passwordHash: await bcrypt.hash(receptionistPassword, 12),
        role: "receptionist",
        status: "active",
        tokenVersion: { increment: 1 },
      },
      create: {
        tenantId,
        username: "spd-receptionist",
        passwordHash: await bcrypt.hash(receptionistPassword, 12),
        role: "receptionist",
        fullName: "Student Progress Receptionist",
        status: "active",
      },
    });
    const parent = await tx.parent.upsert({
      where: { id: ids.parent, tenantId },
      update: { deletedAt: null },
      create: {
        id: ids.parent,
        tenantId,
        fullName: "Phu huynh Student Progress E2E",
        phone: "0900000711",
        relationship: "mother",
      },
    });
    const teacher = await tx.teacher.upsert({
      where: { tenantId_phone: { tenantId, phone: "0900000712" } },
      update: { status: "active" },
      create: {
        fullName: "Giao vien Student Progress E2E",
        tenantId,
        phone: "0900000712",
        salaryType: "hourly",
        salaryAmount: 200000,
      },
    });
    const student = await tx.student.upsert({
      where: { id: ids.student, tenantId },
      update: { status: "active", deletedAt: null, parentId: parent.id },
      create: {
        id: ids.student,
        tenantId,
        fullName: "Hoc vien Student Progress E2E",
        dateOfBirth: new Date("2014-08-03T00:00:00.000Z"),
        gender: "female",
        parentId: parent.id,
        enrollmentDate: enrollmentStart,
      },
    });
    const classRow = await tx.class.upsert({
      where: { id: ids.class, tenantId },
      update: { status: "active", teacherId: teacher.id },
      create: {
        id: ids.class,
        tenantId,
        className: "Flyers Student Progress E2E",
        scheduleDays: [2, 4],
        sessionsPerWeek: 2,
        billingPolicy: "monthly_prorated",
        startTime: "18:00",
        endTime: "19:30",
        feePerDay: 900000,
        maxStudents: 20,
        teacherId: teacher.id,
      },
    });

    await tx.studentClass.upsert({
      where: { tenantId_studentId_classId: { tenantId, studentId: student.id, classId: classRow.id } },
      update: { status: "active", enrollmentDate: enrollmentStart },
      create: {
        tenantId,
        studentId: student.id,
        classId: classRow.id,
        enrollmentDate: enrollmentStart,
        status: "active",
      },
    });
    await tx.enrollmentPeriod.deleteMany({
      where: { tenantId, studentId: student.id, classId: classRow.id },
    });
    await tx.enrollmentPeriod.create({
      data: {
        tenantId,
        studentId: student.id,
        classId: classRow.id,
        startedAt: enrollmentStart,
        source: "student-progress-e2e",
      },
    });
    await tx.studentProgressMonth.deleteMany({
      where: { tenantId, studentId: student.id, classId: classRow.id },
    });

    for (const project of ["real-chromium", "real-mobile-chromium", "real-tablet-chromium"]) {
      for (const [username, role, passwordHash] of [
        [`spd-admin-${project}`, "admin", admin.passwordHash],
        [`spd-receptionist-${project}`, "receptionist", receptionist.passwordHash],
      ] as const) {
        await tx.user.upsert({ where: { tenantId_username: { tenantId, username } },
          update: { passwordHash, role, status: "active", isPlatformOwner: false },
          create: { tenantId, username, fullName: username, passwordHash, role, status: "active", isPlatformOwner: false } });
      }
      const projectStudentId = `${ids.student}-${project}`;
      await tx.student.upsert({
        where: { id: projectStudentId, tenantId }, update: { status: "active", deletedAt: null },
        create: { id: projectStudentId, tenantId, fullName: `Hoc vien E2E ${project}`, dateOfBirth: student.dateOfBirth,
          gender: student.gender, parentId: parent.id, enrollmentDate: enrollmentStart },
      });
      await tx.studentClass.upsert({
        where: { tenantId_studentId_classId: { tenantId, studentId: projectStudentId, classId: classRow.id } },
        update: { status: "active" },
        create: { tenantId, studentId: projectStudentId, classId: classRow.id, enrollmentDate: enrollmentStart, status: "active" },
      });
      await tx.enrollmentPeriod.deleteMany({ where: { tenantId, studentId: projectStudentId, classId: classRow.id } });
      await tx.enrollmentPeriod.create({ data: { tenantId, studentId: projectStudentId, classId: classRow.id, startedAt: enrollmentStart, source: "student-progress-e2e" } });
      await tx.studentProgressMonth.deleteMany({ where: { tenantId, studentId: projectStudentId, classId: classRow.id } });
    }

    const daily80Student = await tx.student.upsert({
      where: { id: "e2e-spd-daily80", tenantId },
      update: { status: "active", deletedAt: null },
      create: { id: "e2e-spd-daily80", tenantId, fullName: "TPR student daily80", dateOfBirth: new Date("2014-08-03T00:00:00Z"), gender: "female", parentId: parent.id, enrollmentDate: enrollmentStart },
    });
    await tx.studentClass.upsert({
      where: { tenantId_studentId_classId: { tenantId, studentId: daily80Student.id, classId: classRow.id } },
      update: { status: "active" },
      create: { tenantId, studentId: daily80Student.id, classId: classRow.id, enrollmentDate: enrollmentStart, status: "active" },
    });
    await tx.studentProgressMonth.deleteMany({ where: { tenantId, studentId: daily80Student.id, classId: classRow.id } });
    await tx.studentProgressMonth.create({ data: {
      tenantId, studentId: daily80Student.id, classId: classRow.id, month: "2026-09", trackKey: "flyers",
      createdById: admin.id, progressScore: 80, dailyAverageScore: 80, dailyLatestScore: 80, dailyAssessmentCount: 1,
      dailyEntries: { create: { tenantId, entryDate: new Date("2026-09-01T00:00:00Z"),
        entryType: "skill_assessment", skillKey: "listening", score: 80, examSetLevel: "flyers",
        difficultyLevel: "medium", gradedByTeacherId: teacher.id, createdById: admin.id } },
    } });

    return {
      admin_id: admin.id,
      receptionist_id: receptionist.id,
      student_id: student.id,
      class_id: classRow.id,
      teacher_id: teacher.id,
    };
  });
  console.info(JSON.stringify(result));
} finally {
  await prisma.$disconnect();
}
