import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import {
  BASELINE_SCHEMA,
  BASELINE_VERSION,
  type AdminConsoleBaseline,
} from "./capture-baseline.js";

export type BaselineDrift = {
  path: string;
  expected: unknown;
  actual: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function diffValues(expected: unknown, actual: unknown, path: string, drifts: BaselineDrift[]) {
  if (Object.is(expected, actual)) return;
  if (Array.isArray(expected) && Array.isArray(actual)) {
    const length = Math.max(expected.length, actual.length);
    for (let index = 0; index < length; index += 1) {
      diffValues(expected[index], actual[index], `${path}[${index}]`, drifts);
    }
    return;
  }
  if (isRecord(expected) && isRecord(actual)) {
    const keys = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
    for (const key of keys) {
      diffValues(expected[key], actual[key], path ? `${path}.${key}` : key, drifts);
    }
    return;
  }
  drifts.push({ path, expected, actual });
}

function assertCompatible(expected: AdminConsoleBaseline, actual: AdminConsoleBaseline) {
  if (expected.schema !== BASELINE_SCHEMA || actual.schema !== BASELINE_SCHEMA) {
    throw new Error("Baseline schema mismatch");
  }
  if (expected.version !== BASELINE_VERSION || actual.version !== BASELINE_VERSION) {
    throw new Error("Baseline version mismatch");
  }
  if (expected.tenantId !== actual.tenantId) {
    throw new Error(`Baseline tenant mismatch: ${expected.tenantId} != ${actual.tenantId}`);
  }
  if (expected.asOfMonth !== actual.asOfMonth) {
    throw new Error(`Baseline as-of month mismatch: ${expected.asOfMonth} != ${actual.asOfMonth}`);
  }
}

export function compareAdminConsoleBaselines(
  expected: AdminConsoleBaseline,
  actual: AdminConsoleBaseline,
) {
  assertCompatible(expected, actual);
  const drifts: BaselineDrift[] = [];
  diffValues(expected.canonical, actual.canonical, "canonical", drifts);
  drifts.sort((left, right) => left.path.localeCompare(right.path));
  return {
    schema: "edu-manager.admin-console-baseline-comparison" as const,
    version: 1 as const,
    tenantId: expected.tenantId,
    matches: drifts.length === 0,
    driftCount: drifts.length,
    drifts,
  };
}

function readArgument(args: string[], name: string) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a file path`);
  return value;
}

async function readBaseline(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as AdminConsoleBaseline;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => ["--apply", "--write", "--fix", "--delete"].includes(arg))) {
    throw new Error("Baseline comparison is read-only and rejects mutation flags");
  }
  const expectedPath = readArgument(args, "--baseline");
  const actualPath = readArgument(args, "--current");
  if (!expectedPath || !actualPath) {
    throw new Error("Usage: compare-admin-console-baseline.ts --baseline <file> --current <file> [--output <file>]");
  }
  const comparison = compareAdminConsoleBaselines(
    await readBaseline(expectedPath),
    await readBaseline(actualPath),
  );
  const serialized = `${JSON.stringify(comparison, null, 2)}\n`;
  const output = readArgument(args, "--output");
  if (output) await writeFile(output, serialized, { encoding: "utf8", flag: "wx" });
  else process.stdout.write(serialized);
  if (!comparison.matches) process.exitCode = 2;
}

const entry = process.argv[1];
if (entry && pathToFileURL(entry).href === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
