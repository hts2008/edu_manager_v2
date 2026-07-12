import prisma from "../lib/prisma.js";
import type { ClassSessionBackfillCandidate } from "../lib/tuition-v3-types.js";

const apply = process.argv.includes("--apply");
const allowLowConfidence = process.argv.includes("--allow-low-confidence");

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

async function main() {
  const [classes, attendance, existingSessions] = await Promise.all([
    prisma.class.findMany({
      select: { id: true, scheduleDays: true, sessionsPerWeek: true },
    }),
    prisma.attendance.findMany({
      select: {
        id: true,
        classId: true,
        attendanceDate: true,
        status: true,
        isMakeUp: true,
      },
      orderBy: [{ classId: "asc" }, { attendanceDate: "asc" }],
    }),
    prisma.classSession.findMany({ select: { classId: true, sessionDate: true } }),
  ]);
  const configuredClasses = new Set(
    classes
      .filter((row) => {
        const days = Array.isArray(row.scheduleDays) ? row.scheduleDays : [];
        return days.length > 0 || Number(row.sessionsPerWeek || 0) > 0;
      })
      .map((row) => row.id),
  );
  const grouped = new Map<string, typeof attendance>();
  for (const row of attendance) {
    const key = `${row.classId}:${dateKey(row.attendanceDate)}`;
    grouped.set(key, [...(grouped.get(key) || []), row]);
  }

  const candidates: ClassSessionBackfillCandidate[] = [...grouped.values()].map((rows) => {
    const statuses = new Set(rows.map((row) => row.status));
    const allHoliday = rows.every((row) => row.status === "holiday");
    const allMakeUp = rows.every((row) => row.isMakeUp);
    const confidenceReasons = [];
    if (!configuredClasses.has(rows[0].classId)) confidenceReasons.push("missing_schedule_config");
    if (statuses.has("holiday") && statuses.size > 1) confidenceReasons.push("mixed_holiday_statuses");
    return {
      classId: rows[0].classId,
      sessionDate: new Date(`${dateKey(rows[0].attendanceDate)}T00:00:00.000Z`),
      billingMonth: dateKey(rows[0].attendanceDate).slice(0, 7),
      kind: allMakeUp ? "makeup" : "regular",
      status: allHoliday ? "holiday" : "held",
      extraFeeMode: "included",
      confidence: confidenceReasons.length ? "low" : "high",
      confidenceReasons,
    };
  });
  const lowConfidence = candidates.filter((row) => row.confidence === "low");
  const existingKeys = new Set(existingSessions.map((row) => `${row.classId}:${dateKey(row.sessionDate)}`));
  const missingCandidates = candidates.filter(
    (row) => !existingKeys.has(`${row.classId}:${dateKey(row.sessionDate)}`),
  );

  if (apply) {
    if (lowConfidence.length > 0 && !allowLowConfidence) {
      throw new Error(
        `Refusing to apply ${lowConfidence.length} low-confidence candidates; review them or pass --allow-low-confidence explicitly`,
      );
    }
    await prisma.$transaction(async (tx) => {
      for (const candidate of candidates) {
        const nextDate = new Date(candidate.sessionDate);
        nextDate.setUTCDate(nextDate.getUTCDate() + 1);
        const session = await tx.classSession.upsert({
          where: {
            classId_sessionDate: {
              classId: candidate.classId,
              sessionDate: candidate.sessionDate,
            },
          },
          create: {
            classId: candidate.classId,
            sessionDate: candidate.sessionDate,
            billingMonth: candidate.billingMonth,
            kind: candidate.kind,
            status: candidate.status,
            extraFeeMode: candidate.extraFeeMode,
            source: "attendance_history_backfill",
          },
          update: {},
        });
        await tx.attendance.updateMany({
          where: {
            classId: candidate.classId,
            attendanceDate: { gte: candidate.sessionDate, lt: nextDate },
            classSessionId: null,
          },
          data: { classSessionId: session.id },
        });
      }
    }, { timeout: 60_000 });
  }

  process.stdout.write(`${JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    attendance_rows: attendance.length,
    sessions_total: candidates.length,
    sessions_to_backfill: missingCandidates.length,
    low_confidence_count: lowConfidence.length,
    lowConfidence: lowConfidence.map((row) => ({
      class_id: row.classId,
      session_date: dateKey(row.sessionDate),
      reasons: row.confidenceReasons,
    })),
  })}\n`);
}

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
