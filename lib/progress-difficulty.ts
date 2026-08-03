export const CAMBRIDGE_DIFFICULTY_LEVELS = [
  "starters",
  "movers",
  "flyers",
  "ket",
  "pet",
] as const;

export type CambridgeDifficultyLevel = (typeof CAMBRIDGE_DIFFICULTY_LEVELS)[number];

export const DIFFICULTY_WEIGHT_DELTA = 0.15;
export const MIN_DIFFICULTY_WEIGHT = 0.7;
export const MAX_DIFFICULTY_WEIGHT = 1.3;

const rankByLevel = new Map<string, number>(
  CAMBRIDGE_DIFFICULTY_LEVELS.map((level, index) => [level, index + 1])
);

function normalizeLevel(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function getDifficultyWeight(entryLevel: unknown, classTrackKey: unknown) {
  const entryRank = rankByLevel.get(normalizeLevel(entryLevel));
  const classRank = rankByLevel.get(normalizeLevel(classTrackKey));
  if (!entryRank || !classRank) return 1;

  const weight = 1 + (entryRank - classRank) * DIFFICULTY_WEIGHT_DELTA;
  return Math.min(MAX_DIFFICULTY_WEIGHT, Math.max(MIN_DIFFICULTY_WEIGHT, weight));
}

export function computeWeightedScore(score: unknown, weight: unknown) {
  if (score === null || score === undefined) return null;
  const rawScore = Number(score);
  const normalizedWeight = Number(weight);
  if (!Number.isFinite(rawScore)) return null;
  const effectiveWeight = Number.isFinite(normalizedWeight) ? normalizedWeight : 1;
  return Math.round(Math.min(100, Math.max(0, rawScore * effectiveWeight)) * 10) / 10;
}
