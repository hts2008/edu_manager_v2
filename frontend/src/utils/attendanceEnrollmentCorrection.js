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

export function resolveEnrollmentCorrection({
  weekDates = [],
  students = [],
  ledgerSessions = [],
}) {
  const weekDateKeys = new Set(
    weekDates.map((item) => item.dateStr).filter(Boolean),
  );
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

  if (!effectiveDate) return { effectiveDate: "", students: [] };

  return {
    effectiveDate,
    students: students.filter((student) => {
      if (student.enrollment_status && student.enrollment_status !== "active") {
        return false;
      }
      return (
        !isStudentEligibleOnDate(student, effectiveDate) &&
        hasLaterActiveEnrollment(student, effectiveDate)
      );
    }),
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
