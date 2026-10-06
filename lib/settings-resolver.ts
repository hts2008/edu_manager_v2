import { getSettingDefinition, parseSettingValue } from "./settings-registry.js";

export interface SettingRow {
  id: string;
  tenantId: string;
  key: string;
  value: unknown;
  effectiveMonth: string | null;
  revision: number;
}

export interface ResolveSettingInput {
  tenantId: string;
  key: string;
  effectiveMonth?: string;
  rows: readonly SettingRow[];
}

export interface ResolvedSetting {
  key: string;
  value: unknown;
  provenance: "registry_default" | "tenant_default" | "tenant_effective";
  effectiveMonth: string | null;
  revision: number | null;
  sourceId: string | null;
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function resolveSetting(input: ResolveSettingInput): ResolvedSetting {
  const definition = getSettingDefinition(input.key);

  if (definition.requiresEffectiveMonth && !input.effectiveMonth) {
    throw new Error(`${input.key} requires effectiveMonth`);
  }
  if (input.effectiveMonth && !MONTH_PATTERN.test(input.effectiveMonth)) {
    throw new Error("effectiveMonth must use YYYY-MM");
  }

  const tenantRows = input.rows.filter(
    (row) => row.tenantId === input.tenantId && row.key === input.key,
  );
  const eligibleRows = definition.requiresEffectiveMonth
    ? tenantRows
        .filter(
          (row) => row.effectiveMonth !== null && row.effectiveMonth <= input.effectiveMonth!,
        )
        .sort((left, right) =>
          right.effectiveMonth!.localeCompare(left.effectiveMonth!) || right.revision - left.revision,
        )
    : tenantRows
        .filter((row) => row.effectiveMonth === null)
        .sort((left, right) => right.revision - left.revision);

  const row = eligibleRows[0];
  if (!row) {
    return {
      key: input.key,
      value: parseSettingValue(input.key, definition.defaultValue),
      provenance: "registry_default",
      effectiveMonth: input.effectiveMonth ?? null,
      revision: null,
      sourceId: null,
    };
  }

  return {
    key: input.key,
    value: parseSettingValue(input.key, row.value),
    provenance: definition.requiresEffectiveMonth ? "tenant_effective" : "tenant_default",
    effectiveMonth: row.effectiveMonth,
    revision: row.revision,
    sourceId: row.id,
  };
}
