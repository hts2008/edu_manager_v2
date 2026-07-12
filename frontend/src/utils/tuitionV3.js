export const SESSION_PLAN_MODES = Object.freeze(["fixed", "flexible"]);
export const SESSION_STATUSES = Object.freeze(["planned", "held", "cancelled", "holiday"]);
export const SESSION_TYPES = Object.freeze(["regular", "makeup", "extra"]);
export const EXTRA_BILLING_TYPES = Object.freeze(["included", "surcharge"]);

const STATUS_LABELS = Object.freeze({
  planned: "Dự kiến",
  held: "Đã học",
  cancelled: "Đã hủy",
  holiday: "Nghỉ lễ",
});

const TYPE_LABELS = Object.freeze({
  regular: "Buổi thường",
  makeup: "Học bù",
  extra: "Buổi thêm",
});

function oneOf(value, options, fallback) {
  return options.includes(value) ? value : fallback;
}

export function formatTuitionMonth(month, locale = "vi-VN") {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || "")) return month || "-";
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

export function formatSessionDate(value, locale = "vi-VN") {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return value || "-";
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function normalizeTuitionSession(session = {}, index = 0) {
  const kind = oneOf(session.kind, SESSION_TYPES, "regular");
  const date = session.date || session.session_date || "";
  const replacesSessionId = session.replaces_session_id || session.replacement_for_id || null;
  return {
    ...session,
    id: session.id || `session-${index}`,
    date,
    status: oneOf(session.status, SESSION_STATUSES, "planned"),
    billing_month: session.billing_month || "",
    kind,
    extra_fee_mode: kind === "extra"
      ? oneOf(session.extra_fee_mode, EXTRA_BILLING_TYPES, "included")
      : null,
    replaces_session_id: kind === "makeup" ? replacesSessionId : null,
    conflict: Boolean(session.conflict),
  };
}

export function calculateTuitionSessionFee({ billingPolicy, feeAmount, plannedSessions } = {}) {
  const amount = Number(feeAmount) || 0;
  if (billingPolicy === "per_session") return amount;
  const sessionCount = Number(plannedSessions) || 0;
  return sessionCount > 0 ? Math.round(amount / sessionCount) : 0;
}

export function summarizeTuitionSessions(sessions = []) {
  const normalized = sessions.map(normalizeTuitionSession);
  const summary = {
    total: normalized.length,
    planned: 0,
    held: 0,
    cancelled: 0,
    holiday: 0,
    regular: 0,
    makeup: 0,
    extra: 0,
    includedExtra: 0,
    surchargeExtra: 0,
    replacements: 0,
    conflicts: 0,
  };

  normalized.forEach((session) => {
    summary[session.status] += 1;
    summary[session.kind] += 1;
    if (session.kind === "makeup" && session.replaces_session_id) summary.replacements += 1;
    if (session.kind === "extra" && session.extra_fee_mode === "included") summary.includedExtra += 1;
    if (session.kind === "extra" && session.extra_fee_mode === "surcharge") summary.surchargeExtra += 1;
    if (session.conflict) summary.conflicts += 1;
  });

  return summary;
}

export function findTuitionSessionConflicts(sessions = []) {
  const normalized = sessions.map(normalizeTuitionSession);
  const byId = new Map(normalized.map((session) => [session.id, session]));
  return normalized.flatMap((session) => {
    const issues = [];
    if (session.billing_month && session.date && !session.date.startsWith(`${session.billing_month}-`)) {
      issues.push({ id: `${session.id}-billing-month`, session_id: session.id, message: "Ngày học phải thuộc billing_month." });
    }
    if (session.kind === "makeup") {
      const replaced = byId.get(session.replaces_session_id);
      if (!replaced) issues.push({ id: `${session.id}-replacement`, session_id: session.id, message: "Buổi makeup phải tham chiếu buổi được thay thế." });
      else if (!session.billing_month || replaced.billing_month !== session.billing_month) issues.push({ id: `${session.id}-same-month`, session_id: session.id, message: "Buổi makeup chỉ được thay thế trong cùng billing_month." });
    }
    return issues;
  });
}

export function buildBillingExplanation({ sessions = [], baseAmount = 0, surchargeAmount = 0 } = {}) {
  const summary = summarizeTuitionSessions(sessions);
  return {
    summary,
    baseAmount: Number(baseAmount) || 0,
    surchargeAmount: Number(surchargeAmount) || 0,
    totalAmount: (Number(baseAmount) || 0) + (Number(surchargeAmount) || 0),
    replacementNote: summary.replacements
      ? `${summary.replacements} buổi bù thay thế trong cùng tháng, không tính thêm.`
      : "Không có buổi bù thay thế trong cùng tháng.",
    extraNote: summary.extra
      ? `${summary.includedExtra} buổi thêm đã bao gồm, ${summary.surchargeExtra} buổi phụ thu.`
      : "Không có buổi học thêm.",
  };
}

export function getSessionStatusLabel(status) {
  return STATUS_LABELS[status] || status;
}

export function getSessionTypeLabel(type) {
  return TYPE_LABELS[type] || type;
}
