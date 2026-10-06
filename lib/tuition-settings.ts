import { getSettingDefinition, parseSettingValue } from "./settings-registry.js";
import { ApiError } from "./api-utils.js";
import { getSettings, type SettingsDatabase } from "./settings.js";

export type ChargeableAttendanceStatus =
  | "present"
  | "absent_with_fee"
  | "absent_no_fee"
  | "holiday";

export type ExtraSessionPolicy = "derive_monthly" | "per_session_fee";

export interface TuitionSettingsContext {
  readonly chargeableStatuses: readonly ChargeableAttendanceStatus[];
  readonly defaultSessionDays: readonly number[];
  readonly extraSessionPolicy: ExtraSessionPolicy;
  readonly makeUpDefaultReason: string;
}

export type TuitionSettingOverrides = Partial<Record<
  | "finance.chargeable_statuses"
  | "finance.default_session_days"
  | "finance.extra_session_policy"
  | "finance.makeup_default_reason",
  unknown
>>;

function settingValue<T>(key: keyof TuitionSettingOverrides, overrides: TuitionSettingOverrides) {
  const raw = Object.prototype.hasOwnProperty.call(overrides, key)
    ? overrides[key]
    : getSettingDefinition(key).defaultValue;
  return parseSettingValue(key, raw) as T;
}

export function buildTuitionSettingsContext(
  overrides: TuitionSettingOverrides = {},
): TuitionSettingsContext {
  return Object.freeze({
    chargeableStatuses: Object.freeze(settingValue<ChargeableAttendanceStatus[]>(
      "finance.chargeable_statuses",
      overrides,
    )),
    defaultSessionDays: Object.freeze(settingValue<number[]>(
      "finance.default_session_days",
      overrides,
    )),
    extraSessionPolicy: settingValue<ExtraSessionPolicy>(
      "finance.extra_session_policy",
      overrides,
    ),
    makeUpDefaultReason: settingValue<string>(
      "finance.makeup_default_reason",
      overrides,
    ),
  });
}

export const DEFAULT_TUITION_SETTINGS = buildTuitionSettingsContext();

export async function loadTuitionSettings(
  db: SettingsDatabase,
  input: { tenantId: string; effectiveMonth: string },
) {
  const resolved = await getSettings(db, {
    tenantId: input.tenantId,
    group: "finance",
    effectiveMonth: input.effectiveMonth,
  });
  const overrides = Object.fromEntries(
    resolved.settings.map((setting) => [setting.key, setting.value]),
  ) as TuitionSettingOverrides;
  if (resolved.settings.some((setting) => setting.warnings?.length)) {
    throw new ApiError("INVALID_SETTING_VALUE", "Invalid stored finance settings", 409);
  }
  return buildTuitionSettingsContext(overrides);
}

export function resolveExtraSessionAmount(
  settings: TuitionSettingsContext,
  input: {
    billingMode: "per_session" | "monthly_prorated";
    monthlyAmount: number;
    plannedRegularSlots: number;
    perSessionFee?: number;
  },
) {
  if (input.billingMode === "per_session" || settings.extraSessionPolicy === "per_session_fee") {
    if (input.perSessionFee == null) {
      throw new ApiError("EXTRA_SESSION_RATE_REQUIRED", "An independent session rate is required for surcharge", 409);
    }
    if (!Number.isSafeInteger(input.perSessionFee) || input.perSessionFee < 0) {
      throw new ApiError("INVALID_TUITION_AMOUNT", "Session rate must be nonnegative safe integer VND", 409);
    }
    return input.perSessionFee;
  }
  if (!Number.isSafeInteger(input.monthlyAmount) || input.monthlyAmount < 0) {
    throw new ApiError("INVALID_TUITION_AMOUNT", "Monthly amount must be nonnegative safe integer VND", 409);
  }
  const slots = input.plannedRegularSlots;
  if (!Number.isSafeInteger(slots) || slots <= 0) {
    throw new ApiError("ZERO_PLANNED_REGULAR_SLOTS", "Monthly surcharge requires a positive integer regular-slot denominator", 409);
  }
  return input.monthlyAmount / slots;
}
