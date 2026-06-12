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

const loginApiPath = "/api/auth/login";
const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const defaultRoutes = [
  "/",
  "/students",
  "/classes",
  "/attendance",
  "/fee-collection",
  "/reports",
  "/templates",
  "template-design:auto",
];

const defaultViewports = [
  { name: "desktop-1440x900", width: 1440, height: 900 },
  { name: "mobile-390x844", width: 390, height: 844 },
];

function usage() {
  console.log(`Usage: npm run ux:baseline -- [options]

Options:
  --base <url>              App base URL. Default: UX_BASE_URL or production.
  --username <value>        Login username. Default: UX_USERNAME or admin.
  --password <value>        Login password. Default: UX_PASSWORD or admin123.
  --routes <csv>            Routes. Use template-design:auto for default template.
  --viewports <csv>         Viewports as name:widthxheight.
  --output-dir <path>       Default: docs/artifacts/ux-baseline.
  --browser-channel <name>  Default: chrome.
  --headful                 Show browser.
  --reduced-motion          Capture reduced-motion pass.
  --fail-on-errors          Exit non-zero on runtime/API/overflow findings.
  --help                    Show this message.

Safety:
  The only allowed mutation is POST ${loginApiPath}. Navigation must be read-only.
`);
}

function parseArgs(argv) {
  const env = process.env;
  const options = {
    baseUrl:
      env.UX_BASE_URL ||
      env.PERF_LAB_BASE_URL ||
      "https://edu-manager-gules.vercel.app",
    username: env.UX_USERNAME || env.PERF_LAB_USERNAME || "admin",
    password: env.UX_PASSWORD || env.PERF_LAB_PASSWORD || "admin123",
    outputDir:
      env.UX_OUTPUT_DIR ||
      path.join("docs", "artifacts", "ux-baseline"),
    browserChannel: env.UX_BROWSER_CHANNEL || "chrome",
    headless: (env.UX_HEADLESS || "1") !== "0",
    reducedMotion: env.UX_REDUCED_MOTION === "1",
    failOnErrors: env.UX_FAIL_ON_ERRORS === "1",
    routes: [...defaultRoutes],
    viewports: [...defaultViewports],
    routeTimeoutMs: readPositiveIntegerEnv("UX_ROUTE_TIMEOUT_MS", 45_000),
    settleMs: readPositiveIntegerEnv("UX_SETTLE_MS", 12_000),
    help: false,
  };

  let routesCsv = env.UX_ROUTES || "";
  let viewportsCsv = env.UX_VIEWPORTS || "";

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
    } else if (arg === "--routes") {
      routesCsv = readValue(arg);
    } else if (arg.startsWith("--routes=")) {
      routesCsv = readValue("--routes");
    } else if (arg === "--viewports") {
      viewportsCsv = readValue(arg);
    } else if (arg.startsWith("--viewports=")) {
      viewportsCsv = readValue("--viewports");
    } else if (arg === "--output-dir") {
      options.outputDir = readValue(arg);
    } else if (arg.startsWith("--output-dir=")) {
      options.outputDir = readValue("--output-dir");
    } else if (arg === "--browser-channel") {
      options.browserChannel = readValue(arg);
    } else if (arg.startsWith("--browser-channel=")) {
      options.browserChannel = readValue("--browser-channel");
    } else if (arg === "--headful") {
      options.headless = false;
    } else if (arg === "--reduced-motion") {
      options.reducedMotion = true;
    } else if (arg === "--fail-on-errors") {
      options.failOnErrors = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (routesCsv) options.routes = parseRoutes(routesCsv);
  if (viewportsCsv) options.viewports = parseViewports(viewportsCsv);

  options.baseUrl = options.baseUrl.replace(/\/+$/, "");
  options.outputDir = path.resolve(rootDir, options.outputDir);
  return options;
}

function readPositiveIntegerEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  return parsePositiveInteger(name, raw);
}

function parsePositiveInteger(name, value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function parseCsv(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseRoutes(value) {
  const routes = parseCsv(value).map((route) => {
    if (route === "template-design:auto") return route;
    const pathname = route.startsWith("http") ? new URL(route).pathname : route;
    return pathname.startsWith("/") ? pathname : `/${pathname}`;
  });
  if (!routes.length) throw new Error("Route list cannot be empty");
  return routes;
}

function parseViewports(value) {
  const viewports = parseCsv(value).map((item) => {
    const [name, size] = item.includes(":")
      ? item.split(":")
      : [item, item];
    const [width, height] = size.split("x").map((part) => Number.parseInt(part, 10));
    if (!name || !Number.isFinite(width) || !Number.isFinite(height)) {
      throw new Error(`Invalid viewport: ${item}. Use name:1440x900`);
    }
    return { name, width, height };
  });
  if (!viewports.length) throw new Error("Viewport list cannot be empty");
  return viewports;
}

function joinUrl(baseUrl, urlPath) {
  return `${baseUrl}${urlPath.startsWith("/") ? urlPath : `/${urlPath}`}`;
}

function round(value) {
  return Math.round(value);
}

function reportableError(error) {
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
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          username: options.username,
          password: options.password,
        }),
      },
      30_000
    );
    const body = parseJsonIfPossible(text);
    const token = body?.data?.token || body?.token;
    result.status = response.status;
    result.ok = response.ok && Boolean(token) && body?.success !== false;
    result.error = result.ok
      ? null
      : body?.error?.code || body?.error?.message || `login_status_${response.status}`;
    return { token, result };
  } catch (error) {
    result.error = reportableError(error);
    return { token: null, result };
  } finally {
    result.duration_ms = round(performance.now() - started);
  }
}

async function resolveRoutes(options, token) {
  if (!options.routes.includes("template-design:auto")) return options.routes;

  const routes = options.routes.filter((route) => route !== "template-design:auto");
  try {
    const { response, text } = await fetchWithTimeout(
      joinUrl(options.baseUrl, "/api/templates"),
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      },
      30_000
    );
    const body = parseJsonIfPossible(text);
    const templates = body?.data?.templates || body?.templates || body?.data || [];
    const template = Array.isArray(templates)
      ? templates.find((item) => item?.id)
      : null;
    if (response.ok && template?.id) {
      routes.push(`/templates/${template.id}/design`);
    }
  } catch {
    routes.push("/templates");
  }

  return [...new Set(routes)];
}

function loadPlaywright() {
  try {
    return requireFromFrontend("playwright");
  } catch (error) {
    throw new Error(
      `Unable to load playwright from frontend/node_modules. Run npm --prefix frontend install. ${error.message}`
    );
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

function safeName(value) {
  return value
    .replace(/^\/+/, "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "root";
}

async function capture(page, outputDir, scenarioName, phase) {
  const fileName = `${scenarioName}__${phase}.png`;
  const screenshotPath = path.join(outputDir, fileName);
  await page.screenshot({ path: screenshotPath, fullPage: true, timeout: 15_000 });
  return screenshotPath;
}

async function collectPageSnapshot(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const text = (body.innerText || "").replace(/\s+/g, " ").trim();
    const busy = document.querySelectorAll("[aria-busy='true']").length;
    const status = document.querySelectorAll("[role='status']").length;
    const pulse = document.querySelectorAll(".animate-pulse, .skeleton").length;
    const spinner = document.querySelectorAll(".animate-spin, [data-testid*='spinner']").length;
    const dialogs = document.querySelectorAll("[role='dialog'], .modal").length;
    const horizontalOverflow = doc.scrollWidth > doc.clientWidth + 2;
    const maxRight = [...document.querySelectorAll("body *")]
      .slice(0, 2000)
      .reduce((max, element) => {
        const rect = element.getBoundingClientRect();
        return Number.isFinite(rect.right) ? Math.max(max, rect.right) : max;
      }, 0);

    return {
      title: document.title,
      url: location.href,
      pathname: location.pathname,
      text_sample: text.slice(0, 500),
      text_length: text.length,
      loading_markers: { busy, status, pulse, spinner },
      dialogs,
      viewport: { width: innerWidth, height: innerHeight },
      document_size: {
        width: doc.scrollWidth,
        height: Math.max(doc.scrollHeight, body.scrollHeight),
      },
      horizontal_overflow: horizontalOverflow,
      max_element_right: Math.round(maxRight),
    };
  });
}

async function collectWebVitals(page) {
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
    };
  });
}

async function inspectRoute(context, options, route, viewport, mode, outputDir) {
  const page = await context.newPage();
  const consoleEntries = [];
  const pageErrors = [];
  const requestFailures = [];
  const apiRequests = [];
  const mutationViolations = [];
  const inflight = new Map();

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleEntries.push({
        type: message.type(),
        text: message.text().slice(0, 1000),
      });
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("request", (request) => {
    if (!isApiRequest(request.url())) return;
    const entry = {
      method: request.method(),
      path: apiPathFromUrl(request.url()),
      status: null,
      duration_ms: null,
      failure: null,
    };
    entry._started = performance.now();
    inflight.set(request, entry);
    apiRequests.push(entry);
    if (mutationMethods.has(entry.method) && !isAllowedMutation(entry.method, request.url())) {
      mutationViolations.push({ method: entry.method, path: entry.path });
    }
  });
  page.on("response", (response) => {
    const entry = inflight.get(response.request());
    if (!entry) return;
    entry.status = response.status();
    entry.duration_ms = round(performance.now() - entry._started);
    delete entry._started;
  });
  page.on("requestfailed", (request) => {
    const entry = inflight.get(request);
    const failure = request.failure()?.errorText || "requestfailed";
    if (entry) {
      entry.duration_ms = round(performance.now() - entry._started);
      entry.failure = failure;
      delete entry._started;
    }
    requestFailures.push({ path: apiPathFromUrl(request.url()), failure });
  });

  const scenarioName = `${mode}__${safeName(route)}__${viewport.name}`;
  const started = performance.now();
  const screenshots = {};
  let initial = null;
  let loading = null;
  let settled = null;
  let vitals = null;
  const errors = [];

  try {
    const response = await page.goto(joinUrl(options.baseUrl, route), {
      waitUntil: "domcontentloaded",
      timeout: options.routeTimeoutMs,
    });
    if (response?.status() >= 400) errors.push(`document_status_${response.status()}`);

    await page.waitForTimeout(180);
    initial = await collectPageSnapshot(page);
    screenshots.initial = await capture(page, outputDir, scenarioName, "initial");

    await page.waitForTimeout(700);
    loading = await collectPageSnapshot(page);
    screenshots.loading = await capture(page, outputDir, scenarioName, "loading");

    try {
      await page.waitForLoadState("networkidle", { timeout: options.settleMs });
    } catch (error) {
      errors.push(`networkidle_timeout_${options.settleMs}ms`);
    }
    await page.waitForTimeout(250);
    settled = await collectPageSnapshot(page);
    screenshots.settled = await capture(page, outputDir, scenarioName, "settled");
    vitals = await collectWebVitals(page);

    if (new URL(page.url()).pathname === "/login") errors.push("redirected_to_login");
    if (settled.text_length < 20) errors.push("blank_or_near_blank");
    if (settled.horizontal_overflow) errors.push("horizontal_overflow");
  } catch (error) {
    errors.push(reportableError(error));
  } finally {
    await page.close().catch(() => {});
  }

  const failedApi = apiRequests.filter(
    (entry) =>
      entry.failure ||
      (typeof entry.status === "number" && entry.status >= 400)
  );
  if (pageErrors.length) errors.push("page_errors");
  if (failedApi.length) errors.push("api_failures");
  if (mutationViolations.length) errors.push("read_only_violations");

  return {
    route,
    viewport,
    mode,
    ok: errors.length === 0,
    duration_ms: round(performance.now() - started),
    vitals,
    screenshots,
    initial,
    loading,
    settled,
    console_entries: consoleEntries,
    page_errors: pageErrors,
    request_failures: requestFailures,
    api_requests: apiRequests.map(({ _started, ...entry }) => entry),
    mutation_violations: mutationViolations,
    errors,
  };
}

async function runPass(browser, options, routes, viewport, mode, outputDir, warnings) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: mode === "reduced-motion" ? "reduce" : "no-preference",
  });
  await context.addInitScript((authToken) => {
    window.localStorage.setItem("token", authToken);
    window.localStorage.setItem("refreshToken", "");
  }, options.token);

  const results = [];
  try {
    for (const route of routes) {
      const result = await inspectRoute(
        context,
        options,
        route,
        viewport,
        mode,
        outputDir
      );
      results.push(result);
      console.log(
        `${result.ok ? "PASS" : "WARN"} ${mode} ${viewport.name} ${route} ${result.duration_ms}ms`
      );
    }
  } finally {
    await context.close().catch((error) => {
      warnings.push(`context_close_failed: ${error.message}`);
    });
  }
  return results;
}

function summarize(report) {
  const scenarios = report.scenarios;
  const failed = scenarios.filter((scenario) => !scenario.ok);
  const apiFailures = scenarios.flatMap((scenario) =>
    scenario.api_requests
      .filter(
        (entry) =>
          entry.failure ||
          (typeof entry.status === "number" && entry.status >= 400)
      )
      .map((entry) => ({ route: scenario.route, ...entry }))
  );
  const pageErrors = scenarios.flatMap((scenario) =>
    scenario.page_errors.map((error) => ({ route: scenario.route, error }))
  );
  const consoleErrors = scenarios.flatMap((scenario) =>
    scenario.console_entries.map((entry) => ({ route: scenario.route, ...entry }))
  );
  const overflows = scenarios.filter((scenario) => scenario.settled?.horizontal_overflow);
  const blank = scenarios.filter((scenario) => (scenario.settled?.text_length || 0) < 20);

  return {
    scenario_total: scenarios.length,
    scenario_with_findings: failed.length,
    api_failures: apiFailures.length,
    page_errors: pageErrors.length,
    console_errors_or_warnings: consoleErrors.length,
    horizontal_overflow: overflows.length,
    blank_or_near_blank: blank.length,
    read_only_violations: scenarios.reduce(
      (sum, scenario) => sum + scenario.mutation_violations.length,
      0
    ),
  };
}

function renderMarkdown(report) {
  const lines = [
    "# EduFlow Motion UX Baseline",
    "",
    `- Started: ${report.started_at}`,
    `- Base URL: ${report.base_url}`,
    `- Browser: chromium/${report.browser.channel || "bundled"} headless=${report.browser.headless}`,
    `- Reduced motion pass: ${report.reduced_motion ? "yes" : "no"}`,
    "",
    "## Summary",
    "",
    "| Metric | Value |",
    "| --- | ---: |",
  ];

  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`| ${key} | ${value} |`);
  }

  lines.push(
    "",
    "## Scenarios",
    "",
    "| Mode | Viewport | Route | Result | Duration ms | Text length | Loading markers | Errors |",
    "| --- | --- | --- | --- | ---: | ---: | ---: | --- |"
  );

  for (const scenario of report.scenarios) {
    const loadingMarkers = scenario.loading?.loading_markers || {};
    const loadingCount = Object.values(loadingMarkers).reduce(
      (sum, value) => sum + (Number(value) || 0),
      0
    );
    lines.push(
      `| ${scenario.mode} | ${scenario.viewport.name} | ${scenario.route} | ${scenario.ok ? "PASS" : "WARN"} | ${scenario.duration_ms} | ${scenario.settled?.text_length ?? "-"} | ${loadingCount} | ${scenario.errors.join("<br>")} |`
    );
  }

  lines.push("", "## Screenshot Files", "");
  for (const scenario of report.scenarios) {
    lines.push(`### ${scenario.mode} ${scenario.viewport.name} ${scenario.route}`);
    for (const [phase, filePath] of Object.entries(scenario.screenshots || {})) {
      lines.push(`- ${phase}: ${path.relative(rootDir, filePath).replaceAll("\\", "/")}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function writeReports(report) {
  await fs.mkdir(report.output_dir, { recursive: true });
  const jsonPath = path.join(report.output_dir, "baseline-metrics.json");
  const markdownPath = path.join(report.output_dir, "baseline-matrix.md");
  const consolePath = path.join(report.output_dir, "console-api-errors.json");
  const loadingPath = path.join(report.output_dir, "loading-state-inventory.md");

  const consolePayload = report.scenarios.map((scenario) => ({
    mode: scenario.mode,
    viewport: scenario.viewport.name,
    route: scenario.route,
    console_entries: scenario.console_entries,
    page_errors: scenario.page_errors,
    request_failures: scenario.request_failures,
    api_failures: scenario.api_requests.filter(
      (entry) =>
        entry.failure ||
        (typeof entry.status === "number" && entry.status >= 400)
    ),
  }));

  const loadingLines = [
    "# Loading State Inventory",
    "",
    "| Mode | Viewport | Route | Initial markers | Loading markers | Settled markers |",
    "| --- | --- | --- | ---: | ---: | ---: |",
  ];
  for (const scenario of report.scenarios) {
    const markerTotal = (snapshot) =>
      Object.values(snapshot?.loading_markers || {}).reduce(
        (sum, value) => sum + (Number(value) || 0),
        0
      );
    loadingLines.push(
      `| ${scenario.mode} | ${scenario.viewport.name} | ${scenario.route} | ${markerTotal(scenario.initial)} | ${markerTotal(scenario.loading)} | ${markerTotal(scenario.settled)} |`
    );
  }

  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await fs.writeFile(markdownPath, renderMarkdown(report), "utf8");
  await fs.writeFile(consolePath, `${JSON.stringify(consolePayload, null, 2)}\n`, "utf8");
  await fs.writeFile(loadingPath, `${loadingLines.join("\n")}\n`, "utf8");
  return { jsonPath, markdownPath, consolePath, loadingPath };
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return 0;
  }

  const startedAt = new Date().toISOString();
  const stamp = startedAt.replace(/[:.]/g, "-");
  const runOutputDir = path.join(options.outputDir, stamp);
  const warnings = [];

  const { token, result: authLogin } = await loginViaApi(options);
  if (!token) {
    throw new Error(`Login failed: ${authLogin.error || "unknown"}`);
  }
  options.token = token;

  const routes = await resolveRoutes(options, token);
  const { chromium } = loadPlaywright();
  const browser = await launchBrowser(chromium, options, warnings);
  const scenarios = [];

  try {
    for (const viewport of options.viewports) {
      scenarios.push(
        ...(await runPass(browser, options, routes, viewport, "default", runOutputDir, warnings))
      );
      if (options.reducedMotion) {
        scenarios.push(
          ...(await runPass(
            browser,
            options,
            routes,
            viewport,
            "reduced-motion",
            runOutputDir,
            warnings
          ))
        );
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  const report = {
    ok: false,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    base_url: options.baseUrl,
    output_dir: runOutputDir,
    selected_routes: routes,
    selected_viewports: options.viewports,
    reduced_motion: options.reducedMotion,
    auth_login: authLogin,
    browser: {
      engine: "chromium",
      channel: options.browserChannel,
      headless: options.headless,
    },
    warnings,
    scenarios,
  };
  report.summary = summarize(report);
  report.ok =
    report.summary.page_errors === 0 &&
    report.summary.api_failures === 0 &&
    report.summary.read_only_violations === 0;

  const paths = await writeReports(report);
  console.log(`JSON report: ${paths.jsonPath}`);
  console.log(`Markdown report: ${paths.markdownPath}`);
  console.log(`Console/API report: ${paths.consolePath}`);
  console.log(`Loading inventory: ${paths.loadingPath}`);

  if (!report.ok && options.failOnErrors) return 1;
  return 0;
}

run()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
