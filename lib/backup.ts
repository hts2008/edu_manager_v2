import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { put } from "@vercel/blob";
import { ApiError } from "./api-utils.js";

const BACKUP_PREFIX = "db-backups";
const BACKUP_VERSION = 1;

function getBackupSecret() {
  const secret = process.env.BACKUP_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new ApiError(
      "BACKUP_KEY_NOT_CONFIGURED",
      "BACKUP_ENCRYPTION_KEY or a strong JWT_SECRET is required",
      500
    );
  }
  return createHash("sha256").update(secret).digest();
}

function encryptJson(payload: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getBackupSecret(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  return {
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64"),
  };
}

function decryptJson(payload: any) {
  if (payload?.algorithm !== "aes-256-gcm") {
    throw new ApiError("UNSUPPORTED_BACKUP", "Unsupported backup encryption", 400);
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getBackupSecret(),
    Buffer.from(payload.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.data, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString("utf8"));
}

async function exportTables(prisma: any) {
  const [
    users,
    parents,
    students,
    teachers,
    classes,
    studentClasses,
    attendance,
    attendancePeriods,
    monthlyFees,
    templates,
    receipts,
    payments,
    activityLogs,
    centerSettings,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.parent.findMany(),
    prisma.student.findMany(),
    prisma.teacher.findMany(),
    prisma.class.findMany(),
    prisma.studentClass.findMany(),
    prisma.attendance.findMany(),
    prisma.attendancePeriod.findMany(),
    prisma.monthlyFee.findMany(),
    prisma.template.findMany(),
    prisma.receipt.findMany(),
    prisma.payment.findMany(),
    prisma.activityLog.findMany(),
    prisma.centerSettings.findMany(),
  ]);

  return {
    users,
    parents,
    students,
    teachers,
    classes,
    studentClasses,
    attendance,
    attendancePeriods,
    monthlyFees,
    templates,
    receipts,
    payments,
    activityLogs,
    centerSettings,
  };
}

function countTables(tables: Record<string, unknown[]>) {
  return Object.fromEntries(
    Object.entries(tables).map(([table, rows]) => [table, Array.isArray(rows) ? rows.length : 0])
  );
}

export async function createDatabaseBackup(prisma: any, { dryRun = true } = {}) {
  const tables = await exportTables(prisma);
  const counts = countTables(tables);
  const createdAt = new Date().toISOString();
  const payload = {
    version: BACKUP_VERSION,
    created_at: createdAt,
    source: "edu-manager-v2",
    counts,
    tables,
  };

  if (dryRun) {
    return {
      dry_run: true,
      encrypted: false,
      uploaded: false,
      created_at: createdAt,
      counts,
    };
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new ApiError(
      "STORAGE_NOT_CONFIGURED",
      "BLOB_READ_WRITE_TOKEN is required for backup upload",
      500
    );
  }

  const encrypted = encryptJson(payload);
  const pathname = `${BACKUP_PREFIX}/${createdAt.slice(0, 10)}/${createdAt.replace(/[:.]/g, "-")}.json`;
  const blob = await put(pathname, JSON.stringify(encrypted), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });

  return {
    dry_run: false,
    encrypted: true,
    uploaded: true,
    created_at: createdAt,
    pathname: blob.pathname,
    url: blob.url,
    counts,
  };
}

export async function verifyDatabaseBackup(url: string) {
  if (!/^https:\/\/.+/.test(url)) {
    throw new ApiError("INVALID_BACKUP_URL", "backup url must be https", 400);
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new ApiError("BACKUP_FETCH_FAILED", `Backup fetch failed: ${response.status}`, 400);
  }

  const encrypted = await response.json();
  const backup = decryptJson(encrypted);
  if (backup?.version !== BACKUP_VERSION || backup?.source !== "edu-manager-v2") {
    throw new ApiError("BACKUP_VERIFY_FAILED", "Backup metadata is invalid", 400);
  }

  return {
    valid: true,
    version: backup.version,
    created_at: backup.created_at,
    counts: backup.counts,
  };
}
