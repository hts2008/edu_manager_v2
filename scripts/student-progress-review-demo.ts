import { Prisma, PrismaClient } from "@prisma/client";
import {
  PROGRESS_SKILL_LABELS,
  summarizeDailyAssessmentRollup,
  type ProgressSkillKey,
} from "../lib/student-progress-assessment.js";
import { assertStudentProgressDemoDatabase } from "../lib/student-progress-demo-safety.js";

const NAMESPACE = "demo-sp-review-v1";
const CONFIRMATION = NAMESPACE;
const prisma = new PrismaClient();
const command = process.argv[2] || "verify";

const skills: ProgressSkillKey[] = [
  "listening",
  "speaking",
  "reading",
  "writing",
  "homework",
  "daily_practice",
  "mock_test",
];

const profiles = [
  {
    id: "01",
    name: "[DEMO] Nguyễn Minh An",
    parent: "[DEMO] Phụ huynh Minh An",
    gender: "male" as const,
    targets: [61, 73, 84],
    readiness: ["watch", "on_track", "on_track"],
    focus: ["speaking", "writing", "writing"] as ProgressSkillKey[],
  },
  {
    id: "02",
    name: "[DEMO] Trần Gia Bình",
    parent: "[DEMO] Phụ huynh Gia Bình",
    gender: "male" as const,
    targets: [75, 77, 78],
    readiness: ["on_track", "on_track", "on_track"],
    focus: ["writing", "writing", "speaking"] as ProgressSkillKey[],
  },
  {
    id: "03",
    name: "[DEMO] Lê Khánh Chi",
    parent: "[DEMO] Phụ huynh Khánh Chi",
    gender: "female" as const,
    targets: [71, 63, 56],
    readiness: ["watch", "needs_support", "needs_support"],
    focus: ["reading", "listening", "listening"] as ProgressSkillKey[],
  },
];

function requiredConfirmation() {
  if (process.env.STUDENT_PROGRESS_DEMO_CONFIRM !== CONFIRMATION) {
    throw new Error(`STUDENT_PROGRESS_DEMO_CONFIRM must equal ${CONFIRMATION}`);
  }
}

function databaseEndpointId() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required");
  const firstLabel = new URL(value).hostname.split(".")[0] || "";
  return firstLabel.replace(/-pooler$/, "");
}

async function assertReviewDatabase() {
  requiredConfirmation();
  const expectedEndpoint = process.env.STUDENT_PROGRESS_DEMO_ENDPOINT_ID?.trim();
  const expectedDatabase = process.env.STUDENT_PROGRESS_DEMO_DATABASE_NAME?.trim();
  if (!expectedEndpoint?.startsWith("ep-") || !expectedDatabase) {
    throw new Error(
      "STUDENT_PROGRESS_DEMO_ENDPOINT_ID and STUDENT_PROGRESS_DEMO_DATABASE_NAME are required",
    );
  }
  const actualEndpoint = databaseEndpointId();
  const [{ current_database: currentDatabase }] = await prisma.$queryRaw<
    Array<{ current_database: string }>
  >`SELECT current_database()`;
  assertStudentProgressDemoDatabase({
    target: process.env.STUDENT_PROGRESS_DEMO_TARGET,
    vercelEnvironment: process.env.VERCEL_ENV,
    expectedEndpoint,
    expectedDatabase,
    actualEndpoint,
    actualDatabase: currentDatabase,
  });
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function reviewMonths() {
  const now = new Date();
  return [-2, -1, 0].map((offset) =>
    monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1))),
  );
}

function dateFor(month: string, day: number) {
  return new Date(`${month}-${String(day).padStart(2, "0")}T00:00:00.000Z`);
}

function nextMonthStart(month: string) {
  const [year, value] = month.split("-").map(Number);
  return new Date(Date.UTC(year, value, 1));
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function dailyRows(profileIndex: number, month: string, target: number) {
  const dates = [3, 10, 17, 24];
  const dayOffsets = [-6, -3, 0, 2];
  const skillOffsets: Record<ProgressSkillKey, number> = {
    listening: profileIndex === 2 ? -7 : 1,
    speaking: profileIndex === 0 ? -4 : 2,
    reading: profileIndex === 2 ? -2 : 1,
    writing: profileIndex === 0 ? -2 : 0,
    homework: 5,
    daily_practice: 3,
    mock_test: -1,
  };
  const difficulty = ["easy", "medium", "medium", "hard"];

  return dates.flatMap((day, dayIndex) =>
    skills.map((skillKey) => ({
      entry_date: dateFor(month, day),
      entry_type:
        skillKey === "homework"
          ? ("homework" as const)
          : skillKey === "daily_practice"
            ? ("daily_practice" as const)
            : skillKey === "mock_test"
              ? ("mock_test" as const)
              : ("skill_assessment" as const),
      skill_key: skillKey,
      score: clamp(target + dayOffsets[dayIndex] + skillOffsets[skillKey]),
      exam_set_level: "flyers",
      difficulty_level: difficulty[dayIndex],
      entry_label: `[DEMO] Flyers Practice Set ${dayIndex + 1}`,
      note: `[${NAMESPACE}] Dữ liệu phục vụ review, không phải kết quả thật.`,
    })),
  );
}

function monthlySkills(rows: ReturnType<typeof dailyRows>) {
  return skills.map((skillKey, index) => {
    const latest = [...rows].reverse().find((row) => row.skill_key === skillKey);
    return {
      skillKey,
      skillLabel: PROGRESS_SKILL_LABELS[skillKey],
      score: latest?.score ?? null,
      maxScore: 100,
      weight: 0,
      status: latest ? "available" : "missing_input",
      note: latest
        ? `Đánh giá demo cuối tháng: ${latest.score}/100.`
        : "Chưa có dữ liệu demo.",
      source: NAMESPACE,
      sortOrder: index,
    };
  });
}

async function cleanup(tx: Prisma.TransactionClient) {
  const studentIds = profiles.map((profile) => `${NAMESPACE}-student-${profile.id}`);
  const parentIds = profiles.map((profile) => `${NAMESPACE}-parent-${profile.id}`);
  await tx.attendance.deleteMany({ where: { studentId: { in: studentIds } } });
  await tx.classSession.deleteMany({ where: { classId: `${NAMESPACE}-class-flyers` } });
  await tx.studentProgressMonth.deleteMany({ where: { studentId: { in: studentIds } } });
  await tx.enrollmentPeriod.deleteMany({ where: { studentId: { in: studentIds } } });
  await tx.studentClass.deleteMany({ where: { studentId: { in: studentIds } } });
  await tx.student.deleteMany({ where: { id: { in: studentIds } } });
  await tx.class.deleteMany({ where: { id: `${NAMESPACE}-class-flyers` } });
  await tx.teacher.deleteMany({ where: { id: `${NAMESPACE}-teacher-01` } });
  await tx.parent.deleteMany({ where: { id: { in: parentIds } } });
}

async function applyDemo() {
  await assertReviewDatabase();
  const months = reviewMonths();
  const result = await prisma.$transaction(
    async (tx) => {
      await cleanup(tx);
      const admin = await tx.user.findFirst({
        where: { role: "admin", status: "active" },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (!admin) throw new Error("Demo fixture requires an active admin user");

      const teacher = await tx.teacher.create({
        data: {
          id: `${NAMESPACE}-teacher-01`,
          fullName: "[DEMO] Giáo viên Cambridge",
          phone: "0899008101",
          salaryType: "hourly",
          salaryAmount: 0,
          status: "active",
          notes: `[${NAMESPACE}]`,
        },
      });
      const classRow = await tx.class.create({
        data: {
          id: `${NAMESPACE}-class-flyers`,
          className: "[DEMO] A2 Flyers - Progress Review",
          scheduleDays: [2, 4],
          sessionsPerWeek: 2,
          billingPolicy: "monthly_prorated",
          startTime: "18:00",
          endTime: "19:30",
          feePerDay: 0,
          maxStudents: 10,
          teacherId: teacher.id,
          status: "active",
          notes: `[${NAMESPACE}] Dữ liệu review tiến bộ học viên.`,
        },
      });

      for (const [profileIndex, profile] of profiles.entries()) {
        const parentId = `${NAMESPACE}-parent-${profile.id}`;
        const studentId = `${NAMESPACE}-student-${profile.id}`;
        await tx.parent.create({
          data: {
            id: parentId,
            fullName: profile.parent,
            phone: `08990082${profile.id}`,
            relationship: "guardian",
            notes: `[${NAMESPACE}]`,
          },
        });
        await tx.student.create({
          data: {
            id: studentId,
            fullName: profile.name,
            dateOfBirth: new Date(`2014-0${profileIndex + 3}-15T00:00:00.000Z`),
            gender: profile.gender,
            parentId,
            enrollmentDate: dateFor(months[0], 1),
            status: "active",
            notes: `[${NAMESPACE}]`,
          },
        });
        await tx.studentClass.create({
          data: {
            studentId,
            classId: classRow.id,
            enrollmentDate: dateFor(months[0], 1),
            status: "active",
          },
        });
        await tx.enrollmentPeriod.create({
          data: {
            studentId,
            classId: classRow.id,
            startedAt: dateFor(months[0], 1),
            endedAt: nextMonthStart(months.at(-1)!),
            source: NAMESPACE,
          },
        });

        for (const [monthIndex, month] of months.entries()) {
          const rows = dailyRows(profileIndex, month, profile.targets[monthIndex]);
          const rollup = summarizeDailyAssessmentRollup(rows);
          const focusSkillKey = profile.focus[monthIndex];
          const progressMonth = await tx.studentProgressMonth.create({
            data: {
              id: `${NAMESPACE}-progress-${profile.id}-${month}`,
              studentId,
              classId: classRow.id,
              month,
              trackKey: "flyers",
              classType: "exam_prep",
              progressScore: profile.targets[monthIndex],
              attendanceScore: 100,
              consistencyScore: profileIndex === 2 ? 68 : 88,
              learningEvidenceCoverage: 100,
              trackReadiness: profile.readiness[monthIndex],
              focusSkillKey,
              focusSkillLabel: PROGRESS_SKILL_LABELS[focusSkillKey],
              teacherNote: `[DEMO] Nhận xét tháng ${month}; dùng để review giao diện và biểu đồ.`,
              parentSummary: `${profile.name} có điểm tiến bộ ${profile.targets[monthIndex]}/100 trong tháng ${month}. Đây là dữ liệu minh họa.`,
              nextActions: [
                `Tập trung ${PROGRESS_SKILL_LABELS[focusSkillKey]} trong tháng tiếp theo.`,
                "Duy trì luyện đề Flyers theo mức độ tăng dần.",
              ],
              evidenceNotes: [`[${NAMESPACE}] Không phải kết quả học tập thật.`],
              academicInputStatus: "complete",
              shieldTotal: 4 + monthIndex,
              pointsTotal: Math.round(rows.reduce((sum, row) => sum + row.score, 0)),
              mockTestScore: rows.filter((row) => row.skill_key === "mock_test").at(-1)?.score,
              dailyAverageScore: rollup.averageScore,
              dailyLatestScore: rollup.latestScore,
              dailyScoreDelta: rollup.scoreDelta,
              dailyAssessmentCount: rollup.assessmentCount,
              createdById: admin.id,
              updatedById: admin.id,
            },
          });
          await tx.studentProgressSkill.createMany({
            data: monthlySkills(rows).map((skill) => ({
              progressMonthId: progressMonth.id,
              ...skill,
            })),
          });
          await tx.studentProgressDailyEntry.createMany({
            data: rows.map((row, rowIndex) => ({
              id: `${NAMESPACE}-entry-${profile.id}-${month}-${String(rowIndex + 1).padStart(2, "0")}`,
              progressMonthId: progressMonth.id,
              entryDate: row.entry_date,
              entryType: row.entry_type,
              skillKey: row.skill_key,
              score: row.score,
              examSetLevel: row.exam_set_level,
              difficultyLevel: row.difficulty_level,
              entryLabel: row.entry_label,
              gradedByTeacherId: teacher.id,
              note: row.note,
              createdById: admin.id,
            })),
          });
        }
      }

      for (const month of months) {
        for (const day of [3, 10, 17, 24]) {
          const session = await tx.classSession.create({
            data: {
              id: `${NAMESPACE}-session-${month}-${day}`,
              classId: classRow.id,
              sessionDate: dateFor(month, day),
              billingMonth: month,
              status: "held",
              source: NAMESPACE,
              notes: `[${NAMESPACE}] Điểm danh minh họa.`,
              createdById: admin.id,
            },
          });
          await tx.attendance.createMany({
            data: profiles.map((profile) => ({
              id: `${NAMESPACE}-attendance-${profile.id}-${month}-${day}`,
              studentId: `${NAMESPACE}-student-${profile.id}`,
              classId: classRow.id,
              classSessionId: session.id,
              attendanceDate: dateFor(month, day),
              status: "present",
              reason: `[${NAMESPACE}]`,
              createdById: admin.id,
            })),
          });
        }
      }
      return { months, namespace: NAMESPACE };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  return { ...result, counts: await verifyDemo(true) };
}

async function verifyDemo(expectPresent = true) {
  const studentIds = profiles.map((profile) => `${NAMESPACE}-student-${profile.id}`);
  const [parents, students, classes, enrollments, progressMonths, skillsCount, entries, sessions, attendance] =
    await Promise.all([
      prisma.parent.count({ where: { id: { startsWith: `${NAMESPACE}-parent-` } } }),
      prisma.student.count({ where: { id: { in: studentIds } } }),
      prisma.class.count({ where: { id: `${NAMESPACE}-class-flyers` } }),
      prisma.enrollmentPeriod.count({ where: { studentId: { in: studentIds } } }),
      prisma.studentProgressMonth.count({ where: { studentId: { in: studentIds } } }),
      prisma.studentProgressSkill.count({ where: { progressMonth: { studentId: { in: studentIds } } } }),
      prisma.studentProgressDailyEntry.count({ where: { progressMonth: { studentId: { in: studentIds } } } }),
      prisma.classSession.count({ where: { classId: `${NAMESPACE}-class-flyers` } }),
      prisma.attendance.count({ where: { studentId: { in: studentIds } } }),
    ]);
  const result = { parents, students, classes, enrollments, progressMonths, skills: skillsCount, entries, sessions, attendance };
  const expected = expectPresent
    ? { parents: 3, students: 3, classes: 1, enrollments: 3, progressMonths: 9, skills: 63, entries: 252, sessions: 12, attendance: 36 }
    : { parents: 0, students: 0, classes: 0, enrollments: 0, progressMonths: 0, skills: 0, entries: 0, sessions: 0, attendance: 0 };
  for (const [key, value] of Object.entries(expected)) {
    if (result[key as keyof typeof result] !== value) {
      throw new Error(`Demo verification failed for ${key}: expected ${value}, found ${result[key as keyof typeof result]}`);
    }
  }
  return result;
}

try {
  if (!new Set(["apply", "verify", "cleanup"]).has(command)) {
    throw new Error("Usage: tsx scripts/student-progress-review-demo.ts apply|verify|cleanup");
  }
  if (command === "apply") console.info(JSON.stringify(await applyDemo(), null, 2));
  if (command === "verify") {
    await assertReviewDatabase();
    console.info(JSON.stringify(await verifyDemo(true), null, 2));
  }
  if (command === "cleanup") {
    await assertReviewDatabase();
    await prisma.$transaction((tx) => cleanup(tx), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    console.info(JSON.stringify(await verifyDemo(false), null, 2));
  }
} finally {
  await prisma.$disconnect();
}
