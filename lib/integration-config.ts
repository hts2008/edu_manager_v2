import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

import { ApiError } from "./api-utils.js";

export const INTEGRATION_KINDS = [
  "fee_reminder_webhook",
  "sms_webhook",
] as const;

export type IntegrationKind = (typeof INTEGRATION_KINDS)[number];

export type IntegrationPublicConfig = {
  url: string;
  enabled: boolean;
};

type SecretEnvelope = {
  format: "edu-manager-integration-secret";
  version: 1;
  algorithm: "aes-256-gcm";
  iv: string;
  tag: string;
  data: string;
};

type IntegrationConfigRow = {
  id: string;
  tenantId: string;
  kind: string;
  config: unknown;
  secretEncrypted: string | null;
  updatedById: string;
  createdAt: Date;
  updatedAt: Date;
};

type IntegrationDb = {
  integrationConfig: {
    findUnique(args: unknown): Promise<IntegrationConfigRow | null>;
    upsert(args: unknown): Promise<IntegrationConfigRow>;
  };
};

type ResolvedAddress = { address: string; family: number };
type LookupLike = (hostname: string) => Promise<ResolvedAddress[]>;
type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Pick<Response, "ok" | "status">>;

const ENV_FALLBACK: Record<
  IntegrationKind,
  { urls: string[]; secrets: string[] }
> = {
  fee_reminder_webhook: {
    urls: ["REMINDER_WEBHOOK_URL", "SMS_WEBHOOK_URL"],
    secrets: ["REMINDER_WEBHOOK_TOKEN"],
  },
  sms_webhook: {
    urls: ["SMS_WEBHOOK_URL", "REMINDER_WEBHOOK_URL"],
    secrets: ["SMS_WEBHOOK_TOKEN", "REMINDER_WEBHOOK_TOKEN"],
  },
};

function encryptionKey(secret = process.env.INTEGRATION_ENCRYPTION_KEY) {
  if (!secret || secret.length < 32) {
    throw new ApiError(
      "INTEGRATION_KEY_NOT_CONFIGURED",
      "INTEGRATION_ENCRYPTION_KEY must contain at least 32 characters",
      500,
    );
  }
  return createHash("sha256").update(secret).digest();
}

export function requireIntegrationKind(value: unknown): IntegrationKind {
  if (
    typeof value !== "string" ||
    !INTEGRATION_KINDS.includes(value as IntegrationKind)
  ) {
    throw new ApiError("UNKNOWN_INTEGRATION", "Unknown integration kind", 400);
  }
  return value as IntegrationKind;
}

export function encryptIntegrationSecret(
  plaintext: string,
  key?: string,
): string {
  if (!plaintext) {
    throw new ApiError(
      "INTEGRATION_SECRET_INVALID",
      "Integration secret must not be empty",
      400,
    );
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(key), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const envelope: SecretEnvelope = {
    format: "edu-manager-integration-secret",
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64"),
  };
  return JSON.stringify(envelope);
}

export function decryptIntegrationSecret(
  encrypted: string,
  key?: string,
): string {
  try {
    const envelope = JSON.parse(encrypted) as SecretEnvelope;
    if (
      envelope?.format !== "edu-manager-integration-secret" ||
      envelope.version !== 1 ||
      envelope.algorithm !== "aes-256-gcm" ||
      !envelope.iv ||
      !envelope.tag ||
      !envelope.data
    ) {
      throw new Error("Unsupported integration secret envelope");
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(key),
      Buffer.from(envelope.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(envelope.data, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.code === "INTEGRATION_KEY_NOT_CONFIGURED"
    ) {
      throw error;
    }
    throw new ApiError(
      "INTEGRATION_DECRYPT_FAILED",
      "Integration secret could not be decrypted with the configured key",
      500,
    );
  }
}

function normalizePublicConfig(value: unknown): IntegrationPublicConfig {
  const config =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const url = typeof config.url === "string" ? config.url.trim() : "";
  return {
    url,
    enabled: config.enabled === true,
  };
}

export function validateIntegrationConfig(
  value: unknown,
): IntegrationPublicConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(
      "INTEGRATION_CONFIG_INVALID",
      "config must be an object",
      400,
    );
  }
  const config = value as Record<string, unknown>;
  if (typeof config.url !== "string") {
    throw new ApiError(
      "INTEGRATION_URL_INVALID",
      "Integration URL must be a string",
      400,
    );
  }
  if (typeof config.enabled !== "boolean") {
    throw new ApiError(
      "INTEGRATION_ENABLED_INVALID",
      "enabled must be a boolean",
      400,
    );
  }
  return { url: config.url.trim(), enabled: config.enabled };
}

function publicDto(row: IntegrationConfigRow) {
  return {
    id: row.id,
    tenant_id: row.tenantId,
    kind: requireIntegrationKind(row.kind),
    config: normalizePublicConfig(row.config),
    secret_configured: Boolean(row.secretEncrypted),
    secret_masked: row.secretEncrypted ? "••••••••" : null,
    updated_by_id: row.updatedById,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export async function getIntegrationConfig(
  db: IntegrationDb,
  tenantId: string,
  kind: IntegrationKind,
) {
  const row = await db.integrationConfig.findUnique({
    where: { tenantId_kind: { tenantId, kind } },
  });
  return row ? publicDto(row) : null;
}

export async function upsertIntegrationConfig(
  db: IntegrationDb,
  input: {
    tenantId: string;
    kind: IntegrationKind;
    config: unknown;
    secret?: string | null;
    updatedById: string;
  },
) {
  const config = validateIntegrationConfig(input.config);
  const existing = await db.integrationConfig.findUnique({
    where: {
      tenantId_kind: { tenantId: input.tenantId, kind: input.kind },
    },
  });
  const endpointChanged = Boolean(
    existing?.secretEncrypted &&
      canonicalEndpoint(normalizePublicConfig(existing.config).url) !==
        canonicalEndpoint(config.url),
  );
  if (
    endpointChanged &&
    (typeof input.secret !== "string" || input.secret.length === 0)
  ) {
    throw new ApiError(
      "INTEGRATION_SECRET_REENTRY_REQUIRED",
      "Changing an integration endpoint requires re-entering its secret",
      400,
    );
  }
  const secretEncrypted =
    input.secret === undefined
      ? undefined
      : input.secret === null
        ? null
        : encryptIntegrationSecret(input.secret);
  const update = {
    config,
    updatedById: input.updatedById,
    ...(secretEncrypted !== undefined ? { secretEncrypted } : {}),
  };
  const row = await db.integrationConfig.upsert({
    where: {
      tenantId_kind: { tenantId: input.tenantId, kind: input.kind },
    },
    create: {
      tenantId: input.tenantId,
      kind: input.kind,
      config,
      secretEncrypted: secretEncrypted ?? null,
      updatedById: input.updatedById,
    },
    update,
  });
  return publicDto(row);
}

export async function resolveIntegrationDeliveryConfig(
  db: IntegrationDb,
  tenantId: string,
  kind: IntegrationKind,
) {
  const row = await db.integrationConfig.findUnique({
    where: { tenantId_kind: { tenantId, kind } },
  });
  if (row) {
    const config = normalizePublicConfig(row.config);
    return {
      ...config,
      source: "database" as const,
      secret: row.secretEncrypted
        ? decryptIntegrationSecret(row.secretEncrypted)
        : null,
    };
  }

  const legacyTenantId =
    process.env.INTEGRATION_LEGACY_ENV_TENANT_ID?.trim() || "tenant_default";
  if (tenantId !== legacyTenantId) {
    return {
      url: "",
      enabled: false,
      source: "none" as const,
      secret: null,
    };
  }

  const env = ENV_FALLBACK[kind];
  const url =
    env.urls
      .map((name) => process.env[name]?.trim())
      .find((value): value is string => Boolean(value)) ?? "";
  const secret =
    env.secrets
      .map((name) => process.env[name]?.trim())
      .find((value): value is string => Boolean(value)) ?? null;
  return {
    url,
    enabled: Boolean(url),
    source: url || secret ? ("env" as const) : ("none" as const),
    secret,
  };
}

function canonicalEndpoint(value: string) {
  try {
    return new URL(value).href;
  } catch {
    return value.trim();
  }
}

function parseEndpoint(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("Unsupported protocol");
    }
    if (url.username || url.password) {
      throw new Error("Embedded credentials are forbidden");
    }
    if (
      (process.env.NODE_ENV === "production" ||
        process.env.VERCEL_ENV === "production") &&
      url.protocol !== "https:"
    ) {
      throw new ApiError(
        "INTEGRATION_HTTPS_REQUIRED",
        "Integration endpoints must use HTTPS in production",
        400,
      );
    }
    return url;
  } catch {
    if (
      process.env.NODE_ENV === "production" ||
      process.env.VERCEL_ENV === "production"
    ) {
      try {
        const url = new URL(value);
        if (url.protocol === "http:") {
          throw new ApiError(
            "INTEGRATION_HTTPS_REQUIRED",
            "Integration endpoints must use HTTPS in production",
            400,
          );
        }
      } catch (error) {
        if (error instanceof ApiError) throw error;
      }
    }
    throw new ApiError(
      "INTEGRATION_URL_INVALID",
      "Integration URL must be a valid HTTP or HTTPS URL",
      400,
    );
  }
}

function parseIpv4(value: string) {
  const octets = value.split(".").map(Number);
  if (
    octets.length !== 4 ||
    octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return null;
  }
  return (
    ((octets[0] << 24) >>> 0) +
    (octets[1] << 16) +
    (octets[2] << 8) +
    octets[3]
  ) >>> 0;
}

function inIpv4Range(address: number, base: string, prefix: number) {
  const baseAddress = parseIpv4(base);
  if (baseAddress === null) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (address & mask) === (baseAddress & mask);
}

function isForbiddenIpv4(value: string) {
  const address = parseIpv4(value);
  if (address === null) return true;
  return [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.0.2.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["198.51.100.0", 24],
    ["203.0.113.0", 24],
    ["224.0.0.0", 4],
    ["240.0.0.0", 4],
  ].some(([base, prefix]) =>
    inIpv4Range(address, base as string, prefix as number),
  );
}

function isForbiddenAddress(rawAddress: string) {
  const address = rawAddress.replace(/^\[|\]$/g, "").split("%")[0].toLowerCase();
  if (isIP(address) === 4) return isForbiddenIpv4(address);
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mapped) return isForbiddenIpv4(mapped);
  if (isIP(address) !== 6) return true;
  return (
    address === "::" ||
    address === "::1" ||
    address.startsWith("fc") ||
    address.startsWith("fd") ||
    /^fe[89ab]/.test(address) ||
    address.startsWith("ff") ||
    address.startsWith("2001:db8")
  );
}

function isForbiddenHostname(rawHostname: string) {
  const hostname = rawHostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "metadata.google.internal" ||
    hostname === "instance-data"
  );
}

async function defaultLookup(hostname: string): Promise<ResolvedAddress[]> {
  return lookup(hostname, { all: true, verbatim: true });
}

export async function resolveSafeIntegrationEndpoint(
  value: string,
  lookupImpl: LookupLike = defaultLookup,
) {
  const endpoint = parseEndpoint(value);
  if (isForbiddenHostname(endpoint.hostname)) {
    throw new ApiError(
      "INTEGRATION_ENDPOINT_FORBIDDEN",
      "Integration endpoint resolves to a forbidden network",
      400,
    );
  }
  const literal = endpoint.hostname.replace(/^\[|\]$/g, "");
  let addresses: ResolvedAddress[];
  try {
    addresses = isIP(literal)
      ? [{ address: literal, family: isIP(literal) }]
      : await lookupImpl(literal);
  } catch {
    throw new ApiError(
      "INTEGRATION_DNS_FAILED",
      "Integration endpoint could not be resolved",
      400,
    );
  }
  if (
    addresses.length === 0 ||
    addresses.some((candidate) => isForbiddenAddress(candidate.address))
  ) {
    throw new ApiError(
      "INTEGRATION_ENDPOINT_FORBIDDEN",
      "Integration endpoint resolves to a forbidden network",
      400,
    );
  }
  return { endpoint, address: addresses[0] };
}

function sendPinnedRequest(
  endpoint: URL,
  address: ResolvedAddress,
  init: { headers: Record<string, string>; body: string },
): Promise<{ ok: boolean; status: number }> {
  return new Promise((resolve, reject) => {
    const request = (endpoint.protocol === "https:" ? httpsRequest : httpRequest)(
      endpoint,
      {
        method: "POST",
        headers: init.headers,
        lookup: (_hostname, _options, callback) =>
          callback(null, address.address, address.family as 4 | 6),
      },
      (response) => {
        response.resume();
        resolve({
          ok: Boolean(response.statusCode && response.statusCode >= 200 && response.statusCode < 300),
          status: response.statusCode ?? 502,
        });
      },
    );
    request.setTimeout(10_000, () =>
      request.destroy(new Error("Integration request timed out")),
    );
    request.on("error", reject);
    request.end(init.body);
  });
}

export async function testIntegrationDelivery(
  db: IntegrationDb,
  input: {
    tenantId: string;
    kind: IntegrationKind;
    fetchImpl?: FetchLike;
    lookupImpl?: LookupLike;
  },
) {
  const resolved = await resolveIntegrationDeliveryConfig(
    db,
    input.tenantId,
    input.kind,
  );
  if (!resolved.url) {
    throw new ApiError(
      "INTEGRATION_NOT_CONFIGURED",
      "Integration endpoint is not configured",
      409,
    );
  }
  const { endpoint, address } = await resolveSafeIntegrationEndpoint(
    resolved.url,
    input.lookupImpl,
  );
  const startedAt = Date.now();
  const headers = {
    "content-type": "application/json",
    ...(resolved.secret
      ? { authorization: `Bearer ${resolved.secret}` }
      : {}),
  };
  const body = JSON.stringify({
    event: "integration.test",
    kind: input.kind,
    test: true,
    sent_at: new Date().toISOString(),
  });
  try {
    const response = input.fetchImpl
      ? await input.fetchImpl(endpoint, {
          method: "POST",
          headers,
          body,
          redirect: "error",
          signal: AbortSignal.timeout(10_000),
        })
      : await sendPinnedRequest(endpoint, address, { headers, body });
    if (!response.ok) {
      throw new ApiError(
        "INTEGRATION_TEST_REJECTED",
        `Integration endpoint rejected the test request with HTTP ${response.status}`,
        502,
        { provider_status: response.status },
      );
    }
    return {
      ok: true,
      kind: input.kind,
      source: resolved.source,
      status: response.status,
      duration_ms: Date.now() - startedAt,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "INTEGRATION_TEST_FAILED",
      "Integration test request failed",
      502,
    );
  }
}
