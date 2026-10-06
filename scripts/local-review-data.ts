import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { resolveTuitionProgressTestTarget } from "../lib/tuition-progress-test-target.js";
import { assertDatabaseTarget } from "../tests/helpers/tuition-progress-http.js";

const target = resolveTuitionProgressTestTarget({ ...process.env, TPR_RELEASE_MODE: "true" });
if (!target || process.env.LOCAL_REVIEW_CONFIRM !== "local-review-v1") throw new Error("Guarded local target and confirmation required");
const fixture = JSON.parse(readFileSync("docs/artifacts/tuition-progress-execution-2026-10-05/browser-fixture.json", "utf8"));
if (fixture.purpose !== "browser" || !/^c[a-f0-9]{32}browser$/.test(fixture.run)
  || fixture.tenants[0] !== `${fixture.run}a` || fixture.users[0] !== `${fixture.run}admin`) throw new Error("Fixture ownership mismatch");
const db = new PrismaClient({ datasources: { db: { url: target.url } } });
const ns = "local-review-v1";
const id = (kind: string, value: string | number) => `${fixture.run}-${ns}-${kind}-${value}`;
const months = ["2026-07", "2026-08", "2026-09", "2026-10"];
const profiles = [
  { name: "Nguyen Minh An", scenario: "Tien bo tot", scores: [55, 65, 75, 85] },
  { name: "Tran Gia Binh", scenario: "On dinh", scores: [76, 77, 78, 79] },
  { name: "Le Khanh Chi", scenario: "Can ho tro", scores: [85, 76, 60, 48] },
  { name: "Pham Tue Nhi", scenario: "But pha", scores: [40, 58, 75, 90] },
  { name: "Do Anh Khoa", scenario: "Chua co danh gia", scores: [null, null, null, null] },
  { name: "Hoang Bao Nam", scenario: "Diem 0 hop le", scores: [0, 0, 0, 0] },
];
try {
  await assertDatabaseTarget(db, target);
  await db.$transaction(async tx => {
    const admin = await tx.user.findUnique({ where: { id: fixture.users[0] }, include: { tenant: true } });
    if (!admin || admin.tenantId !== fixture.tenants[0] || admin.role !== "admin"
      || admin.tenant.name !== "TPR browser fixture") throw new Error("Stored ownership mismatch");
    const tenantId = admin.tenantId;
    const existing = await tx.student.count({ where: { tenantId, id: { startsWith: id("student", "") } } });
    if (existing) {
      if (existing !== profiles.length) throw new Error("Partial dataset; refusing overwrite");
      return;
    }
    const teacher = await tx.teacher.create({ data: { id: id("teacher", 1), tenantId,
      fullName: "[DEMO] Giao vien Cambridge", phone: "0899100001", salaryType: "hourly", salaryAmount: 150000 } });
    for (let c = 0; c < 3; c++) {
      const classId = id("class", c);
      await tx.class.create({ data: { id: classId, tenantId, teacherId: teacher.id,
        className: `[DEMO] ${["Movers", "Flyers", "KET"][c]} - Review`, scheduleDays: [1, 3],
        sessionsPerWeek: 2, startTime: "18:00", endTime: "19:30", feePerDay: 90000 + c * 10000,
        billingPolicy: "per_session", notes: `[${ns}] Synthetic local review only` } });
      for (const month of months) {
        await tx.classMonthPlan.create({ data: { tenantId, classId, billingMonth: month,
          state: "frozen", createdById: admin.id, frozenById: admin.id, frozenAt: new Date() } });
        await tx.attendancePeriod.create({ data: { tenantId, classId, periodMonth: month,
          status: "locked", lockedById: admin.id, lockedAt: new Date(), totalSessions: 9 } });
        for (const day of [1, 3, 8, 10, 15, 17, 22, 24, 26]) {
          await tx.classSession.create({ data: { id: id("session", `${c}-${month}-${day}`), tenantId,
            classId, sessionDate: new Date(`${month}-${String(day).padStart(2, "0")}T00:00:00Z`),
            billingMonth: month, kind: day === 26 ? "extra" : "regular", status: "held",
            extraFeeMode: day === 26 ? "surcharge" : "included", createdById: admin.id, source: ns } });
        }
      }
    }
    for (const [i, profile] of profiles.entries()) {
      const classId = id("class", Math.floor(i / 2));
      const studentId = id("student", i);
      const parent = await tx.parent.create({ data: { id: id("parent", i), tenantId,
        fullName: `[DEMO] Phu huynh ${profile.name}`, phone: `089910010${i}`, relationship: "guardian" } });
      await tx.student.create({ data: { id: studentId, tenantId, parentId: parent.id,
        fullName: `[DEMO] ${profile.name}`, gender: i % 2 ? "female" : "male",
        dateOfBirth: new Date("2015-03-15T00:00:00Z"), enrollmentDate: new Date("2026-07-01T00:00:00Z"),
        notes: `[${ns}] ${profile.scenario}` } });
      await tx.studentClass.create({ data: { tenantId, studentId, classId, enrollmentDate: new Date("2026-07-01T00:00:00Z") } });
      await tx.enrollmentPeriod.create({ data: { tenantId, studentId, classId, startedAt: new Date("2026-07-01T00:00:00Z"), source: ns } });
      for (const [m, month] of months.entries()) {
        const score = profile.scores[m];
        const progress = await tx.studentProgressMonth.create({ data: { id: id("progress", `${i}-${month}`),
          tenantId, studentId, classId, month, trackKey: ["movers", "flyers", "ket"][Math.floor(i / 2)],
          classType: "communicative", progressScore: score ?? 0, createdById: admin.id,
          teacherNote: `[DEMO] ${profile.scenario}`, parentSummary: `[DEMO] ${profile.scenario} - ${month}`,
          rubricSnapshot: { scoreEvidence: { source: score === null ? "missing" : "daily_raw", formulaVersion: "TP-1", value: score } } } });
        if (score !== null) for (const day of [3, 10, 17, 24]) for (const skill of ["listening", "speaking", "reading", "writing"]) {
          await tx.studentProgressDailyEntry.create({ data: { tenantId, progressMonthId: progress.id,
            entryDate: new Date(`${month}-${String(day).padStart(2, "0")}T00:00:00Z`), entryType: "skill_assessment",
            skillKey: skill, score, examSetLevel: ["movers", "flyers", "ket"][Math.floor(i / 2)],
            difficultyLevel: "medium", gradedByTeacherId: teacher.id, createdById: admin.id, note: `[${ns}] Synthetic assessment` } });
        }
        for (const day of [1, 3, 8, 10, 15, 17, 22, 24, 26]) await tx.attendance.create({ data: {
          tenantId, studentId, classId, classSessionId: id("session", `${Math.floor(i / 2)}-${month}-${day}`),
          attendanceDate: new Date(`${month}-${String(day).padStart(2, "0")}T00:00:00Z`),
          status: i === 2 && day >= 22 ? "absent_no_fee" : "present", createdById: admin.id, reason: `[${ns}]` } });
      }
    }
    await tx.activityLog.create({ data: { tenantId, userId: admin.id, action: "LOCAL_REVIEW_DATA_CREATED",
      entityType: "demo_dataset", entityId: ns } });
  }, { timeout: 60000 });
  console.log(JSON.stringify({ namespace: ns, tenantId: fixture.tenants[0], months,
    students: await db.student.count({ where: { id: { startsWith: id("student", "") } } }),
    classes: await db.class.count({ where: { id: { startsWith: id("class", "") } } }),
    progressMonths: await db.studentProgressMonth.count({ where: { id: { startsWith: id("progress", "") } } }),
    studentIds: profiles.map((_, i) => id("student", i)) }, null, 2));
} finally { await db.$disconnect(); }
