export const CAMBRIDGE_EXAM_SET_LEVELS = [
  "starters",
  "movers",
  "flyers",
  "ket",
  "pet",
] as const;

export type CambridgeExamSetLevel = (typeof CAMBRIDGE_EXAM_SET_LEVELS)[number];

export const DIFFICULTY_WEIGHT_DELTA = 0.15;
export const MIN_DIFFICULTY_WEIGHT = 0.7;
export const MAX_DIFFICULTY_WEIGHT = 1.3;

const rankByLevel = new Map<string, number>(
  CAMBRIDGE_EXAM_SET_LEVELS.map((level, index) => [level, index + 1])
);

const taskDifficultyLevels = new Set(["easy", "medium", "hard"]);

function normalizeLevel(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function getDifficultyWeight(
  examSetLevel: unknown,
  classTrackKey: unknown,
  difficultyLevel: unknown = null
) {
  const entryRank = rankByLevel.get(normalizeLevel(examSetLevel));
  const classRank = rankByLevel.get(normalizeLevel(classTrackKey));
  const examSetWeight =
    entryRank && classRank
      ? 1 + (entryRank - classRank) * DIFFICULTY_WEIGHT_DELTA
      : 1;
  // Descriptive only until an academic task-difficulty rubric is approved.
  void difficultyLevel;
  const weight = examSetWeight;
  return Math.round(
    Math.min(MAX_DIFFICULTY_WEIGHT, Math.max(MIN_DIFFICULTY_WEIGHT, weight)) * 1000
  ) / 1000;
}

export function normalizeProgressEntrySemantics(
  examSetLevel: unknown,
  difficultyLevel: unknown
) {
  const normalizedExamSet = normalizeLevel(examSetLevel);
  const normalizedDifficulty = normalizeLevel(difficultyLevel);
  const legacyExamSet = rankByLevel.has(normalizedDifficulty)
    ? normalizedDifficulty
    : null;

  return {
    examSetLevel: rankByLevel.has(normalizedExamSet)
      ? normalizedExamSet
      : legacyExamSet,
    difficultyLevel: taskDifficultyLevels.has(normalizedDifficulty)
      ? normalizedDifficulty
      : null,
  };
}

export function computeWeightedScore(score: unknown, weight: unknown) {
  if (score === null || score === undefined) return null;
  const rawScore = Number(score);
  const normalizedWeight = Number(weight);
  if (!Number.isFinite(rawScore)) return null;
  const effectiveWeight = Number.isFinite(normalizedWeight) ? normalizedWeight : 1;
  return Math.round(Math.min(100, Math.max(0, rawScore * effectiveWeight)) * 10) / 10;
}
