import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

const fixture = JSON.parse(readFileSync(new URL("../../docs/artifacts/tuition-progress-execution-2026-10-05/browser-fixture.json", import.meta.url), "utf8"));
test("real authenticated daily80 dashboard retains missing growth after reload", async ({ page, request }, testInfo) => {
  const password = process.env.TPR_BROWSER_PASSWORD;
  expect(password).toBeTruthy();
  const response = await request.post("/api/auth/login", { data: {
    tenant_slug: fixture.tenants[0], username: fixture.users[0], password,
  } });
  expect(response.status()).toBe(200);
  const login = await response.json();
  expect(login.success).toBe(true);
  await page.addInitScript(token => localStorage.setItem("token", token), login.data.token);
  const query = new URLSearchParams({ student_id: fixture.students[0], class_id: fixture.classId,
    from: "2026-06-01", to: "2026-06-30" });
  const timeline = await request.get(`/api/student-progress/timeline?${query}`, {
    headers: { authorization: `Bearer ${login.data.token}` },
  });
  expect(timeline.status()).toBe(200);
  const payload = await timeline.json();
  expect(payload.data.summary.latest_score).toBe(80);
  expect(payload.data.summary.growth).toBeNull();
  await page.goto(`/student-progress/${fixture.students[0]}?class_id=${fixture.classId}&month=2026-06`);
  await expect(page.getByText("TPR student", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("80", { exact: true }).first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText("NaN");
  await page.reload();
  await expect(page.getByText("80", { exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("daily80-reload.png"), fullPage: true });
});
