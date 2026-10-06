import { mkdir, writeFile } from "node:fs/promises";
import { resolveTuitionProgressTestTarget, bindTuitionProgressTestTarget } from "../lib/tuition-progress-test-target.js";
import { assertDatabaseTarget, fixtureIds, seedBusinessFixtures } from "../tests/helpers/tuition-progress-http.js";

const target = resolveTuitionProgressTestTarget({ ...process.env, TPR_RELEASE_MODE: "true" });
if (!target) throw new Error("Isolated target required");
bindTuitionProgressTestTarget(process.env, target);
const password = process.env.TPR_BROWSER_PASSWORD;
if (!password || password.length < 12) throw new Error("Synthetic TPR_BROWSER_PASSWORD required");
const { PrismaClient } = await import("@prisma/client");
const db = new PrismaClient({ datasources: { db: { url: target.url } } });
try {
  await assertDatabaseTarget(db, target);
  const ids = fixtureIds("browser");
  await seedBusinessFixtures(db, ids, password);
  const month = await db.studentProgressMonth.create({ data: {
    tenantId: ids.tenants[0], studentId: ids.students[0], classId: ids.classId,
    month: "2026-06", trackKey: "movers", classType: "communicative",
    progressScore: 80, dailyAverageScore: 80, dailyLatestScore: 80, dailyAssessmentCount: 1,
    createdById: ids.users[0],
    rubricSnapshot: { scoreEvidence: { source: "daily_raw", formulaVersion: "TP-1", value: 80 } },
  } });
  await db.studentProgressDailyEntry.create({ data: {
    tenantId: ids.tenants[0], progressMonthId: month.id,
    entryDate: new Date("2026-06-01T00:00:00Z"), entryType: "skill_assessment",
    skillKey: "listening", score: 80, examSetLevel: "movers", difficultyLevel: "medium",
    gradedByTeacherId: ids.teacher,
    createdById: ids.users[0],
  } });
  const directory = "docs/artifacts/tuition-progress-execution-2026-10-05";
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/browser-fixture.json`, JSON.stringify({ ...ids, month: "2026-06" }, null, 2));
  console.log("Isolated browser fixture seeded; identity artifact contains no password");
} finally { await db.$disconnect(); }
