export function isStudentEligibleOnDate(student, dateStr) {
  const periods = student?.enrollment_periods;
  if (Array.isArray(periods) && periods.length > 0) {
    return periods.some(
      (period) =>
        period.started_at <= dateStr &&
        (!period.ended_at || dateStr < period.ended_at),
    );
  }
  if (student?.enrollment_status && student.enrollment_status !== "active") {
    return false;
  }
  return !student?.enrollment_date || dateStr >= student.enrollment_date;
}

function hasLaterActiveEnrollment(student, effectiveDate) {
  const periods = student?.enrollment_periods;
  if (Array.isArray(periods) && periods.length > 0) {
    return periods.some(
      (period) => !period.ended_at && period.started_at > effectiveDate,
    );
  }
  return Boolean(
    student?.enrollment_date && student.enrollment_date > effectiveDate,
  );
}

export function resolveEnrollmentCorrectionStudents(students = [], effectiveDate = "") {
  if (!effectiveDate) return [];
  return students.filter((student) => {
    if (student.enrollment_status && student.enrollment_status !== "active") {
      return false;
    }
    return (
      !isStudentEligibleOnDate(student, effectiveDate) &&
      hasLaterActiveEnrollment(student, effectiveDate)
    );
  });
}

export function resolveEnrollmentCorrection({
  weekDates = [],
  students = [],
  ledgerSessions = [],
  maxEffectiveDate = "",
}) {
  const selectableWeekDateKeys = weekDates
    .map((item) => item.dateStr)
    .filter((dateStr) => dateStr && (!maxEffectiveDate || dateStr <= maxEffectiveDate));
  const weekDateKeys = new Set(selectableWeekDateKeys);
  const effectiveDate = ledgerSessions
    .filter(
      (session) =>
        session.kind === "regular" &&
        session.status !== "cancelled" &&
        session.status !== "holiday" &&
        weekDateKeys.has(session.date),
    )
    .map((session) => session.date)
    .filter(Boolean)
    .sort()[0] || "";
  const suggestedEffectiveDate =
    effectiveDate ||
    weekDates.find(
      (item) => item.isScheduleDay && weekDateKeys.has(item.dateStr),
    )?.dateStr ||
    selectableWeekDateKeys[0] ||
    "";

  if (!suggestedEffectiveDate) {
    return {
      effectiveDate: "",
      suggestedEffectiveDate: "",
      effectiveDateSource: "none",
      students: [],
    };
  }

  const correctionDateKeys = effectiveDate
    ? selectableWeekDateKeys.filter((dateStr) => dateStr >= effectiveDate)
    : selectableWeekDateKeys;
  const affectedStudentIds = new Set(
    correctionDateKeys.flatMap((dateStr) =>
      resolveEnrollmentCorrectionStudents(students, dateStr).map(
        (student) => student.id,
      ),
    ),
  );

  return {
    effectiveDate,
    suggestedEffectiveDate,
    effectiveDateSource: effectiveDate ? "ledger" : "week_selection",
    students: students.filter((student) => affectedStudentIds.has(student.id)),
  };
}

export function validateEnrollmentCorrectionResult(enrollment, expectedCount) {
  const adjusted = Number(enrollment?.adjusted || 0);
  const skipped = Number(enrollment?.skipped || 0);
  return {
    complete: expectedCount > 0 && adjusted === expectedCount && skipped === 0,
    adjusted,
    skipped,
  };
}
