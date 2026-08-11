import { Prisma, PrismaClient } from "@prisma/client";
import {
  PROGRESS_SKILL_LABELS,
  summarizeDailyAssessmentRollup,
  type ProgressSkillKey,
} from "../lib/student-progress-assessment.js";
import {
  assertStudentProgressDemoDatabase,
  studentProgressDemoEndpointId,
} from "../lib/student-progress-demo-safety.js";

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

const examSetLabels: Record<string, string> = {
  starters: "Pre A1 Starters",
  movers: "A1 Movers",
  flyers: "A2 Flyers",
  ket: "A2 Key / KET",
  pet: "B1 Preliminary / PET",
};

const profiles = [
  {
    id: "01",
    name: "[DEMO] Nguyễn Minh An",
    parent: "[DEMO] Phụ huynh Minh An",
    gender: "male" as const,
    scenario: "Tiến bộ tốt",
    trackKey: "starters",
    trackLabel: "Pre A1 Starters",
    classType: "foundation",
    examSetHistory: ["starters", "starters", "starters"],
    attendanceScores: [100, 100, 100],
    targets: [61, 73, 84],
    readiness: ["watch", "on_track", "on_track"],
    focus: ["speaking", "writing", "writing"] as ProgressSkillKey[],
  },
  {
    id: "02",
    name: "[DEMO] Trần Gia Bình",
    parent: "[DEMO] Phụ huynh Gia Bình",
    gender: "male" as const,
    scenario: "Ổn định",
    trackKey: "movers",
    trackLabel: "A1 Movers",
    classType: "foundation",
    examSetHistory: ["starters", "movers", "movers"],
    attendanceScores: [100, 100, 100],
    targets: [75, 77, 78],
    readiness: ["on_track", "on_track", "on_track"],
    focus: ["writing", "writing", "speaking"] as ProgressSkillKey[],
  },
  {
    id: "03",
    name: "[DEMO] Lê Khánh Chi",
    parent: "[DEMO] Phụ huynh Khánh Chi",
    gender: "female" as const,
    scenario: "Cần hỗ trợ",
    trackKey: "flyers",
    trackLabel: "A2 Flyers",
    classType: "exam_prep",
    examSetHistory: ["flyers", "flyers", "ket"],
    attendanceScores: [100, 75, 50],
    targets: [71, 63, 56],
    readiness: ["watch", "needs_support", "needs_support"],
    focus: ["reading", "listening", "listening"] as ProgressSkillKey[],
  },
  {
    id: "04",
    name: "[DEMO] Phạm Tuệ Nhi",
    parent: "[DEMO] Phụ huynh Tuệ Nhi",
    gender: "female" as const,
    scenario: "Bứt phá luyện đề",
    trackKey: "ket",
    trackLabel: "A2 Key / KET",
    classType: "exam_prep",
    examSetHistory: ["movers", "ket", "ket"],
    attendanceScores: [75, 100, 100],
    targets: [58, 70, 82],
    readiness: ["needs_support", "watch", "on_track"],
    focus: ["reading", "writing", "speaking"] as ProgressSkillKey[],
  },
  {
    id: "05",
    name: "[DEMO] Đỗ Anh Khoa",
    parent: "[DEMO] Phụ huynh Anh Khoa",
    gender: "male" as const,
    scenario: "Năng lực cao nhưng thiếu đều đặn",
    trackKey: "pet",
    trackLabel: "B1 Preliminary / PET",
    classType: "exam_prep",
    examSetHistory: ["ket", "pet", "pet"],
    attendanceScores: [100, 75, 100],
    targets: [82, 79, 86],
    readiness: ["on_track", "watch", "on_track"],
    focus: ["daily_practice", "homework", "writing"] as ProgressSkillKey[],
  },
];

function classIdFor(profile: (typeof profiles)[number]) {
  return `${NAMESPACE}-class-${profile.trackKey}`;
}

function requiredConfirmation() {
  if (process.env.STUDENT_PROGRESS_DEMO_CONFIRM !== CONFIRMATION) {
    throw new Error(`STUDENT_PROGRESS_DEMO_CONFIRM must equal ${CONFIRMATION}`);
  }
}

function databaseEndpointId() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required");
  return studentProgressDemoEndpointId(value);
}

async function assertReviewDatabase() {
  requiredConfirmation();
  const expectedEndpoint = process.env.STUDENT_PROGRESS_DEMO_ENDPOINT_ID?.trim();
  const expectedDatabase = process.env.STUDENT_PROGRESS_DEMO_DATABASE_NAME?.trim();
  const target = process.env.STUDENT_PROGRESS_DEMO_TARGET;
  const endpointLooksValid = target === "local"
    ? Boolean(expectedEndpoint)
    : expectedEndpoint?.startsWith("ep-");
  if (!endpointLooksValid || !expectedDatabase) {
    throw new Error(
      "STUDENT_PROGRESS_DEMO_ENDPOINT_ID and STUDENT_PROGRESS_DEMO_DATABASE_NAME are required",
    );
  }
  const actualEndpoint = databaseEndpointId();
  const [{ current_database: currentDatabase }] = await prisma.$queryRaw<
    Array<{ current_database: string }>
  >`SELECT current_database()`;
  assertStudentProgressDemoDatabase({
    target,
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
  return [-3, -2, -1].map((offset) =>
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

function dailyRows(
  profile: (typeof profiles)[number],
  profileIndex: number,
  monthIndex: number,
  month: string,
  target: number,
) {
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
  const examSetLevel = profile.examSetHistory[monthIndex];
  const examSetLabel = examSetLabels[examSetLevel] ?? examSetLevel;

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
      exam_set_level: examSetLevel,
      difficulty_level: difficulty[dayIndex],
      entry_label: `[DEMO] ${examSetLabel} - Bộ đề ${dayIndex + 1}`,
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
  const classIds = profiles.map(classIdFor);
  await tx.attendance.deleteMany({ where: { studentId: { in: studentIds } } });
  await tx.classSession.deleteMany({ where: { classId: { in: classIds } } });
  await tx.studentProgressMonth.deleteMany({ where: { studentId: { in: studentIds } } });
  await tx.enrollmentPeriod.deleteMany({ where: { studentId: { in: studentIds } } });
  await tx.studentClass.deleteMany({ where: { studentId: { in: studentIds } } });
  await tx.student.deleteMany({ where: { id: { in: studentIds } } });
  await tx.class.deleteMany({ where: { id: { in: classIds } } });
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
      const classRows = new Map<string, { id: string }>();
      for (const profile of profiles) {
        const classRow = await tx.class.create({
          data: {
            id: classIdFor(profile),
            className: `[DEMO] ${profile.trackLabel} - ${profile.scenario}`,
            scheduleDays: [2, 4],
            sessionsPerWeek: 2,
            billingPolicy: "monthly_prorated",
            startTime: "18:00",
            endTime: "19:30",
            feePerDay: 0,
            maxStudents: 10,
            teacherId: teacher.id,
            status: "active",
            notes: `[${NAMESPACE}] Dữ liệu review tiến bộ học viên, không tham gia tài chính.`,
          },
        });
        classRows.set(profile.trackKey, classRow);
      }

      for (const [profileIndex, profile] of profiles.entries()) {
        const classRow = classRows.get(profile.trackKey)!;
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
          const rows = dailyRows(profile, profileIndex, monthIndex, month, profile.targets[monthIndex]);
          const rollup = summarizeDailyAssessmentRollup(rows);
          const focusSkillKey = profile.focus[monthIndex];
          const progressMonth = await tx.studentProgressMonth.create({
            data: {
              id: `${NAMESPACE}-progress-${profile.id}-${month}`,
              studentId,
              classId: classRow.id,
              month,
              trackKey: profile.trackKey,
              classType: profile.classType,
              progressScore: profile.targets[monthIndex],
              attendanceScore: profile.attendanceScores[monthIndex],
              consistencyScore: profileIndex === 2 ? 68 : profileIndex === 4 ? 72 : 88,
              learningEvidenceCoverage: 100,
              trackReadiness: profile.readiness[monthIndex],
              focusSkillKey,
              focusSkillLabel: PROGRESS_SKILL_LABELS[focusSkillKey],
              teacherNote: `[DEMO] ${profile.scenario} trong tháng ${month}; dùng để review giao diện và biểu đồ.`,
              parentSummary: `${profile.name} đang theo ${profile.trackLabel}, đạt ${profile.targets[monthIndex]}/100 trong tháng ${month}. Đây là dữ liệu minh họa.`,
              nextActions: [
                `Tập trung ${PROGRESS_SKILL_LABELS[focusSkillKey]} trong tháng tiếp theo.`,
                `Duy trì luyện tập ${profile.trackLabel} theo mức độ tăng dần.`,
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

      for (const profile of profiles) {
        const classRow = classRows.get(profile.trackKey)!;
        for (const [monthIndex, month] of months.entries()) {
          for (const [dayIndex, day] of [3, 10, 17, 24].entries()) {
            const session = await tx.classSession.create({
              data: {
                id: `${NAMESPACE}-session-${profile.id}-${month}-${day}`,
                classId: classRow.id,
                sessionDate: dateFor(month, day),
                billingMonth: month,
                status: "held",
                source: NAMESPACE,
                notes: `[${NAMESPACE}] Điểm danh minh họa.`,
                createdById: admin.id,
              },
            });
            await tx.attendance.create({
              data: {
                id: `${NAMESPACE}-attendance-${profile.id}-${month}-${day}`,
                studentId: `${NAMESPACE}-student-${profile.id}`,
                classId: classRow.id,
                classSessionId: session.id,
                attendanceDate: dateFor(month, day),
                status:
                  dayIndex < Math.round(profile.attendanceScores[monthIndex] / 25)
                    ? "present"
                    : "absent_no_fee",
                reason: `[${NAMESPACE}]`,
                createdById: admin.id,
              },
            });
          }
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
  const classIds = profiles.map(classIdFor);
  const [parents, students, classes, enrollments, progressMonths, skillsCount, entries, sessions, attendance] =
    await Promise.all([
      prisma.parent.count({ where: { id: { startsWith: `${NAMESPACE}-parent-` } } }),
      prisma.student.count({ where: { id: { in: studentIds } } }),
      prisma.class.count({ where: { id: { in: classIds } } }),
      prisma.enrollmentPeriod.count({ where: { studentId: { in: studentIds } } }),
      prisma.studentProgressMonth.count({ where: { studentId: { in: studentIds } } }),
      prisma.studentProgressSkill.count({ where: { progressMonth: { studentId: { in: studentIds } } } }),
      prisma.studentProgressDailyEntry.count({ where: { progressMonth: { studentId: { in: studentIds } } } }),
      prisma.classSession.count({ where: { classId: { in: classIds } } }),
      prisma.attendance.count({ where: { studentId: { in: studentIds } } }),
    ]);
  const result = { parents, students, classes, enrollments, progressMonths, skills: skillsCount, entries, sessions, attendance };
  const expected = expectPresent
    ? { parents: 5, students: 5, classes: 5, enrollments: 5, progressMonths: 15, skills: 105, entries: 420, sessions: 60, attendance: 60 }
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
