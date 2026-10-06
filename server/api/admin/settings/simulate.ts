import { z } from "zod";

import type { VercelResponse } from "../../../../lib/vercel-types.js";
import { errorResponse, successResponse, type AuthedRequest } from "../../../../lib/auth.js";
import { ApiError, parseMonthRange, sendApiError } from "../../../../lib/api-utils.js";
import type { AcademicSettingsContext } from "../../../../lib/academic-settings.js";
import { getSettingDefinition, parseSettingValue } from "../../../../lib/settings-registry.js";
import { getSettings } from "../../../../lib/settings.js";
import { buildTuitionSettingsContext } from "../../../../lib/tuition-settings.js";
import { buildStudentTuitionV3 } from "../../../../lib/tuition-v3-service.js";
import { buildReportCube } from "../../../../lib/report-cube.js";
import {
  buildProgressAssessment,
  type ProgressMonthSnapshot,
} from "../../../../lib/student-progress-assessment.js";
import { assertRequestPermission, requirePermission } from "../../../../lib/require-permission.js";

type SettingEntry = { key: string; value: unknown };

const simulationSchema = z.object({
  keys: z.record(z.string(), z.unknown()).refine((keys) => Object.keys(keys).length > 0, {
    message: "keys must include at least one draft setting",
  }),
  classId: z.string().trim().min(1).optional(),
  class_id: z.string().trim().min(1).optional(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
}).refine((body) => Boolean(body.classId || body.class_id), {
  message: "classId is required",
});

const SIMULATABLE_GROUPS = new Set(["finance", "academic"]);

function settingMap(entries: SettingEntry[]) {
  return Object.fromEntries(entries.map((entry) => [entry.key, entry.value]));
}

function progressSnapshot(record: any): ProgressMonthSnapshot | null {
  if (!record) return null;
  return {
    ...record,
    skills: (record.skills || []).map((skill: any) => ({
      skill_key: skill.skillKey,
      skill_label: skill.skillLabel,
      score: skill.score,
      max_score: skill.maxScore,
      weight: skill.weight,
      status: skill.status,
      note: skill.note,
      source: skill.source,
      sort_order: skill.sortOrder,
    })),
    dailyEntries: (record.dailyEntries || []).map((entry: any) => ({
      entry_date: entry.entryDate,
      entry_type: entry.entryType,
      skill_key: entry.skillKey,
      score: entry.score,
      shield_count: entry.shieldCount,
      exam_set_level: entry.examSetLevel,
      difficulty_level: entry.difficultyLevel,
      entry_label: entry.entryLabel,
      graded_by_teacher_id: entry.gradedByTeacherId,
      note: entry.note,
    })),
  };
}

export async function simulateSettingsDryRun(
  db: any,
  input: {
    tenantId: string;
    classId: string;
    month: string;
    currentSettings: SettingEntry[];
    draftSettings: SettingEntry[];
  },
) {
  const { startDate, endDate } = parseMonthRange(input.month);
  const classRecord = await db.class.findFirst({
    where: { tenantId: input.tenantId, id: input.classId },
  });
  if (!classRecord) throw new ApiError("CLASS_NOT_FOUND", "Class not found", 404);

  const [periods, legacyEnrollments, sessions, attendance, monthPlan, progressRows] =
    await Promise.all([
      db.enrollmentPeriod.findMany({
        where: {
          tenantId: input.tenantId,
          classId: input.classId,
          startedAt: { lt: endDate },
          OR: [{ endedAt: null }, { endedAt: { gt: startDate } }],
        },
        include: { student: { select: { id: true, fullName: true } } },
      }),
      db.studentClass.findMany({
        where: {
          tenantId: input.tenantId,
          classId: input.classId,
          status: "active",
          enrollmentDate: { lt: endDate },
          student: { deletedAt: null },
        },
        include: { student: { select: { id: true, fullName: true } } },
      }),
      db.classSession.findMany({
        where: { tenantId: input.tenantId, classId: input.classId, billingMonth: input.month },
        orderBy: [{ sessionDate: "asc" }, { id: "asc" }],
      }),
      db.attendance.findMany({
        where: {
          tenantId: input.tenantId,
          classId: input.classId,
          attendanceDate: { gte: startDate, lt: endDate },
        },
      }),
      db.classMonthPlan.findFirst({
        where: { tenantId: input.tenantId, classId: input.classId, billingMonth: input.month },
      }),
      db.studentProgressMonth.findMany({
        where: { tenantId: input.tenantId, classId: input.classId, month: input.month },
        include: { skills: { orderBy: { sortOrder: "asc" } }, dailyEntries: true },
      }),
    ]);

  const enrollments = new Map<string, { student: any; periods: Array<{ startedAt: Date; endedAt: Date | null }> }>();
  for (const period of periods) {
    const current = enrollments.get(period.studentId) || { student: period.student, periods: [] };
    current.periods.push({ startedAt: period.startedAt, endedAt: period.endedAt });
    enrollments.set(period.studentId, current);
  }
  for (const enrollment of legacyEnrollments) {
    if (enrollments.has(enrollment.studentId)) continue;
    enrollments.set(enrollment.studentId, {
      student: enrollment.student,
      periods: [{ startedAt: enrollment.enrollmentDate, endedAt: null }],
    });
  }

  const currentMap = settingMap(input.currentSettings);
  const draftMap = settingMap(input.draftSettings);
  const currentTuition = buildTuitionSettingsContext(currentMap);
  const draftTuition = buildTuitionSettingsContext(draftMap);
  const currentAcademic: AcademicSettingsContext = { settings: input.currentSettings };
  const draftAcademic: AcademicSettingsContext = { settings: input.draftSettings };

  const reportCube = buildReportCube({
    months: [input.month],
    enrollments: [...enrollments.values()].flatMap((enrollment) =>
      enrollment.periods.map((period) => ({
        studentId: enrollment.student.id,
        studentName: enrollment.student.fullName,
        classId: classRecord.id,
        className: classRecord.className,
        enrollmentDate: period.startedAt,
        enrollmentEndDate: period.endedAt,
        feePerDay: classRecord.feePerDay,
        scheduleDays: classRecord.scheduleDays,
        sessionsPerWeek: classRecord.sessionsPerWeek,
      })),
    ),
    attendance: attendance.map((record: any) => ({
      studentId: record.studentId,
      classId: record.classId,
      attendanceDate: record.attendanceDate,
      status: record.status,
      isMakeUp: Boolean(record.isMakeUp),
    })),
    feeLines: [],
    monthlyFees: [],
    classMonthPlans: monthPlan ? [{
      classId: classRecord.id,
      billingMonth: input.month,
      expectedSessions: monthPlan.expectedSessions,
      snapshot: monthPlan.snapshot,
    }] : [],
    classSessions: sessions,
  });
  const reportByStudent = new Map(reportCube.students.map((row) => [row.student_id, row]));
  const progressByStudent = new Map(progressRows.map((row: any) => [row.studentId, row]));

  const rows = [...enrollments.values()].map((enrollment) => {
    const studentAttendance = attendance.filter(
      (record: any) => record.studentId === enrollment.student.id,
    );
    const tuitionInput = {
      month: input.month,
      classData: classRecord,
      enrollment: { periods: enrollment.periods },
      sessions,
      attendance: studentAttendance,
    };
    const oldFee = buildStudentTuitionV3({ ...tuitionInput, settings: currentTuition });
    const newFee = buildStudentTuitionV3({ ...tuitionInput, settings: draftTuition });
    const reportRow = reportByStudent.get(enrollment.student.id);
    const snapshot = progressSnapshot(progressByStudent.get(enrollment.student.id));
    const oldAcademic = reportRow
      ? buildProgressAssessment({ row: reportRow, progressMonth: snapshot, settings: currentAcademic })
      : null;
    const newAcademic = reportRow
      ? buildProgressAssessment({ row: reportRow, progressMonth: snapshot, settings: draftAcademic })
      : null;

    return {
      student_id: enrollment.student.id,
      student_name: enrollment.student.fullName,
      finance: {
        old: { amount: oldFee.amount, charged_sessions: oldFee.chargedSessions, fee_per_session: oldFee.feePerSession },
        new: { amount: newFee.amount, charged_sessions: newFee.chargedSessions, fee_per_session: newFee.feePerSession },
        delta: { amount: newFee.amount - oldFee.amount, charged_sessions: newFee.chargedSessions - oldFee.chargedSessions },
      },
      academic: oldAcademic && newAcademic ? {
        old: { score: oldAcademic.progressScore, readiness: oldAcademic.readinessBand, focus_skill: oldAcademic.focusSkillKey },
        new: { score: newAcademic.progressScore, readiness: newAcademic.readinessBand, focus_skill: newAcademic.focusSkillKey },
        delta: { score: newAcademic.progressScore === null || oldAcademic.progressScore === null
          ? null : Math.round((newAcademic.progressScore - oldAcademic.progressScore) * 10) / 10 },
      } : null,
    };
  });

  return {
    dry_run: true,
    tenant_id: input.tenantId,
    class_id: input.classId,
    month: input.month,
    rows,
  };
}

export async function handler(req: AuthedRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }
  try {
    const body = simulationSchema.parse(req.body);
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new ApiError("TENANT_REQUIRED", "Tenant identity is required", 403);

    const draftEntries = Object.entries(body.keys).map(([key, value]) => {
      const definition = getSettingDefinition(key);
      if (!SIMULATABLE_GROUPS.has(definition.group)) {
        throw new ApiError("SETTING_NOT_SIMULATABLE", `${key} is not a finance or academic engine setting`, 400);
      }
      return { key, value: parseSettingValue(key, value), permission: definition.permission };
    });
    for (const permission of new Set(draftEntries.map((entry) => entry.permission))) {
      await assertRequestPermission(req, permission);
    }

    const [finance, academic] = await Promise.all([
      getSettings(req.db, { tenantId, group: "finance", effectiveMonth: body.month }),
      getSettings(req.db, { tenantId, group: "academic", effectiveMonth: body.month }),
    ]);
    const currentSettings = [...finance.settings, ...academic.settings].map(({ key, value }) => ({ key, value }));
    const drafts = new Map(draftEntries.map(({ key, value }) => [key, value]));
    const draftSettings = currentSettings.map((entry) => ({
      key: entry.key,
      value: drafts.has(entry.key) ? drafts.get(entry.key) : entry.value,
    }));

    return successResponse(res, await simulateSettingsDryRun(req.db, {
      tenantId,
      classId: body.classId || body.class_id!,
      month: body.month,
      currentSettings,
      draftSettings,
    }));
  } catch (error) {
    return sendApiError(res, error, "SETTINGS_SIMULATION_ERROR");
  }
}

export default requirePermission("console.access", handler);
