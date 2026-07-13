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
