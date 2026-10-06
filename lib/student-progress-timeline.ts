import {
  computeWeightedScore,
  getDifficultyWeight,
  normalizeProgressEntrySemantics,
} from "./progress-difficulty.js";
import { PROGRESS_SKILL_LABELS } from "./student-progress-assessment.js";
import { resolveAcademicSettings } from "./academic-settings.js";
import { timelineMonthSettings, type TimelineSettingsByMonth } from "./student-progress-timeline-settings.js";
import { compareProgressScores, previousProgressMonth } from "./student-progress-evidence.js";

export type TimelineGranularity = "day" | "week" | "month";
export const MAX_PROGRESS_RANGE_DAYS = 732;

type TimelineEntry = {
  id?: string;
  entryDate: Date | string;
  entryType: string;
  skillKey?: string | null;
  score?: number | null;
  shieldCount?: number | null;
  examSetLevel?: string | null;
  difficultyLevel?: string | null;
  entryLabel?: string | null;
  note?: string | null;
  gradedByTeacherId?: string | null;
  gradedByTeacher?: { id?: string; fullName?: string } | null;
};

type TimelineMonth = {
  month: string;
  trackKey?: string | null;
  finalizedAt?: Date | string | null;
  rubricSnapshot?: unknown;
  dailyEntries?: TimelineEntry[];
};

const skillKeys = Object.keys(PROGRESS_SKILL_LABELS);

export function getTimelineBaseline(from: string, to: string) {
  const start = parseDate(from);
  const end = parseDate(to);
  const next = addDays(end, 1);
  const calendar = start.getUTCDate() === 1 && next.getUTCDate() === 1 && from.slice(0, 7) === to.slice(0, 7);
  const previousEnd = addDays(start, -1);
  const previousStart = calendar ? parseDate(`${previousProgressMonth(from.slice(0, 7))}-01`) : addDays(start, -daysInRange(from, to));
  return { from: dateOnly(previousStart), to: dateOnly(previousEnd), kind: calendar ? "previous_calendar_month" : "previous_equal_window" };
}

export function isTimelineScoreDrop(current: number | null, baseline: number | null, comparable = true) {
  return comparable && compareProgressScores(
    { value: current, source: "daily_raw", signature: "timeline" },
    { value: baseline, source: "daily_raw", signature: "timeline" },
  ).alert_score_drop;
}

function comparisonReason(a: { raw_score: number | null; signature: string }, b: { raw_score: number | null; signature: string } | undefined) {
  if (!b || a.raw_score === null || b.raw_score === null) return "insufficient_comparable_evidence";
  return compareProgressScores(
    { value: a.raw_score, source: "daily_raw", signature: a.signature },
    { value: b.raw_score, source: "daily_raw", signature: b.signature },
  ).reason;
}

function calibrationSignature(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return JSON.stringify([...counts].sort(([a], [b]) => a.localeCompare(b)).map(([key, count]) => [key, count / values.length]));
}

function dateOnly(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function mean(values: Array<number | null | undefined>) {
  const available = values.filter((value): value is number => Number.isFinite(value));
  return available.length ? round(available.reduce((sum, value) => sum + value, 0) / available.length) : null;
}

function daysInRange(from: string, to: string) {
  return Math.floor((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000) + 1;
}

export function chooseTimelineGranularity(from: string, to: string): TimelineGranularity {
  const days = daysInRange(from, to);
  if (days <= 45) return "day";
  if (days <= 186) return "week";
  return "month";
}

function isoWeekKey(value: string) {
  const date = parseDate(value);
  const weekday = date.getUTCDay() || 7;
  const monday = addDays(date, 1 - weekday);
  return dateOnly(monday);
}

function bucketKey(value: string, granularity: TimelineGranularity) {
  if (granularity === "day") return value;
  if (granularity === "week") return isoWeekKey(value);
  return value.slice(0, 7);
}

function allBucketKeys(from: string, to: string, granularity: TimelineGranularity) {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (let cursor = parseDate(from); cursor <= parseDate(to); cursor = addDays(cursor, 1)) {
    const key = bucketKey(dateOnly(cursor), granularity);
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
}

export function buildStudentProgressTimeline(
  records: TimelineMonth[],
  from: string,
  to: string,
  academicSettingsByMonth: TimelineSettingsByMonth = {}
) {
  const granularity = chooseTimelineGranularity(from, to);
  const entriesByDate = new Map<string, Array<TimelineEntry & { classTrackKey: string; finalized: boolean; weighted: number | null; calibration: string; performanceCalibration: string; settingsProvenance: string }>>();

  for (const record of records) {
    const settings = timelineMonthSettings(record, academicSettingsByMonth[record.month]);
    const configured = settings === null ? null : resolveAcademicSettings(settings).difficultyWeights;
    for (const entry of record.dailyEntries || []) {
      const date = dateOnly(entry.entryDate);
      if (date < from || date > to) continue;
      const list = entriesByDate.get(date) || [];
      list.push({
        ...entry,
        classTrackKey: record.trackKey || "unknown",
        finalized: Boolean(record.finalizedAt),
        weighted: settings === null ? null : computeWeightedScore(entry.score, getDifficultyWeight(normalizeProgressEntrySemantics(entry.examSetLevel, entry.difficultyLevel).examSetLevel, record.trackKey, entry.difficultyLevel, settings)),
        calibration: JSON.stringify([record.trackKey || "unknown", normalizeProgressEntrySemantics(entry.examSetLevel, entry.difficultyLevel).examSetLevel]),
        performanceCalibration: JSON.stringify(configured),
        settingsProvenance: settings === null ? "legacy_unknown" : record.finalizedAt ? "frozen_snapshot" : "effective_month",
      });
      entriesByDate.set(date, list);
    }
  }

  let previousObservation: { raw_score: number | null; signature: string } | undefined;
  let cumulativePoints = 0;
  const days = [...entriesByDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, entries]) => {
    const skills: Record<string, { raw_score: number | null; weighted_score: number | null; signature: string; performance_signature: string; evidence_count: number }> = {};
    for (const skillKey of skillKeys) {
      const skillEntries = entries.filter((entry) => entry.skillKey === skillKey && entry.entryType === "skill_assessment" && entry.score != null && Number.isFinite(entry.score));
      skills[skillKey] = {
        raw_score: mean(skillEntries.map((entry) => entry.score)),
        weighted_score: skillEntries.some((entry) => entry.weighted === null) ? null : mean(skillEntries.map((entry) => entry.weighted)),
        signature: calibrationSignature(skillEntries.map((entry) => entry.calibration)),
        performance_signature: calibrationSignature(skillEntries.map((entry) => entry.calibration + entry.performanceCalibration)),
        evidence_count: skillEntries.length,
      };
    }
    const total = mean(Object.values(skills).map((skill) => skill.raw_score));
    const assessed = Object.entries(skills).filter(([, skill]) => skill.raw_score !== null);
    const signature = JSON.stringify(assessed.map(([key, skill]) => [key, skill.signature]));
    const weightedTotal = assessed.some(([, skill]) => skill.weighted_score === null) ? null : mean(assessed.map(([, skill]) => skill.weighted_score));
    const reason = comparisonReason({ raw_score: total, signature }, previousObservation);
    const delta = reason === null ? round(total! - previousObservation!.raw_score!) : null;
    if (total !== null) previousObservation = { raw_score: total, signature };
    const points = entries.reduce((sum, entry) => sum + (Number.isFinite(entry.score) ? Number(entry.score) : 0), 0);
    cumulativePoints += points;
    return {
      date,
      month: date.slice(0, 7),
      month_finalized: entries.some((entry) => entry.finalized),
      raw_score: total,
      weighted_score: weightedTotal,
      delta,
      comparison_reason: reason,
      signature,
      performance_signature: JSON.stringify(assessed.map(([key, skill]) => [key, skill.performance_signature])),
      skill_keys: assessed.map(([key]) => key),
      source: total === null ? "missing" : "daily_raw",
      points,
      cumulative_points: cumulativePoints,
      skills,
      entries: entries.map((entry) => ({
        id: entry.id || null,
        entry_type: entry.entryType,
        skill_key: entry.skillKey || null,
        score: entry.score ?? null,
        weighted_score: entry.weighted,
        settings_provenance: entry.settingsProvenance,
        exam_set_level: normalizeProgressEntrySemantics(
          entry.examSetLevel,
          entry.difficultyLevel
        ).examSetLevel,
        difficulty_level: normalizeProgressEntrySemantics(
          entry.examSetLevel,
          entry.difficultyLevel
        ).difficultyLevel,
        entry_label: entry.entryLabel || null,
        shield_count: entry.shieldCount || 0,
        note: entry.note || null,
        graded_by_teacher_id: entry.gradedByTeacherId || null,
        graded_by_teacher_name: entry.gradedByTeacher?.fullName || null,
      })),
    };
  });

  const buckets = allBucketKeys(from, to, granularity);
  const series: Record<string, Array<{ period: string; raw_score: number | null; weighted_score: number | null }>> = {};
  for (const skillKey of skillKeys) {
    series[skillKey] = buckets.map((period) => {
      const bucketDays = days.filter((day) => bucketKey(day.date, granularity) === period);
      return {
        period,
        raw_score: mean(bucketDays.map((day) => day.skills[skillKey]?.raw_score)),
        weighted_score: bucketDays.some((day) => day.skills[skillKey].raw_score !== null && day.skills[skillKey].weighted_score === null) ? null : mean(bucketDays.map((day) => day.skills[skillKey]?.weighted_score)),
      };
    });
  }

  const growthBySkill: Record<string, { first_score: number | null; latest_score: number | null; growth: number | null; comparison_reason: string | null; assessed_date_count: number }> = {};
  for (const skillKey of skillKeys) {
    const observations = days.map((day) => day.skills[skillKey]).filter((skill) => skill.raw_score !== null);
    const first = observations[0]?.raw_score ?? null;
    const latest = observations.at(-1)?.raw_score ?? null;
    const reason = observations.length < 2 ? "insufficient_comparable_evidence" : new Set(observations.map((skill) => skill.signature)).size > 1 ? "coverage_or_calibration_changed" : null;
    growthBySkill[skillKey] = {
      first_score: first,
      latest_score: latest,
      growth: reason === null ? round(latest! - first!) : null,
      comparison_reason: reason,
      assessed_date_count: observations.length,
    };
  }
  const availableLatest = Object.entries(growthBySkill).filter(([, value]) => value.latest_score !== null);
  availableLatest.sort(([, a], [, b]) => Number(a.latest_score) - Number(b.latest_score));
  const observations = days.filter((day) => day.raw_score !== null);
  const firstTotal = observations[0]?.raw_score ?? null;
  const latestTotal = observations.at(-1)?.raw_score ?? null;
  const reason = observations.length < 2 ? "insufficient_comparable_evidence" : new Set(observations.map((day) => day.signature)).size > 1 ? "coverage_or_calibration_changed" : null;

  return {
    from,
    to,
    granularity,
    days,
    series,
    summary: {
      first_score: firstTotal,
      latest_score: latestTotal,
      growth: reason === null ? round(latestTotal! - firstTotal!) : null,
      comparison_reason: reason,
      cumulative_points: cumulativePoints,
      focus_skill_key: availableLatest[0]?.[0] || null,
      alert_score_drop:
        isTimelineScoreDrop(latestTotal, firstTotal, reason === null),
      skills: growthBySkill,
    },
  };
}

export function buildStudentProgressComparison(
  current: ReturnType<typeof buildStudentProgressTimeline>,
  previous: ReturnType<typeof buildStudentProgressTimeline>
) {
  const signature = (values: string[]) => {
    const counts = new Map<string, number>();
    for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
    return JSON.stringify([...counts].sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => [value, count / values.length]));
  };
  const skills = Object.fromEntries(skillKeys.map((skillKey) => {
    const currentRaw = mean(current.days.map((day) => day.skills[skillKey]?.raw_score));
    const previousRaw = mean(previous.days.map((day) => day.skills[skillKey]?.raw_score));
    const currentWeighted = mean(current.days.map((day) => day.skills[skillKey]?.weighted_score));
    const previousWeighted = mean(previous.days.map((day) => day.skills[skillKey]?.weighted_score));
    const currentSkills = current.days.map((day) => day.skills[skillKey]).filter((skill) => skill.raw_score !== null);
    const previousSkills = previous.days.map((day) => day.skills[skillKey]).filter((skill) => skill.raw_score !== null);
    const comparison = compareProgressScores(
      { value: currentRaw, source: "daily_raw", signature: signature(currentSkills.map((skill) => skill.signature)) },
      { value: previousRaw, source: "daily_raw", signature: signature(previousSkills.map((skill) => skill.signature)) },
    );
    const reason = comparison.reason;
    const weightedReason = reason || (currentWeighted === null || previousWeighted === null ||
      [...currentSkills, ...previousSkills].some((skill) => skill.weighted_score === null)
      ? "settings_provenance_unavailable" : signature(currentSkills.map((skill) => skill.performance_signature)) !== signature(previousSkills.map((skill) => skill.performance_signature)) ? "performance_settings_changed" : null);
    return [skillKey, {
      current_raw_score: currentRaw,
      previous_raw_score: previousRaw,
      raw_delta: comparison.delta,
      comparison_reason: reason,
      weighted_comparison_reason: weightedReason,
      current_weighted_score: currentWeighted,
      previous_weighted_score: previousWeighted,
      weighted_delta:
        weightedReason !== null
          ? null
          : round(currentWeighted! - previousWeighted!),
    }];
  }));
  const currentDays = current.days.filter((day) => day.raw_score !== null);
  const previousDays = previous.days.filter((day) => day.raw_score !== null);
  const currentRaw = mean(currentDays.map((day) => day.raw_score));
  const previousRaw = mean(previousDays.map((day) => day.raw_score));
  const comparison = compareProgressScores(
    { value: currentRaw, source: "daily_raw", signature: signature(currentDays.map((day) => day.signature)) },
    { value: previousRaw, source: "daily_raw", signature: signature(previousDays.map((day) => day.signature)) },
  );
  return { skills, current_raw_score: currentRaw, previous_raw_score: previousRaw, raw_delta: comparison.delta, comparison_reason: comparison.reason, alert_score_drop: comparison.alert_score_drop, baseline_kind: getTimelineBaseline(current.from, current.to).kind };
}
