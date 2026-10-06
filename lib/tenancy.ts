export const DEFAULT_TENANT_ID = "tenant_default";
export const DEFAULT_TENANT_SLUG = "default";

export type TenancyMode = "legacy" | "dual_write" | "enforced";

type EnvLike = Record<string, string | undefined>;

export function getTenancyMode(env: EnvLike = process.env): TenancyMode {
  const mode = env.TENANCY_MODE?.trim() || "legacy";
  if (mode === "legacy" || mode === "dual_write" || mode === "enforced") {
    return mode;
  }
  throw new Error(`Invalid TENANCY_MODE: ${mode}`);
}

export function resolveLoginTenantSlug(
  tenantSlug: string | null | undefined,
  mode = getTenancyMode(),
) {
  const normalized = tenantSlug?.trim().toLowerCase() || null;
  if (normalized) return normalized;
  if (mode === "legacy") return null;
  if (mode === "dual_write") return DEFAULT_TENANT_SLUG;
  throw new Error("tenant_slug is required when TENANCY_MODE=enforced");
}

export function tenantIdForWrite(
  tenantId: string | null | undefined,
  mode = getTenancyMode(),
) {
  if (tenantId) return tenantId;
  if (mode === "legacy") return null;
  if (mode === "dual_write") return DEFAULT_TENANT_ID;
  throw new Error("Tenant identity is required when TENANCY_MODE=enforced");
}

export function assertTenantIdentity(input: {
  mode?: TenancyMode;
  tokenTenantId?: string;
  sessionTenantId?: string | null;
  subjectTenantId?: string | null;
}) {
  const mode = input.mode ?? getTenancyMode();
  if (mode !== "enforced") return;

  if (!input.tokenTenantId || !input.sessionTenantId || !input.subjectTenantId) {
    throw new Error("Tenant identity is required when TENANCY_MODE=enforced");
  }
  if (
    input.tokenTenantId !== input.sessionTenantId ||
    input.tokenTenantId !== input.subjectTenantId
  ) {
    throw new Error("Tenant identity mismatch");
  }
}

export function resolveEffectiveTenantId(input: {
  mode?: TenancyMode;
  tokenTenantId?: string;
  sessionTenantId?: string | null;
  subjectTenantId?: string | null;
}) {
  const mode = input.mode ?? getTenancyMode();
  assertTenantIdentity({ ...input, mode });

  if (mode === "legacy") {
    return input.subjectTenantId ?? input.sessionTenantId ?? input.tokenTenantId ?? null;
  }

  return input.subjectTenantId ?? input.sessionTenantId ?? input.tokenTenantId ?? null;
}
