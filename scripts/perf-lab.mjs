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
const loginApiPath = "/api/auth/login";

function usage() {
  console.log(`Usage: npm run perf:lab -- [options]

Options:
  --base <url>              App base URL. Defaults to PERF_LAB_BASE_URL,
                            PERF_BASE_URL, or http://127.0.0.1:3000.
  --username <value>        Login username. Defaults to PERF_LAB_USERNAME,
                            PERF_USERNAME, or admin.
  --password <value>        Login password. Defaults to PERF_LAB_PASSWORD,
                            PERF_PASSWORD, or admin123.
  --month <yyyy-mm>         Month for month-scoped read endpoints.
  --routes <csv>            Route paths to navigate. Default: core app routes.
  --apis <csv>              API paths to measure directly. GET only.
  --skip-browser            Only run direct API measurements.
  --skip-api                Only run browser route navigation measurements.
  --route-repeat <n>        Route navigation samples per route. Default: 1.
  --api-repeat <n>          Direct API samples per endpoint. Default: 1.
  --route-severe-ms <n>     Route severe threshold. Default: 15000.
  --api-severe-ms <n>       API severe threshold. Default: 10000.
  --output-dir <path>       Report directory. Default: receipts/perf.
  --browser-channel <name>  Playwright Chromium channel. Default: chrome.
  --headful                 Show the browser. Default: headless.
  --trace                   Write Playwright trace zip next to reports.
  --help                    Show this message.

Environment aliases:
  PERF_LAB_BASE_URL, PERF_LAB_USERNAME, PERF_LAB_PASSWORD, PERF_LAB_MONTH,
  PERF_LAB_ROUTES, PERF_LAB_APIS, PERF_LAB_HEADLESS, PERF_LAB_OUTPUT_DIR.

Safety:
  The only allowed mutation is POST ${loginApiPath}. Direct API checks are GET
  requests only, and browser route navigation fails on any other API mutation.
`);
}

function parseArgs(argv) {
  const env = process.env;
  const options = {
    baseUrl: env.PERF_LAB_BASE_URL || env.PERF_BASE_URL || "http://127.0.0.1:3000",
    username: env.PERF_LAB_USERNAME || env.PERF_USERNAME || "admin",
    password: env.PERF_LAB_PASSWORD || env.PERF_PASSWORD || "admin123",
    month: env.PERF_LAB_MONTH || env.PERF_MONTH || currentMonth(),
    outputDir:
      env.PERF_LAB_OUTPUT_DIR ||
      env.PERF_OUTPUT_DIR ||
      path.join("receipts", "perf"),
    routeRepeat: readPositiveIntegerEnv(
      ["PERF_LAB_ROUTE_REPEAT", "PERF_ROUTE_REPEAT"],
      1
    ),
    apiRepeat: readPositiveIntegerEnv(
      ["PERF_LAB_API_REPEAT", "PERF_API_REPEAT"],
      1
    ),
    routeSevereMs: readPositiveIntegerEnv(
      ["PERF_LAB_ROUTE_SEVERE_MS", "PERF_ROUTE_SEVERE_MS"],
      15_000
    ),
    apiSevereMs: readPositiveIntegerEnv(
      ["PERF_LAB_API_SEVERE_MS", "PERF_API_SEVERE_MS"],
      10_000
    ),
    routeTimeoutMs: readPositiveIntegerEnv(
      ["PERF_LAB_ROUTE_TIMEOUT_MS", "PERF_ROUTE_TIMEOUT_MS"],
      45_000
    ),
    apiTimeoutMs: readPositiveIntegerEnv(
      ["PERF_LAB_API_TIMEOUT_MS", "PERF_API_TIMEOUT_MS"],
      30_000
    ),
    networkIdleMs: readPositiveIntegerEnv(
      ["PERF_LAB_NETWORK_IDLE_MS", "PERF_NETWORK_IDLE_MS"],
      20_000
    ),
    browserChannel: env.PERF_LAB_BROWSER_CHANNEL || "chrome",
    headless: (env.PERF_LAB_HEADLESS || env.PERF_HEADLESS || "1") !== "0",
    trace: env.PERF_LAB_TRACE === "1" || env.PERF_TRACE === "1",
    skipBrowser: env.PERF_LAB_SKIP_BROWSER === "1",
    skipApi: env.PERF_LAB_SKIP_API === "1",
    help: false,
  };
  let routesCsv = env.PERF_LAB_ROUTES || "";
  let apisCsv = env.PERF_LAB_APIS || "";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const readValue = (name) => {
      if (arg.startsWith(`${name}=`)) return arg.slice(name.length + 1);
      const value = argv[index + 1];
      if (!value) throw new Error(`${name} requires a value`);
      index += 1;
      return value;
    };

    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--base" || arg === "--base-url") {
      options.baseUrl = readValue(arg);
    } else if (arg.startsWith("--base=")) {
      options.baseUrl = readValue("--base");
    } else if (arg.startsWith("--base-url=")) {
      options.baseUrl = readValue("--base-url");
    } else if (arg === "--username") {
      options.username = readValue(arg);
    } else if (arg.startsWith("--username=")) {
      options.username = readValue("--username");
    } else if (arg === "--password") {
      options.password = readValue(arg);
    } else if (arg.startsWith("--password=")) {
      options.password = readValue("--password");
    } else if (arg === "--month") {
      options.month = readValue(arg);
    } else if (arg.startsWith("--month=")) {
      options.month = readValue("--month");
    } else if (arg === "--routes") {
      routesCsv = readValue(arg);
    } else if (arg.startsWith("--routes=")) {
      routesCsv = readValue("--routes");
    } else if (arg === "--apis") {
      apisCsv = readValue(arg);
    } else if (arg.startsWith("--apis=")) {
      apisCsv = readValue("--apis");
    } else if (arg === "--output-dir") {
      options.outputDir = readValue(arg);
    } else if (arg.startsWith("--output-dir=")) {
      options.outputDir = readValue("--output-dir");
    } else if (arg === "--route-repeat") {
      options.routeRepeat = parsePositiveInteger("--route-repeat", readValue(arg));
    } else if (arg.startsWith("--route-repeat=")) {
      options.routeRepeat = parsePositiveInteger(
        "--route-repeat",
        readValue("--route-repeat")
      );
    } else if (arg === "--api-repeat") {
      options.apiRepeat = parsePositiveInteger("--api-repeat", readValue(arg));
    } else if (arg.startsWith("--api-repeat=")) {
      options.apiRepeat = parsePositiveInteger(
        "--api-repeat",
        readValue("--api-repeat")
      );
    } else if (arg === "--route-severe-ms") {
      options.routeSevereMs = parsePositiveInteger(
        "--route-severe-ms",
        readValue(arg)
      );
    } else if (arg.startsWith("--route-severe-ms=")) {
      options.routeSevereMs = parsePositiveInteger(
        "--route-severe-ms",
        readValue("--route-severe-ms")
      );
    } else if (arg === "--api-severe-ms") {
      options.apiSevereMs = parsePositiveInteger("--api-severe-ms", readValue(arg));
    } else if (arg.startsWith("--api-severe-ms=")) {
      options.apiSevereMs = parsePositiveInteger(
        "--api-severe-ms",
        readValue("--api-severe-ms")
      );
    } else if (arg === "--browser-channel") {
      options.browserChannel = readValue(arg);
    } else if (arg.startsWith("--browser-channel=")) {
      options.browserChannel = readValue("--browser-channel");
    } else if (arg === "--headful") {
      options.headless = false;
    } else if (arg === "--trace") {
      options.trace = true;
    } else if (arg === "--skip-browser" || arg === "--no-browser") {
      options.skipBrowser = true;
    } else if (arg === "--skip-api" || arg === "--no-api") {
      options.skipApi = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  options.baseUrl = normalizeBaseUrl(options.baseUrl);
  options.month = normalizeMonth(options.month);
  options.outputDir = path.resolve(rootDir, options.outputDir);
  options.routes = routesCsv
    ? parseRouteList(routesCsv)
    : [...defaultRoutes];
  options.apiPaths = apisCsv
    ? parseApiList(apisCsv)
    : defaultApiPaths(options.month);

  if (options.skipBrowser && options.skipApi) {
    throw new Error("At least one of browser or API measurements must run");
  }

  return options;
}

function readPositiveIntegerEnv(names, fallback) {
  for (const name of names) {
    if (process.env[name]) return parsePositiveInteger(name, process.env[name]);
  }
  return fallback;
}

function parsePositiveInteger(name, value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function normalizeBaseUrl(value) {
  try {
    const url = new URL(value);
    return url.href.replace(/\/$/, "");
  } catch {
    throw new Error(`Invalid base URL: ${value}`);
  }
}

function normalizeMonth(value) {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    throw new Error(`Month must use yyyy-mm format: ${value}`);
  }
  const [year, month] = value.split("-").map(Number);
  if (month < 1 || month > 12 || year < 2000 || year > 2100) {
    throw new Error(`Invalid month value: ${value}`);
  }
  return value;
}

function parseCsv(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseRouteList(value) {
  const routes = parseCsv(value).map((route) => {
    const parsed = route.startsWith("http")
      ? new URL(route).pathname
      : route;
    const normalized = parsed.startsWith("/") ? parsed : `/${parsed}`;
    if (normalized.startsWith("/api/")) {
      throw new Error(`Route entries must not be API paths: ${route}`);
    }
    return normalized;
  });
  if (!routes.length) throw new Error("Route list cannot be empty");
  return routes;
}

function parseApiList(value) {
  const apis = parseCsv(value).map(normalizeApiPath);
  if (!apis.length) throw new Error("API list cannot be empty");
  return apis;
}

function normalizeApiPath(value) {
  const parsed = value.startsWith("http")
    ? `${new URL(value).pathname}${new URL(value).search}`
    : value;
  let normalized = parsed.startsWith("/") ? parsed : `/${parsed}`;
  if (!normalized.startsWith("/api/")) normalized = `/api${normalized}`;
  if (!normalized.startsWith("/api/")) {
    throw new Error(`API path must resolve under /api/: ${value}`);
  }
  return normalized;
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function monthWindow(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = `${month}-01`;
  const endDate = new Date(year, monthNumber, 0);
  const today = new Date();
  const end =
    month === currentMonth() ? formatDate(today) : formatDate(endDate);
  return { start, end };
}

function oneYearBefore(dateValue) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setFullYear(date.getFullYear() - 1);
  return formatDate(date);
}

function defaultApiPaths(month) {
  const { start, end } = monthWindow(month);
  return [
    "/api/auth/me",
    "/api/reports/dashboard",
    "/api/students?fields=options",
    "/api/classes",
    "/api/teachers",
    "/api/parents",
    `/api/monthly-fees/workbench?month=${month}&limit=500`,
    `/api/reports/financial?from=${start}&to=${end}&type=monthly`,
    `/api/reports/bi?from=${month.slice(0, 4)}-01&to=${month}&page=1&page_size=50`,
    `/api/reports/student-fees?from=${month}&to=${month}`,
    `/api/reports/advanced?from=${oneYearBefore(end)}&to=${end}&group_by=month`,
    "/api/templates",
    "/api/payments",
    "/api/receipts",
    "/api/attendance-periods",
  ];
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function percentile(values, percentileValue) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function reportableError(error) {
  if (error?.name === "AbortError") return "timeout";
  return error?.message || String(error);
}

function parseJsonIfPossible(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function joinUrl(baseUrl, urlPath) {
  return `${baseUrl}${urlPath.startsWith("/") ? urlPath : `/${urlPath}`}`;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    return { response, text };
  } finally {
    clearTimeout(timer);
  }
}

async function loginViaApi(options) {
  const started = performance.now();
  const result = {
    path: loginApiPath,
    method: "POST",
    status: null,
    duration_ms: null,
    ok: false,
    error: null,
  };

  try {
    const { response, text } = await fetchWithTimeout(
      joinUrl(options.baseUrl, loginApiPath),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          username: options.username,
          password: options.password,
        }),
      },
      options.apiTimeoutMs
    );
    const body = parseJsonIfPossible(text);
    const token = body?.data?.token || body?.token;

    result.status = response.status;
    result.ok = response.ok && Boolean(token) && body?.success !== false;
    if (!result.ok) {
      result.error =
        body?.error?.code ||
        body?.error?.message ||
        `login_status_${response.status}`;
    }

    return { token, result };
  } catch (error) {
    result.error = reportableError(error);
    return { token: null, result };
  } finally {
    result.duration_ms = round(performance.now() - started);
  }
}

async function measureDirectApi(options, token, apiPath, sampleIndex) {
  const started = performance.now();
  const entry = {
    path: apiPath,
    method: "GET",
    sample: sampleIndex,
    status: null,
    duration_ms: null,
    response_bytes: null,
    content_type: null,
    success_field: null,
    severe: false,
    ok: false,
    errors: [],
  };

  try {
    const { response, text } = await fetchWithTimeout(
      joinUrl(options.baseUrl, apiPath),
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
      options.apiTimeoutMs
    );
    const body = parseJsonIfPossible(text);
    entry.status = response.status;
    entry.response_bytes = Buffer.byteLength(text, "utf8");
    entry.content_type = response.headers.get("content-type");
    entry.success_field = body?.success ?? null;

    if (response.status >= 400) {
      entry.errors.push(`status_${response.status}`);
    }
    if (body?.success === false) {
      entry.errors.push(body?.error?.code || body?.error?.message || "success_false");
    }
  } catch (error) {
    entry.errors.push(reportableError(error));
  } finally {
    entry.duration_ms = round(performance.now() - started);
  }

  entry.severe = entry.duration_ms > options.apiSevereMs;
  if (entry.severe) {
    entry.errors.push(`api_severe_threshold_${options.apiSevereMs}ms_exceeded`);
  }
  entry.ok = entry.errors.length === 0;
  return entry;
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

function apiPathFromUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function isAllowedMutation(method, url) {
  if (method !== "POST") return false;
  try {
    return new URL(url).pathname === loginApiPath;
  } catch {
    return false;
  }
}

async function launchBrowser(chromium, options, warnings) {
  const launchOptions = { headless: options.headless };
  if (options.browserChannel && options.browserChannel !== "default") {
    launchOptions.channel = options.browserChannel;
  }

  try {
    return await chromium.launch(launchOptions);
  } catch (error) {
    if (!launchOptions.channel) throw error;
    warnings.push(
      `browser_channel_${launchOptions.channel}_failed_falling_back: ${error.message}`
    );
    return chromium.launch({ headless: options.headless });
  }
}

async function collectBrowserMetrics(page) {
  return page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation").at(-1);
    const paints = performance.getEntriesByType("paint");
    const firstPaint = paints.find((entry) => entry.name === "first-paint");
    const fcp = paints.find((entry) => entry.name === "first-contentful-paint");
    const resources = performance.getEntriesByType("resource");
    const scripts = resources.filter((entry) => entry.initiatorType === "script");
    const styles = resources.filter((entry) => entry.initiatorType === "css");
    const fetches = resources.filter((entry) =>
      ["fetch", "xmlhttprequest"].includes(entry.initiatorType)
    );

    const sumTransfer = (entries) =>
      Math.round(entries.reduce((sum, entry) => sum + (entry.transferSize || 0), 0));

    return {
      dom_content_loaded_ms: navigation
        ? Math.round(navigation.domContentLoadedEventEnd)
        : null,
      load_event_ms: navigation ? Math.round(navigation.loadEventEnd) : null,
      first_paint_ms: firstPaint ? Math.round(firstPaint.startTime) : null,
      first_contentful_paint_ms: fcp ? Math.round(fcp.startTime) : null,
      document_transfer_bytes: navigation
        ? Math.round(navigation.transferSize || 0)
        : null,
      resource_counts: {
        script: scripts.length,
        style: styles.length,
        fetch: fetches.length,
      },
      resource_transfer_bytes: {
        script: sumTransfer(scripts),
        style: sumTransfer(styles),
        fetch: sumTransfer(fetches),
      },
    };
  });
}

async function measureRoute(page, options, route, sampleIndex) {
  const routeStarted = performance.now();
  const result = {
    route,
    sample: sampleIndex,
    ok: true,
    duration_ms: null,
    browser_metrics: null,
    api_call_count: 0,
    warnings: [],
    errors: [],
  };

  try {
    await page.evaluate(() => performance.clearResourceTimings()).catch(() => {});
    const response = await page.goto(joinUrl(options.baseUrl, route), {
      waitUntil: "domcontentloaded",
      timeout: options.routeTimeoutMs,
    });

    if (response && response.status() >= 400) {
      result.errors.push(`document_status_${response.status()}`);
    }

    try {
      await page.waitForLoadState("networkidle", {
        timeout: options.networkIdleMs,
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
    result.errors.push(reportableError(error));
  } finally {
    result.duration_ms = round(performance.now() - routeStarted);
  }

  if (result.duration_ms > options.routeSevereMs) {
    result.errors.push(
      `route_severe_threshold_${options.routeSevereMs}ms_exceeded`
    );
  }

  result.ok = result.errors.length === 0;
  return result;
}

async function runBrowserRoutes(options, token, startedAt) {
  const warnings = [];
  const apiRequests = [];
  const mutationViolations = [];
  const routeResults = [];
  let browser = null;
  let context = null;
  let tracePath = null;
  let traceStarted = false;
  let currentRoute = "setup";

  try {
    const { chromium } = await loadPlaywright();
    browser = await launchBrowser(chromium, options, warnings);
    context = await browser.newContext({
      viewport: { width: 1440, height: 960 },
    });
    await context.addInitScript((authToken) => {
      window.localStorage.setItem("token", authToken);
      window.localStorage.setItem("refreshToken", "");
    }, token);

    if (options.trace) {
      await fs.mkdir(options.outputDir, { recursive: true });
      tracePath = path.join(
        options.outputDir,
        `perf-lab-${startedAt.replace(/[:.]/g, "-")}.trace.zip`
      );
      await context.tracing.start({
        screenshots: true,
        snapshots: true,
        sources: false,
      });
      traceStarted = true;
    }

    const page = await context.newPage();
    const inflight = new Map();

    page.on("request", (request) => {
      if (!isApiRequest(request.url())) return;

      const entry = {
        route: currentRoute,
        method: request.method(),
        url: request.url(),
        path: apiPathFromUrl(request.url()),
        status: null,
        duration_ms: null,
        failure: null,
        severe: false,
        _started: performance.now(),
      };

      inflight.set(request, entry);
      apiRequests.push(entry);

      if (
        mutationMethods.has(entry.method) &&
        !isAllowedMutation(entry.method, entry.url)
      ) {
        mutationViolations.push({
          route: entry.route,
          method: entry.method,
          path: entry.path,
        });
      }
    });

    page.on("response", (response) => {
      const entry = inflight.get(response.request());
      if (!entry) return;
      entry.status = response.status();
      entry.duration_ms = round(performance.now() - entry._started);
      entry.severe = entry.duration_ms > options.apiSevereMs;
      delete entry._started;
    });

    page.on("requestfailed", (request) => {
      const entry = inflight.get(request);
      if (!entry) return;
      entry.duration_ms = round(performance.now() - entry._started);
      entry.failure = request.failure()?.errorText || "requestfailed";
      entry.severe = true;
      delete entry._started;
    });

    for (let sample = 1; sample <= options.routeRepeat; sample += 1) {
      for (const route of options.routes) {
        currentRoute = route;
        const apiCountBefore = apiRequests.length;
        const result = await measureRoute(page, options, route, sample);
        result.api_call_count = apiRequests.length - apiCountBefore;
        routeResults.push(result);
        console.log(
          `${result.ok ? "PASS" : "FAIL"} route ${route} sample=${sample} ${result.duration_ms}ms`
        );
      }
    }

    if (traceStarted) {
      await context.tracing.stop({ path: tracePath });
      traceStarted = false;
    }
  } catch (error) {
    routeResults.push({
      route: currentRoute,
      sample: 0,
      ok: false,
      duration_ms: 0,
      browser_metrics: null,
      api_call_count: 0,
      warnings,
      errors: [reportableError(error)],
    });
  } finally {
    if (traceStarted && context && tracePath) {
      try {
        await context.tracing.stop({ path: tracePath });
      } catch (error) {
        warnings.push(`trace_stop_failed: ${error.message}`);
      }
    }
    if (browser) await browser.close();
  }

  for (const entry of apiRequests) {
    delete entry._started;
  }

  return {
    routes: routeResults,
    browser_api_requests: apiRequests,
    read_only_violations: mutationViolations,
    warnings,
    trace_path: tracePath,
  };
}

function failedBrowserApis(apiRequests) {
  return apiRequests.filter(
    (entry) =>
      entry.failure ||
      entry.severe ||
      (typeof entry.status === "number" && entry.status >= 400)
  );
}

function buildSummary(report) {
  const routeDurations = report.routes.map((entry) => entry.duration_ms);
  const directApiDurations = report.direct_api_checks.map(
    (entry) => entry.duration_ms
  );
  const browserApiDurations = report.browser_api_requests
    .filter((entry) => typeof entry.duration_ms === "number")
    .map((entry) => entry.duration_ms);
  const failedRoutes = report.routes.filter((entry) => !entry.ok);
  const failedDirectApis = report.direct_api_checks.filter((entry) => !entry.ok);
  const failedRouteApis = failedBrowserApis(report.browser_api_requests);

  return {
    auth_login_ok: report.auth_login.ok,
    direct_api_total: report.direct_api_checks.length,
    direct_api_failed: failedDirectApis.length,
    direct_api_p95_ms: round(percentile(directApiDurations, 95)),
    route_total: report.routes.length,
    route_failed: failedRoutes.length,
    route_p95_ms: round(percentile(routeDurations, 95)),
    browser_api_total: report.browser_api_requests.length,
    browser_api_failed_or_severe: failedRouteApis.length,
    browser_api_p95_ms: round(percentile(browserApiDurations, 95)),
    read_only_violations: report.read_only_violations.length,
  };
}

function escapeCell(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value).replaceAll("|", "\\|").replaceAll("\n", "<br>");
}

function renderMarkdown(report) {
  const lines = [
    "# EDU_MANAGER_V2 Perf Lab",
    "",
    `- Base URL: ${report.base_url}`,
    `- Started: ${report.started_at}`,
    `- Finished: ${report.finished_at}`,
    `- Username: ${report.username}`,
    `- Month: ${report.month}`,
    `- Browser: ${report.browser.enabled ? `${report.browser.engine}/${report.browser.channel}` : "skipped"}`,
    `- Result: ${report.ok ? "PASS" : "FAIL"}`,
    "",
    "## Summary",
    "",
    "| Metric | Value |",
    "| --- | ---: |",
    `| Auth login ok | ${report.summary.auth_login_ok ? "yes" : "no"} |`,
    `| Direct API failures | ${report.summary.direct_api_failed}/${report.summary.direct_api_total} |`,
    `| Direct API p95 ms | ${report.summary.direct_api_p95_ms} |`,
    `| Route failures | ${report.summary.route_failed}/${report.summary.route_total} |`,
    `| Route p95 ms | ${report.summary.route_p95_ms} |`,
    `| Browser API failed/severe | ${report.summary.browser_api_failed_or_severe}/${report.summary.browser_api_total} |`,
    `| Browser API p95 ms | ${report.summary.browser_api_p95_ms} |`,
    `| Read-only violations | ${report.summary.read_only_violations} |`,
    "",
    "## Direct API Checks",
    "",
    "| Path | Sample | Status | Duration ms | Bytes | Result | Errors |",
    "| --- | ---: | ---: | ---: | ---: | --- | --- |",
  ];

  for (const entry of report.direct_api_checks) {
    lines.push(
      `| ${escapeCell(entry.path)} | ${entry.sample} | ${entry.status ?? "-"} | ${entry.duration_ms} | ${entry.response_bytes ?? "-"} | ${entry.ok ? "PASS" : "FAIL"} | ${escapeCell(entry.errors.join("<br>"))} |`
    );
  }

  lines.push(
    "",
    "## Routes",
    "",
    "| Route | Sample | Result | Duration ms | API calls | Warnings | Errors |",
    "| --- | ---: | --- | ---: | ---: | --- | --- |"
  );

  for (const route of report.routes) {
    lines.push(
      `| ${escapeCell(route.route)} | ${route.sample} | ${route.ok ? "PASS" : "FAIL"} | ${route.duration_ms} | ${route.api_call_count} | ${escapeCell(route.warnings.join("<br>"))} | ${escapeCell(route.errors.join("<br>"))} |`
    );
  }

  lines.push(
    "",
    "## Slowest Browser API Requests",
    "",
    "| Route | Method | Path | Status | Duration ms | Failure |",
    "| --- | --- | --- | ---: | ---: | --- |"
  );

  for (const entry of [...report.browser_api_requests]
    .filter((item) => typeof item.duration_ms === "number")
    .sort((a, b) => b.duration_ms - a.duration_ms)
    .slice(0, 25)) {
    lines.push(
      `| ${escapeCell(entry.route)} | ${entry.method} | ${escapeCell(entry.path)} | ${entry.status ?? "-"} | ${entry.duration_ms} | ${escapeCell(entry.failure)} |`
    );
  }

  if (report.read_only_violations.length) {
    lines.push("", "## Read-only Violations", "");
    for (const violation of report.read_only_violations) {
      lines.push(
        `- ${violation.method} ${violation.path} on ${violation.route}`
      );
    }
  }

  if (report.warnings.length) {
    lines.push("", "## Warnings", "");
    for (const warning of report.warnings) lines.push(`- ${warning}`);
  }

  if (report.trace_path) {
    lines.push("", `Trace: ${report.trace_path}`);
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function writeReports(report) {
  await fs.mkdir(report.output_dir, { recursive: true });
  const stamp = report.started_at.replace(/[:.]/g, "-");
  const jsonPath = path.join(report.output_dir, `perf-lab-${stamp}.json`);
  const markdownPath = path.join(report.output_dir, `perf-lab-${stamp}.md`);

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

  const startedAt = new Date().toISOString();
  const { token, result: authLogin } = await loginViaApi(options);
  if (!token) {
    const report = {
      ok: false,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      base_url: options.baseUrl,
      username: options.username,
      month: options.month,
      output_dir: options.outputDir,
      auth_login: authLogin,
      browser: {
        enabled: false,
        engine: "chromium",
        channel: options.browserChannel,
        headless: options.headless,
      },
      thresholds: {
        route_severe_ms: options.routeSevereMs,
        api_severe_ms: options.apiSevereMs,
      },
      direct_api_checks: [],
      routes: [],
      browser_api_requests: [],
      read_only_violations: [],
      warnings: [],
      trace_path: null,
    };
    report.summary = buildSummary(report);
    const paths = await writeReports(report);
    console.error(`Login failed: ${authLogin.error || "unknown_error"}`);
    console.log(`JSON report: ${paths.jsonPath}`);
    console.log(`Markdown report: ${paths.markdownPath}`);
    return 1;
  }

  const directApiChecks = [];
  if (!options.skipApi) {
    for (let sample = 1; sample <= options.apiRepeat; sample += 1) {
      for (const apiPath of options.apiPaths) {
        const result = await measureDirectApi(options, token, apiPath, sample);
        directApiChecks.push(result);
        console.log(
          `${result.ok ? "PASS" : "FAIL"} api ${apiPath} sample=${sample} ${result.duration_ms}ms`
        );
      }
    }
  }

  const browserResult = options.skipBrowser
    ? {
        routes: [],
        browser_api_requests: [],
        read_only_violations: [],
        warnings: [],
        trace_path: null,
      }
    : await runBrowserRoutes(options, token, startedAt);

  const report = {
    ok: false,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    base_url: options.baseUrl,
    username: options.username,
    month: options.month,
    output_dir: options.outputDir,
    auth_login: authLogin,
    browser: {
      enabled: !options.skipBrowser,
      engine: "chromium",
      channel: options.browserChannel,
      headless: options.headless,
    },
    thresholds: {
      route_severe_ms: options.routeSevereMs,
      api_severe_ms: options.apiSevereMs,
      route_timeout_ms: options.routeTimeoutMs,
      api_timeout_ms: options.apiTimeoutMs,
      network_idle_ms: options.networkIdleMs,
    },
    selected_routes: options.routes,
    selected_api_paths: options.apiPaths,
    direct_api_checks: directApiChecks,
    routes: browserResult.routes,
    browser_api_requests: browserResult.browser_api_requests,
    read_only_violations: browserResult.read_only_violations,
    warnings: browserResult.warnings,
    trace_path: browserResult.trace_path,
  };
  report.summary = buildSummary(report);
  report.ok =
    report.auth_login.ok &&
    report.direct_api_checks.every((entry) => entry.ok) &&
    report.routes.every((entry) => entry.ok) &&
    failedBrowserApis(report.browser_api_requests).length === 0 &&
    report.read_only_violations.length === 0;

  const paths = await writeReports(report);
  console.log(`JSON report: ${paths.jsonPath}`);
  console.log(`Markdown report: ${paths.markdownPath}`);
  if (report.trace_path) console.log(`Trace: ${report.trace_path}`);

  if (!report.ok) {
    console.error(
      `Perf lab failed: directApiFailures=${report.summary.direct_api_failed}, routeFailures=${report.summary.route_failed}, browserApiFailedOrSevere=${report.summary.browser_api_failed_or_severe}, readOnlyViolations=${report.summary.read_only_violations}`
    );
    return 1;
  }

  console.log(
    `Perf lab passed: ${report.summary.direct_api_total} direct API checks, ${report.summary.route_total} route samples, ${report.summary.browser_api_total} browser API calls`
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
