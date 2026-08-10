import {
  computeWeightedScore,
  getDifficultyWeight,
  normalizeProgressEntrySemantics,
} from "./progress-difficulty.js";
import { PROGRESS_SKILL_LABELS } from "./student-progress-assessment.js";

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
  dailyEntries?: TimelineEntry[];
};

const skillKeys = Object.keys(PROGRESS_SKILL_LABELS);

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
  to: string
) {
  const granularity = chooseTimelineGranularity(from, to);
  const entriesByDate = new Map<string, Array<TimelineEntry & { classTrackKey: string; finalized: boolean }>>();

  for (const record of records) {
    for (const entry of record.dailyEntries || []) {
      const date = dateOnly(entry.entryDate);
      if (date < from || date > to) continue;
      const list = entriesByDate.get(date) || [];
      list.push({
        ...entry,
        classTrackKey: record.trackKey || "unknown",
        finalized: Boolean(record.finalizedAt),
      });
      entriesByDate.set(date, list);
    }
  }

  let previousTotal: number | null = null;
  let cumulativePoints = 0;
  const days = [...entriesByDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, entries]) => {
    const skills: Record<string, { raw_score: number | null; weighted_score: number | null }> = {};
    for (const skillKey of skillKeys) {
      const skillEntries = entries.filter((entry) => entry.skillKey === skillKey);
      skills[skillKey] = {
        raw_score: mean(skillEntries.map((entry) => entry.score)),
        weighted_score: mean(
          skillEntries.map((entry) =>
            computeWeightedScore(
              entry.score,
              getDifficultyWeight(
                entry.examSetLevel,
                entry.classTrackKey,
                entry.difficultyLevel
              )
            )
          )
        ),
      };
    }
    const total = mean(Object.values(skills).map((skill) => skill.raw_score));
    const weightedTotal = mean(Object.values(skills).map((skill) => skill.weighted_score));
    const delta = total === null || previousTotal === null ? null : round(total - previousTotal);
    if (total !== null) previousTotal = total;
    const points = entries.reduce((sum, entry) => sum + (Number.isFinite(entry.score) ? Number(entry.score) : 0), 0);
    cumulativePoints += points;
    return {
      date,
      month: date.slice(0, 7),
      month_finalized: entries.some((entry) => entry.finalized),
      raw_score: total,
      weighted_score: weightedTotal,
      delta,
      points,
      cumulative_points: cumulativePoints,
      skills,
      entries: entries.map((entry) => ({
        id: entry.id || null,
        entry_type: entry.entryType,
        skill_key: entry.skillKey || null,
        score: entry.score ?? null,
        weighted_score: computeWeightedScore(
          entry.score,
          getDifficultyWeight(
            entry.examSetLevel,
            entry.classTrackKey,
            entry.difficultyLevel
          )
        ),
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
        weighted_score: mean(bucketDays.map((day) => day.skills[skillKey]?.weighted_score)),
      };
    });
  }

  const growthBySkill: Record<string, { first_score: number | null; latest_score: number | null; growth: number | null }> = {};
  for (const skillKey of skillKeys) {
    const values = days.map((day) => day.skills[skillKey]?.raw_score).filter((value): value is number => value !== null && value !== undefined);
    const first = values[0] ?? null;
    const latest = values.at(-1) ?? null;
    growthBySkill[skillKey] = {
      first_score: first,
      latest_score: latest,
      growth: first === null || latest === null ? null : round(latest - first),
    };
  }
  const availableLatest = Object.entries(growthBySkill).filter(([, value]) => value.latest_score !== null);
  availableLatest.sort(([, a], [, b]) => Number(a.latest_score) - Number(b.latest_score));
  const firstTotal = days.find((day) => day.raw_score !== null)?.raw_score ?? null;
  const latestTotal = [...days].reverse().find((day) => day.raw_score !== null)?.raw_score ?? null;

  return {
    from,
    to,
    granularity,
    days,
    series,
    summary: {
      first_score: firstTotal,
      latest_score: latestTotal,
      growth: firstTotal === null || latestTotal === null ? null : round(latestTotal - firstTotal),
      cumulative_points: cumulativePoints,
      focus_skill_key: availableLatest[0]?.[0] || null,
      alert_score_drop:
        firstTotal !== null && latestTotal !== null ? latestTotal < firstTotal * 0.85 : false,
      skills: growthBySkill,
    },
  };
}

export function buildStudentProgressComparison(
  current: ReturnType<typeof buildStudentProgressTimeline>,
  previous: ReturnType<typeof buildStudentProgressTimeline>
) {
  const skills = Object.fromEntries(skillKeys.map((skillKey) => {
    const currentRaw = mean(current.days.map((day) => day.skills[skillKey]?.raw_score));
    const previousRaw = mean(previous.days.map((day) => day.skills[skillKey]?.raw_score));
    const currentWeighted = mean(current.days.map((day) => day.skills[skillKey]?.weighted_score));
    const previousWeighted = mean(previous.days.map((day) => day.skills[skillKey]?.weighted_score));
    return [skillKey, {
      current_raw_score: currentRaw,
      previous_raw_score: previousRaw,
      raw_delta: currentRaw === null || previousRaw === null ? null : round(currentRaw - previousRaw),
      current_weighted_score: currentWeighted,
      previous_weighted_score: previousWeighted,
      weighted_delta:
        currentWeighted === null || previousWeighted === null
          ? null
          : round(currentWeighted - previousWeighted),
    }];
  }));
  return { skills };
}
