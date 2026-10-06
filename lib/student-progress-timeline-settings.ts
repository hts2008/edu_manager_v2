import { academicContextFromSnapshot, resolveAcademicSettings, type AcademicSettingsContext } from "./academic-settings.js";
import { ApiError } from "./api-utils.js";
import { getSettings } from "./settings.js";

export type TimelineSettingsByMonth = Record<string, AcademicSettingsContext | undefined>;

export function timelineMonthSettings(record: { finalizedAt?: unknown; rubricSnapshot?: unknown }, open?: AcademicSettingsContext): AcademicSettingsContext {
  if (!record.finalizedAt) return open ?? {};
  const snapshot = record.rubricSnapshot as { academicSettings?: Record<string, unknown> } | null;
  return academicContextFromSnapshot(snapshot?.academicSettings) ?? null;
}

export async function loadTimelineAcademicSettings(db: any, tenantId: string | null | undefined, records: Array<{ month: string; finalizedAt?: unknown }>): Promise<TimelineSettingsByMonth> {
  if (!tenantId) throw new ApiError("TENANT_REQUIRED", "Tenant context is required", 403);
  const result: TimelineSettingsByMonth = {};
  for (const month of new Set(records.filter((record) => !record.finalizedAt).map((record) => record.month))) {
    const { settings } = await getSettings(db, { tenantId, group: "academic", effectiveMonth: month });
    if (settings.some((setting) => setting.warnings?.length)) throw new ApiError("INVALID_SETTING_VALUE", "Invalid academic settings", 400);
    const context = { settings };
    try {
      resolveAcademicSettings(context);
    } catch {
      throw new ApiError("INVALID_SETTING_VALUE", "Invalid academic settings", 400);
    }
    result[month] = context;
  }
  return result;
}
