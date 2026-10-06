import { existsSync, readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type RuntimeExceptionOwner = "auth" | "backup" | "cron" | "platform";
export type RuntimeExceptionCapability = "direct_prisma" | "raw_sql";

export interface TenantRuntimeAllowlistEntry {
  path: string;
  owner: RuntimeExceptionOwner;
  capabilities: RuntimeExceptionCapability[];
  reason: string;
  followUp: string;
}

// Exceptions are exact files, never directories or globs. Each entry is reviewed as
// control-plane/bootstrap work that cannot obtain a normal authenticated tenant client.
export const TENANT_RUNTIME_ALLOWLIST: readonly TenantRuntimeAllowlistEntry[] = [
  {
    path: "server/api/admin/tenants.ts",
    owner: "platform",
    capabilities: ["direct_prisma"],
    reason: "Platform Owner tenant lifecycle operations intentionally cross tenant boundaries through a dedicated control-plane API.",
    followUp: "Keep the persistent Platform Owner guard, immutable audit records, and isolated tenant lifecycle tests mandatory.",
  },
  {
    path: "server/api/auth/login.ts",
    owner: "auth",
    capabilities: ["direct_prisma"],
    reason: "Login must resolve the tenant and user before an authenticated request context exists.",
    followUp: "Keep lookups limited to tenant and identity records; test ambiguous usernames per tenant.",
  },
  {
    path: "server/api/auth/change-password.ts",
    owner: "auth",
    capabilities: ["direct_prisma"],
    reason: "Credential rotation updates the global identity and revokes all of that identity's sessions.",
    followUp: "Revisit after identity-plane ownership is separated from tenant business data.",
  },
  {
    path: "server/api/parent-portal/login.ts",
    owner: "auth",
    capabilities: ["direct_prisma"],
    reason: "Parent login resolves a portal identity before a parent tenant session has been established.",
    followUp: "Bind the issued parent session to one tenant and reject cross-tenant phone ambiguity.",
  },
  {
    path: "server/api/backups/index.ts",
    owner: "backup",
    capabilities: ["direct_prisma"],
    reason: "Database backup and restore intentionally traverse the full platform dataset under admin control.",
    followUp: "Retain isolated rehearsal, manifest coverage, and explicit platform-owner authorization gates.",
  },
  {
    path: "server/api/cron/backup.ts",
    owner: "cron",
    capabilities: ["direct_prisma"],
    reason: "The platform backup cron intentionally snapshots all tenants and has no end-user request context.",
    followUp: "Keep CRON_SECRET authentication and full-manifest round-trip tests mandatory.",
  },
  {
    path: "server/api/cron/monthly-fees.ts",
    owner: "cron",
    capabilities: ["direct_prisma"],
    reason: "The scheduler currently runs platform-wide and therefore has no single authenticated tenant request.",
    followUp: "Replace global generation with explicit active-tenant fan-out before enforced-mode rollout.",
  },
] as const;

export type TenantRuntimeFindingCode =
  | "TENANT_DB_BYPASS"
  | "RAW_SQL_BYPASS"
  | "STALE_ALLOWLIST";

export interface TenantRuntimeFinding {
  code: TenantRuntimeFindingCode;
  path: string;
  message: string;
}

export interface TenantRuntimeFileAudit {
  path: string;
  protectedHandler: boolean;
  directPrismaImport: boolean;
  usesRequestDb: boolean;
  rawSql: boolean;
  allowlist?: TenantRuntimeAllowlistEntry;
  findings: TenantRuntimeFinding[];
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/");
}

function listTypescriptFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...listTypescriptFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".ts")) files.push(path);
  }
  return files.sort();
}

function hasCapability(
  entry: TenantRuntimeAllowlistEntry | undefined,
  capability: RuntimeExceptionCapability,
): boolean {
  return entry?.capabilities.includes(capability) === true;
}

export function auditTenantRuntime(rootDir: string) {
  const apiRoot = resolve(rootDir, "server/api");
  const allowlist = new Map(TENANT_RUNTIME_ALLOWLIST.map((entry) => [entry.path, entry]));
  const files: TenantRuntimeFileAudit[] = listTypescriptFiles(apiRoot).map((absolutePath) => {
    const path = normalizePath(relative(rootDir, absolutePath));
    const source = readFileSync(absolutePath, "utf8");
    const exception = allowlist.get(path);
    const directPrismaImport = /import\s+prisma\s+from\s+["'][^"']*lib\/prisma(?:\.js)?["']/.test(source);
    const usesRequestDb = /\breq\.db\b/.test(source);
    const rawSql = /\$(?:queryRaw|queryRawUnsafe|executeRaw|executeRawUnsafe)\b|\bPrisma\.sql\b/.test(source);
    const findings: TenantRuntimeFinding[] = [];

    if (directPrismaImport && !hasCapability(exception, "direct_prisma")) {
      findings.push({
        code: "TENANT_DB_BYPASS",
        path,
        message: "Business handler imports the global Prisma client instead of using req.db.",
      });
    }
    if (rawSql && !hasCapability(exception, "raw_sql")) {
      findings.push({
        code: "RAW_SQL_BYPASS",
        path,
        message: "API handler executes raw SQL without an exact reviewed exception.",
      });
    }

    return {
      path,
      protectedHandler: /export\s+default\s+require(?:Auth|Admin|Permission)\s*\(/.test(source),
      directPrismaImport,
      usesRequestDb,
      rawSql,
      ...(exception ? { allowlist: exception } : {}),
      findings,
    };
  });

  const existingPaths = new Set(files.map((file) => file.path));
  const staleAllowlist = TENANT_RUNTIME_ALLOWLIST
    .filter((entry) => !existingPaths.has(entry.path))
    .map<TenantRuntimeFinding>((entry) => ({
      code: "STALE_ALLOWLIST",
      path: entry.path,
      message: "Allowlisted runtime exception no longer exists and must be removed.",
    }));
  const findings = [...files.flatMap((file) => file.findings), ...staleAllowlist];

  return {
    schemaVersion: 1,
    ok: findings.length === 0,
    generatedAt: new Date().toISOString(),
    root: normalizePath(rootDir),
    summary: {
      apiFiles: files.length,
      protectedHandlers: files.filter((file) => file.protectedHandler).length,
      requestDbHandlers: files.filter((file) => file.usesRequestDb).length,
      directPrismaImports: files.filter((file) => file.directPrismaImport).length,
      rawSqlHandlers: files.filter((file) => file.rawSql).length,
      allowedExceptions: files.filter((file) => file.allowlist).length,
      blockingFindings: findings.length,
      staleAllowlist: staleAllowlist.length,
    },
    allowlist: TENANT_RUNTIME_ALLOWLIST,
    staleAllowlist,
    findings,
    files,
  };
}

function isMainModule(): boolean {
  const invoked = process.argv[1];
  return Boolean(invoked) && resolve(invoked) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  const rootDir = process.cwd();
  if (!existsSync(resolve(rootDir, "server/api"))) {
    process.stderr.write("Run audit-tenant-runtime.ts from the repository root.\n");
    process.exitCode = 2;
  } else {
    const result = auditTenantRuntime(rootDir);
    if (process.argv.includes("--json")) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      process.stdout.write(
        `Tenant runtime audit: ${result.ok ? "PASS" : "BLOCKED"} ` +
        `(${result.summary.blockingFindings} finding(s), ` +
        `${result.summary.allowedExceptions} exception(s))\n`,
      );
      for (const finding of result.findings) {
        process.stdout.write(`- [${finding.code}] ${finding.path}: ${finding.message}\n`);
      }
    }
    process.exitCode = result.ok ? 0 : 1;
  }
}
