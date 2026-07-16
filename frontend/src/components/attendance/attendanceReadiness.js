import { calculateTuitionCharge } from "../../utils/tuitionV3.js";

export const ATTENDANCE_READINESS_ISSUES = Object.freeze({
  SESSION_UNRESOLVED: {
    label: "Buổi học chưa được xử lý",
    description: "Buổi học vẫn ở trạng thái dự kiến. Hãy xác nhận đã học hoặc đã hủy.",
    icon: "calendar-clock",
  },
  ATTENDANCE_INCOMPLETE: {
    label: "Điểm danh chưa đầy đủ",
    description: "Một hoặc nhiều học viên chưa có trạng thái điểm danh cho buổi học.",
    icon: "clipboard-x",
  },
  ENROLLMENT_CONFLICT: {
    label: "Xung đột thời gian ghi danh",
    description: "Có điểm danh nằm ngoài thời gian học viên được ghi danh vào lớp.",
    icon: "users",
  },
  MISSING_PUBLISHED_PLAN: {
    label: "Chưa có lịch học đã công bố",
    description: "Tháng này chưa có buổi học chính khóa trong sổ buổi học.",
    icon: "calendar-x",
  },
});

export function normalizeAttendanceReadiness(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.issues)) {
    return null;
  }

  const ready =
    typeof value.ready_to_lock === "boolean"
      ? value.ready_to_lock
      : typeof value.ready === "boolean"
        ? value.ready
        : null;
  if (ready === null) return null;

  return {
    ...value,
    ready,
    ready_to_lock: ready,
    issues: value.issues.filter(
      (issue) => issue && typeof issue === "object" && typeof issue.code === "string",
    ),
  };
}

export function getAttendanceReadinessError(response) {
  const readiness = normalizeAttendanceReadiness(response?.error?.details);
  if (!readiness) return null;
  return {
    error: response.error,
    readiness,
  };
}

export function formatAttendanceIssueDate(value) {
  if (!value) return "";
  const date = String(value).slice(0, 10);
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : String(value);
}

const PLAN_SOURCE_LABELS = Object.freeze({
  published_plan_snapshot: "Kế hoạch tháng đã công bố",
  current_regular_session_ledger: "Sổ buổi học hiện tại",
  none: "Chưa có kế hoạch",
  persisted_revision: "Kế hoạch tháng đã lưu",
  class_month_plan: "Kế hoạch tháng đã lưu",
  month_plan: "Kế hoạch tháng đã lưu",
  current_schedule: "Lịch cố định hiện tại",
  class_schedule: "Lịch cố định hiện tại",
  legacy_fallback: "Lịch lớp tương thích",
});

function nonNegativeInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

export function normalizeAttendancePlanReadiness(value) {
  if (!value || typeof value !== "object") return null;
  const issues = Array.isArray(value.issues) ? value.issues : [];
  const publishedPlanIssue = issues.find((issue) => issue?.code === "MISSING_PUBLISHED_PLAN");
  const summary = value.summary && typeof value.summary === "object" ? value.summary : {};
  const expectedValue = nonNegativeInteger(
    summary.expected_regular_sessions ??
      summary.expected_sessions ??
      publishedPlanIssue?.expected_sessions,
  );
  const expected = expectedValue ?? 0;
  const actual = nonNegativeInteger(
    summary.regular_sessions ??
      summary.actual_sessions ??
      publishedPlanIssue?.actual_sessions,
  ) ?? 0;
  const missing = nonNegativeInteger(
    summary.missing_count ?? summary.missing_sessions ?? publishedPlanIssue?.missing_count,
  );
  const rawSource =
    summary.expected_source ??
    summary.plan_source ??
    summary.schedule_source ??
    summary.denominator_source ??
    summary.expected_sessions_source ??
    summary.source ??
    value.plan_source ??
    value.expected_source ??
    value.schedule_source ??
    value.denominator_source ??
    value.source ??
    publishedPlanIssue?.plan_source ??
    publishedPlanIssue?.source ??
    "";

  return {
    month: value.month || "",
    expected,
    expectedKnown: expectedValue !== null,
    actual,
    missing: missing ?? Math.max(0, expected - actual),
    source: PLAN_SOURCE_LABELS[rawSource] || rawSource || "Chưa được backend cung cấp",
    hasPublishedPlanIssue: Boolean(publishedPlanIssue),
  };
}

export function buildMonthPlanFeePreview({
  billingPolicy,
  feeAmount,
  sessionCount,
} = {}) {
  const normalizedSessionCount = nonNegativeInteger(sessionCount);
  const normalizedFeeAmount = Number(feeAmount);
  if (
    !normalizedSessionCount ||
    !["monthly_prorated", "per_session"].includes(billingPolicy) ||
    !Number.isFinite(normalizedFeeAmount) ||
    normalizedFeeAmount < 0
  ) {
    return null;
  }
  return {
    billingPolicy,
    sessionCount: normalizedSessionCount,
    total: calculateTuitionCharge({
      billingPolicy,
      feeAmount: normalizedFeeAmount,
      plannedSessions: normalizedSessionCount,
      chargedSessions: normalizedSessionCount,
    }),
  };
}

export function findMonthPlanDateConflicts(sessions = []) {
  return [...new Set(
    sessions
      .filter((session) => session && (session.kind || "regular") !== "regular")
      .map((session) => String(session.date || session.session_date || "").slice(0, 10))
      .filter(Boolean),
  )].sort();
}

export function getAttendanceWeekMonthKeys(dates = []) {
  return [...new Set(
    dates
      .map(({ dateStr }) => String(dateStr || "").slice(0, 7))
      .filter((month) => /^\d{4}-\d{2}$/.test(month)),
  )].sort();
}

export function getAttendanceWeekMetadataState(dates = [], metadataByMonth = {}) {
  const monthKeys = getAttendanceWeekMonthKeys(dates);
  const pendingMonths = monthKeys.filter((month) => {
    const metadata = metadataByMonth?.[month];
    return !metadata ||
      metadata.periodLoaded !== true ||
      metadata.readinessLoaded !== true ||
      metadata.planLoaded !== true;
  });
  const loadedMonths = monthKeys.filter((month) => !pendingMonths.includes(month));
  const missingPeriodMonths = loadedMonths.filter(
    (month) => !metadataByMonth[month]?.period,
  );
  const nonOpenMonths = loadedMonths.filter((month) => {
    const period = metadataByMonth[month]?.period;
    return Boolean(period && period.status !== "open");
  });

  return {
    monthKeys,
    pendingMonths,
    missingPeriodMonths,
    nonOpenMonths,
    ready: monthKeys.length > 0 && pendingMonths.length === 0,
  };
}

export function getEditableAttendanceDates(
  dates = [],
  periods = {},
  metadataByMonth,
) {
  if (
    metadataByMonth !== undefined &&
    !getAttendanceWeekMetadataState(dates, metadataByMonth).ready
  ) {
    return [];
  }

  return dates.filter(({ dateStr }) => {
    const month = String(dateStr || "").slice(0, 7);
    const period = metadataByMonth === undefined
      ? periods?.[month]
      : metadataByMonth?.[month]?.period;
    // A fully loaded month without a period is still a valid attendance draft.
    // The save workflow creates the open period before writing any attendance.
    return !period || period.status === "open";
  });
}
