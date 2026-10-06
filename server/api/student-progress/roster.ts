import type { VercelRequest, VercelResponse } from "../../../lib/vercel-types.js";
import { successResponse, handleCors, type AuthedRequest } from "../../../lib/auth.js";
import { requirePermission } from "../../../lib/require-permission.js";
import { ApiError, sendApiError } from "../../../lib/api-utils.js";
import { assertAttendanceWriteEnrollment, findAttendanceEnrollmentConflicts } from "../../../lib/attendance-enrollment-guard.js";
import { assertProgressMonthEditable, runSerializableProgressTransaction } from "../../../lib/student-progress-finalization.js";
import { rosterPatchSchema } from "../../../lib/progress-roster-contract.js";
import { rosterAssignment, rosterSettings, rosterMonth, rosterRow, rosterOperationalRows } from "../../../lib/progress-roster-read.js";
import { recomputeMonthlyRollup } from "./daily.js";
import { createHash } from "node:crypto";
import { getClientIp } from "../../../lib/rate-limit.js";
import { z } from "zod";
import { submissionSchema, submissionQuerySchema, submissionClock, assertSubmissionMonth,
  appendProgressSubmission, countSubmissionOperations } from "../../../lib/progress-submission-contract.js";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const d = new Date(`${v}T00:00:00Z`); return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
});
const querySchema = z.object({ class_id: z.string().min(1), month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  entry_date: dateSchema, offset: z.coerce.number().int().min(0).max(500).default(0), limit: z.coerce.number().int().min(1).max(50).default(50) })
  .refine(v => v.entry_date.startsWith(v.month), { message: "Date must belong to the selected month" });

async function enrollmentRows(db: any, tenantId: string, classId: string, date: string, studentId?: string) {
  const where = { tenantId, classId, status: "active", ...(studentId ? { studentId } : {}),
    enrollmentDate: { lte: new Date(`${date}T00:00:00Z`) }, student: { deletedAt: null, status: "active" } };
  const enrollments = await db.studentClass.findMany({ where, include: { student: true }, orderBy: { student: { fullName: "asc" } }, take: 501 });
  if (enrollments.length > 500) throw new ApiError("ROSTER_TOO_LARGE", "Roster exceeds the reviewed 500 learner limit", 400);
  const periods = await db.enrollmentPeriod.findMany({ where: { tenantId, classId, studentId: { in: enrollments.map((e: any) => e.studentId) } }, orderBy: { id: "asc" } });
  const conflicts = findAttendanceEnrollmentConflicts({ records: enrollments.map((e: any) => ({ studentId: e.studentId, attendanceDate: date })),
    enrollmentPeriods: periods, projections: enrollments });
  return { enrollments: enrollments.filter((e: any) => !conflicts.some(c => c.student_id === e.studentId)), periods };
}

async function loadRoster(req: AuthedRequest, query: z.infer<typeof querySchema>) {
  const tenantId = req.user.tenantId!;
  return req.db.$transaction(async (tx: any) => {
    const assignment = await rosterAssignment(tx, tenantId, query.class_id);
    const settings = await rosterSettings(tx, tenantId, query.month);
    const { enrollments, periods } = await enrollmentRows(tx, tenantId, assignment.id, query.entry_date);
    const selected = enrollments.slice(query.offset, query.offset + query.limit);
    const records = await tx.studentProgressMonth.findMany({ where: { tenantId, classId: assignment.id, month: query.month,
      studentId: { in: selected.map((e: any) => e.studentId) } }, include: { skills: { where: { tenantId } }, dailyEntries: { where: { tenantId } } } });
    const operational = await rosterOperationalRows(tx, assignment, selected, periods, query.month);
    const rows = selected.map((enrollment: any) => rosterRow({ enrollment, assignment, settings,
      record: records.find((r: any) => r.studentId === enrollment.studentId) || null,
      operational: operational.get(enrollment.studentId), date: query.entry_date, periods: periods.filter((p: any) => p.studentId === enrollment.studentId), actorId: req.user.id }));
    return { rows, total: enrollments.length, next_offset: query.offset + selected.length < enrollments.length ? query.offset + selected.length : null };
  }, { isolationLevel: "RepeatableRead" });
}

async function patchRoster(req: AuthedRequest) {
  const body = rosterPatchSchema.parse(req.body);
  const tenantId = req.user.tenantId!;
  const month = body.entry_date.slice(0, 7);
  const requestHash = createHash("sha256").update(JSON.stringify({ ...body, changes: Object.fromEntries(Object.entries(body.changes).sort()) })).digest("hex");
  return runSerializableProgressTransaction(req.db, async tx => {
    const replay = await tx.activityLog.findFirst({ where: { tenantId, userId: req.user.id,
      entityType: "progress_grid_operation", entityId: body.operation_id } });
    if (replay) {
      const saved = JSON.parse(replay.action);
      if (saved.request_hash !== requestHash) throw new ApiError("ROSTER_OPERATION_REUSED", "Operation ID belongs to a different request", 409);
      return { row: saved.row };
    }
    const assignment = await rosterAssignment(tx, tenantId, body.class_id);
    const { enrollments, periods } = await enrollmentRows(tx, tenantId, body.class_id, body.entry_date, body.student_id);
    const enrollment = enrollments[0];
    if (!enrollment) throw new ApiError("ENROLLMENT_NOT_FOUND", "Student is not enrolled in this class", 404);
    if (!assignment.teacherId || assignment.teacher?.status !== "active") throw new ApiError("GRADER_NOT_ASSIGNED", "An active assigned teacher is required", 409);
    await assertAttendanceWriteEnrollment(tx, { classId: body.class_id, records: [{ studentId: body.student_id, attendanceDate: body.entry_date }] });
    const settings = await rosterSettings(tx, tenantId, month);
    let record = await rosterMonth(tx, tenantId, body.student_id, body.class_id, month);
    assertProgressMonthEditable(record?.finalizedAt);
    const operational = await rosterOperationalRows(tx, assignment, [enrollment], periods, month);
    const current = rosterRow({ assignment, enrollment, settings, record, operational: operational.get(body.student_id), date: body.entry_date, periods, actorId: req.user.id });
    if (current.evidence_version !== body.expected_evidence_version) throw new ApiError("ROSTER_EVIDENCE_CONFLICT", "Evidence or rubric changed; reload before saving", 409);
    if (!record) record = await tx.studentProgressMonth.create({ data: { tenantId, studentId: body.student_id, classId: body.class_id,
      month, trackKey: current.track_key, classType: current.class_type, createdById: req.user.id }, include: { dailyEntries: true, skills: true } });
    const entries = record.dailyEntries.filter((e: any) => e.entryDate.toISOString().slice(0, 10) === body.entry_date);
    const ownership = { tenantId, progressMonthId: record.id };
    for (const [skill, score] of Object.entries(body.changes)) {
      const matches = entries.filter((e: any) => e.entryType === "skill_assessment" && e.skillKey === skill);
      if (matches.length > 1) throw new ApiError("MULTIPLE_ASSESSMENTS", "Open dated evidence before editing multiple assessments", 409);
      if (matches[0]) {
        if (matches[0].createdById !== req.user.id) throw new ApiError("EVIDENCE_NOT_OWNED", "Only the evidence author can edit this cell", 403);
        if (score === null) await tx.studentProgressDailyEntry.deleteMany({ where: { ...ownership, id: matches[0].id } });
        else await tx.studentProgressDailyEntry.update({ where: { id: matches[0].id, tenantId }, data: { score } });
      } else if (score !== null) await tx.studentProgressDailyEntry.create({ data: { ...ownership, entryDate: new Date(`${body.entry_date}T00:00:00Z`),
        entryType: "skill_assessment", skillKey: skill, score, examSetLevel: body.assessment_context?.exam_set_level ?? null,
        difficultyLevel: body.assessment_context?.difficulty_level ?? null, gradedByTeacherId: assignment.teacherId, createdById: req.user.id } });
    }
    if (body.note !== undefined) {
      const notes = entries.filter((e: any) => e.entryType === "note");
      if (notes.length > 1) throw new ApiError("MULTIPLE_NOTES", "Open dated evidence before editing multiple notes", 409);
      if (notes[0]) {
        if (notes[0].createdById !== req.user.id) throw new ApiError("EVIDENCE_NOT_OWNED", "Only the evidence author can edit this note", 403);
        if (body.note.trim()) await tx.studentProgressDailyEntry.update({ where: { id: notes[0].id, tenantId }, data: { note: body.note.trim() } });
        else await tx.studentProgressDailyEntry.deleteMany({ where: { ...ownership, id: notes[0].id } });
      }
      else if (body.note) await tx.studentProgressDailyEntry.create({ data: { ...ownership, entryDate: new Date(`${body.entry_date}T00:00:00Z`),
        entryType: "note", note: body.note, createdById: req.user.id } });
    }
    const dayEnd = new Date(`${body.entry_date}T00:00:00Z`);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    const attendance = await tx.attendance.findFirst({ where: { tenantId, classId: body.class_id, studentId: body.student_id,
      attendanceDate: { gte: new Date(`${body.entry_date}T00:00:00Z`), lt: dayEnd } }, select: { id: true } });
    const savedEntries = await tx.studentProgressDailyEntry.findMany({ where: { ...ownership,
      entryDate: { gte: new Date(`${body.entry_date}T00:00:00Z`), lt: dayEnd } } });
    if (!attendance && savedEntries.length && !savedEntries.some(e => e.note?.trim())) {
      throw new ApiError("NON_ATTENDANCE_NOTE_REQUIRED", "A note is required for evidence outside an attendance date", 400);
    }
    await recomputeMonthlyRollup(tx, record, tenantId, req.user.id);
    const updated = await rosterMonth(tx, tenantId, body.student_id, body.class_id, month);
    const row = rosterRow({ assignment, enrollment, settings, record: updated, operational: operational.get(body.student_id), date: body.entry_date, periods, actorId: req.user.id });
    await tx.activityLog.create({ data: { tenantId, userId: req.user.id, entityType: "progress_grid_operation", entityId: body.operation_id,
      action: JSON.stringify({ type: "progress.grid.save", request_hash: requestHash, row }), ipAddress: getClientIp(req) } });
    return { row };
  }, { isolationLevel: "Serializable" });
}

async function submissionContext(tx: any, req: AuthedRequest, studentId: string, classId: string, date: string) {
  const tenantId = req.user.tenantId!;
  const assignment = await rosterAssignment(tx, tenantId, classId);
  const { enrollments, periods } = await enrollmentRows(tx, tenantId, classId, date, studentId);
  const enrollment = enrollments[0];
  if (!enrollment) throw new ApiError("ENROLLMENT_NOT_FOUND", "Student is not enrolled in this class", 404);
  const month = date.slice(0, 7);
  const settings = await rosterSettings(tx, tenantId, month);
  const record = await rosterMonth(tx, tenantId, studentId, classId, month);
  const operational = await rosterOperationalRows(tx, assignment, [enrollment], periods, month);
  return { assignment, record, row: rosterRow({ assignment, enrollment, settings, record,
    operational: operational.get(studentId), date, periods, actorId: req.user.id }) };
}

async function loadSubmission(req: AuthedRequest) {
  const query = submissionQuerySchema.parse(req.query);
  const clock = submissionClock();
  assertSubmissionMonth(query.month, clock);
  return req.db.$transaction(async (tx: any) => {
    const { row } = await submissionContext(tx, req, query.student_id, query.class_id, clock.current_date);
    const submission_count = await countSubmissionOperations(tx, req.user.tenantId!, query.student_id, query.class_id, clock.month);
    return { row: { ...row, submission_count }, current_date: clock.current_date, entry_date: clock.current_date,
      month: clock.month, server_timestamp: clock.server_timestamp, submission_count };
  }, { isolationLevel: "RepeatableRead" });
}

async function postSubmission(req: AuthedRequest) {
  const body = submissionSchema.parse(req.body);
  return runSerializableProgressTransaction(req.db, async tx => {
    // Capture time per attempt so a serialization retry cannot write a month that has rolled over.
    const now = new Date();
    const clock = submissionClock(now);
    return appendProgressSubmission({ tx, body, now, tenantId: req.user.tenantId!, actorId: req.user.id,
      ipAddress: getClientIp(req), recompute: recomputeMonthlyRollup,
      loadContext: () => submissionContext(tx, req, body.student_id, body.class_id, clock.current_date) });
  }, { isolationLevel: "Serializable" });
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "private, no-store");
  try {
    if (req.method === "GET" && req.query.mode === "submission") return successResponse(res, await loadSubmission(req));
    if (req.method === "POST") return successResponse(res, await postSubmission(req));
    if (req.method === "GET") return successResponse(res, await loadRoster(req, querySchema.parse({ class_id: req.query.class_id,
      month: req.query.month, entry_date: req.query.entry_date, offset: req.query.offset, limit: req.query.limit })));
    if (req.method === "PATCH") return successResponse(res, await patchRoster(req));
    throw new ApiError("METHOD_NOT_ALLOWED", "Only GET, PATCH and POST allowed", 405);
  } catch (error) {
    if (error instanceof z.ZodError) return sendApiError(res, new ApiError("VALIDATION_ERROR", "Invalid roster payload", 400), "ROSTER_VALIDATION_ERROR");
    return sendApiError(res, error, "PROGRESS_ROSTER_ERROR");
  }
}
const view = requirePermission("progress.view", handler);
const grade = requirePermission("progress.grade", handler);
export default async function route(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  return req.method === "GET" ? view(req, res) : grade(req, res);
}
