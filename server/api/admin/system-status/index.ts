import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { errorResponse, requireAuth, successResponse, type AuthedRequest } from "../../../../lib/auth.js";
import { sendApiError } from "../../../../lib/api-utils.js";
import { requirePermission } from "../../../../lib/require-permission.js";
import type { VercelResponse } from "../../../../lib/vercel-types.js";

const ENVIRONMENT_VARIABLES = Object.freeze([
  "CRON_SECRET",
  "BLOB_READ_WRITE_TOKEN",
  "BACKUP_ENCRYPTION_KEY",
  "DATABASE_URL",
  "JWT_SECRET",
  "INTEGRATION_ENCRYPTION_KEY",
]);

const LEGACY_ADMIN_LINKS = Object.freeze([
  { label: "Người dùng", path: "/users" },
  { label: "Mẫu in", path: "/templates" },
  { label: "Import CSV", path: "/imports" },
  { label: "Nhắc học phí", path: "/fee-reminders" },
  { label: "Sao lưu", path: "/backups" },
  { label: "Thùng rác", path: "/recycle-bin" },
  { label: "Nhật ký", path: "/audit-logs" },
  { label: "Cài đặt trung tâm", path: "/settings" },
]);

type CronDeclaration = { path: string; schedule: string };
type CronActivity = { action: string; entityId?: string | null; createdAt: Date };

export function parseDeploymentConfig(text: string): {
  readable: boolean;
  crons: CronDeclaration[];
} {
  try {
    const parsed = JSON.parse(text) as { crons?: unknown };
    const crons = Array.isArray(parsed.crons)
      ? parsed.crons.flatMap((entry) => {
          if (!entry || typeof entry !== "object") return [];
          const candidate = entry as { path?: unknown; schedule?: unknown };
          return typeof candidate.path === "string" && typeof candidate.schedule === "string"
            ? [{ path: candidate.path, schedule: candidate.schedule }]
            : [];
        })
      : [];
    return { readable: true, crons };
  } catch {
    return { readable: false, crons: [] };
  }
}

function parseAppVersion(text: string) {
  try {
    const version = (JSON.parse(text) as { version?: unknown }).version;
    return typeof version === "string" && version.trim() ? version : "unknown";
  } catch {
    return "unknown";
  }
}

function findLastRun(cronPath: string, activities: CronActivity[]) {
  const slug = cronPath.split("/").filter(Boolean).at(-1) || "";
  const match = activities.find((activity) =>
    activity.entityId === cronPath || activity.action.toLowerCase().includes(`cron.${slug}`),
  );
  return match?.createdAt.toISOString() ?? null;
}

export async function buildSystemStatus({
  env,
  deploymentConfigText,
  packageText,
  activityLogs = [],
}: {
  env: Record<string, string | undefined>;
  deploymentConfigText: string;
  packageText: string;
  activityLogs?: CronActivity[];
}) {
  const deployment = parseDeploymentConfig(deploymentConfigText);
  return {
    appVersion: parseAppVersion(packageText),
    environment: ENVIRONMENT_VARIABLES.map((name) => ({
      name,
      configured: Boolean(env[name]?.trim()),
    })),
    cronConfigReadable: deployment.readable,
    crons: deployment.crons.map((cron) => ({
      ...cron,
      lastRunAt: findLastRun(cron.path, activityLogs),
    })),
    legacyLinks: LEGACY_ADMIN_LINKS.map((link) => ({ ...link })),
  };
}

async function readWorkspaceFile(url: URL, fallbackFilename: string) {
  try {
    return await readFile(url, "utf8");
  } catch {
    try {
      return await readFile(resolve(process.cwd(), fallbackFilename), "utf8");
    } catch {
      return "";
    }
  }
}

export async function handler(req: AuthedRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  try {
    const [deploymentConfigText, packageText, activityLogs] = await Promise.all([
      readWorkspaceFile(new URL("../../../../vercel.json", import.meta.url), "vercel.json"),
      readWorkspaceFile(new URL("../../../../package.json", import.meta.url), "package.json"),
      req.db.activityLog.findMany({
        where: { action: { startsWith: "cron." } },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { action: true, entityId: true, createdAt: true },
      }),
    ]);

    return successResponse(res, await buildSystemStatus({
      env: process.env,
      deploymentConfigText,
      packageText,
      activityLogs,
    }));
  } catch (error) {
    return sendApiError(res, error, "SYSTEM_STATUS_ERROR");
  }
}

export default requirePermission("console.access", handler);
