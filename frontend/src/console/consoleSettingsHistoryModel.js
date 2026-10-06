export function normalizeSettingHistoryPayload(payload) {
  const revisions = Array.isArray(payload?.revisions) ? payload.revisions : [];
  const page = Number.isInteger(payload?.page) && payload.page > 0 ? payload.page : 1;
  const pageSize = Number.isInteger(payload?.pageSize) && payload.pageSize > 0
    ? payload.pageSize
    : revisions.length || 10;
  const total = Number.isInteger(payload?.total) && payload.total >= 0
    ? payload.total
    : revisions.length;

  return {
    revisions,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function formatRevisionValue(value) {
  if (value === null || value === undefined) return "Chưa có giá trị";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  if (typeof value === "boolean") return value ? "Bật" : "Tắt";
  return String(value);
}

export function formatRevisionDate(value, locale = "vi-VN") {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Không rõ thời gian";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function revisionActorLabel(revision) {
  return revision?.changedBy?.fullName
    || revision?.changedBy?.username
    || revision?.actorName
    || revision?.changedById
    || "Không rõ người cập nhật";
}
