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

export function calculateTuitionCharge({
  billingPolicy,
  feeAmount,
  plannedSessions,
  chargedSessions,
  regularSessions,
  chargedSessionDates,
} = {}) {
  const amount = Math.max(0, Number(feeAmount) || 0);
  if (Array.isArray(regularSessions) && Array.isArray(chargedSessionDates)) {
    const chargedDates = new Set(chargedSessionDates);
    const slots = regularSessions
      .map(normalizeTuitionSession)
      .filter((session) => session.kind === "regular" && session.date)
      .sort((left, right) =>
        left.date.localeCompare(right.date) || left.id.localeCompare(right.id),
      );
    if (!slots.length) return 0;
    const isChargeableSlot = (slot) =>
      chargedDates.has(slot.date) && slot.status !== "holiday" && slot.status !== "cancelled";
    if (billingPolicy === "per_session") {
      return slots.reduce(
        (total, slot) => total + (isChargeableSlot(slot) ? Math.round(amount) : 0),
        0,
      );
    }

    const monthlyAmount = Math.round(amount);
    const baseAmount = Math.floor(monthlyAmount / slots.length);
    const remainder = monthlyAmount % slots.length;
    return slots.reduce(
      (total, slot, index) =>
        total + (isChargeableSlot(slot) ? baseAmount + (index < remainder ? 1 : 0) : 0),
      0,
    );
  }

  const charged = Math.max(0, Number(chargedSessions) || 0);
  if (billingPolicy === "per_session") return Math.round(amount * charged);
  const planned = Math.max(0, Number(plannedSessions) || 0);
  return planned > 0 ? Math.round((amount * charged) / planned) : 0;
}

function validMonth(value) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value || "");
}

function sessionDate(session) {
  return String(session?.date || session?.session_date || "").slice(0, 10);
}

function normalizeMonthPlanWeekdays(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
  )].sort((left, right) => left - right);
}

function localDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function buildMondayCalendarWeeks(year, month, scheduleDays = [], today = new Date()) {
  const firstDay = new Date(year, month, 1);
  if (Number.isNaN(firstDay.getTime())) return [];
  const lastDay = new Date(year, month + 1, 0);
  const start = new Date(firstDay);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(lastDay);
  end.setDate(end.getDate() + ((7 - end.getDay()) % 7));
  const normalizedScheduleDays = new Set(scheduleDays.map(Number));
  const hasScheduleDays = normalizedScheduleDays.size > 0;
  const weeks = [];
  let week = [];

  for (const current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
    const date = new Date(current);
    week.push({
      day: date.getDate(),
      date,
      dateStr: localDateKey(date),
      isCurrentMonth: date.getFullYear() === year && date.getMonth() === month,
      isScheduleDay: !hasScheduleDays || normalizedScheduleDays.has(date.getDay()),
      isToday: date.toDateString() === today.toDateString(),
      weekday: date.getDay(),
    });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  return weeks;
}

export function classifyAttendanceDate({ date, monthPlan, scheduleDays = [] } = {}) {
  const dateKey = String(date || "").slice(0, 10);
  const normalizedPlan = normalizeMonthPlanResponse(monthPlan || {});
  const matchingSession = normalizedPlan.sessions
    .map(normalizeTuitionSession)
    .find((session) => session.date === dateKey);
  if (matchingSession) {
    return { kind: matchingSession.kind, session: matchingSession, source: "month_plan" };
  }

  if (normalizedPlan.source.includes("published")) {
    return {
      kind: normalizedPlan.regularDates.includes(dateKey) ? "regular" : "makeup",
      session: null,
      source: "month_plan",
    };
  }

  const weekday = new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();
  const normalizedScheduleDays = new Set(scheduleDays.map(Number));
  return {
    kind:
      normalizedScheduleDays.size === 0 || normalizedScheduleDays.has(weekday)
        ? "regular"
        : "makeup",
    session: null,
    source: "class_schedule",
  };
}

export function generateFixedMonthPlanDates(month, weekdays = []) {
  if (!validMonth(month)) return [];
  const normalizedWeekdays = [...new Set(
    weekdays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
  )].sort((a, b) => a - b);
  if (!normalizedWeekdays.length) return [];

  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const wanted = new Set(normalizedWeekdays);
  const dates = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(Date.UTC(year, monthNumber - 1, day));
    if (wanted.has(date.getUTCDay())) dates.push(date.toISOString().slice(0, 10));
  }
  return dates;
}

export function normalizeMonthPlanResponse(value = {}) {
  const root = value?.data && typeof value.data === "object" ? value.data : value;
  const nestedPlan = root?.plan && typeof root.plan === "object" ? root.plan : {};
  const rawScheduleMode = root?.schedule_mode ?? nestedPlan.schedule_mode;
  const rawWeekdays = root?.weekdays ?? root?.schedule_days ??
    nestedPlan.weekdays ?? nestedPlan.schedule_days;
  const scheduleMode = rawScheduleMode === "fixed_weekdays" || rawScheduleMode === "flexible"
    ? rawScheduleMode
    : null;
  const sessions = Array.isArray(root?.sessions)
    ? root.sessions
    : Array.isArray(nestedPlan.sessions)
      ? nestedPlan.sessions
      : [];
  const regularDates = sessions
    .filter((session) => (session?.kind || "regular") === "regular")
    .map(sessionDate)
    .filter(Boolean)
    .sort();
  const version = Number(
    root?.version ?? root?.revision ?? nestedPlan.version ?? nestedPlan.revision,
  );
  const expected = Number(
    root?.expected_regular_sessions ??
      root?.expected_sessions ??
      nestedPlan.expected_regular_sessions ??
      nestedPlan.expected_sessions,
  );

  return {
    version: Number.isInteger(version) && version >= 0 ? version : 0,
    state: root?.state || nestedPlan.state || "open",
    source:
      root?.plan_source ||
      root?.expected_source ||
      root?.schedule_source ||
      root?.source ||
      nestedPlan.plan_source ||
      nestedPlan.expected_source ||
      nestedPlan.schedule_source ||
      nestedPlan.source ||
      "",
    scheduleMode,
    weekdays: normalizeMonthPlanWeekdays(rawWeekdays),
    scheduleAuthorityKnown: scheduleMode !== null && Array.isArray(rawWeekdays),
    expectedRegularSessions:
      Number.isInteger(expected) && expected >= 0 ? expected : regularDates.length,
    regularDates,
    sessions,
  };
}

export function matchesMonthPlanScheduleAuthority(
  value,
  { mode, weekdays = [], requestedDates = [], minimumVersion = 0 } = {},
) {
  const plan = value?.scheduleAuthorityKnown === undefined
    ? normalizeMonthPlanResponse(value)
    : value;
  if (!plan.scheduleAuthorityKnown || plan.scheduleMode !== mode) return false;
  if (!Number.isInteger(plan.version) || plan.version < minimumVersion) return false;

  const expectedDates = [...new Set(requestedDates)]
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort();
  if (expectedDates.join("|") !== [...plan.regularDates].sort().join("|")) return false;

  const expectedWeekdays = mode === "fixed_weekdays"
    ? normalizeMonthPlanWeekdays(weekdays)
    : [];
  return expectedWeekdays.join("|") === plan.weekdays.join("|");
}

export function buildMonthPlanRequest({
  classId,
  month,
  mode,
  weekdays = [],
  sessionsPerWeek,
  selectedDates = [],
  reason,
  plan = {},
} = {}) {
  if (!classId || !validMonth(month)) throw new Error("Class and month are required");
  if (!Number.isInteger(plan.version) || plan.version < 0) {
    throw new Error("Month plan version is required");
  }
  const normalizedReason = String(reason || "").trim();
  if (!normalizedReason) throw new Error("A change reason is required");

  const rowVersions = Object.fromEntries(
    (plan.sessions || [])
      .filter((session) => session?.id && Number.isInteger(Number(session.version)))
      .map((session) => [session.id, Number(session.version)]),
  );
  const request = {
    class_id: classId,
    month,
    expected_version: plan.version,
    row_versions: rowVersions,
    schedule_mode: mode,
    reason: normalizedReason,
  };

  if (mode === "fixed_weekdays") {
    const normalizedWeekdays = [...new Set(
      weekdays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
    )].sort((a, b) => a - b);
    if (!normalizedWeekdays.length) throw new Error("Choose at least one weekday");
    return {
      ...request,
      weekdays: normalizedWeekdays,
      sessions_per_week:
        Number(sessionsPerWeek) > 0 ? Math.trunc(Number(sessionsPerWeek)) : normalizedWeekdays.length,
    };
  }

  if (mode !== "flexible") throw new Error("Unsupported month plan mode");
  const dates = [...new Set(selectedDates)]
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date.startsWith(`${month}-`))
    .sort();
  if (!dates.length) throw new Error("Choose at least one session date");
  return { ...request, dates };
}

export function buildMonthPlanPatchRequest({
  classId,
  month,
  mode,
  weekdays = [],
  sessionsPerWeek,
  requestedDates = [],
  reason,
  plan = {},
} = {}) {
  if (!classId || !validMonth(month)) throw new Error("Class and month are required");
  if (!Number.isInteger(plan.version) || plan.version < 0) {
    throw new Error("Month plan version is required");
  }
  const normalizedReason = String(reason || "").trim();
  if (!normalizedReason) throw new Error("A change reason is required");
  if (mode !== "fixed_weekdays" && mode !== "flexible") {
    throw new Error("Unsupported month plan mode");
  }

  const normalizedWeekdays = mode === "fixed_weekdays"
    ? normalizeMonthPlanWeekdays(weekdays)
    : [];
  if (mode === "fixed_weekdays" && !normalizedWeekdays.length) {
    throw new Error("Choose at least one weekday");
  }

  const dates = [...new Set(requestedDates)]
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date.startsWith(`${month}-`))
    .sort();
  if (!dates.length) throw new Error("Choose at least one session date");

  const regularSessions = (plan.sessions || [])
    .filter((session) => (session?.kind || "regular") === "regular")
    .map((session) => ({
      id: session.id,
      date: sessionDate(session),
      version: Number(session.version),
    }))
    .filter((session) => session.id && session.date);
  const requestedDateSet = new Set(dates);
  const currentRegularDates = new Set(regularSessions.map((session) => session.date));
  const rowVersions = Object.fromEntries(
    (plan.sessions || [])
      .filter((session) => session?.id && Number.isInteger(Number(session.version)))
      .map((session) => [session.id, Number(session.version)]),
  );

  const request = {
    class_id: classId,
    month,
    expected_version: plan.version,
    row_versions: rowVersions,
    schedule_mode: mode,
    weekdays: normalizedWeekdays,
    reason: normalizedReason,
    add_sessions: dates
      .filter((date) => !currentRegularDates.has(date))
      .map((date) => ({
        session_date: date,
        billing_month: month,
        kind: "regular",
        status: "planned",
      })),
    remove_session_ids: regularSessions
      .filter((session) => !requestedDateSet.has(session.date))
      .map((session) => session.id),
  };
  return mode === "fixed_weekdays"
    ? {
        ...request,
        sessions_per_week:
          Number(sessionsPerWeek) > 0
            ? Math.trunc(Number(sessionsPerWeek))
            : normalizedWeekdays.length,
      }
    : request;
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
