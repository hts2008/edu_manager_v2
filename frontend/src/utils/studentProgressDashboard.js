export const PROGRESS_SKILLS = [
  { key: "listening", label: "Nghe", color: "#4f46e5" },
  { key: "speaking", label: "Nói", color: "#0891b2" },
  { key: "reading", label: "Đọc", color: "#16a34a" },
  { key: "writing", label: "Viết", color: "#ea580c" },
  { key: "homework", label: "BTVN", color: "#9333ea" },
  { key: "daily_practice", label: "Luyện hằng ngày", color: "#db2777" },
  { key: "mock_test", label: "Bài kiểm tra / đề", color: "#ca8a04" },
];

const GRID_EVIDENCE_TYPES = new Set(["mock_test", "homework", "daily_practice"]);

function normalizedEntryMetadata(entry) {
  return JSON.stringify([
    entry?.exam_set_level || null,
    entry?.difficulty_level || null,
    entry?.entry_label?.trim() || null,
    entry?.graded_by_teacher_id || null,
  ]);
}

export function analyzeDailyEntriesForGrid(entries = []) {
  const reasons = new Set();
  const contentEntries = entries.filter(
    (entry) => entry?.entry_type !== "shield" && entry?.entry_type !== "note",
  );
  const scoreCounts = new Map();
  let supplementalCount = 0;

  for (const entry of contentEntries) {
    const hasScore = entry?.score !== null && entry?.score !== undefined;
    if (hasScore && entry?.skill_key) {
      scoreCounts.set(entry.skill_key, (scoreCounts.get(entry.skill_key) || 0) + 1);
      if (entry.entry_type !== "skill_assessment") reasons.add("unsupported_scored_entry");
      if (!PROGRESS_SKILLS.some((skill) => skill.key === entry.skill_key)) {
        reasons.add("unsupported_skill");
      }
      continue;
    }

    if (GRID_EVIDENCE_TYPES.has(entry?.entry_type)) {
      supplementalCount += 1;
      if (entry?.skill_key) reasons.add("unsupported_evidence_shape");
    } else {
      reasons.add("unsupported_entry_type");
    }
  }

  if ([...scoreCounts.values()].some((count) => count > 1)) reasons.add("duplicate_skill");
  if (supplementalCount > 1) reasons.add("multiple_evidence_entries");
  if (new Set(contentEntries.map(normalizedEntryMetadata)).size > 1) {
    reasons.add("heterogeneous_metadata");
  }
  if (entries.filter((entry) => entry?.entry_type === "shield").length > 1) {
    reasons.add("multiple_shield_entries");
  }

  return { safe: reasons.size === 0, reasons: [...reasons] };
}

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

export function getProgressPeriodRange(mode, anchorValue = dateOnly(new Date())) {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(String(anchorValue || "").slice(0, 10))
    ? String(anchorValue).slice(0, 10)
    : dateOnly(new Date());
  const candidate = new Date(`${normalized}T00:00:00.000Z`);
  const anchor = Number.isNaN(candidate.getTime()) ? new Date(`${dateOnly(new Date())}T00:00:00.000Z`) : candidate;
  if (mode === "week") {
    const weekday = anchor.getUTCDay() || 7;
    const from = addDays(anchor, 1 - weekday);
    return { from: dateOnly(from), to: dateOnly(addDays(from, 6)) };
  }
  if (mode === "year") {
    const year = anchor.getUTCFullYear();
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  return {
    from: `${year}-${String(month + 1).padStart(2, "0")}-01`,
    to: dateOnly(lastDay),
  };
}

export function buildProgressChartRows(series = {}, scoreMode = "raw") {
  const periods = new Set();
  for (const values of Object.values(series)) {
    for (const item of values || []) periods.add(item.period);
  }
  return [...periods].sort().map((period) => {
    const row = { period };
    for (const skill of PROGRESS_SKILLS) {
      const item = (series[skill.key] || []).find((value) => value.period === period);
      const value = item?.[`${scoreMode}_score`];
      row[skill.key] = Number.isFinite(value) ? value : null;
    }
    return row;
  });
}

export function buildSkillGrowthRows(summary = {}) {
  return PROGRESS_SKILLS.map((skill) => ({
    key: skill.key,
    skill: skill.label,
    color: skill.color,
    first: finiteProgressValue(summary.skills?.[skill.key]?.first_score),
    latest: finiteProgressValue(summary.skills?.[skill.key]?.latest_score),
    growth: finiteProgressValue(summary.skills?.[skill.key]?.growth),
  }));
}

export function buildLatestSkillDeltaRows(days = [], scoreMode = "raw") {
  return PROGRESS_SKILLS.map((skill) => {
    const observations = days.map((day) => day.skills?.[skill.key]).filter((item) => Number.isFinite(item?.[`${scoreMode}_score`]));
    const latest = observations.at(-1)?.[`${scoreMode}_score`] ?? null;
    const previous = observations.at(-2)?.[`${scoreMode}_score`] ?? null;
    const signatureKey = scoreMode === "weighted" ? "performance_signature" : "signature";
    const changedBasis = observations.at(-1)?.[signatureKey] !== observations.at(-2)?.[signatureKey];
    return {
      key: skill.key,
      skill: skill.label,
      latest,
      previous,
      delta: changedBasis || latest === null || previous === null ? null : Math.round((latest - previous) * 10) / 10,
    };
  });
}

export function buildSkillComparisonRows(comparison = {}, scoreMode = "raw") {
  return PROGRESS_SKILLS.map((skill) => ({
    key: skill.key,
    skill: skill.label,
    current: finiteProgressValue(comparison.skills?.[skill.key]?.[`current_${scoreMode}_score`]),
    previous: finiteProgressValue(comparison.skills?.[skill.key]?.[`previous_${scoreMode}_score`]),
  }));
}

export function buildDailyEntryPayload({
  studentId,
  classId,
  entryDate,
  form,
}) {
  if (form?.edit_safety?.safe === false) {
    throw new Error(
      "Ngày này có nhiều evidence khác nhau nên không thể sửa an toàn bằng lưới đơn.",
    );
  }
  const entries = (form.skills || [])
    .filter((skill) => skill.score !== "" && skill.score !== null && skill.score !== undefined)
    .map((skill) => ({
      entry_type: "skill_assessment",
      skill_key: skill.skill_key,
      score: Number(skill.score),
      shield_count: 0,
      exam_set_level: form.exam_set_level || null,
      difficulty_level: form.difficulty_level || null,
      entry_label: form.entry_label?.trim() || null,
      graded_by_teacher_id: form.graded_by_teacher_id || null,
      note: null,
    }));
  if (form.entry_type && form.entry_type !== "skill_assessment") {
    entries.push({
      entry_type: form.entry_type,
      skill_key: null,
      score: null,
      shield_count: 0,
      exam_set_level: form.exam_set_level || null,
      difficulty_level: form.difficulty_level || null,
      entry_label: form.entry_label?.trim() || null,
      graded_by_teacher_id: form.graded_by_teacher_id || null,
      note: null,
    });
  }
  const shieldCount = Number(form.shield_count || 0);
  if (shieldCount > 0) {
    entries.push({
      entry_type: "shield",
      skill_key: null,
      score: null,
      shield_count: shieldCount,
      exam_set_level: null,
      difficulty_level: null,
      entry_label: form.entry_label?.trim() || null,
      graded_by_teacher_id: form.graded_by_teacher_id || null,
      note: null,
    });
  }
  return {
    student_id: studentId,
    class_id: classId,
    entry_date: entryDate,
    note: form.note?.trim() || null,
    entries,
  };
}

function finiteProgressValue(value) {
  return Number.isFinite(value) ? value : null;
}

export function formatProgressValue(value, suffix = "") {
  return Number.isFinite(value) ? `${value}${suffix}` : "—";
}

export function formatProgressDelta(value, suffix = "") {
  return Number.isFinite(value) ? `${value > 0 ? "+" : ""}${value}${suffix}` : "—";
}

export function progressDeltaTone(value) {
  return !Number.isFinite(value) ? "text-slate-500" : value >= 0 ? "text-emerald-600" : "text-rose-600";
}

export function createProgressRequestGuard() {
  let generation = 0;
  return {
    begin() {
      const request = ++generation;
      return { isCurrent: () => request === generation };
    },
    cancel() { generation += 1; },
  };
}

export function selectedProgressMonthTrack(daily, rows = [], date = "") {
  const month = date.slice(0, 7);
  const selected = rows.find((row) => row.month === month);
  return daily?.progress_month?.track_key ?? selected?.english_track ?? selected?.progress_assessment?.trackKey ?? "";
}

export async function loadProgressGraders(fetchTeachers) {
  try {
    const response = await fetchTeachers();
    const teachers = response.data?.teachers ?? response.data;
    if (!response.success || !Array.isArray(teachers)) throw new Error("Graders unavailable");
    return { teachers, unavailable: false };
  } catch {
    return { teachers: [], unavailable: true };
  }
}

export function progressEvidenceLabel(row = {}) {
  const assessment = row.progress_assessment || {};
  const source = row.score_source ?? assessment.scoreSource;
  const labels = { daily_raw: "Điểm thô hằng ngày", manual_monthly: "Điểm tháng", operational_proxy: "Chỉ số vận hành", missing: "Chưa có dữ liệu", legacy_unknown: "Nguồn lịch sử chưa xác định" };
  const contributors = assessment.contributors ?? row.contributors ?? [];
  const skills = contributors.map((key) => PROGRESS_SKILLS.find((skill) => skill.key === key)?.label || key);
  return [labels[source] || "Nguồn chưa xác định", ...skills].join(" · ");
}

export function progressReportScoreNote(row = {}) {
  const source = progressEvidenceLabel(row);
  if (!Number.isFinite(row.progress_score) || row.progress_score === row.daily_average_score) return source;
  return `Điểm tháng: ${formatProgressValue(row.progress_score, "/100")} · ${source}`;
}
