import { createHash } from "node:crypto";
import { z } from "zod";

class SubmissionError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
    this.name = "SubmissionError";
  }
}

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const identity = { student_id: z.string().trim().min(1), class_id: z.string().trim().min(1) };
export const submissionQuerySchema = z.object({
  ...identity, mode: z.literal("submission"), month: monthSchema.optional(),
}).strict();
export const submissionSchema = z.object({
  ...identity, month: monthSchema,
  expected_evidence_version: z.string().regex(/^[a-fA-F0-9]{64}$/),
  operation_id: z.string().uuid(),
  scores: z.partialRecord(z.enum(["listening", "speaking", "reading", "writing",
    "homework", "daily_practice", "mock_test"]), z.number().min(0).max(100))
    .refine(scores => Object.keys(scores).length > 0, "At least one score is required"),
  note: z.string().max(2000).optional(),
  assessment_context: z.object({
    exam_set_level: z.enum(["starters", "movers", "flyers", "ket", "pet"]).nullable(),
    difficulty_level: z.enum(["easy", "medium", "hard"]),
  }).strict().optional(),
}).strict();
export type Submission = z.infer<typeof submissionSchema>;

export function submissionClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  const current_date = `${part("year")}-${part("month")}-${part("day")}`;
  return { current_date, month: current_date.slice(0, 7), server_timestamp: now.toISOString() };
}

export function assertSubmissionMonth(month: string | undefined, clock: ReturnType<typeof submissionClock>) {
  if (month !== undefined && month !== clock.month) {
    throw new SubmissionError("SUBMISSION_MONTH_CHANGED", "Submission must belong to the current server month; reload", 409);
  }
}

export function submissionRequestHash(body: Submission) {
  return createHash("sha256").update(JSON.stringify({
    ...body, scores: Object.fromEntries(Object.entries(body.scores).sort()),
    assessment_context: body.assessment_context ? {
      exam_set_level: body.assessment_context.exam_set_level,
      difficulty_level: body.assessment_context.difficulty_level,
    } : undefined,
  })).digest("hex");
}

export async function countSubmissionOperations(db: any, tenantId: string, studentId: string, classId: string, month: string) {
  monthSchema.parse(month);
  const start = new Date(`${month}-01T00:00:00+07:00`);
  // UTC date may still be the previous month's last day; build the next civil month explicitly.
  const [year, monthNumber] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, monthNumber, 1) - 7 * 60 * 60 * 1000);
  const logs = await db.activityLog.findMany({ where: { tenantId, entityType: "progress_submission_operation",
    createdAt: { gte: start, lt: next } },
    select: { userId: true, entityId: true, action: true } });
  const operations = new Set<string>();
  for (const log of logs) {
    let action;
    try { action = JSON.parse(log.action); } catch { continue; }
    if (!z.string().uuid().safeParse(log.entityId).success || !log.userId ||
      !z.string().datetime({ offset: true }).safeParse(action?.submitted_at).success) continue;
    if (action?.student_id === studentId && action?.class_id === classId && action?.month === month &&
      submissionClock(new Date(action.submitted_at)).month === month) {
      operations.add(JSON.stringify([log.userId, log.entityId]));
    }
  }
  return operations.size;
}

type SubmissionContext = { assignment: any; record: any; row: any };

export async function createSubmissionMonth(tx: any, args: any) {
  try {
    return await tx.studentProgressMonth.create(args);
  } catch (error: any) {
    const target = error?.meta?.target;
    const columns = Array.isArray(target) ? target.map((key: string) => ({
      tenant_id: "tenantId", student_id: "studentId", class_id: "classId",
    }[key] || key)).sort() : null;
    const monthUnique = columns?.join(",") === "classId,month,studentId,tenantId" ||
      target === "student_progress_months_tenant_id_student_id_class_id_month_key";
    if (error?.code !== "P2002" || !monthUnique ||
      (error.meta?.modelName && error.meta.modelName !== "StudentProgressMonth")) throw error;
    // A losing create must restart the entire transaction, including its replay read.
    throw Object.assign(new Error("Concurrent progress month creation; retry transaction", { cause: error }),
      { code: "P2034" });
  }
}

export async function appendProgressSubmission(input: {
  tx: any; tenantId: string; actorId: string; body: Submission; now: Date; ipAddress: string;
  loadContext: () => Promise<SubmissionContext>;
  recompute: (tx: any, record: any, tenantId: string, actorId: string) => Promise<unknown>;
}) {
  const { tx, tenantId, actorId, body } = input;
  const requestHash = submissionRequestHash(body);
  const replay = await tx.activityLog.findFirst({ where: {
    tenantId, userId: actorId, entityType: "progress_submission_operation", entityId: body.operation_id,
  } });
  if (replay) {
    const saved = JSON.parse(replay.action);
    if (saved.request_hash !== requestHash) {
      throw new SubmissionError("ROSTER_OPERATION_REUSED", "Operation ID belongs to a different request", 409);
    }
    return saved.response;
  }
  const clock = submissionClock(input.now);
  assertSubmissionMonth(body.month, clock);
  const context = await input.loadContext();
  if (!context.assignment.teacherId || context.assignment.teacher?.status !== "active") {
    throw new SubmissionError("GRADER_NOT_ASSIGNED", "An active assigned teacher is required", 409);
  }
  const { assertProgressMonthEditable } = await import("./student-progress-finalization.js");
  assertProgressMonthEditable(context.record?.finalizedAt);
  if (context.row.evidence_version !== body.expected_evidence_version) {
    throw new SubmissionError("ROSTER_EVIDENCE_CONFLICT", "Evidence or rubric changed; reload before saving", 409);
  }
  const record = context.record || await createSubmissionMonth(tx, { data: {
    tenantId, studentId: body.student_id, classId: body.class_id, month: clock.month,
    trackKey: context.row.track_key, classType: context.row.class_type, createdById: actorId,
  }, include: { dailyEntries: true, skills: true } });
  const base = { tenantId, progressMonthId: record.id, createdById: actorId,
    entryDate: new Date(`${clock.current_date}T00:00:00Z`) };
  for (const [skillKey, score] of Object.entries(body.scores)) {
    await tx.studentProgressDailyEntry.create({ data: { ...base, entryType: "skill_assessment",
      skillKey, score, gradedByTeacherId: context.assignment.teacherId,
      examSetLevel: body.assessment_context?.exam_set_level ?? null,
      difficultyLevel: body.assessment_context?.difficulty_level ?? null } });
  }
  if (body.note?.trim()) await tx.studentProgressDailyEntry.create({ data: {
    ...base, entryType: "note", note: body.note.trim(),
  } });
  await input.recompute(tx, record, tenantId, actorId);
  const updated = await input.loadContext();
  const submission_count = await countSubmissionOperations(tx, tenantId, body.student_id, body.class_id, clock.month) + 1;
  const response = { row: { ...updated.row, submission_count }, entry_date: clock.current_date,
    submitted_at: clock.server_timestamp, server_timestamp: clock.server_timestamp, submission_count };
  await tx.activityLog.create({ data: { tenantId, userId: actorId,
    entityType: "progress_submission_operation", entityId: body.operation_id, ipAddress: input.ipAddress,
    createdAt: input.now,
    action: JSON.stringify({ type: "progress.submission.append", student_id: body.student_id,
      class_id: body.class_id, month: clock.month, submitted_at: clock.server_timestamp,
      request_hash: requestHash, response }) } });
  return response;
}
