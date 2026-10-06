import { ApiError, parseMonthRange } from "./api-utils.js";
import { getSettings } from "./settings.js";
import { buildReportCube } from "./report-cube.js";
import { buildProgressAssessment, defaultClassTypeForTrack, detectProgressTrackKey, PROGRESS_SKILL_LABELS } from "./student-progress-assessment.js";
import { normalizeProgressEntrySemantics } from "./progress-difficulty.js";
import { progressRosterVersion } from "./progress-roster-contract.js";
import { storedProgressScore } from "./student-progress-evidence.js";

export async function rosterSettings(db: any, tenantId: string, month: string) {
  const settings = await getSettings(db, { tenantId, group: "academic", effectiveMonth: month });
  if (settings.settings.some((s: any) => s.warnings?.length)) throw new ApiError("INVALID_SETTING_VALUE", "Invalid academic settings", 409);
  return settings;
}

export async function rosterAssignment(db: any, tenantId: string, classId: string) {
  const assignment = await db.class.findFirst({ where: { id: classId, tenantId, status: "active" },
    include: { teacher: { select: { id: true, status: true, fullName: true } } } });
  if (!assignment) throw new ApiError("CLASS_NOT_FOUND", "Class not found", 404);
  return assignment;
}

export async function rosterMonth(db: any, tenantId: string, studentId: string, classId: string, month: string) {
  return db.studentProgressMonth.findFirst({ where: { tenantId, studentId, classId, month },
    include: { dailyEntries: { where: { tenantId } }, skills: { where: { tenantId } } } });
}

export function rosterRow(input: { enrollment: any; assignment: any; record: any; settings: any; operational: any; date: string; periods: any[]; actorId: string }) {
  const { enrollment, assignment, record, settings, operational, date, periods, actorId } = input;
  const track = record?.trackKey || detectProgressTrackKey(assignment.className, { settings: settings.settings });
  const entries = record?.dailyEntries || [];
  const dayEntries = entries.filter((entry: any) => entry.entryDate.toISOString().slice(0, 10) === date);
  const skills = Object.fromEntries(Object.keys(PROGRESS_SKILL_LABELS).map(key => {
    const evidence = dayEntries.filter((e: any) => e.entryType === "skill_assessment" && e.skillKey === key);
    return [key, { score: evidence.length === 1 ? evidence[0].score : null, count: evidence.length,
      editable: evidence.length === 0 || (evidence.length === 1 && evidence[0].createdById === actorId),
      exam_set_level: evidence.length === 1 ? evidence[0].examSetLevel : null,
      difficulty_level: evidence.length === 1 ? evidence[0].difficultyLevel : null,
      graded_by_teacher_id: evidence.length === 1 ? evidence[0].gradedByTeacherId : null,
      graded_by_teacher_name: evidence.length === 1 && evidence[0].gradedByTeacherId === assignment.teacherId ? assignment.teacher?.fullName : null }];
  }));
  const notes = dayEntries.filter((e: any) => e.entryType === "note");
  const context = { assignment: { id: assignment.id, className: assignment.className, teacherId: assignment.teacherId,
    teacherStatus: assignment.teacher?.status }, enrollment: { id: enrollment.id, enrollmentDate: enrollment.enrollmentDate,
    status: enrollment.status, studentStatus: enrollment.student.status }, periods, date };
  const academicValues = settings.settings.map((s: any) => ({ key: s.key, value: s.value }));
  const assessment = buildProgressAssessment({ row: operational, settings: { settings: settings.settings }, progressMonth: record ? {
    id: record.id, studentId: record.studentId, classId: record.classId, month: record.month,
    trackKey: track, classType: record.classType, teacherNote: record.teacherNote,
    skills: record.skills.map((s: any) => ({ skill_key: s.skillKey, score: s.score, max_score: s.maxScore, weight: s.weight, source: s.source })),
    dailyEntries: entries.map((e: any) => ({ entry_date: e.entryDate, entry_type: e.entryType, skill_key: e.skillKey,
      score: e.score, shield_count: e.shieldCount, ...(() => { const v = normalizeProgressEntrySemantics(e.examSetLevel, e.difficultyLevel);
        return { exam_set_level: v.examSetLevel, difficulty_level: v.difficultyLevel }; })() })),
  } : null });
  return { student_id: enrollment.studentId, student_name: enrollment.student.fullName, class_id: assignment.id,
    class_name: assignment.className, month: date.slice(0, 7), track_key: track,
    graded_by_teacher_id: assignment.teacher?.status === "active" ? assignment.teacherId : null,
    graded_by_teacher_name: assignment.teacher?.status === "active" ? assignment.teacher?.fullName : null,
    is_finalized: Boolean(record?.finalizedAt), skills, note: notes.length === 1 ? notes[0].note || "" : "",
    note_count: notes.length, note_editable: notes.length === 0 || (notes.length === 1 && notes[0].createdById === actorId),
    evidence_version: progressRosterVersion(record, academicValues, entries, record?.skills || [], context),
    progress_score: record?.finalizedAt ? storedProgressScore(record) : assessment.progressScore,
    score_source: record?.finalizedAt ? record.rubricSnapshot?.scoreEvidence?.source || "legacy_unknown" : assessment.scoreSource,
    class_type: record?.classType || defaultClassTypeForTrack(track) };
}

export async function rosterOperationalRows(db: any, assignment: any, enrollments: any[], periods: any[], month: string) {
  const { startDate, endDate } = parseMonthRange(month);
  const ids = enrollments.map(e => e.studentId);
  const [attendance, feeLines, monthlyFees, plans, sessions] = await Promise.all([
    db.attendance.findMany({ where: { tenantId: assignment.tenantId, classId: assignment.id, studentId: { in: ids }, attendanceDate: { gte: startDate, lt: endDate } } }),
    db.monthlyFeeLine.findMany({ where: { tenantId: assignment.tenantId, classId: assignment.id, studentId: { in: ids }, month } }),
    db.monthlyFee.findMany({ where: { tenantId: assignment.tenantId, studentId: { in: ids }, month } }),
    db.classMonthPlan.findMany({ where: { tenantId: assignment.tenantId, classId: assignment.id, billingMonth: month }, include: { revisions: { orderBy: { revision: "desc" }, take: 1 } } }),
    db.classSession.findMany({ where: { tenantId: assignment.tenantId, classId: assignment.id, billingMonth: month, kind: "regular" } }),
  ]);
  const cube = buildReportCube({ months: [month], enrollments: enrollments.map(enrollment => {
    const period = periods.filter(p => p.studentId === enrollment.studentId && p.startedAt < endDate
      && (!p.endedAt || p.endedAt > startDate)).sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0];
    return { studentId: enrollment.studentId, studentName: enrollment.student.fullName, classId: assignment.id,
      className: assignment.className, enrollmentDate: period?.startedAt || enrollment.enrollmentDate,
      enrollmentEndDate: period?.endedAt || null, feePerDay: assignment.feePerDay,
      scheduleDays: assignment.scheduleDays, sessionsPerWeek: assignment.sessionsPerWeek };
  }), attendance, feeLines, monthlyFees, classMonthPlans: plans, classSessions: sessions });
  return new Map(cube.students.map((row: any) => [row.student_id, row]));
}
