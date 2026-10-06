import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import prisma from "../lib/prisma.js";

export const BASELINE_SCHEMA = "edu-manager.admin-console-baseline" as const;
export const BASELINE_VERSION = 1 as const;

type MonthlyFeeRow = {
  month: string;
  totalAmount: number;
  status: string;
};

type ReceiptRow = {
  month: string;
  amount: number;
};

type PaymentRow = {
  createdAt: Date;
  amount: number;
};

type ProgressRow = {
  studentId: string;
  classId: string;
  month: string;
  progressScore: number;
  attendanceScore: number;
  consistencyScore: number;
  learningEvidenceCoverage: number;
  dailyAssessmentCount: number;
  finalizedAt: Date | null;
  academicInputStatus: string | null;
};

type TemplateRow = {
  type: string;
  paperSize: string;
  orientation: string;
  jsonConfig: unknown;
};

export type BaselineReader = {
  tenantExists(tenantId: string): Promise<boolean>;
  readMonthlyFees(tenantId: string, months: string[]): Promise<MonthlyFeeRow[]>;
  readReceipts(tenantId: string, months: string[]): Promise<ReceiptRow[]>;
  readPayments(tenantId: string, start: Date, end: Date): Promise<PaymentRow[]>;
  readProgressMonths(tenantId: string, month: string): Promise<ProgressRow[]>;
  readDefaultTemplates(tenantId: string): Promise<TemplateRow[]>;
};

export type AdminConsoleBaseline = {
  schema: typeof BASELINE_SCHEMA;
  version: typeof BASELINE_VERSION;
  tenantId: string;
  capturedAt: string;
  asOfMonth: string;
  canonical: {
    finance: {
      months: Array<{
        month: string;
        assessedTotal: string;
        paidFeeTotal: string;
        receiptTotal: string;
        expenseTotal: string;
        outstandingTotal: string;
      }>;
    };
    academic: {
      month: string;
      summary: {
        records: number;
        finalizedRecords: number;
        incompleteRecords: number;
        averageProgressScore: string;
        averageAttendanceScore: string;
        averageConsistencyScore: string;
        averageEvidenceCoverage: string;
        dailyAssessmentCount: number;
      };
      students: Array<{
        studentId: string;
        classId: string;
        progressScore: string;
        attendanceScore: string;
        consistencyScore: string;
        learningEvidenceCoverage: string;
        dailyAssessmentCount: number;
        finalized: boolean;
        academicInputStatus: string | null;
      }>;
    };
    pdfTemplates: Array<{
      type: string;
      paperSize: string;
      orientation: string;
      inputChecksum: string;
    }>;
  };
};

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthWindow(count: number, asOf: Date) {
  if (!Number.isInteger(count) || count < 1) throw new Error("Month count must be a positive integer");
  if (Number.isNaN(asOf.getTime())) throw new Error("Invalid as-of timestamp");
  const result: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    result.push(monthKey(new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() - offset, 1))));
  }
  return result;
}

function monthRange(months: string[]) {
  const first = months[0];
  const last = months.at(-1);
  if (!first || !last) throw new Error("Month window is empty");
  const [startYear, startMonth] = first.split("-").map(Number);
  const [endYear, endMonth] = last.split("-").map(Number);
  return {
    start: new Date(Date.UTC(startYear, startMonth - 1, 1)),
    end: new Date(Date.UTC(endYear, endMonth, 1)),
  };
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalValue(child)]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown) {
  return JSON.stringify(canonicalValue(value));
}

function normalizeTemplateConfig(value: unknown) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function checksum(value: unknown) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function decimal(value: number) {
  if (!Number.isFinite(value)) throw new Error("Baseline contains a non-finite numeric value");
  return value.toFixed(2);
}

function average(rows: ProgressRow[], pick: (row: ProgressRow) => number) {
  if (!rows.length) return "0.00";
  return decimal(rows.reduce((sum, row) => sum + pick(row), 0) / rows.length);
}

export function createPrismaBaselineReader(db: any): BaselineReader {
  return {
    async tenantExists(tenantId) {
      return Boolean(await db.tenant.findUnique({ where: { id: tenantId }, select: { id: true } }));
    },
    async readMonthlyFees(tenantId, months) {
      return db.monthlyFee.findMany({
        where: { tenantId, month: { in: months } },
        select: { month: true, totalAmount: true, status: true },
        orderBy: [{ month: "asc" }, { id: "asc" }],
      });
    },
    async readReceipts(tenantId, months) {
      return db.receipt.findMany({
        where: { tenantId, month: { in: months }, deletedAt: null },
        select: { month: true, amount: true },
        orderBy: [{ month: "asc" }, { id: "asc" }],
      });
    },
    async readPayments(tenantId, start, end) {
      return db.payment.findMany({
        where: { tenantId, deletedAt: null, createdAt: { gte: start, lt: end } },
        select: { createdAt: true, amount: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
    },
    async readProgressMonths(tenantId, month) {
      return db.studentProgressMonth.findMany({
        where: { tenantId, month },
        select: {
          studentId: true,
          classId: true,
          month: true,
          progressScore: true,
          attendanceScore: true,
          consistencyScore: true,
          learningEvidenceCoverage: true,
          dailyAssessmentCount: true,
          finalizedAt: true,
          academicInputStatus: true,
        },
        orderBy: [{ studentId: "asc" }, { classId: "asc" }],
      });
    },
    async readDefaultTemplates(tenantId) {
      return db.template.findMany({
        where: { tenantId, isDefault: true },
        select: { type: true, paperSize: true, orientation: true, jsonConfig: true },
        orderBy: [{ type: "asc" }, { id: "asc" }],
      });
    },
  };
}

export async function buildAdminConsoleBaseline(
  reader: BaselineReader,
  options: { tenantId: string; asOf?: Date; capturedAt?: string },
): Promise<AdminConsoleBaseline> {
  const tenantId = options.tenantId.trim();
  if (!tenantId) throw new Error("Tenant ID is required");
  const asOf = options.asOf ?? new Date();
  if (Number.isNaN(asOf.getTime())) throw new Error("Invalid as-of timestamp");
  const capturedAt = options.capturedAt ?? new Date().toISOString();
  if (Number.isNaN(new Date(capturedAt).getTime())) throw new Error("Invalid captured-at timestamp");
  if (!(await reader.tenantExists(tenantId))) throw new Error(`Tenant ${tenantId} does not exist`);

  const months = monthWindow(12, asOf);
  const currentMonth = months.at(-1)!;
  const range = monthRange(months);
  const [monthlyFees, receipts, payments, progressRows, templates] = await Promise.all([
    reader.readMonthlyFees(tenantId, months),
    reader.readReceipts(tenantId, months),
    reader.readPayments(tenantId, range.start, range.end),
    reader.readProgressMonths(tenantId, currentMonth),
    reader.readDefaultTemplates(tenantId),
  ]);

  const financeMonths = months.map((month) => {
    const feeRows = monthlyFees.filter((row) => row.month === month);
    const assessed = feeRows.reduce((sum, row) => sum + Number(row.totalAmount), 0);
    const paid = feeRows
      .filter((row) => row.status === "paid")
      .reduce((sum, row) => sum + Number(row.totalAmount), 0);
    const receiptTotal = receipts
      .filter((row) => row.month === month)
      .reduce((sum, row) => sum + Number(row.amount), 0);
    const expenseTotal = payments
      .filter((row) => monthKey(row.createdAt) === month)
      .reduce((sum, row) => sum + Number(row.amount), 0);
    return {
      month,
      assessedTotal: decimal(assessed),
      paidFeeTotal: decimal(paid),
      receiptTotal: decimal(receiptTotal),
      expenseTotal: decimal(expenseTotal),
      outstandingTotal: decimal(assessed - paid),
    };
  });

  const sortedProgress = [...progressRows].sort(
    (left, right) => left.studentId.localeCompare(right.studentId) || left.classId.localeCompare(right.classId),
  );
  const academicStudents = sortedProgress.map((row) => ({
    studentId: row.studentId,
    classId: row.classId,
    progressScore: decimal(row.progressScore),
    attendanceScore: decimal(row.attendanceScore),
    consistencyScore: decimal(row.consistencyScore),
    learningEvidenceCoverage: decimal(row.learningEvidenceCoverage),
    dailyAssessmentCount: row.dailyAssessmentCount,
    finalized: Boolean(row.finalizedAt),
    academicInputStatus: row.academicInputStatus,
  }));

  const pdfTemplates = templates
    .map((template) => {
      const stableInput = {
        type: String(template.type),
        paperSize: String(template.paperSize),
        orientation: String(template.orientation),
        jsonConfig: normalizeTemplateConfig(template.jsonConfig),
      };
      return {
        type: stableInput.type,
        paperSize: stableInput.paperSize,
        orientation: stableInput.orientation,
        inputChecksum: checksum(stableInput),
      };
    })
    .sort(
      (left, right) =>
        left.type.localeCompare(right.type) ||
        left.paperSize.localeCompare(right.paperSize) ||
        left.orientation.localeCompare(right.orientation) ||
        left.inputChecksum.localeCompare(right.inputChecksum),
    );

  return {
    schema: BASELINE_SCHEMA,
    version: BASELINE_VERSION,
    tenantId,
    capturedAt: new Date(capturedAt).toISOString(),
    asOfMonth: currentMonth,
    canonical: {
      finance: { months: financeMonths },
      academic: {
        month: currentMonth,
        summary: {
          records: sortedProgress.length,
          finalizedRecords: sortedProgress.filter((row) => row.finalizedAt).length,
          incompleteRecords: sortedProgress.filter((row) => row.academicInputStatus !== "complete").length,
          averageProgressScore: average(sortedProgress, (row) => row.progressScore),
          averageAttendanceScore: average(sortedProgress, (row) => row.attendanceScore),
          averageConsistencyScore: average(sortedProgress, (row) => row.consistencyScore),
          averageEvidenceCoverage: average(sortedProgress, (row) => row.learningEvidenceCoverage),
          dailyAssessmentCount: sortedProgress.reduce((sum, row) => sum + row.dailyAssessmentCount, 0),
        },
        students: academicStudents,
      },
      pdfTemplates,
    },
  };
}

function readArgument(args: string[], name: string) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => ["--apply", "--write", "--fix", "--delete"].includes(arg))) {
    throw new Error("Baseline capture is read-only and rejects mutation flags");
  }
  const tenantId = readArgument(args, "--tenant");
  if (!tenantId) throw new Error("Usage: capture-baseline.ts --tenant <tenant-id> [--as-of <ISO>] [--output <file>]");
  const asOfValue = readArgument(args, "--as-of");
  const baseline = await buildAdminConsoleBaseline(createPrismaBaselineReader(prisma), {
    tenantId,
    asOf: asOfValue ? new Date(asOfValue) : new Date(),
  });
  const serialized = `${JSON.stringify(baseline, null, 2)}\n`;
  const output = readArgument(args, "--output");
  if (output) await writeFile(output, serialized, { encoding: "utf8", flag: "wx" });
  else process.stdout.write(serialized);
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
