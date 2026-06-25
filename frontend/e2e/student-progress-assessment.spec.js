import { expect, test } from "@playwright/test";

const username = process.env.E2E_USERNAME || "admin";
const password = process.env.E2E_PASSWORD || "admin123";

let authToken;
let sampleRow;

test.beforeAll(async ({ request }) => {
  const login = await request.post("/api/auth/login", {
    data: { username, password },
  });
  expect(login.ok()).toBeTruthy();
  const loginBody = await login.json();
  authToken = loginBody.data?.token;
  expect(authToken).toBeTruthy();

  const report = await request.get(
    "/api/reports/student-progress?from=2026-06&to=2026-06&page_size=50",
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  expect(report.ok()).toBeTruthy();
  const body = await report.json();
  sampleRow = body.data?.students?.[0] || null;
});

async function seedAuth(page) {
  await page.addInitScript((token) => {
    window.localStorage.setItem("token", token);
    window.localStorage.setItem("refreshToken", "");
  }, authToken);
}

async function attachRuntimeGuards(page) {
  const errors = [];

  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });

  page.on("requestfailed", (request) => {
    if (!request.url().includes("/api/")) return;
    const failureText = request.failure()?.errorText || "";
    if (failureText.includes("ERR_ABORTED")) return;
    errors.push(`requestfailed: ${request.method()} ${request.url()}`);
  });

  page.on("response", (response) => {
    if (response.url().includes("/api/") && response.status() >= 500) {
      errors.push(`api-${response.status()}: ${response.url()}`);
    }
  });

  return errors;
}

test("student progress assessment supports filters, teacher save, and parent print", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  test.skip(!sampleRow, "No student progress rows available for assessment smoke.");
  await seedAuth(page);
  const errors = await attachRuntimeGuards(page);
  await page.setViewportSize({ width: 1440, height: 980 });

  const reportResponses = [];
  page.on("response", async (response) => {
    const url = response.url();
    if (!url.includes("/api/reports/student-progress")) return;
    try {
      reportResponses.push({ url, body: await response.json() });
    } catch {
      reportResponses.push({ url, body: null });
    }
  });

  await page.goto("/student-progress");
  await page.waitForLoadState("networkidle");
  await expect(page).not.toHaveURL(/\/login$/);
  await expect(page.locator('[data-testid="student-progress-page"]')).toBeVisible();
  await expect(page.locator("main h1")).toContainText(/Tiến bộ học viên|Báo cáo tiến bộ/);
  await expect(page.getByText("Năng lực theo kỹ năng")).toBeVisible();
  await expect(page.getByText("Độ phủ input giáo viên")).toBeVisible();

  await page.locator('input[type="month"]').nth(0).fill(sampleRow.month);
  await page.locator('input[type="month"]').nth(1).fill(sampleRow.month);
  await page.locator('main input:not([type]), main input[type="text"]').first().fill(sampleRow.student_name);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(sampleRow.student_name).first()).toBeVisible();

  if (sampleRow.english_track && sampleRow.english_track !== "unknown") {
    const trackResponse = page.waitForResponse((response) => {
      const url = response.url();
      return (
        url.includes("/api/reports/student-progress") &&
        url.includes(`track=${sampleRow.english_track}`) &&
        response.status() === 200
      );
    });
    await page.locator("main select").nth(2).selectOption(sampleRow.english_track);
    const response = await trackResponse;
    const body = await response.json();
    expect(body.data?.meta?.filters?.track).toBe(sampleRow.english_track);
    expect(
      (body.data?.students || []).every((row) => row.english_track === sampleRow.english_track)
    ).toBeTruthy();
  }

  await page.getByRole("button", { name: /Xem/ }).first().click();
  const panel = page.locator('[data-testid="progress-input-panel"]');
  await expect(panel).toBeVisible();
  await expect(panel.locator('input[type="number"]').first()).toBeVisible();

  const listeningScore = "88";
  const testNote = `E2E progress smoke ${Date.now()}`;
  await panel.locator('input[type="number"]').first().fill(listeningScore);
  await panel.locator("textarea").first().fill(testNote);
  const [saveResponse] = await Promise.all([
    page.waitForResponse((response) => {
      return (
        response.url().includes("/api/student-progress") &&
        response.request().method() === "POST"
      );
    }),
    panel.getByTestId("save-progress").click(),
  ]);
  expect(saveResponse.status()).toBeGreaterThanOrEqual(200);
  expect(saveResponse.status()).toBeLessThan(300);
  const saveBody = await saveResponse.json();
  expect(saveBody.success).toBeTruthy();
  const savedRecord = saveBody.data?.progress_month;
  expect(savedRecord?.skills?.some((skill) => skill.skill_key === "listening" && skill.score === 88)).toBeTruthy();
  await expect(panel.getByText(/Da luu|Đã lưu|luu tien do/i)).toBeVisible();

  const saved = await request.get(
    `/api/student-progress?student_id=${savedRecord.student_id}&class_id=${savedRecord.class_id}&month=${savedRecord.month}&limit=1`,
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  expect(saved.ok()).toBeTruthy();
  const savedBody = await saved.json();
  const reloadedRecord = savedBody.data?.progress_months?.[0];
  expect(reloadedRecord?.skills?.some((skill) => skill.skill_key === "listening" && skill.score === 88)).toBeTruthy();

  await page.screenshot({
    path: "../receipts/artifacts/student-progress-assessment-e2e.png",
    fullPage: true,
  });

  const popupPromise = page.waitForEvent("popup");
  await page.getByTestId("print-selected-progress").click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");
  const printText = await popup.locator("body").innerText();
  expect(printText).toContain("Bao cao tien bo hoc vien");
  expect(printText).toContain(savedRecord.student_name);
  expect(printText).toContain("88");
  expect(printText).toContain("Chua nhap");
  await popup.screenshot({
    path: "../receipts/artifacts/student-progress-assessment-print-e2e.png",
    fullPage: true,
  });
  await popup.close();

  expect(reportResponses.length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
