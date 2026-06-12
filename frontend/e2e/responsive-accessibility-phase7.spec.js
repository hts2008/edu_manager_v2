import { expect, test } from "@playwright/test";

const username = process.env.E2E_USERNAME || "admin";
const password = process.env.E2E_PASSWORD || "admin123";

let authToken;

const protectedRoutes = [
  "/",
  "/students",
  "/parents",
  "/classes",
  "/teachers",
  "/attendance",
  "/fee-collection",
  "/reports",
  "/templates",
  "/users",
  "/imports",
  "/audit-logs",
  "/backups",
  "/recycle-bin",
  "/settings",
];

const routeSubsetForReducedMotion = [
  "/",
  "/students",
  "/attendance",
  "/fee-collection",
  "/reports",
  "/templates",
];

test.beforeAll(async ({ request }) => {
  const response = await request.post("/api/auth/login", {
    data: { username, password },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  authToken = body.data?.token;
  expect(authToken).toBeTruthy();
});

async function seedAuth(page) {
  await page.addInitScript((token) => {
    window.localStorage.setItem("token", token);
    window.localStorage.setItem("refreshToken", "");
  }, authToken);
}

function attachRuntimeGuards(page) {
  const errors = [];

  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console: ${message.text()}`);
    }
  });

  page.on("response", (response) => {
    const url = response.url();
    if (!url.includes("/api/")) return;
    if (response.status() >= 500) {
      errors.push(`api ${response.status()}: ${url}`);
    }
  });

  page.on("requestfailed", (request) => {
    const url = request.url();
    if (!url.includes("/api/")) return;
    const failureText = request.failure()?.errorText || "";
    if (failureText.includes("ERR_ABORTED")) return;
    errors.push(`request failed: ${url} ${failureText}`.trim());
  });

  return () => errors;
}

async function waitForUsefulMain(page) {
  const main = page.locator("main");
  await expect(main).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-testid='route-loading']")).toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator("[data-testid='loading-scene']")).toHaveCount(0, { timeout: 30_000 });
  await expect
    .poll(async () => main.evaluate((node) => node.innerText.trim().length))
    .toBeGreaterThan(20);
}

async function collectLayoutA11yMetrics(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return (
        rect.width > 1 &&
        rect.height > 1 &&
        style.visibility !== "hidden" &&
        style.display !== "none"
      );
    };

    const unnamedButtons = [...document.querySelectorAll("button")]
      .filter(visible)
      .map((button) => ({
        text: button.innerText.trim(),
        aria: button.getAttribute("aria-label") || "",
        title: button.getAttribute("title") || "",
        testId: button.getAttribute("data-testid") || "",
        html: button.outerHTML.slice(0, 160),
      }))
      .filter((button) => !button.text && !button.aria && !button.title);

    const liveRegions = document.querySelectorAll(
      "[aria-live], [role='status'], [role='alert']"
    ).length;

    const focusable = [
      ...document.querySelectorAll(
        "a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])"
      ),
    ].filter(visible).length;

    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      bodyWidth: body?.scrollWidth || 0,
      viewportWidth: window.innerWidth,
      mainCount: document.querySelectorAll("main").length,
      headingCount: document.querySelectorAll("main h1, main h2").length,
      liveRegions,
      focusable,
      unnamedButtons,
    };
  });
}

async function assertRouteHealth(page, route, viewportName) {
  await page.goto(route);
  await waitForUsefulMain(page);

  const metrics = await collectLayoutA11yMetrics(page);
  expect(metrics.mainCount, `${route} ${viewportName} should expose one main region`).toBe(1);
  expect(metrics.headingCount, `${route} ${viewportName} should expose page headings`).toBeGreaterThan(0);
  expect(metrics.focusable, `${route} ${viewportName} should keep interactive controls reachable`).toBeGreaterThan(0);
  expect(metrics.liveRegions, `${route} ${viewportName} should expose async live/status regions`).toBeGreaterThan(0);
  expect(metrics.scrollWidth, `${route} ${viewportName} horizontal overflow`).toBeLessThanOrEqual(
    metrics.clientWidth + 2
  );
  expect(metrics.unnamedButtons, `${route} ${viewportName} unnamed icon buttons`).toEqual([]);
}

test("primary admin routes remain responsive, accessible and error-free", async ({ page }) => {
  test.setTimeout(240_000);
  await seedAuth(page);
  const readRuntimeErrors = attachRuntimeGuards(page);

  for (const viewport of [
    { name: "mobile-390x844", width: 390, height: 844 },
    { name: "desktop-1440x900", width: 1440, height: 900 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const route of protectedRoutes) {
      await assertRouteHealth(page, route, viewport.name);
    }
  }

  expect(readRuntimeErrors()).toEqual([]);
});

test("reduced motion disables recurring decorative animation on core routes", async ({ page }) => {
  test.setTimeout(120_000);
  await seedAuth(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  const readRuntimeErrors = attachRuntimeGuards(page);

  for (const route of routeSubsetForReducedMotion) {
    await page.goto(route);
    await waitForUsefulMain(page);
    const runningAnimations = await page.evaluate(() =>
      document.getAnimations({ subtree: true })
        .filter((animation) => animation.playState === "running")
        .map((animation) => {
          const timing = animation.effect?.getTiming?.() || {};
          return {
            duration: timing.duration,
            iterations: timing.iterations,
          };
        })
        .filter((animation) => animation.duration === Infinity || animation.iterations === Infinity)
    );
    expect(runningAnimations, `${route} should not keep infinite animation in reduced motion`).toEqual([]);
  }

  expect(readRuntimeErrors()).toEqual([]);
});
