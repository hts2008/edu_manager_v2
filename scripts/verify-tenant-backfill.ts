import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import prisma from "../lib/prisma.js";

export const DEFAULT_TENANT_ID = "tenant_default";

export const TENANT_TABLES = [
  "users", "parents", "auth_sessions", "students", "teachers", "classes",
  "class_sessions", "class_month_plans", "class_month_plan_revisions",
  "student_classes", "enrollment_periods", "attendance", "attendance_periods",
  "monthly_fees", "monthly_fee_lines", "monthly_fee_line_revisions", "templates",
  "receipts", "receipt_lines", "bulk_fee_payment_batches", "bulk_fee_payment_items",
  "payments", "activity_logs", "student_progress_months", "student_progress_revisions",
  "student_progress_skills", "student_progress_daily_entries", "center_settings",
] as const;

export type TenantTable = typeof TENANT_TABLES[number];

export type TenantRelation = {
  childTable: TenantTable;
  childColumn: string;
  parentTable: TenantTable;
  parentColumn?: string;
  nullable?: boolean;
};

export const TENANT_RELATIONS: readonly TenantRelation[] = [
  { childTable: "auth_sessions", childColumn: "user_id", parentTable: "users", nullable: true },
  { childTable: "auth_sessions", childColumn: "parent_id", parentTable: "parents", nullable: true },
  { childTable: "students", childColumn: "parent_id", parentTable: "parents" },
  { childTable: "classes", childColumn: "teacher_id", parentTable: "teachers", nullable: true },
  { childTable: "class_sessions", childColumn: "class_id", parentTable: "classes" },
  { childTable: "class_sessions", childColumn: "replacement_for_id", parentTable: "class_sessions", nullable: true },
  { childTable: "class_sessions", childColumn: "created_by", parentTable: "users", nullable: true },
  { childTable: "class_sessions", childColumn: "updated_by", parentTable: "users", nullable: true },
  { childTable: "class_month_plans", childColumn: "class_id", parentTable: "classes" },
  { childTable: "class_month_plans", childColumn: "created_by", parentTable: "users", nullable: true },
  { childTable: "class_month_plans", childColumn: "updated_by", parentTable: "users", nullable: true },
  { childTable: "class_month_plans", childColumn: "frozen_by", parentTable: "users", nullable: true },
  { childTable: "class_month_plan_revisions", childColumn: "plan_id", parentTable: "class_month_plans" },
  { childTable: "class_month_plan_revisions", childColumn: "actor_id", parentTable: "users", nullable: true },
  { childTable: "student_classes", childColumn: "student_id", parentTable: "students" },
  { childTable: "student_classes", childColumn: "class_id", parentTable: "classes" },
  { childTable: "enrollment_periods", childColumn: "student_id", parentTable: "students" },
  { childTable: "enrollment_periods", childColumn: "class_id", parentTable: "classes" },
  { childTable: "attendance", childColumn: "student_id", parentTable: "students" },
  { childTable: "attendance", childColumn: "class_id", parentTable: "classes" },
  { childTable: "attendance", childColumn: "class_session_id", parentTable: "class_sessions", nullable: true },
  { childTable: "attendance", childColumn: "created_by", parentTable: "users" },
  { childTable: "attendance_periods", childColumn: "class_id", parentTable: "classes" },
  { childTable: "attendance_periods", childColumn: "submitted_by", parentTable: "users", nullable: true },
  { childTable: "attendance_periods", childColumn: "approved_by", parentTable: "users", nullable: true },
  { childTable: "attendance_periods", childColumn: "locked_by", parentTable: "users", nullable: true },
  { childTable: "monthly_fees", childColumn: "student_id", parentTable: "students" },
  { childTable: "monthly_fees", childColumn: "receipt_id", parentTable: "receipts", nullable: true },
  { childTable: "monthly_fee_lines", childColumn: "monthly_fee_id", parentTable: "monthly_fees" },
  { childTable: "monthly_fee_lines", childColumn: "student_id", parentTable: "students" },
  { childTable: "monthly_fee_lines", childColumn: "class_id", parentTable: "classes", nullable: true },
  { childTable: "monthly_fee_lines", childColumn: "receipt_id", parentTable: "receipts", nullable: true },
  { childTable: "monthly_fee_line_revisions", childColumn: "monthly_fee_line_id", parentTable: "monthly_fee_lines" },
  { childTable: "monthly_fee_line_revisions", childColumn: "actor_id", parentTable: "users", nullable: true },
  { childTable: "templates", childColumn: "created_by", parentTable: "users" },
  { childTable: "receipts", childColumn: "student_id", parentTable: "students" },
  { childTable: "receipts", childColumn: "template_id", parentTable: "templates" },
  { childTable: "receipts", childColumn: "created_by", parentTable: "users" },
  { childTable: "receipt_lines", childColumn: "receipt_id", parentTable: "receipts" },
  { childTable: "receipt_lines", childColumn: "monthly_fee_line_id", parentTable: "monthly_fee_lines", nullable: true },
  { childTable: "receipt_lines", childColumn: "class_id", parentTable: "classes", nullable: true },
  { childTable: "bulk_fee_payment_batches", childColumn: "actor_id", parentTable: "users" },
  { childTable: "bulk_fee_payment_batches", childColumn: "template_id", parentTable: "templates" },
  { childTable: "bulk_fee_payment_items", childColumn: "batch_id", parentTable: "bulk_fee_payment_batches" },
  { childTable: "bulk_fee_payment_items", childColumn: "line_id", parentTable: "monthly_fee_lines" },
  { childTable: "bulk_fee_payment_items", childColumn: "receipt_id", parentTable: "receipts", nullable: true },
  { childTable: "payments", childColumn: "template_id", parentTable: "templates" },
  { childTable: "payments", childColumn: "created_by", parentTable: "users" },
  { childTable: "activity_logs", childColumn: "user_id", parentTable: "users" },
  { childTable: "student_progress_months", childColumn: "student_id", parentTable: "students" },
  { childTable: "student_progress_months", childColumn: "class_id", parentTable: "classes" },
  { childTable: "student_progress_months", childColumn: "created_by", parentTable: "users" },
  { childTable: "student_progress_months", childColumn: "updated_by", parentTable: "users", nullable: true },
  { childTable: "student_progress_revisions", childColumn: "progress_month_id", parentTable: "student_progress_months" },
  { childTable: "student_progress_revisions", childColumn: "actor_id", parentTable: "users" },
  { childTable: "student_progress_skills", childColumn: "progress_month_id", parentTable: "student_progress_months" },
  { childTable: "student_progress_daily_entries", childColumn: "progress_month_id", parentTable: "student_progress_months" },
  { childTable: "student_progress_daily_entries", childColumn: "created_by", parentTable: "users" },
  { childTable: "student_progress_daily_entries", childColumn: "graded_by_teacher_id", parentTable: "teachers", nullable: true },
] as const;

export type TableMetric = {
  rowCount: number;
  nullTenantCount: number;
  orphanTenantCount: number;
  businessChecksum: string;
};

export type TenantVerificationReader = {
  defaultTenantExists(tenantId: string): Promise<boolean>;
  readTableMetric(table: TenantTable): Promise<TableMetric>;
  readRelationMismatch(relation: TenantRelation): Promise<number>;
};

export type TenantBackfillBaseline = {
  version: 1;
  expectedTenantId: string;
  generatedAt: string;
  tables: Record<string, { rowCount: number; businessChecksum: string }>;
};

type FailureCode =
  | "BASELINE_REQUIRED" | "DEFAULT_TENANT_MISSING" | "NULL_TENANT_ID"
  | "ORPHAN_TENANT_ID" | "CROSS_TENANT_RELATION" | "ROW_COUNT_CHANGED"
  | "BUSINESS_CHECKSUM_CHANGED" | "BASELINE_INVALID";

type VerificationFailure = {
  code: FailureCode;
  target: string;
  expected?: string | number;
  actual?: string | number;
};

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function asNumber(value: bigint | number | string) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`Unsafe count returned by database: ${value}`);
  return parsed;
}

export function createPostgresVerificationReader(db: {
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
}): TenantVerificationReader {
  return {
    async defaultTenantExists(tenantId) {
      const rows = await db.$queryRawUnsafe<Array<{ exists: boolean }>>(
        `SELECT EXISTS (SELECT 1 FROM "tenants" WHERE "id" = $1) AS "exists"`,
        tenantId,
      );
      return rows[0]?.exists === true;
    },
    async readTableMetric(table) {
      const identifier = quoteIdentifier(table);
      const rows = await db.$queryRawUnsafe<Array<{
        row_count: bigint | number | string;
        null_tenant_count: bigint | number | string;
        orphan_tenant_count: bigint | number | string;
        business_checksum: string;
      }>>(`
        SELECT
          COUNT(*) AS "row_count",
          COUNT(*) FILTER (WHERE source."tenant_id" IS NULL) AS "null_tenant_count",
          COUNT(*) FILTER (
            WHERE source."tenant_id" IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM "tenants" tenant WHERE tenant."id" = source."tenant_id")
          ) AS "orphan_tenant_count",
          md5(COALESCE(string_agg((to_jsonb(source.*) - 'tenant_id')::text, '|' ORDER BY (to_jsonb(source.*) - 'tenant_id')::text), 'empty')) AS "business_checksum"
        FROM ${identifier} source
      `);
      const row = rows[0];
      if (!row) throw new Error(`No verification metric returned for ${table}`);
      return {
        rowCount: asNumber(row.row_count),
        nullTenantCount: asNumber(row.null_tenant_count),
        orphanTenantCount: asNumber(row.orphan_tenant_count),
        businessChecksum: row.business_checksum,
      };
    },
    async readRelationMismatch(relation) {
      const childTable = quoteIdentifier(relation.childTable);
      const childColumn = quoteIdentifier(relation.childColumn);
      const parentTable = quoteIdentifier(relation.parentTable);
      const parentColumn = quoteIdentifier(relation.parentColumn ?? "id");
      const rows = await db.$queryRawUnsafe<Array<{ mismatch_count: bigint | number | string }>>(`
        SELECT COUNT(*) AS "mismatch_count"
        FROM ${childTable} child
        JOIN ${parentTable} parent ON parent.${parentColumn} = child.${childColumn}
        WHERE child.${childColumn} IS NOT NULL
          AND child."tenant_id" IS DISTINCT FROM parent."tenant_id"
      `);
      return asNumber(rows[0]?.mismatch_count ?? 0);
    },
  };
}

export async function captureTenantBackfillBaseline(
  reader: TenantVerificationReader,
  generatedAt = new Date().toISOString(),
): Promise<TenantBackfillBaseline> {
  if (!(await reader.defaultTenantExists(DEFAULT_TENANT_ID))) {
    throw new Error(`Default tenant ${DEFAULT_TENANT_ID} is missing; run tenancy expand first`);
  }
  const tables: TenantBackfillBaseline["tables"] = {};
  for (const table of TENANT_TABLES) {
    const metric = await reader.readTableMetric(table);
    tables[table] = { rowCount: metric.rowCount, businessChecksum: metric.businessChecksum };
  }
  return { version: 1, expectedTenantId: DEFAULT_TENANT_ID, generatedAt, tables };
}

export async function verifyTenantBackfill(
  reader: TenantVerificationReader,
  baseline?: TenantBackfillBaseline,
) {
  const failures: VerificationFailure[] = [];
  const baselineTables = baseline?.tables && typeof baseline.tables === "object"
    ? baseline.tables
    : undefined;
  if (!baseline) failures.push({ code: "BASELINE_REQUIRED", target: "baseline" });
  if (baseline && (
    baseline.version !== 1 ||
    baseline.expectedTenantId !== DEFAULT_TENANT_ID ||
    !baselineTables
  )) {
    failures.push({ code: "BASELINE_INVALID", target: "baseline" });
  }
  if (!(await reader.defaultTenantExists(DEFAULT_TENANT_ID))) {
    failures.push({ code: "DEFAULT_TENANT_MISSING", target: DEFAULT_TENANT_ID });
  }

  const tables: Record<string, TableMetric> = {};
  for (const table of TENANT_TABLES) {
    const metric = await reader.readTableMetric(table);
    tables[table] = metric;
    if (metric.nullTenantCount) failures.push({ code: "NULL_TENANT_ID", target: table, expected: 0, actual: metric.nullTenantCount });
    if (metric.orphanTenantCount) failures.push({ code: "ORPHAN_TENANT_ID", target: table, expected: 0, actual: metric.orphanTenantCount });
    const expected = baselineTables?.[table];
    if (baseline && !expected) failures.push({ code: "BASELINE_INVALID", target: table });
    if (expected && expected.rowCount !== metric.rowCount) failures.push({ code: "ROW_COUNT_CHANGED", target: table, expected: expected.rowCount, actual: metric.rowCount });
    if (expected && expected.businessChecksum !== metric.businessChecksum) failures.push({ code: "BUSINESS_CHECKSUM_CHANGED", target: table, expected: expected.businessChecksum, actual: metric.businessChecksum });
  }

  const relations: Record<string, number> = {};
  for (const relation of TENANT_RELATIONS) {
    const key = `${relation.childTable}.${relation.childColumn}->${relation.parentTable}.${relation.parentColumn ?? "id"}`;
    const count = await reader.readRelationMismatch(relation);
    relations[key] = count;
    if (count) failures.push({ code: "CROSS_TENANT_RELATION", target: key, expected: 0, actual: count });
  }

  return {
    mode: "read-only" as const,
    expectedTenantId: DEFAULT_TENANT_ID,
    readyForConstrain: failures.length === 0,
    summary: { tablesChecked: TENANT_TABLES.length, relationsChecked: TENANT_RELATIONS.length, failures: failures.length },
    failures,
    tables,
    relations,
  };
}

function readArgument(args: string[], name: string) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a file path`);
  return value;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => ["--apply", "--write", "--fix"].includes(arg))) {
    throw new Error("This verifier is read-only and does not support mutation flags");
  }
  const reader = createPostgresVerificationReader(prisma);
  if (args.includes("--capture-baseline")) {
    process.stdout.write(`${JSON.stringify(await captureTenantBackfillBaseline(reader), null, 2)}\n`);
    return;
  }
  const baselinePath = readArgument(args, "--baseline");
  const baseline = baselinePath
    ? JSON.parse(await readFile(baselinePath, "utf8")) as TenantBackfillBaseline
    : undefined;
  const report = await verifyTenantBackfill(reader, baseline);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.readyForConstrain) process.exitCode = 2;
}

const entry = process.argv[1];
if (entry && pathToFileURL(entry).href === import.meta.url) {
  main()
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
