import type { ProgressDailyEntryInput, ProgressSkillKey } from "./student-progress-assessment.js";

export const PROGRESS_FORMULA_VERSION = "TP-1";
export type ProgressScoreSource = "manual_monthly" | "daily_raw" | "operational_proxy" | "missing" | "legacy_unknown";
export type ProgressScoreMetric = {
  value: number | null;
  source: ProgressScoreSource;
  signature: string | null;
};

export function normalizedProgressScore(score: unknown, maxScore: unknown = 100): number | null {
  if (score === null || score === undefined || score === "") return null;
  const value = Number(score);
  if (!Number.isFinite(value)) return null;
  const max = Number(maxScore);
  return Math.max(0, Math.min(100, Number.isFinite(max) && max > 0 ? value / max * 100 : value));
}

export function scoredAcademicEntries(entries: ProgressDailyEntryInput[], keys: readonly ProgressSkillKey[]) {
  return entries.filter((entry) => entry.entry_type === "skill_assessment" &&
    entry.skill_key && keys.includes(entry.skill_key) && normalizedProgressScore(entry.score) !== null);
}

export function compareProgressScores(current: ProgressScoreMetric, previous?: ProgressScoreMetric | null) {
  const reason = !previous ? "baseline_missing"
    : current.value === null || previous.value === null ? "missing_evidence"
    : current.source === "legacy_unknown" || previous.source === "legacy_unknown" ? "legacy_unknown"
    : current.source !== previous.source ? "source_changed"
    : !current.signature || current.signature !== previous.signature ? "basis_changed"
    : null;
  return {
    comparable: reason === null,
    reason,
    delta: reason === null ? Math.round((current.value! - previous!.value!) * 10) / 10 : null,
    alert_score_drop: reason === null && previous!.value! > 0 && current.value! < previous!.value! * 0.85,
  };
}

export function previousProgressMonth(month: string) {
  const [year, value] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, value - 2, 1));
  return date.toISOString().slice(0, 7);
}

export function academicEntrySignature(entries: ProgressDailyEntryInput[]) {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const key = `${entry.skill_key}:${entry.exam_set_level || "unknown"}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const total = entries.length;
  return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([key, count]) => [key, count / total]);
}

export function storedProgressScore(record: { progressScore?: number | null; rubricSnapshot?: unknown }) {
  const rubric = record.rubricSnapshot as { scoreEvidence?: { source?: ProgressScoreSource; value?: number | null } } | null;
  return rubric?.scoreEvidence?.source === "missing" ? null : record.progressScore ?? null;
}
