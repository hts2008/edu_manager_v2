#!/usr/bin/env node

import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), "..");
const requireFromFrontend = createRequire(
  path.join(rootDir, "frontend", "package.json")
);

const defaultRoutes = [
  "/",
  "/students",
  "/classes",
  "/attendance",
  "/fee-collection",
  "/reports",
  "/advanced-reports",
  "/templates",
  "/payments",
  "/history",
];

const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function usage() {
  console.log(`Usage: npm run test:perf -- [--base <url>] [--trace]

Options:
  --base <url>      App base URL. Defaults to PERF_BASE_URL or http://127.0.0.1:3000.
  --trace           Write a Playwright trace zip next to the JSON/Markdown reports.
  --help            Show this message.

Environment:
  PERF_USERNAME            Login username. Default: admin
  PERF_PASSWORD            Login password. Default: admin123
  PERF_READ_ONLY           Fail on non-auth mutation API calls when set to 1. Default: 1
  PERF_ROUTE_SEVERE_MS     Per-route severe threshold. Default: 15000
  PERF_API_SEVERE_MS       Per-API severe threshold. Default: 10000
  PERF_OUTPUT_DIR          Report directory. Default: receipts/perf
  PERF_HEADLESS            Set to 0 to show Chrome. Default: 1
`);
}

function parseArgs(argv) {
  const options = {
    baseUrl: process.env.PERF_BASE_URL || "http://127.0.0.1:3000",
    trace: process.env.PERF_TRACE === "1",
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--trace") {
      options.trace = true;
    } else if (arg === "--base") {
      const value = argv[index + 1];
      if (!value) throw new Error("--base requires a URL value");
      options.baseUrl = value;
      index += 1;
    } else if (arg.startsWith("--base=")) {
      options.baseUrl = arg.slice("--base=".length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return {
    ...options,
    baseUrl: normalizeBaseUrl(options.baseUrl),
  };
}

function normalizeBaseUrl(value) {
  try {
    const url = new URL(value);
    return url.href.replace(/\/$/, "");
  } catch {
    throw new Error(`Invalid base URL: ${value}`);
  }
}

function parsePositiveInteger(name, fallback) {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

async function loadPlaywright() {
  try {
    return requireFromFrontend("playwright");
  } catch (error) {
    throw new Error(
      `Unable to load playwright from frontend/node_modules. Run npm --prefix frontend install if dependencies are missing. ${error.message}`
    );
  }
}

function isApiRequest(url) {
  try {
    return new URL(url).pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

function apiPath(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function isAllowedAuthMutation(method, url) {
  if (method !== "POST") return false;
  try {
    return new URL(url).pathname === "/api/auth/login";
  } catch {
    return false;
  }
}

function percentile(values, percentileValue) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function round(value) {
  return Math.round(value * 10) / 10;
}

async function login(page, baseUrl, username, password) {
  await page.goto(`${baseUrl}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await Promise.all([
    page.waitForURL((url) => url.pathname !== "/login", { timeout: 30_000 }),
    page.locator('form button[type="submit"]').click(),
  ]);
}

async function collectBrowserMetrics(page) {
  return page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation").at(-1);
    const paints = performance.getEntriesByType("paint");
    const firstPaint = paints.find((entry) => entry.name === "first-paint");
    const fcp = paints.find((entry) => entry.name === "first-contentful-paint");
    return {
      dom_content_loaded_ms: navigation
        ? Math.round(navigation.domContentLoadedEventEnd)
        : null,
      load_event_ms: navigation ? Math.round(navigation.loadEventEnd) : null,
      first_paint_ms: firstPaint ? Math.round(firstPaint.startTime) : null,
      first_contentful_paint_ms: fcp ? Math.round(fcp.startTime) : null,
      transfer_size_bytes: navigation
        ? Math.round(navigation.transferSize || 0)
        : null,
    };
  });
}

async function measureRoute(page, baseUrl, route, thresholds) {
  const routeStarted = performance.now();
  const result = {
    route,
    ok: true,
    duration_ms: null,
    browser_metrics: null,
    warnings: [],
    errors: [],
  };

  try {
    const response = await page.goto(`${baseUrl}${route}`, {
      waitUntil: "domcontentloaded",
      timeout: thresholds.routeTimeoutMs,
    });

    if (response && response.status() >= 400) {
      result.errors.push(`document_status_${response.status()}`);
    }

    try {
      await page.waitForLoadState("networkidle", {
        timeout: thresholds.networkIdleMs,
      });
    } catch (error) {
      result.warnings.push(`networkidle_timeout: ${error.message}`);
    }

    try {
      await page.locator("main").first().waitFor({
        state: "visible",
        timeout: 10_000,
      });
    } catch (error) {
      result.errors.push(`main_not_visible: ${error.message}`);
    }

    if (new URL(page.url()).pathname === "/login") {
      result.errors.push("redirected_to_login");
    }

    result.browser_metrics = await collectBrowserMetrics(page);
  } catch (error) {
    result.errors.push(error.message);
  } finally {
    result.duration_ms = round(performance.now() - routeStarted);
  }

  if (result.duration_ms > thresholds.routeSevereMs) {
    result.errors.push(
      `route_severe_threshold_${thresholds.routeSevereMs}ms_exceeded`
    );
  }

  result.ok = result.errors.length === 0;
  return result;
}

function buildSummary({ routeResults, apiRequests, mutationViolations }) {
  const completedApis = apiRequests.filter(
    (entry) => typeof entry.duration_ms === "number"
  );
  const apiDurations = completedApis.map((entry) => entry.duration_ms);
  const failedApis = apiRequests.filter(
    (entry) =>
      entry.failure ||
      (typeof entry.status === "number" && entry.status >= 400)
  );
  const severeApis = apiRequests.filter((entry) => entry.severe);
  const failedRoutes = routeResults.filter((route) => !route.ok);

  return {
    routes_total: routeResults.length,
    routes_failed: failedRoutes.length,
    apis_total: apiRequests.length,
    apis_failed: failedApis.length,
    apis_severe: severeApis.length,
    read_only_violations: mutationViolations.length,
    route_duration_ms: {
      max: routeResults.length
        ? Math.max(...routeResults.map((route) => route.duration_ms))
        : 0,
      p95: percentile(
        routeResults.map((route) => route.duration_ms),
        95
      ),
    },
    api_duration_ms: {
      max: apiDurations.length ? Math.max(...apiDurations) : 0,
      p95: percentile(apiDurations, 95),
    },
  };
}

function renderMarkdown(report) {
  const lines = [
    "# EDU_MANAGER_V2 Performance Smoke",
    "",
    `- Base URL: ${report.base_url}`,
    `- Started: ${report.started_at}`,
    `- Finished: ${report.finished_at}`,
    `- Chrome channel: ${report.browser.channel}`,
    `- Read-only guard: ${report.read_only ? "enabled" : "disabled"}`,
    `- Result: ${report.ok ? "PASS" : "FAIL"}`,
    "",
    "## Summary",
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    `| Routes failed | ${report.summary.routes_failed}/${report.summary.routes_total} |`,
    `| API failures | ${report.summary.apis_failed}/${report.summary.apis_total} |`,
    `| API severe threshold hits | ${report.summary.apis_severe} |`,
    `| Read-only violations | ${report.summary.read_only_violations} |`,
    `| Route p95 ms | ${round(report.summary.route_duration_ms.p95)} |`,
    `| API p95 ms | ${round(report.summary.api_duration_ms.p95)} |`,
    "",
    "## Routes",
    "",
    "| Route | Status | Duration ms | API calls | Warnings | Errors |",
    "| --- | --- | ---: | ---: | --- | --- |",
  ];

  for (const route of report.routes) {
    const routeApis = report.api_requests.filter(
      (entry) => entry.route === route.route
    );
    lines.push(
      `| ${route.route} | ${route.ok ? "PASS" : "FAIL"} | ${route.duration_ms} | ${routeApis.length} | ${route.warnings.length ? route.warnings.join("<br>") : "-"} | ${route.errors.length ? route.errors.join("<br>") : "-"} |`
    );
  }

  lines.push(
    "",
    "## Slowest API Requests",
    "",
    "| Route | Method | Path | Status | Duration ms |",
    "| --- | --- | --- | ---: | ---: |"
  );

  for (const entry of [...report.api_requests]
    .filter((item) => typeof item.duration_ms === "number")
    .sort((a, b) => b.duration_ms - a.duration_ms)
    .slice(0, 20)) {
    lines.push(
      `| ${entry.route || "-"} | ${entry.method} | ${entry.path} | ${entry.status ?? "-"} | ${entry.duration_ms} |`
    );
  }

  if (report.read_only_violations.length) {
    lines.push("", "## Read-only Violations", "");
    for (const violation of report.read_only_violations) {
      lines.push(`- ${violation.method} ${violation.path} on ${violation.route}`);
    }
  }

  if (report.trace_path) {
    lines.push("", `Trace: ${report.trace_path}`);
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function writeReports(report, outputDir) {
  await fs.mkdir(outputDir, { recursive: true });
  const stamp = report.started_at.replace(/[:.]/g, "-");
  const jsonPath = path.join(outputDir, `perf-smoke-${stamp}.json`);
  const markdownPath = path.join(outputDir, `perf-smoke-${stamp}.md`);

  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await fs.writeFile(markdownPath, renderMarkdown(report), "utf8");

  return { jsonPath, markdownPath };
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return 0;
  }

  const thresholds = {
    routeSevereMs: parsePositiveInteger("PERF_ROUTE_SEVERE_MS", 15_000),
    apiSevereMs: parsePositiveInteger("PERF_API_SEVERE_MS", 10_000),
    routeTimeoutMs: parsePositiveInteger("PERF_ROUTE_TIMEOUT_MS", 45_000),
    networkIdleMs: parsePositiveInteger("PERF_NETWORK_IDLE_MS", 20_000),
  };
  const username = process.env.PERF_USERNAME || "admin";
  const password = process.env.PERF_PASSWORD || "admin123";
  const readOnly = process.env.PERF_READ_ONLY !== "0";
  const outputDir = path.resolve(
    rootDir,
    process.env.PERF_OUTPUT_DIR || path.join("receipts", "perf")
  );
  const startedAt = new Date().toISOString();
  const { chromium } = await loadPlaywright();

  const browser = await chromium.launch({
    channel: "chrome",
    headless: process.env.PERF_HEADLESS !== "0",
  });

  const apiRequests = [];
  const mutationViolations = [];
  const routeResults = [];
  let tracePath = null;
  let context = null;
  let traceStarted = false;
  let currentRoute = "login";

  try {
    context = await browser.newContext({
      viewport: { width: 1440, height: 960 },
    });
    const page = await context.newPage();
    const inflight = new Map();

    page.on("request", (request) => {
      if (!isApiRequest(request.url())) return;

      const entry = {
        route: currentRoute,
        method: request.method(),
        url: request.url(),
        path: apiPath(request.url()),
        started_ms: round(performance.now()),
        status: null,
        duration_ms: null,
        failure: null,
        severe: false,
      };

      inflight.set(request, entry);
      apiRequests.push(entry);

      if (
        readOnly &&
        mutationMethods.has(entry.method) &&
        !isAllowedAuthMutation(entry.method, entry.url)
      ) {
        mutationViolations.push(entry);
      }
    });

    page.on("response", (response) => {
      const entry = inflight.get(response.request());
      if (!entry) return;
      entry.status = response.status();
      entry.duration_ms = round(performance.now() - entry.started_ms);
      entry.severe = entry.duration_ms > thresholds.apiSevereMs;
    });

    page.on("requestfailed", (request) => {
      const entry = inflight.get(request);
      if (!entry) return;
      entry.duration_ms = round(performance.now() - entry.started_ms);
      entry.failure = request.failure()?.errorText || "requestfailed";
      entry.severe = true;
    });

    if (options.trace) {
      await fs.mkdir(outputDir, { recursive: true });
      tracePath = path.join(
        outputDir,
        `perf-smoke-${startedAt.replace(/[:.]/g, "-")}.trace.zip`
      );
      await context.tracing.start({
        screenshots: true,
        snapshots: true,
        sources: false,
      });
      traceStarted = true;
    }

    await login(page, options.baseUrl, username, password);

    for (const route of defaultRoutes) {
      currentRoute = route;
      const result = await measureRoute(page, options.baseUrl, route, thresholds);
      routeResults.push(result);
      console.log(
        `${result.ok ? "PASS" : "FAIL"} ${route} ${result.duration_ms}ms`
      );
    }

    if (options.trace) {
      await context.tracing.stop({ path: tracePath });
      traceStarted = false;
    }
  } catch (error) {
    routeResults.push({
      route: currentRoute || "setup",
      ok: false,
      duration_ms: 0,
      browser_metrics: null,
      warnings: [],
      errors: [error.message],
    });
  } finally {
    if (traceStarted && context && tracePath) {
      try {
        await context.tracing.stop({ path: tracePath });
      } catch (error) {
        routeResults.push({
          route: "trace",
          ok: false,
          duration_ms: 0,
          browser_metrics: null,
          warnings: [],
          errors: [`trace_stop_failed: ${error.message}`],
        });
      }
    }
    await browser.close();
  }

  const failedApis = apiRequests.filter(
    (entry) =>
      entry.failure ||
      (typeof entry.status === "number" && entry.status >= 400)
  );
  const severeApis = apiRequests.filter((entry) => entry.severe);
  const report = {
    ok:
      routeResults.every((route) => route.ok) &&
      failedApis.length === 0 &&
      severeApis.length === 0 &&
      mutationViolations.length === 0,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    base_url: options.baseUrl,
    browser: {
      engine: "chromium",
      channel: "chrome",
      headless: process.env.PERF_HEADLESS !== "0",
    },
    read_only: readOnly,
    thresholds,
    routes: routeResults,
    api_requests: apiRequests,
    read_only_violations: mutationViolations,
    trace_path: tracePath,
  };
  report.summary = buildSummary({
    routeResults,
    apiRequests,
    mutationViolations,
  });

  const paths = await writeReports(report, outputDir);
  console.log(`JSON report: ${paths.jsonPath}`);
  console.log(`Markdown report: ${paths.markdownPath}`);
  if (tracePath) console.log(`Trace: ${tracePath}`);

  if (!report.ok) {
    console.error(
      `Performance smoke failed: routes=${report.summary.routes_failed}, apiFailures=${report.summary.apis_failed}, apiSevere=${report.summary.apis_severe}, readOnlyViolations=${report.summary.read_only_violations}`
    );
    return 1;
  }

  console.log(
    `Performance smoke passed: ${report.summary.routes_total} routes, ${report.summary.apis_total} API calls`
  );
  return 0;
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] || "")) {
  run()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(error.stack || error.message);
      process.exitCode = 1;
    });
}
