type DailyMetricEntry = {
  entryDate: Date | string;
  entryType: string;
  skillKey?: string | null;
  score?: number | null;
};

function dateOnly(value: Date | string) {
  return (value instanceof Date ? value : new Date(value)).toISOString().slice(0, 10);
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function deriveMockTestScores(entries: DailyMetricEntry[]) {
  const explicitByDate = new Map<string, number[]>();
  const markerDates = new Set<string>();
  const skillsByDate = new Map<string, number[]>();

  for (const entry of entries) {
    const date = dateOnly(entry.entryDate);
    const numeric = Number(entry.score);
    if (entry.entryType === "mock_test") {
      if (Number.isFinite(numeric) && entry.score !== null && entry.score !== undefined) {
        const scores = explicitByDate.get(date) || [];
        scores.push(numeric);
        explicitByDate.set(date, scores);
      } else {
        markerDates.add(date);
      }
    }
    if (
      entry.entryType === "skill_assessment" &&
      entry.skillKey &&
      Number.isFinite(numeric) &&
      entry.score !== null &&
      entry.score !== undefined
    ) {
      const scores = skillsByDate.get(date) || [];
      scores.push(numeric);
      skillsByDate.set(date, scores);
    }
  }

  const scores = [...explicitByDate.values()].flat();
  for (const date of markerDates) {
    if (explicitByDate.has(date)) continue;
    const derived = mean(skillsByDate.get(date) || []);
    if (derived !== null) scores.push(derived);
  }
  return scores;
}

export function resolveMonthlyProgressScore(input: {
  dailyAverageScore: number | null;
  previousProgressScore: number;
  manualSkillCount: number;
}) {
  if (input.manualSkillCount > 0) return input.previousProgressScore;
  return input.dailyAverageScore ?? 0;
}
