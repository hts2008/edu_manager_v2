import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveTuitionProgressTestTarget, bindTuitionProgressTestTarget } from "../lib/tuition-progress-test-target.ts";

const root = process.cwd();
const target = resolveTuitionProgressTestTarget({ ...process.env, TPR_RELEASE_MODE: "true" });
if (!target) throw new Error("Isolated target required");
bindTuitionProgressTestTarget(process.env, target);
process.env.NODE_ENV = "test";
const directory = resolve(root, "docs/artifacts/tuition-progress-execution-2026-10-05");
mkdirSync(directory, { recursive: true });
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const tsx = resolve(root, "node_modules/tsx/dist/cli.mjs");
const frontend = resolve(root, "frontend");
const tests = readdirSync(resolve(frontend, "tests")).filter(name => name.endsWith(".test.js"));
const commands = [
  ["typecheck", ["node_modules/typescript/bin/tsc", "--noEmit", "--pretty", "false"]],
  ["root-unit", [tsx, ...pkg.scripts["test:unit"].split(" ").slice(1)]],
  ["admin-console", ["scripts/run-admin-console-tests.mjs"]],
  ["remediation", [tsx, ...pkg.scripts["test:tuition-progress"].split(" ").slice(1)]],
  ["real-http-pg", [tsx, ...pkg.scripts["test:tuition-progress:real"].split(" ").slice(1)]],
  ["frontend-unit", ["--test", ...tests.map(name => `tests/${name}`)], frontend],
  ["frontend-lint", ["node_modules/eslint/bin/eslint.js", ".", "--max-warnings=0"], frontend],
  ["frontend-build", ["node_modules/vite/bin/vite.js", "build"], frontend],
  ["inventory", [tsx, "scripts/audit-tuition-progress.ts", "--cutoff=2026-10-05T23:59:59Z"]],
  ["frontend-security-policy", ["scripts/npm-audit-policy.mjs", "--cwd", "frontend"]],
  ["focused-coverage", ["--experimental-test-coverage", "--import", "tsx", "--test", "--test-reporter=spec",
    "tests/tuition-production-remediation.test.ts", "tests/tuition-v3.test.ts", "tests/tuition-v3-service.test.ts",
    "tests/student-progress-remediation.test.ts", "tests/student-progress-timeline-remediation.test.ts",
    "tests/student-progress-finalization.test.ts", "tests/student-progress-report.test.ts", "tests/student-progress-daily-rollup.test.ts"]],
];
if (process.env.E2E_BASE_URL) {
  if (process.env.E2E_BASE_URL !== "http://127.0.0.1:3088") throw new Error("Browser target must be the isolated local server");
  process.env.E2E_OUTPUT_DIR = resolve(directory, "browser");
  commands.push(["browser", ["node_modules/@playwright/test/cli.js", "test", "--config=playwright.real.config.js",
    "tuition-progress-remediation.spec.js"], frontend]);
}
const results = [];
for (const [name, args, cwd = root] of commands) {
  const start = Date.now();
  const result = spawnSync(process.execPath, args, { cwd, env: process.env, encoding: "utf8",
    timeout: 240_000, maxBuffer: 20 * 1024 * 1024 });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  const counts = Object.fromEntries(["tests", "pass", "fail", "skipped"].map(key => {
    const match = output.match(new RegExp(`(?:#|\\u2139) ${key} (\\d+)`));
    return [key, match ? Number(match[1]) : null];
  }));
  if (name === "browser") {
    counts.pass = Number(output.match(/(\d+) passed/)?.[1] || 0);
    counts.fail = Number(output.match(/(\d+) failed/)?.[1] || 0);
    counts.skipped = Number(output.match(/(\d+) skipped/)?.[1] || 0);
    counts.tests = counts.pass + counts.fail + counts.skipped;
  }
  writeFileSync(resolve(directory, `${name}.log`), output);
  results.push({ name, exit: result.status, signal: result.signal, durationMs: Date.now() - start, ...counts });
  console.log(`${name}: exit=${result.status}, tests=${counts.tests}, pass=${counts.pass}, fail=${counts.fail}, skipped=${counts.skipped}`);
}
const audit = spawnSync("npm", ["audit", "--omit=dev", "--json"], { cwd: root,
  encoding: "utf8", shell: process.platform === "win32", timeout: 60_000 });
writeFileSync(resolve(directory, "root-production-audit.json"), audit.stdout || "{}");
results.push({ name: "root-production-security", exit: audit.status, signal: audit.signal });
console.log(`root-production-security: exit=${audit.status}`);
writeFileSync(resolve(directory, "verification.json"), JSON.stringify({
  generatedAt: new Date().toISOString(), head: spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim(),
  candidate: "dirty working tree; not an immutable release candidate", database: target.database,
  schema: target.schema, productionAccess: false, results,
}, null, 2));
if (results.some(result => result.exit !== 0)) process.exitCode = 1;
