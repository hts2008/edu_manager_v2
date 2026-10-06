import { z } from "zod";

import { ApiError, getBusinessMonthKey } from "./api-utils.js";
import {
  SETTINGS_REGISTRY,
  getSettingDefinition,
  type SettingDefinition,
  type SettingGroup,
} from "./settings-registry.js";
import { resolveSetting, type ResolvedSetting, type SettingRow } from "./settings-resolver.js";

export type SettingsDatabase = any;

export interface SettingWarning {
  code: "INVALID_STORED_VALUE";
  key: string;
  sourceId: string | null;
  message: string;
  issues: Array<{ path: string; message: string }>;
}

export interface SafeResolvedSetting extends ResolvedSetting {
  warnings?: SettingWarning[];
}

export interface ListedSetting extends SafeResolvedSetting {
  definition: Omit<SettingDefinition, "schema">;
  updatedById: string | null;
  updatedAt: Date | null;
}

type StoredSettingRow = SettingRow & {
  effectiveFromMonth?: string | null;
  updatedById?: string;
  updatedAt?: Date;
};

type TenantCache = {
  version: number;
  rows: StoredSettingRow[];
};

const cacheByDatabase = new WeakMap<object, Map<string, TenantCache>>();
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const CHANGE_NOTE_MAX_LENGTH = 500;

function apiDefinition(key: string) {
  try {
    return getSettingDefinition(key);
  } catch {
    throw new ApiError("UNKNOWN_SETTING", `Unknown setting key: ${key}`, 400);
  }
}

function normalizedIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: ["value", ...issue.path.map(String)].join("."),
    message: issue.message,
  }));
}

function parseWriteValue(key: string, value: unknown) {
  const definition = apiDefinition(key);
  const parsed = definition.schema.safeParse(value);
  if (!parsed.success) {
    throw new ApiError("INVALID_SETTING_VALUE", "Setting value is invalid", 400, {
      issues: normalizedIssues(parsed.error),
    });
  }
  return { definition, value: parsed.data };
}

function validateEffectiveMonth(
  definition: SettingDefinition,
  effectiveFromMonth: string | null | undefined,
  now: Date,
) {
  if (definition.requiresEffectiveMonth && !effectiveFromMonth) {
    throw new ApiError(
      "EFFECTIVE_MONTH_REQUIRED",
      "effective_from_month is required for this setting",
      400,
    );
  }
  if (effectiveFromMonth && !MONTH_PATTERN.test(effectiveFromMonth)) {
    throw new ApiError("INVALID_EFFECTIVE_MONTH", "effective_from_month must use YYYY-MM", 400);
  }
  if (definition.requiresEffectiveMonth && effectiveFromMonth! < getBusinessMonthKey(now)) {
    throw new ApiError(
      "EFFECTIVE_MONTH_IN_PAST",
      "effective_from_month cannot be earlier than the current business month",
      400,
    );
  }
  return definition.requiresEffectiveMonth ? effectiveFromMonth! : null;
}

function validateChangeNote(changeNote: string | undefined) {
  if (changeNote && changeNote.trim().length > CHANGE_NOTE_MAX_LENGTH) {
    throw new ApiError(
      "INVALID_CHANGE_NOTE",
      `change_note must not exceed ${CHANGE_NOTE_MAX_LENGTH} characters`,
      400,
    );
  }
  return changeNote;
}

export function validateSettingUpdate(input: {
  key: string;
  value: unknown;
  effectiveFromMonth?: string | null;
  changeNote?: string;
  now?: Date;
  expectedConfigVersion?: unknown;
}) {
  if (input.expectedConfigVersion !== undefined &&
    (typeof input.expectedConfigVersion !== "number" || !Number.isSafeInteger(input.expectedConfigVersion) || input.expectedConfigVersion < 0)) {
    throw new ApiError("INVALID_CONFIG_VERSION", "Expected config version must be a nonnegative safe integer", 400);
  }
  const parsed = parseWriteValue(input.key, input.value);
  validateChangeNote(input.changeNote);
  if (parsed.definition.readOnly) {
    throw new ApiError("SETTING_READ_ONLY", "This setting is read-only", 409);
  }
  const effectiveFromMonth = validateEffectiveMonth(
    parsed.definition,
    input.effectiveFromMonth,
    input.now ?? new Date(),
  );
  return { ...parsed, effectiveFromMonth };
}

function getDatabaseCache(db: object) {
  let cache = cacheByDatabase.get(db);
  if (!cache) {
    cache = new Map();
    cacheByDatabase.set(db, cache);
  }
  return cache;
}

async function loadTenantRows(db: SettingsDatabase, tenantId: string) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { configVersion: true },
  });
  if (!tenant) throw new ApiError("TENANT_NOT_FOUND", "Tenant not found", 404);

  const cache = getDatabaseCache(db as object);
  const cached = cache.get(tenantId);
  if (cached && cached.version === tenant.configVersion) return cached;

  const databaseRows = await db.settingValue.findMany({
    where: { tenantId },
    orderBy: [{ key: "asc" }, { effectiveFromMonth: "desc" }, { revision: "desc" }],
  });
  const rows: StoredSettingRow[] = databaseRows.map((row: any) => ({
    ...row,
    effectiveMonth: row.effectiveFromMonth ?? null,
  }));
  const loaded = { version: tenant.configVersion, rows };
  cache.set(tenantId, loaded);
  return loaded;
}

function invalidateTenant(db: SettingsDatabase, tenantId: string) {
  cacheByDatabase.get(db as object)?.delete(tenantId);
}

function toSafeResolved(
  key: string,
  tenantId: string,
  rows: StoredSettingRow[],
  effectiveMonth?: string,
): SafeResolvedSetting {
  try {
    return resolveSetting({ tenantId, key, rows, effectiveMonth });
  } catch (error) {
    if (!(error instanceof z.ZodError)) throw error;
    const definition = apiDefinition(key);
    const source = rows
      .filter((row) => row.tenantId === tenantId && row.key === key)
      .sort((left, right) => right.revision - left.revision)[0];
    return {
      key,
      value: definition.defaultValue,
      provenance: "registry_default",
      effectiveMonth: effectiveMonth ?? null,
      revision: null,
      sourceId: null,
      warnings: [{
        code: "INVALID_STORED_VALUE",
        key,
        sourceId: source?.id ?? null,
        message: "Stored setting is invalid; registry default was used",
        issues: normalizedIssues(error),
      }],
    };
  }
}

function publicDefinition(definition: SettingDefinition): Omit<SettingDefinition, "schema"> {
  const { schema: _schema, ...publicFields } = definition;
  return publicFields;
}

export async function getSetting(
  db: SettingsDatabase,
  input: { tenantId: string; key: string; effectiveMonth?: string },
): Promise<SafeResolvedSetting> {
  const definition = apiDefinition(input.key);
  const effectiveMonth = definition.requiresEffectiveMonth
    ? input.effectiveMonth ?? getBusinessMonthKey()
    : input.effectiveMonth;
  const loaded = await loadTenantRows(db, input.tenantId);
  return toSafeResolved(input.key, input.tenantId, loaded.rows, effectiveMonth);
}

export async function getSettings(
  db: SettingsDatabase,
  input: { tenantId: string; group?: SettingGroup; effectiveMonth?: string },
) {
  const loaded = await loadTenantRows(db, input.tenantId);
  const definitions = SETTINGS_REGISTRY.filter(
    (definition) => !input.group || definition.group === input.group,
  );
  const settings: ListedSetting[] = definitions.map((definition) => {
    const effectiveMonth = definition.requiresEffectiveMonth
      ? input.effectiveMonth ?? getBusinessMonthKey()
      : input.effectiveMonth;
    const resolved = toSafeResolved(
      definition.key,
      input.tenantId,
      loaded.rows,
      effectiveMonth,
    );
    const source = resolved.sourceId
      ? loaded.rows.find((row) => row.id === resolved.sourceId)
      : undefined;
    return {
      ...resolved,
      definition: publicDefinition(definition),
      updatedById: source?.updatedById ?? null,
      updatedAt: source?.updatedAt ?? null,
    };
  });
  return { configVersion: loaded.version, settings };
}

function auditAction(input: {
  type: "setting.update" | "setting.rollback";
  key: string;
  effectiveFromMonth: string | null;
  oldValue: unknown;
  newValue: unknown;
  revision: number;
  sourceRevisionId?: string;
}) {
  return JSON.stringify(input);
}

async function writeInTransaction(
  tx: SettingsDatabase,
  input: {
    tenantId: string;
    actorId: string;
    key: string;
    value: unknown;
    effectiveFromMonth: string | null;
    changeNote?: string;
    auditType: "setting.update" | "setting.rollback";
    sourceRevisionId?: string;
    expectedConfigVersion?: number;
  },
) {
  // Claim the tenant version before any setting write; all writers use the same lock order.
  if (input.expectedConfigVersion !== undefined) {
    const claimed = await tx.tenant.updateMany({ where: { id: input.tenantId, configVersion: input.expectedConfigVersion },
      data: { configVersion: { increment: 1 } } });
    if (claimed.count !== 1) throw new ApiError("SETTING_CONFIG_CONFLICT", "Configuration changed; simulate again", 409);
  } else {
    await tx.tenant.update({ where: { id: input.tenantId }, data: { configVersion: { increment: 1 } } });
  }
  const current = await tx.settingValue.findFirst({
    where: {
      tenantId: input.tenantId,
      key: input.key,
      effectiveFromMonth: input.effectiveFromMonth,
    },
  });
  const nextRevision = (current?.revision ?? 0) + 1;
  const data = {
    tenantId: input.tenantId,
    key: input.key,
    value: input.value,
    effectiveFromMonth: input.effectiveFromMonth,
    revision: nextRevision,
    updatedById: input.actorId,
  };
  const setting = current
    ? await tx.settingValue.update({ where: { id: current.id }, data })
    : await tx.settingValue.create({ data });

  await tx.settingRevision.create({
    data: {
      tenantId: input.tenantId,
      settingValueId: setting.id,
      revision: nextRevision,
      oldValue: current?.value ?? null,
      newValue: input.value,
      changeNote: input.changeNote?.trim() || null,
      changedById: input.actorId,
    },
  });
  await tx.activityLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.actorId,
      action: auditAction({
        type: input.auditType,
        key: input.key,
        effectiveFromMonth: input.effectiveFromMonth,
        oldValue: current?.value ?? null,
        newValue: input.value,
        revision: nextRevision,
        sourceRevisionId: input.sourceRevisionId,
      }),
      entityType: "setting_value",
      entityId: setting.id,
    },
  });
  return setting;
}

export async function updateSetting(
  db: SettingsDatabase,
  input: {
    tenantId: string;
    actorId: string;
    key: string;
    value: unknown;
    effectiveFromMonth?: string | null;
    changeNote?: string;
    now?: Date;
    expectedConfigVersion?: number;
  },
) {
  const parsed = validateSettingUpdate(input);
  const effectiveFromMonth = parsed.effectiveFromMonth;
  const setting = await db.$transaction((tx: SettingsDatabase) =>
    writeInTransaction(tx, {
      ...input,
      value: parsed.value,
      effectiveFromMonth,
      auditType: "setting.update",
    }),
  );
  invalidateTenant(db, input.tenantId);
  return {
    key: setting.key,
    value: setting.value,
    effectiveFromMonth: setting.effectiveFromMonth,
    revision: setting.revision,
    provenance: parsed.definition.requiresEffectiveMonth
      ? "tenant_effective" as const
      : "tenant_default" as const,
  };
}

export async function getSettingHistory(
  db: SettingsDatabase,
  input: { tenantId: string; key: string; page?: number; pageSize?: number },
) {
  apiDefinition(input.key);
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 50;
  const values = await db.settingValue.findMany({
    where: { tenantId: input.tenantId, key: input.key },
    select: { id: true },
  });
  const ids = values.map((value: { id: string }) => value.id);
  if (ids.length === 0) return { page, pageSize, total: 0, revisions: [] };
  const where = { tenantId: input.tenantId, settingValueId: { in: ids } };
  const [total, revisions] = await Promise.all([
    db.settingRevision.count({ where }),
    db.settingRevision.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { page, pageSize, total, revisions };
}

export async function rollbackSetting(
  db: SettingsDatabase,
  input: {
    tenantId: string;
    actorId: string;
    key: string;
    revisionId: string;
    changeNote?: string;
    now?: Date;
  },
) {
  const definition = apiDefinition(input.key);
  validateChangeNote(input.changeNote);
  if (definition.readOnly) {
    throw new ApiError("SETTING_READ_ONLY", "This setting is read-only", 409);
  }
  const setting = await db.$transaction(async (tx: SettingsDatabase) => {
    const values = await tx.settingValue.findMany({
      where: { tenantId: input.tenantId, key: input.key },
      select: { id: true, effectiveFromMonth: true },
    });
    const ids = values.map((value: { id: string }) => value.id);
    const target = ids.length
      ? await tx.settingRevision.findFirst({
          where: {
            tenantId: input.tenantId,
            id: input.revisionId,
            settingValueId: { in: ids },
          },
        })
      : null;
    if (!target) throw new ApiError("REVISION_NOT_FOUND", "Setting revision not found", 404);
    const source = values.find((value: { id: string }) => value.id === target.settingValueId);
    if (!source) throw new ApiError("SETTING_NOT_FOUND", "Setting value not found", 404);

    // Rolling back a revision undoes that revision. The first override has no
    // old value, so restoring it resolves to the registry default.
    const rollbackValue = target.oldValue ?? definition.defaultValue;
    const parsed = parseWriteValue(input.key, rollbackValue);
    validateEffectiveMonth(
      parsed.definition,
      source.effectiveFromMonth,
      input.now ?? new Date(),
    );
    return writeInTransaction(tx, {
      tenantId: input.tenantId,
      actorId: input.actorId,
      key: input.key,
      value: parsed.value,
      effectiveFromMonth: source.effectiveFromMonth,
      changeNote: input.changeNote,
      auditType: "setting.rollback",
      sourceRevisionId: target.id,
    });
  });
  invalidateTenant(db, input.tenantId);
  return {
    key: setting.key,
    value: setting.value,
    effectiveFromMonth: setting.effectiveFromMonth,
    revision: setting.revision,
    provenance: definition.requiresEffectiveMonth
      ? "tenant_effective" as const
      : "tenant_default" as const,
  };
}
