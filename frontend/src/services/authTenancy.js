const TENANT_AWARE_MODES = new Set(["dual_write", "enforced"]);

export function normalizeTenancyMode(value) {
  const normalized = String(value || "legacy").trim().toLowerCase();
  return TENANT_AWARE_MODES.has(normalized) ? normalized : "legacy";
}

export function isTenantAwareLoginEnabled(mode) {
  return TENANT_AWARE_MODES.has(normalizeTenancyMode(mode));
}

export function normalizeTenantSlug(value) {
  return String(value || "").trim().toLowerCase();
}

export function buildLoginPayload(username, password, tenantSlug) {
  const payload = { username, password };
  const normalizedTenantSlug = normalizeTenantSlug(tenantSlug);

  if (normalizedTenantSlug) {
    payload.tenant_slug = normalizedTenantSlug;
  }

  return payload;
}
