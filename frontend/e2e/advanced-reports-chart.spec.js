import { expect, test } from "@playwright/test";

const token = "mock-admin-token";

async function seedAuth(page) {
  await page.addInitScript((authToken) => {
    window.localStorage.setItem("token", authToken);
    window.localStorage.setItem("refreshToken", "");
  }, token);
}

async function mockAdvancedReportsApi(page) {
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          user: {
            id: "admin",
            username: "admin",
            role: "admin",
            full_name: "Admin",
          },
        },
      }),
    });
  });

  await page.route("**/api/reports/advanced**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          summary: {
            total_revenue: 18000000,
            total_expense: 4300000,
            net_revenue: 13700000,
            active_class_count: 8,
          },
          revenue_trend: [
            {
              period: "2026-04",
              total_receipts: 12000000,
              total_payments: 2500000,
              net_revenue: 9500000,
            },
            {
              period: "2026-05",
              total_receipts: 18000000,
              total_payments: 4300000,
              net_revenue: 13700000,
            },
          ],
          teacher_utilization: [],
          retention_cohort: [],
        },
      }),
    });
  });
}

test("advanced reports renders the revenue line chart from API data", async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await seedAuth(page);
  await mockAdvancedReportsApi(page);
  await page.goto("/advanced-reports");

  const chart = page.getByTestId("advanced-revenue-line-chart");
  await expect(chart).toBeVisible();
  await expect(chart.locator('svg.recharts-surface[role="application"]')).toBeVisible();
  await expect(chart).toContainText("Xu hướng doanh thu");
  await expect(page.getByText("Network Error")).toHaveCount(0);
  expect(errors).toEqual([]);
});
