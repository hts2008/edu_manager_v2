import type { VercelResponse } from "../../../lib/vercel-types.js";
import {
  AuthedRequest,
  errorResponse,
  handleCors,
  successResponse,
} from "../../../lib/auth.js";
import { requirePermission } from "../../../lib/require-permission.js";
import { ApiError, getString, parseMonthRange, sendApiError } from "../../../lib/api-utils.js";
import {
  buildReportCube,
  filterReportRows,
  parseReportBiQuery,
} from "../../../lib/report-cube.js";
import {
  buildStudentProgressCharts,
  buildStudentProgressReport,
  loadProgressSubmissionOperations,
  summarizeStudentProgress,
} from "../../../lib/student-progress-report.js";
import { summarizeDailyAssessmentRollup, type ProgressMonthSnapshot } from "../../../lib/student-progress-assessment.js";
import { buildStudentProgressComparison, buildStudentProgressTimeline } from "../../../lib/student-progress-timeline.js";
import { normalizeProgressEntrySemantics } from "../../../lib/progress-difficulty.js";
import { getSettings } from "../../../lib/settings.js";
import type { AcademicSettingsContext } from "../../../lib/academic-settings.js";

function evidenceKey(studentId: string, classId: string) {
  return `${studentId}\u0000${classId}`;
}

function progressKey(studentId: string, classId: string, month: string) {
  return `${studentId}\u0000${classId}\u0000${month}`;
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function previousMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function progressRecordToSnapshot(record: any): ProgressMonthSnapshot {
  return {
    id: record.id,
    studentId: record.studentId,
    classId: record.classId,
    month: record.month,
    trackKey: record.trackKey,
    classType: record.classType,
    progressScore: record.progressScore,
    attendanceScore: record.attendanceScore,
    consistencyScore: record.consistencyScore,
    learningEvidenceCoverage: record.learningEvidenceCoverage,
    trackReadiness: record.trackReadiness,
    focusSkillKey: record.focusSkillKey,
    focusSkillLabel: record.focusSkillLabel,
    teacherNote: record.teacherNote,
    parentSummary: record.parentSummary,
    nextActions: record.nextActions,
    evidenceNotes: record.evidenceNotes,
    rubricSnapshot: record.rubricSnapshot,
    academicInputStatus: record.academicInputStatus,
    shieldTotal: record.shieldTotal,
    pointsTotal: record.pointsTotal,
    mockTestScore: record.mockTestScore,
    finalizedAt: record.finalizedAt,
    skills:
      record.skills?.map((skill: any) => ({
        skill_key: skill.skillKey,
        skill_label: skill.skillLabel,
        score: skill.score,
        max_score: skill.maxScore,
        weight: skill.weight,
        status: skill.status,
        note: skill.note,
        source: skill.source,
        sort_order: skill.sortOrder,
      })) || [],
    dailyEntries:
      record.dailyEntries?.map((entry: any) => ({
        entry_date: entry.entryDate,
        entry_type: entry.entryType,
        skill_key: entry.skillKey,
        score: entry.score,
        shield_count: entry.shieldCount,
        exam_set_level: normalizeProgressEntrySemantics(entry.examSetLevel, entry.difficultyLevel).examSetLevel,
        difficulty_level: normalizeProgressEntrySemantics(entry.examSetLevel, entry.difficultyLevel).difficultyLevel,
        note: entry.note,
      })) || [],
  };
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  try {
    const query = parseReportBiQuery({
      ...req.query,
      mode: "overview",
    });
    const businessMonths = [previousMonth(query.from), ...query.months];
    const rangeStart = parseMonthRange(businessMonths[0]).startDate;
    if (!req.user.tenantId) {
      throw new ApiError("TENANT_REQUIRED", "Tenant context is required", 403);
    }
    const academicSettingsByMonth = new Map<string, AcademicSettingsContext>();
    await Promise.all(
      businessMonths.map(async (month) => {
        const resolved = await getSettings(req.db, {
          tenantId: req.user.tenantId!,
          group: "academic",
          effectiveMonth: month,
        });
        if (resolved.settings.some((setting) => setting.warnings?.length)) {
          throw new ApiError("INVALID_SETTING_VALUE", "Invalid academic settings", 409);
        }
        academicSettingsByMonth.set(month, { settings: resolved.settings });
      }),
    );
    const rangeEnd = parseMonthRange(query.to).endDate;
    const enrollmentWhere: Record<string, unknown> = {
      enrollmentDate: { lt: rangeEnd },
      student: { deletedAt: null },
    };
    if (query.student_id) enrollmentWhere.studentId = query.student_id;

    const enrollmentPeriodWhere: Record<string, unknown> = {
      startedAt: { lt: rangeEnd },
      OR: [{ endedAt: null }, { endedAt: { gt: rangeStart } }],
      student: { deletedAt: null },
    };
    if (query.student_id) enrollmentPeriodWhere.studentId = query.student_id;

    const [enrollmentRows, enrollmentPeriodRows] = await Promise.all([
      req.db.studentClass.findMany({
        where: enrollmentWhere,
        select: {
          studentId: true,
          classId: true,
          enrollmentDate: true,
          status: true,
          student: {
            select: {
              fullName: true,
              parent: { select: { fullName: true, phone: true } },
            },
          },
          class: {
            select: {
              className: true,
              feePerDay: true,
              scheduleDays: true,
              sessionsPerWeek: true,
            },
          },
        },
        orderBy: [
          { student: { fullName: "asc" } },
          { class: { className: "asc" } },
        ],
      }),
      req.db.enrollmentPeriod.findMany({
        where: enrollmentPeriodWhere,
        select: {
          studentId: true,
          classId: true,
          startedAt: true,
          endedAt: true,
          student: {
            select: {
              fullName: true,
              parent: { select: { fullName: true, phone: true } },
            },
          },
          class: {
            select: {
              className: true,
              feePerDay: true,
              scheduleDays: true,
              sessionsPerWeek: true,
            },
          },
        },
        orderBy: [
          { student: { fullName: "asc" } },
          { class: { className: "asc" } },
          { startedAt: "asc" },
        ],
      }),
    ]);

    const studentIds = [...new Set([
      ...enrollmentRows.map((row) => row.studentId),
      ...enrollmentPeriodRows.map((row) => row.studentId),
    ])];
    const classIds = [...new Set([
      ...enrollmentRows.map((row) => row.classId),
      ...enrollmentPeriodRows.map((row) => row.classId),
    ])];
    const [
      attendanceRows,
      feeLineRows,
      monthlyFeeRows,
      progressRows,
      classMonthPlanRows,
      classSessionRows,
    ] = await Promise.all([
            req.db.attendance.findMany({
              where: {
                studentId: { in: studentIds },
                classId: { in: classIds },
                attendanceDate: { gte: rangeStart, lt: rangeEnd },
              },
              select: {
                studentId: true,
                classId: true,
                attendanceDate: true,
                status: true,
                isMakeUp: true,
              },
            }),
            req.db.monthlyFeeLine.findMany({
              where: {
                studentId: { in: studentIds },
                classId: { in: classIds },
                month: { in: businessMonths },
              },
              select: {
                id: true,
                monthlyFeeId: true,
                studentId: true,
                classId: true,
                month: true,
                expectedSessions: true,
                calculationSnapshot: true,
                amount: true,
                status: true,
                allocationConfidence: true,
              },
            }),
            req.db.monthlyFee.findMany({
              where: {
                studentId: { in: studentIds },
                month: { in: businessMonths },
              },
              select: {
                id: true,
                studentId: true,
                month: true,
                totalDays: true,
                totalAmount: true,
                status: true,
                receiptId: true,
                paidAt: true,
              },
            }),
            req.db.studentProgressMonth.findMany({
              where: {
                studentId: { in: studentIds },
                classId: { in: classIds },
                month: { in: [...new Set([...query.months, previousMonth(query.from)])] },
              },
              include: {
                skills: { orderBy: { sortOrder: "asc" } },
                dailyEntries: { orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }] },
              },
            }),
            req.db.classMonthPlan.findMany({
              where: {
                classId: { in: classIds },
                billingMonth: { in: businessMonths },
              },
              select: {
                classId: true,
                billingMonth: true,
                revisions: {
                  orderBy: { revision: "desc" },
                  select: { revision: true, snapshot: true },
                },
              },
            }),
            req.db.classSession.findMany({
              where: {
                classId: { in: classIds },
                billingMonth: { in: businessMonths },
                kind: "regular",
              },
              select: {
                classId: true,
                billingMonth: true,
                sessionDate: true,
                kind: true,
                status: true,
              },
            }),
      ]);

    const evidenceByEnrollment = new Set<string>();
    for (const record of attendanceRows) {
      evidenceByEnrollment.add(evidenceKey(record.studentId, record.classId));
    }
    for (const line of feeLineRows) {
      if (line.classId) evidenceByEnrollment.add(evidenceKey(line.studentId, line.classId));
    }

    const parentMap = new Map<string, { name: string | null; phone: string | null }>();
    const periodKeys = new Set(
      enrollmentPeriodRows.map((period) => evidenceKey(period.studentId, period.classId)),
    );
    const reportEnrollmentRows = [
      ...enrollmentPeriodRows.map((period) => ({
        studentId: period.studentId,
        classId: period.classId,
        enrollmentDate: period.startedAt,
        enrollmentEndDate: period.endedAt,
        status: "historical" as const,
        student: period.student,
        class: period.class,
      })),
      ...enrollmentRows.filter(
        (row) => !periodKeys.has(evidenceKey(row.studentId, row.classId)),
      ).filter((row) => {
        return (
          row.status === "active" ||
          evidenceByEnrollment.has(evidenceKey(row.studentId, row.classId))
        );
      }).map((row) => ({
        ...row,
        enrollmentEndDate: null,
      })),
    ];
    for (const row of reportEnrollmentRows) {
      parentMap.set(row.studentId, {
        name: row.student.parent?.fullName || null,
        phone: row.student.parent?.phone || null,
      });
    }

    const cube = buildReportCube({
      months: businessMonths,
      enrollments: reportEnrollmentRows.map((row) => ({
        studentId: row.studentId,
        studentName: row.student.fullName,
        classId: row.classId,
        className: row.class.className,
        enrollmentDate: row.enrollmentDate,
        enrollmentEndDate: row.enrollmentEndDate,
        feePerDay: row.class.feePerDay,
        scheduleDays: row.class.scheduleDays,
        sessionsPerWeek: row.class.sessionsPerWeek,
      })),
      attendance: attendanceRows,
      feeLines: feeLineRows,
      monthlyFees: monthlyFeeRows,
      classMonthPlans: classMonthPlanRows.map((row) => ({
        classId: row.classId,
        billingMonth: row.billingMonth,
        revisions: row.revisions,
      })),
      classSessions: classSessionRows,
    });

    // The cube includes a prior-month baseline solely for score comparisons.
    const filteredRows = filterReportRows(cube.students.filter((row) => query.months.includes(row.month)), {
      ...query,
      mode: "overview",
    });
    const progressMonthsByKey = new Map<string, ProgressMonthSnapshot>();
    for (const record of progressRows) {
      progressMonthsByKey.set(
        progressKey(record.studentId, record.classId, record.month),
        progressRecordToSnapshot(record)
      );
    }
    const attendanceDatesByProgressKey = new Map<string, Set<string>>();
    for (const record of attendanceRows) {
      const date = dateOnly(record.attendanceDate);
      const month = date.slice(0, 7);
      const key = progressKey(record.studentId, record.classId, month);
      const dates = attendanceDatesByProgressKey.get(key) || new Set<string>();
      dates.add(date);
      attendanceDatesByProgressKey.set(key, dates);
    }
    const submissionOperations = await loadProgressSubmissionOperations(req.db, req.user.tenantId, filteredRows);
    const report = buildStudentProgressReport({
      tenantId: req.user.tenantId,
      submissionOperations,
      rows: filteredRows,
      parentsByStudentId: parentMap,
      progressMonthsByKey,
      academicSettingsByMonth,
      baselineRows: cube.students.filter((row) => row.month === businessMonths[0]),
    });
    const track = getString(req.query.track);
    const readiness = getString(req.query.readiness);
    const academicStatus = getString(req.query.academic_status);
    const progressRecordByKey = new Map(
      progressRows.map((record) => [
        progressKey(record.studentId, record.classId, record.month),
        record,
      ])
    );
    const reportRows = report.rows.map((row) => {
      const current = progressRecordByKey.get(
        progressKey(row.student_id, row.class_id, row.month)
      );
      const previous = progressRecordByKey.get(
        progressKey(row.student_id, row.class_id, previousMonth(row.month))
      );
      const rollup = summarizeDailyAssessmentRollup(progressRecordToSnapshot(current || {}).dailyEntries || []);
      const currentRange = parseMonthRange(row.month);
      const previousRange = parseMonthRange(previousMonth(row.month));
      const inclusiveTo = (end: Date) => dateOnly(new Date(end.getTime() - 86_400_000));
      const settings = Object.fromEntries(academicSettingsByMonth);
      const currentTimeline = buildStudentProgressTimeline(
        current ? [current] : [], dateOnly(currentRange.startDate), inclusiveTo(currentRange.endDate), settings,
      );
      const previousTimeline = buildStudentProgressTimeline(
        previous ? [previous] : [], dateOnly(previousRange.startDate), inclusiveTo(previousRange.endDate), settings,
      );
      const alertComparison = buildStudentProgressComparison(currentTimeline, previousTimeline);
      currentTimeline.summary.alert_score_drop = alertComparison.alert_score_drop;
      const lastEntryDate = current?.dailyEntries?.length
        ? dateOnly(current.dailyEntries[current.dailyEntries.length - 1].entryDate)
        : null;
      return {
        ...row,
        daily_average_score: rollup.averageScore,
        daily_latest_score: rollup.latestScore,
        daily_score_delta: rollup.scoreDelta,
        daily_assessment_count: rollup.assessmentCount,
        last_entry_date: lastEntryDate,
        alert_score_drop: alertComparison.alert_score_drop,
        alert_comparison: alertComparison,
        chart_timeline: {
          ...currentTimeline,
          comparison: {
            previous_from: dateOnly(previousRange.startDate),
            previous_to: inclusiveTo(previousRange.endDate),
            ...alertComparison,
          },
        },
        attendance_dates: Array.from(
          attendanceDatesByProgressKey.get(progressKey(row.student_id, row.class_id, row.month)) ||
            new Set<string>()
        ).sort(),
      };
    }).filter((row) => {
      if (track && track !== "all" && row.english_track !== track) return false;
      if (readiness && readiness !== "all" && row.readiness_band !== readiness) return false;
      if (
        academicStatus &&
        academicStatus !== "all" &&
        row.academic_input_status !== academicStatus
      ) {
        return false;
      }
      return true;
    });
    const totalItems = reportRows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / query.page_size));
    const page = Math.min(Math.max(1, query.page), totalPages);
    const offset = (page - 1) * query.page_size;
    const classes = Array.from(
      new Map(
        reportEnrollmentRows.map((row) => [
          row.classId,
          { id: row.classId, class_name: row.class.className },
        ])
      ).values()
    ).sort((a, b) => a.class_name.localeCompare(b.class_name));

    return successResponse(res, {
      summary: summarizeStudentProgress(reportRows),
      charts: buildStudentProgressCharts(reportRows),
      students: reportRows.slice(offset, offset + query.page_size),
      framework: report.framework,
      pagination: {
        page,
        page_size: query.page_size,
        total_items: totalItems,
        total_pages: totalPages,
      },
      meta: {
        from: query.from,
        to: query.to,
        month_count: query.months.length,
        cube_grain: "student_class_month",
        report_type: "monthly_parent_progress",
        data_contract:
          "Uses real attendance/class/fee evidence. Teacher-entered academic inputs override proxy rows; missing skill scores remain explicit.",
        filters: {
          class_id: query.class_id,
          student_id: query.student_id,
          q: query.q,
          track: track || "all",
          readiness: readiness || "all",
          academic_status: academicStatus || "all",
        },
        classes,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    return sendApiError(res, error, "STUDENT_PROGRESS_REPORT_ERROR");
  }
}

export default requirePermission("progress.view", handler);
