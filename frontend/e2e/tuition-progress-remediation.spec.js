import { test, expect } from "@playwright/test";

const fixture = { tenants: ["default"], users: [process.env.E2E_ADMIN_USERNAME], students: ["e2e-spd-daily80"], classId: "e2e-spd-class" };
test("real authenticated daily80 dashboard retains missing growth after reload", async ({ page, request }, testInfo) => {
  const password = process.env.E2E_ADMIN_PASSWORD;
  expect(password).toBeTruthy();
  const response = await request.post("/api/auth/login", { data: {
    tenant_slug: fixture.tenants[0], username: fixture.users[0], password,
  } });
  expect(response.status()).toBe(200);
  const login = await response.json();
  expect(login.success).toBe(true);
  await page.addInitScript(token => localStorage.setItem("token", token), login.data.token);
  const query = new URLSearchParams({ student_id: fixture.students[0], class_id: fixture.classId,
    from: "2026-09-01", to: "2026-09-30" });
  const timeline = await request.get(`/api/student-progress/timeline?${query}`, {
    headers: { authorization: `Bearer ${login.data.token}` },
  });
  expect(timeline.status()).toBe(200);
  const payload = await timeline.json();
  expect(payload.data.summary.latest_score).toBe(80);
  expect(payload.data.summary.growth).toBeNull();
  await page.goto(`/student-progress/${fixture.students[0]}?class_id=${fixture.classId}&month=2026-09`);
  await expect(page.getByText("TPR student", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("80", { exact: true }).first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText("NaN");
  await page.reload();
  await expect(page.getByText("80", { exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("daily80-reload.png"), fullPage: true });
});
