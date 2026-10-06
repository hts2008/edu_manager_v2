import type { AuthedRequest } from "../../../../lib/auth.js";
import { ApiError, getString } from "../../../../lib/api-utils.js";
import { SETTING_GROUPS, type SettingGroup } from "../../../../lib/settings-registry.js";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function requireTenantId(req: AuthedRequest) {
  if (!req.user.tenantId) {
    throw new ApiError(
      "TENANT_CONTEXT_REQUIRED",
      "A tenant-scoped session is required for Admin Console settings",
      409,
    );
  }
  return req.user.tenantId;
}

export function getSettingKey(req: AuthedRequest) {
  const key = getString(req.query.key);
  if (!key) throw new ApiError("SETTING_KEY_REQUIRED", "Setting key is required", 400);
  return key;
}

export function getSettingGroup(value: unknown): SettingGroup | undefined {
  const group = getString(value);
  if (!group) return undefined;
  if (!(SETTING_GROUPS as readonly string[]).includes(group)) {
    throw new ApiError("INVALID_SETTING_GROUP", "Unknown setting group", 400);
  }
  return group as SettingGroup;
}

export function getEffectiveMonth(value: unknown) {
  const month = getString(value);
  if (!month) return undefined;
  if (!MONTH_PATTERN.test(month)) {
    throw new ApiError("INVALID_EFFECTIVE_MONTH", "effective_month must use YYYY-MM", 400);
  }
  return month;
}

export function getPagination(req: AuthedRequest) {
  const rawPage = getString(req.query.page);
  const rawPageSize = getString(req.query.page_size);
  const page = rawPage === undefined ? 1 : Number(rawPage);
  const pageSize = rawPageSize === undefined ? 50 : Number(rawPageSize);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new ApiError(
      "INVALID_PAGINATION",
      "page must be >= 1 and page_size must be between 1 and 100",
      400,
    );
  }
  return { page, pageSize };
}
