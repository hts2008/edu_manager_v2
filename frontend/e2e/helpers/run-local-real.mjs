import { spawn, execFileSync } from "node:child_process";
import { setTimeout } from "node:timers/promises";
import { randomBytes } from "node:crypto";

const container = "edu-release-recovery-20261006";
const inspected = JSON.parse(execFileSync("docker", ["inspect", container], { encoding: "utf8" }))[0];
const password = inspected.Config.Env.find(value => value.startsWith("POSTGRES_PASSWORD=")).slice("POSTGRES_PASSWORD=".length);
const database = `edu_sidecar_e2e_${randomBytes(4).toString("hex")}`;
execFileSync("docker", ["exec", container, "psql", "-U", "release", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", `CREATE DATABASE ${database}`]);
const url = `postgresql://release:${encodeURIComponent(password)}@127.0.0.1:15433/${database}`;
const credential = randomBytes(24).toString("hex");
const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url, TEST_DATABASE_URL: url,
  E2E_FIXTURE_ALLOW_MUTATION: "student-progress-local-test", E2E_ADMIN_USERNAME: "admin",
  E2E_ADMIN_PASSWORD: credential, BOOTSTRAP_ADMIN_PASSWORD: credential, E2E_RECEPTIONIST_PASSWORD: credential,
  JWT_SECRET: randomBytes(32).toString("hex"), TENANCY_MODE: "legacy", RELEASE_MAINTENANCE: "false",
  NODE_ENV: "production", PORT: "3195", E2E_BASE_URL: "http://127.0.0.1:3195", E2E_OUTPUT_DIR: "./test-results/sidecar-real" };
function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", code => code === 0 ? resolve() : reject(new Error(`Command failed (${code})`)));
  });
}
await run(["node_modules/prisma/build/index.js", "migrate", "deploy"]);
await run(["node_modules/tsx/dist/cli.mjs", "scripts/e2e-fixture.ts"]);
await run(["node_modules/tsx/dist/cli.mjs", "scripts/student-progress-e2e-fixture.ts"]);
const server = spawn(process.execPath, ["node_modules/tsx/dist/cli.mjs", "scripts/local-smoke-server.ts"], { env, stdio: "ignore" });
try {
  await setTimeout(3000);
  await run(["frontend/node_modules/@playwright/test/cli.js", "test", "--config=frontend/playwright.real.config.js", "--reporter=list"]);
} finally {
  server.kill();
  console.info(`Isolated test database retained: ${database}`);
}
