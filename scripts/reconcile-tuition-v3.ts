import { randomUUID } from "node:crypto";
import prisma from "../lib/prisma.js";
import { refreshMonthlyFeeAggregateFromLines } from "../lib/monthly-fee-lines.js";
import { buildStudentTuitionV3 } from "../lib/tuition-v3-service.js";

function argument(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) || null;
}

const apply = process.argv.includes("--apply");
const month = argument("month");
const classId = argument("class-id");
const reason = argument("reason");

if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("--month=YYYY-MM is required");
if (apply && (!reason || reason.trim().length < 8)) throw new Error("--apply requires --reason with at least 8 characters");

const [year, monthNumber] = month.split("-").map(Number);
const startDate = new Date(Date.UTC(year, monthNumber - 1, 1));
const nextMonth = new Date(Date.UTC(year, monthNumber, 1));
const runId = `tuition-v3-${month}-${randomUUID()}`;

function sourceFingerprint(sessions: any[], enrollment: any, attendance: any[]) {
  return JSON.stringify({
    sessions: sessions.map((row) => [row.id, row.version, row.status, row.kind, row.extraFeeMode, row.replacementForId]),
    enrollment: enrollment
      ? [enrollment.id, enrollment.startedAt?.toISOString(), enrollment.endedAt?.toISOString(), enrollment.updatedAt?.toISOString()]
      : null,
    attendance: attendance.map((row) => [row.id, row.classSessionId, row.status, row.updatedAt?.toISOString()]),
  });
}

function calculationFields(value: any) {
  return JSON.stringify({
    expectedSessions: value.expectedSessions,
    chargedSessions: value.chargedSessions,
    makeUpSessions: value.makeUpSessions,
    extraSessions: value.extraSessions,
    feePerSession: value.feePerSession,
    monthlyTuition: value.monthlyTuition,
    amount: value.amount,
    billingMode: value.billingMode,
    scheduleMode: value.scheduleMode,
    contractSessions: value.contractSessions,
    eligibleSessions: value.eligibleSessions,
    deliveredSessions: value.deliveredSessions,
    centerCreditSessions: value.centerCreditSessions,
    studentWaivedSessions: value.studentWaivedSessions,
    calculationVersion: value.calculationVersion,
    calculationSnapshot: value.calculationSnapshot,
  });
}

async function main() {
  const lines = await prisma.monthlyFeeLine.findMany({
    where: { month, ...(classId ? { classId } : { classId: { not: null } }), status: { in: ["pending", "ready"] }, receiptId: null, paidAt: null, receiptLines: { none: {} } },
    include: { class: { include: { teacher: true } } },
    orderBy: [{ classId: "asc" }, { studentId: "asc" }],
  });
  const sessionCache = new Map<string, any[]>();
  const changes: Array<{ line: any; after: any; sourceFingerprint: string }> = [];
  const skipped: any[] = [];

  for (const line of lines) {
    if (!line.classId || !line.class) continue;
    let sessions = sessionCache.get(line.classId);
    if (!sessions) {
      sessions = await prisma.classSession.findMany({ where: { classId: line.classId, billingMonth: month }, orderBy: [{ sessionDate: "asc" }, { id: "asc" }] });
      sessionCache.set(line.classId, sessions);
    }
    if (!sessions.length) { skipped.push({ line_id: line.id, reason: "missing_class_session_plan" }); continue; }
    const [enrollment, attendance] = await Promise.all([
      prisma.enrollmentPeriod.findFirst({ where: { studentId: line.studentId, classId: line.classId, startedAt: { lt: nextMonth }, OR: [{ endedAt: null }, { endedAt: { gt: startDate } }] }, orderBy: { startedAt: "desc" } }),
      prisma.attendance.findMany({ where: { studentId: line.studentId, classId: line.classId, attendanceDate: { gte: startDate, lt: nextMonth } }, select: { id: true, classSessionId: true, attendanceDate: true, status: true, updatedAt: true }, orderBy: [{ attendanceDate: "asc" }, { id: "asc" }] }),
    ]);
    if (!enrollment) { skipped.push({ line_id: line.id, reason: "missing_enrollment_period" }); continue; }
    try {
      const result = buildStudentTuitionV3({ month, classData: line.class, enrollment, sessions, attendance });
      const after = {
        expectedSessions: result.contractSessions, chargedSessions: result.chargedSessions,
        makeUpSessions: result.makeUpSessions, extraSessions: result.extraSessions,
        feePerSession: result.feePerSession, monthlyTuition: result.monthlyTuition,
        amount: result.amount, billingMode: result.billingMode, scheduleMode: result.scheduleMode,
        status: result.amount > 0 ? "ready" : "pending",
        contractSessions: result.contractSessions, eligibleSessions: result.eligibleSessions,
        deliveredSessions: result.deliveredSessions, centerCreditSessions: result.centerCreditSessions,
        studentWaivedSessions: result.studentWaivedSessions,
        calculationVersion: result.calculationVersion, calculationSnapshot: result.calculationSnapshot,
      };
      if (calculationFields(line) !== calculationFields(after)) {
        changes.push({ line, after, sourceFingerprint: sourceFingerprint(sessions, enrollment, attendance) });
      }
    } catch (error: any) {
      skipped.push({ line_id: line.id, reason: error?.code || error?.message || "calculation_failed" });
    }
  }

  if (apply && changes.length) {
    await prisma.$transaction(async (tx) => {
      const feeIds = new Set<string>();
      for (const change of changes) {
        const latest = await tx.monthlyFeeLine.findFirst({ where: { id: change.line.id, status: { in: ["pending", "ready"] }, receiptId: null, paidAt: null }, include: { receiptLines: { select: { id: true } }, revisions: { orderBy: { revisionNumber: "desc" }, take: 1 } } });
        if (!latest || latest.receiptLines.length) throw new Error(`Protected line changed during reconcile: ${change.line.id}`);
        const [latestSessions, latestEnrollment, latestAttendance] = await Promise.all([
          tx.classSession.findMany({ where: { classId: latest.classId!, billingMonth: month }, orderBy: [{ sessionDate: "asc" }, { id: "asc" }] }),
          tx.enrollmentPeriod.findFirst({ where: { studentId: latest.studentId, classId: latest.classId!, startedAt: { lt: nextMonth }, OR: [{ endedAt: null }, { endedAt: { gt: startDate } }] }, orderBy: { startedAt: "desc" } }),
          tx.attendance.findMany({ where: { studentId: latest.studentId, classId: latest.classId!, attendanceDate: { gte: startDate, lt: nextMonth } }, select: { id: true, classSessionId: true, attendanceDate: true, status: true, updatedAt: true }, orderBy: [{ attendanceDate: "asc" }, { id: "asc" }] }),
        ]);
        if (sourceFingerprint(latestSessions, latestEnrollment, latestAttendance) !== change.sourceFingerprint) {
          throw new Error(`Tuition source changed during reconcile: ${change.line.id}`);
        }
        const beforeSnapshot = JSON.parse(JSON.stringify(latest));
        const updated = await tx.monthlyFeeLine.update({ where: { id: latest.id }, data: change.after });
        await tx.monthlyFeeLineRevision.create({ data: { monthlyFeeLineId: latest.id, revisionNumber: (latest.revisions[0]?.revisionNumber || 0) + 1, runId, eventType: "tuition_v3_reconcile", reason, beforeSnapshot, afterSnapshot: JSON.parse(JSON.stringify(updated)) } });
        feeIds.add(latest.monthlyFeeId);
      }
      for (const feeId of feeIds) await refreshMonthlyFeeAggregateFromLines(tx, feeId);
    }, { isolationLevel: "Serializable", timeout: 30_000 });
  }

  process.stdout.write(`${JSON.stringify({ mode: apply ? "apply" : "dry-run", run_id: runId, month, class_id: classId, mutable_lines_scanned: lines.length, changes: changes.map(({ line, after }) => ({ line_id: line.id, student_id: line.studentId, class_id: line.classId, before_amount: line.amount, after_amount: after.amount, before_version: line.calculationVersion, after_version: after.calculationVersion })), skipped }, null, 2)}\n`);
}

main().finally(() => prisma.$disconnect());
