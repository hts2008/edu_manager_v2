import { mkdir, writeFile } from "node:fs/promises";
import { bindTuitionProgressTestTarget, resolveTuitionProgressTestTarget } from "../lib/tuition-progress-test-target.js";
import { assertDatabaseTarget, fixtureIds, seedBusinessFixtures } from "../tests/helpers/tuition-progress-http.js";

const target = resolveTuitionProgressTestTarget({ ...process.env, TPR_RELEASE_MODE: "true" });
if (!target) throw new Error("Isolated local target required");
bindTuitionProgressTestTarget(process.env, target);
const password = process.env.TPR_BROWSER_PASSWORD;
if (!password || password.length < 12) throw new Error("Synthetic fixture password required");
const { PrismaClient } = await import("@prisma/client");
const db = new PrismaClient({ datasources: { db: { url: target.url } } });
try {
  await assertDatabaseTarget(db, target);
  const ids = fixtureIds("browser");
  await seedBusinessFixtures(db, ids, password);
  const directory = "docs/artifacts/inline-report-assessments-2026-10-06";
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/browser-fixture.json`, JSON.stringify(ids, null, 2));
} finally {
  await db.$disconnect();
}
