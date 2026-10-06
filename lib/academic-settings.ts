import { getSettingDefinition, parseSettingValue } from "./settings-registry.js";

export const ACADEMIC_SETTING_KEYS = [
  "academic.track_catalog",
  "academic.rubric_base_weights",
  "academic.rubric_track_overrides",
  "academic.score_blend",
  "academic.readiness_thresholds",
  "academic.fallback_score_weights",
  "academic.consistency_penalties",
  "academic.difficulty_weights",
] as const;

export type AcademicSettingKey = (typeof ACADEMIC_SETTING_KEYS)[number];
export type AcademicSettingsContext =
  | Partial<Record<AcademicSettingKey, unknown>>
  | {
      settings?: ReadonlyArray<{ key: string; value: unknown }>;
    }
  | null;

type SkillWeights = Record<
  "listening" | "speaking" | "reading" | "writing" | "homework" | "daily_practice" | "mock_test",
  number
>;

export interface AcademicSettings {
  trackCatalog: Array<{
    key: "starters" | "movers" | "flyers" | "ket" | "pet" | "unknown";
    label: string;
    cefr: string;
    keywords: string[];
    canDo: string;
  }>;
  rubricBaseWeights: Record<"communicative" | "exam_prep" | "mixed", SkillWeights>;
  rubricTrackOverrides: Record<"starters" | "movers" | "flyers" | "ket" | "pet", SkillWeights>;
  scoreBlend: { skill: number; attendance: number; consistency: number };
  readinessThresholds: { onTrack: number; watch: number; riskAdjusted: number };
  fallbackScoreWeights: { attendance: number; completion: number };
  consistencyPenalties: {
    missingSession: number;
    absentNoFee: number;
    absentWithFee: number;
  };
  difficultyWeights: { delta: number; min: number; max: number };
}

export type AcademicSettingsSnapshotValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: AcademicSettingsSnapshotValue }
  | AcademicSettingsSnapshotValue[];

export type AcademicSettingsSnapshot = {
  [key: string]: AcademicSettingsSnapshotValue;
};

const propertyByKey = {
  "academic.track_catalog": "trackCatalog",
  "academic.rubric_base_weights": "rubricBaseWeights",
  "academic.rubric_track_overrides": "rubricTrackOverrides",
  "academic.score_blend": "scoreBlend",
  "academic.readiness_thresholds": "readinessThresholds",
  "academic.fallback_score_weights": "fallbackScoreWeights",
  "academic.consistency_penalties": "consistencyPenalties",
  "academic.difficulty_weights": "difficultyWeights",
} as const satisfies Record<AcademicSettingKey, keyof AcademicSettings>;

function contextValue(context: AcademicSettingsContext | undefined, key: AcademicSettingKey) {
  if (!context) return undefined;
  if ("settings" in context && Array.isArray(context.settings)) {
    return context.settings.find((setting) => setting.key === key)?.value;
  }
  const value = (context as Partial<Record<AcademicSettingKey, unknown>>)[key];
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "value" in value
  ) {
    return (value as { value: unknown }).value;
  }
  return value;
}

export function resolveAcademicSettings(
  context?: AcademicSettingsContext,
): AcademicSettings {
  const resolved: Partial<AcademicSettings> = {};
  for (const key of ACADEMIC_SETTING_KEYS) {
    const supplied = contextValue(context, key);
    const value = supplied === undefined
      ? getSettingDefinition(key).defaultValue
      : supplied;
    const property = propertyByKey[key];
    (resolved as Record<keyof AcademicSettings, unknown>)[property] = parseSettingValue(key, value);
  }
  return resolved as AcademicSettings;
}

export function snapshotAcademicSettings(
  context?: AcademicSettingsContext,
): AcademicSettingsSnapshot {
  return structuredClone(resolveAcademicSettings(context)) as unknown as AcademicSettingsSnapshot;
}

export function academicContextFromSnapshot(snapshot: unknown): AcademicSettingsContext | undefined {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return undefined;
  const values = snapshot as Record<string, unknown>;
  if (!ACADEMIC_SETTING_KEYS.every((key) => values[propertyByKey[key]] !== undefined)) return undefined;
  return Object.fromEntries(ACADEMIC_SETTING_KEYS.map((key) => [key, values[propertyByKey[key]]])) as AcademicSettingsContext;
}
