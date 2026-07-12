import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { put } from "@vercel/blob";
import { ApiError } from "./api-utils.js";

const BACKUP_PREFIX = "db-backups";
export const BACKUP_VERSION = 2;
export const BACKUP_FORMAT = "edu-manager-backup";

export const BACKUP_MANIFEST = [
  { model: "User", key: "users", delegate: "user" },
  { model: "Parent", key: "parents", delegate: "parent" },
  { model: "AuthSession", key: "authSessions", delegate: "authSession" },
  { model: "Teacher", key: "teachers", delegate: "teacher" },
  { model: "Class", key: "classes", delegate: "class" },
  { model: "Student", key: "students", delegate: "student" },
  { model: "StudentClass", key: "studentClasses", delegate: "studentClass" },
  { model: "EnrollmentPeriod", key: "enrollmentPeriods", delegate: "enrollmentPeriod" },
  { model: "Attendance", key: "attendance", delegate: "attendance" },
  { model: "AttendancePeriod", key: "attendancePeriods", delegate: "attendancePeriod" },
  { model: "Template", key: "templates", delegate: "template" },
  { model: "Receipt", key: "receipts", delegate: "receipt" },
  { model: "MonthlyFee", key: "monthlyFees", delegate: "monthlyFee" },
  { model: "MonthlyFeeLine", key: "monthlyFeeLines", delegate: "monthlyFeeLine" },
  { model: "ReceiptLine", key: "receiptLines", delegate: "receiptLine" },
  { model: "BulkFeePaymentBatch", key: "bulkFeePaymentBatches", delegate: "bulkFeePaymentBatch" },
  { model: "BulkFeePaymentItem", key: "bulkFeePaymentItems", delegate: "bulkFeePaymentItem" },
  { model: "Payment", key: "payments", delegate: "payment" },
  { model: "ActivityLog", key: "activityLogs", delegate: "activityLog" },
  { model: "StudentProgressMonth", key: "studentProgressMonths", delegate: "studentProgressMonth" },
  { model: "StudentProgressRevision", key: "studentProgressRevisions", delegate: "studentProgressRevision" },
  { model: "StudentProgressSkill", key: "studentProgressSkills", delegate: "studentProgressSkill" },
  { model: "StudentProgressDailyEntry", key: "studentProgressDailyEntries", delegate: "studentProgressDailyEntry" },
  { model: "CenterSettings", key: "centerSettings", delegate: "centerSettings" },
] as const;

type Tables = Record<string, any[]>;
export type DatabaseBackup = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  created_at: string;
  source: "edu-manager-v2";
  manifest: Array<{ model: string; key: string }>;
  counts: Record<string, number>;
  tables: Tables;
};

export type BackupEnvelope = {
  format: "edu-manager-backup-envelope";
  version: 2;
  key_id: string;
  algorithm: "aes-256-gcm";
  iv: string;
  tag: string;
  payload_checksum: string;
  ciphertext_checksum: string;
  data: string;
};

function checksum(value: Buffer | string) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function encryptionKey(secret: string | undefined) {
  if (!secret || secret.length < 32) {
    throw new ApiError("BACKUP_KEY_NOT_CONFIGURED", "BACKUP_ENCRYPTION_KEY must contain at least 32 characters", 500);
  }
  return createHash("sha256").update(secret).digest();
}

export function createBackupEnvelope(payload: DatabaseBackup, options: { key?: string; keyId?: string } = {}): BackupEnvelope {
  const secret = options.key ?? process.env.BACKUP_ENCRYPTION_KEY;
  const key = encryptionKey(secret);
  const keyId = options.keyId ?? process.env.BACKUP_ENCRYPTION_KEY_ID;
  if (!keyId) throw new ApiError("BACKUP_KEY_ID_NOT_CONFIGURED", "BACKUP_ENCRYPTION_KEY_ID is required", 500);
  const plaintext = JSON.stringify(payload);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    format: "edu-manager-backup-envelope",
    version: 2,
    key_id: keyId,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    payload_checksum: checksum(plaintext),
    ciphertext_checksum: checksum(encrypted),
    data: encrypted.toString("base64"),
  };
}

export function openBackupEnvelope(envelope: BackupEnvelope, options: { key?: string; keyId?: string } = {}): DatabaseBackup {
  if (envelope?.format !== "edu-manager-backup-envelope" || envelope.version !== 2 || envelope.algorithm !== "aes-256-gcm") {
    throw new ApiError("UNSUPPORTED_BACKUP", "Unsupported backup envelope", 400);
  }
  const expectedKeyId = options.keyId ?? process.env.BACKUP_ENCRYPTION_KEY_ID;
  if (expectedKeyId && envelope.key_id !== expectedKeyId) {
    throw new ApiError("BACKUP_KEY_ID_MISMATCH", `Backup requires encryption key ${envelope.key_id}`, 400);
  }
  const encrypted = Buffer.from(envelope.data, "base64");
  if (checksum(encrypted) !== envelope.ciphertext_checksum) throw new ApiError("BACKUP_CHECKSUM_FAILED", "Backup ciphertext checksum failed", 400);
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(options.key ?? process.env.BACKUP_ENCRYPTION_KEY), Buffer.from(envelope.iv, "base64"));
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    if (checksum(plaintext) !== envelope.payload_checksum) throw new ApiError("BACKUP_CHECKSUM_FAILED", "Backup payload checksum failed", 400);
    const backup = JSON.parse(plaintext);
    validateBackup(backup);
    return backup;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("BACKUP_DECRYPT_FAILED", "Backup could not be decrypted with the configured key", 400);
  }
}

function validateBackup(backup: any): asserts backup is DatabaseBackup {
  const expectedManifest = BACKUP_MANIFEST.map(({ model, key }) => ({ model, key }));
  if (backup?.format !== BACKUP_FORMAT || backup.version !== BACKUP_VERSION || backup.source !== "edu-manager-v2" || JSON.stringify(backup.manifest) !== JSON.stringify(expectedManifest)) {
    throw new ApiError("BACKUP_VERIFY_FAILED", "Backup metadata or model manifest is invalid", 400);
  }
  for (const { key } of BACKUP_MANIFEST) {
    if (!Array.isArray(backup.tables?.[key]) || backup.counts?.[key] !== backup.tables[key].length) {
      throw new ApiError("BACKUP_VERIFY_FAILED", `Backup table count is invalid: ${key}`, 400);
    }
  }
}

export async function createDatabaseSnapshot(prisma: any): Promise<DatabaseBackup> {
  return prisma.$transaction(async (tx: any) => {
    const rows = await Promise.all(BACKUP_MANIFEST.map(({ delegate }) => tx[delegate].findMany()));
    const tables = Object.fromEntries(BACKUP_MANIFEST.map(({ key }, index) => [key, rows[index]]));
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      created_at: new Date().toISOString(),
      source: "edu-manager-v2",
      manifest: BACKUP_MANIFEST.map(({ model, key }) => ({ model, key })),
      counts: Object.fromEntries(BACKUP_MANIFEST.map(({ key }) => [key, tables[key].length])),
      tables,
    };
  }, { isolationLevel: "RepeatableRead" });
}

export async function createDatabaseBackup(prisma: any, { dryRun = true } = {}) {
  const backup = await createDatabaseSnapshot(prisma);
  if (dryRun) return { dry_run: true, encrypted: false, uploaded: false, created_at: backup.created_at, counts: backup.counts, version: backup.version };
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new ApiError("STORAGE_NOT_CONFIGURED", "BLOB_READ_WRITE_TOKEN is required for backup upload", 500);
  const envelope = createBackupEnvelope(backup);
  const pathname = `${BACKUP_PREFIX}/${backup.created_at.slice(0, 10)}/${backup.created_at.replace(/[:.]/g, "-")}.v2.json`;
  const blob = await put(pathname, JSON.stringify(envelope), { access: "public", addRandomSuffix: false, contentType: "application/json" });
  return { dry_run: false, encrypted: true, uploaded: true, created_at: backup.created_at, pathname: blob.pathname, url: blob.url, counts: backup.counts, version: backup.version, key_id: envelope.key_id, payload_checksum: envelope.payload_checksum };
}

export async function fetchDatabaseBackup(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ApiError("INVALID_BACKUP_URL", "backup url is invalid", 400);
  }
  const configuredHosts = (process.env.BACKUP_ALLOWED_HOSTS || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  const allowedHost =
    parsed.hostname.endsWith(".public.blob.vercel-storage.com") ||
    configuredHosts.includes(parsed.hostname.toLowerCase());
  if (parsed.protocol !== "https:" || !allowedHost || !parsed.pathname.startsWith(`/${BACKUP_PREFIX}/`)) {
    throw new ApiError("INVALID_BACKUP_URL", "backup url is outside the configured backup storage", 400);
  }
  const response = await fetch(parsed, {
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new ApiError("BACKUP_FETCH_FAILED", `Backup fetch failed: ${response.status}`, 400);
  const maxBytes = 25 * 1024 * 1024;
  const declaredBytes = Number(response.headers.get("content-length") || 0);
  if (declaredBytes > maxBytes) {
    throw new ApiError("BACKUP_TOO_LARGE", "Backup exceeds the maximum supported size", 400);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > maxBytes) {
    throw new ApiError("BACKUP_TOO_LARGE", "Backup exceeds the maximum supported size", 400);
  }
  try {
    return openBackupEnvelope(JSON.parse(bytes.toString("utf8")));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("BACKUP_PARSE_FAILED", "Backup response is not valid JSON", 400);
  }
}

export async function verifyDatabaseBackup(url: string) {
  const backup = await fetchDatabaseBackup(url);
  return { valid: true, version: backup.version, created_at: backup.created_at, counts: backup.counts, manifest: backup.manifest };
}

export function assertRestoreAllowed(options: { databaseUrl?: string; confirmation?: string; nodeEnv?: string }) {
  if (options.confirmation !== "RESTORE_EDU_MANAGER") throw new ApiError("RESTORE_CONFIRMATION_REQUIRED", "Explicit restore confirmation is required", 400);
  let hostname = "";
  try { hostname = new URL(options.databaseUrl ?? "").hostname; } catch { /* rejected below */ }
  const localHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  if (options.nodeEnv !== "test" && !localHost) throw new ApiError("RESTORE_TARGET_FORBIDDEN", "Restore is restricted to localhost or NODE_ENV=test targets", 403);
}

export async function restoreDatabaseBackup(prisma: any, backup: DatabaseBackup, options: { databaseUrl?: string; confirmation?: string; nodeEnv?: string }) {
  assertRestoreAllowed(options);
  validateBackup(backup);
  await prisma.$transaction(async (tx: any) => {
    for (const { delegate } of [...BACKUP_MANIFEST].reverse()) await tx[delegate].deleteMany();
    for (const { delegate, key } of BACKUP_MANIFEST) {
      const data = backup.tables[key];
      if (data.length) await tx[delegate].createMany({ data });
    }
  });
  return { restored: true, version: backup.version, created_at: backup.created_at, counts: backup.counts };
}
