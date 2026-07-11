import prisma from "../lib/prisma.js";

const apply = process.argv.includes("--apply");

async function main() {
  const activeLinks = await prisma.studentClass.findMany({
    where: { status: "active" },
    select: {
      studentId: true,
      classId: true,
      enrollmentDate: true,
    },
  });
  const existing = await prisma.enrollmentPeriod.findMany({
    where: { endedAt: null },
    select: { studentId: true, classId: true },
  });
  const existingKeys = new Set(
    existing.map((row) => `${row.studentId}:${row.classId}`),
  );
  const rows = activeLinks
    .filter((row) => !existingKeys.has(`${row.studentId}:${row.classId}`))
    .map((row) => ({
      studentId: row.studentId,
      classId: row.classId,
      startedAt: row.enrollmentDate,
      source: "active_projection_backfill",
    }));

  if (apply && rows.length > 0) {
    await prisma.enrollmentPeriod.createMany({ data: rows });
  }

  process.stdout.write(
    `${JSON.stringify({
      mode: apply ? "apply" : "dry-run",
      active_links: activeLinks.length,
      existing_open_periods: existing.length,
      periods_to_create: rows.length,
    })}\n`,
  );
}

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
