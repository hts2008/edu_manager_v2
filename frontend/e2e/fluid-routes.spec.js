import { expect, test } from "@playwright/test";

const routes = [
  { name: "dashboard", path: "/" },
  { name: "students", path: "/students" },
  { name: "parents", path: "/parents" },
  { name: "classes", path: "/classes" },
  { name: "teachers", path: "/teachers" },
  { name: "attendance", path: "/attendance" },
  { name: "attendance insights", path: "/attendance-insights" },
  { name: "attendance periods", path: "/attendance-periods" },
  { name: "receipts", path: "/receipts" },
  { name: "payments", path: "/payments" },
  { name: "fee collection", path: "/fee-collection" },
  { name: "history", path: "/history" },
  { name: "templates", path: "/templates" },
  { name: "reports", path: "/reports" },
  { name: "student progress", path: "/student-progress" },
  {
    name: "student progress detail",
    path: "/student-progress/student-dashboard?class_id=class-dashboard&month=2026-06",
  },
  { name: "advanced reports", path: "/advanced-reports" },
  { name: "audit logs", path: "/audit-logs" },
  { name: "settings", path: "/settings" },
  { name: "users", path: "/users" },
  { name: "imports", path: "/imports" },
  { name: "fee reminders", path: "/fee-reminders" },
  { name: "backups", path: "/backups" },
  { name: "recycle bin", path: "/recycle-bin" },
];

const viewports = [
  { name: "wide desktop", width: 1920, height: 1080 },
  { name: "ultrawide", width: 2560, height: 1440 },
];

async function mockAuthenticatedApis(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("token", "mock-admin-token");
    window.localStorage.setItem("refreshToken", "");
  });

  await page.route("**/api/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const data = pathname === "/api/auth/me"
      ? { user: { id: "admin", username: "admin", role: "admin", full_name: "Admin" } }
      : {};

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data }),
    });
  });
}

for (const viewport of viewports) {
  test.describe(`${viewport.name} authenticated shell`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of routes) {
      test(`${route.name} fills the content track without horizontal overflow`, async ({ page }) => {
        await mockAuthenticatedApis(page);
        await page.goto(route.path);

        const main = page.locator("main.eduflow-main");
        await expect(main).toBeVisible();

        const metrics = await main.evaluate((mainElement) => {
          const contentTrack = mainElement.parentElement;
          if (!contentTrack) throw new Error("Authenticated content track is missing");

          const mainRect = mainElement.getBoundingClientRect();
          const trackRect = contentTrack.getBoundingClientRect();
          return {
            horizontalOverflow:
              document.documentElement.scrollWidth - document.documentElement.clientWidth,
            trackRatio: mainRect.width / trackRect.width,
          };
        });

        expect(metrics.trackRatio).toBeGreaterThanOrEqual(0.99);
        expect(metrics.horizontalOverflow).toBeLessThanOrEqual(1);
      });
    }
  });
}
