import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";

const env = { ...process.env, E2E_BASE_URL: "http://127.0.0.1:3194", E2E_OUTPUT_DIR: "./test-results/sidecar-visual" };
function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", code => code === 0 ? resolve() : reject(new Error(`Command failed (${code})`)));
  });
}
await run(["frontend/node_modules/vite/bin/vite.js", "build", "frontend"]);
const server = spawn(process.execPath, ["frontend/node_modules/vite/bin/vite.js", "preview", "frontend", "--host", "127.0.0.1", "--port", "3194", "--strictPort"], { env, stdio: "ignore" });
try {
  await setTimeout(2000);
  await run(["frontend/node_modules/@playwright/test/cli.js", "test", "--config=frontend/playwright.config.js", "advanced-reports-chart.spec.js", "report-bi.spec.js", "template-designer-hardening.spec.js", "student-progress-dashboard.spec.js", "--project=chromium", "--reporter=list"]);
} finally {
  server.kill();
}
