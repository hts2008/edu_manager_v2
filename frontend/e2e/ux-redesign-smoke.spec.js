import { expect, test } from "@playwright/test";

const username = process.env.E2E_USERNAME || "admin";
const password = process.env.E2E_PASSWORD || "admin123";

let authToken;

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

async function expectNoHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 2);
}

const protectedMenuPaths = [
  "/",
  "/students",
  "/parents",
  "/classes",
  "/teachers",
  "/attendance",
  "/attendance-insights",
  "/attendance-periods",
  "/fee-collection",
  "/payments",
  "/history",
  "/reports",
  "/advanced-reports",
  "/audit-logs",
  "/templates",
  "/users",
  "/imports",
  "/fee-reminders",
  "/backups",
  "/recycle-bin",
  "/settings",
];

test("redesigned navigation groups primary and secondary menus", async ({ page }) => {
  await seedAuth(page);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/fee-collection");
  await page.waitForLoadState("networkidle");

  const sidebar = page.locator("aside");
  await expect(sidebar.getByText("Menu chính")).toBeVisible();
  await expect(sidebar.getByText("Menu phụ")).toBeVisible();
  await expect(sidebar.getByRole("button", { name: "Vận hành" })).toBeVisible();
  await expect(sidebar.getByRole("button", { name: "Tài chính" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Thu tiền", exact: true })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Thu học phí", exact: true })).toHaveCount(0);
  await expect(sidebar.getByRole("button", { name: "Báo cáo" })).toBeVisible();
  await expect(sidebar.getByRole("button", { name: "Quản trị" })).toBeVisible();
  await expect(sidebar).toBeVisible();
  await expect(page.locator("main h1")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.screenshot({ path: "output/playwright/ux-redesign-desktop.png", fullPage: true });
});

test("mobile navigation remains usable without layout overflow", async ({ page }) => {
  await seedAuth(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/fee-collection");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Mở menu" }).click();
  const sidebar = page.locator("aside");
  await expect(sidebar.getByText("Menu chính")).toBeVisible();
  await expect(sidebar.getByText("Menu phụ")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.screenshot({ path: "output/playwright/ux-redesign-mobile.png", fullPage: true });
});

test("fee workbench and receipt history are distinct surfaces", async ({ page }) => {
  await seedAuth(page);
  await page.setViewportSize({ width: 1440, height: 960 });

  await page.goto("/fee-collection");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("main h1")).toContainText("Thu tiền học phí");
  await expect(page.getByRole("button", { name: /Thu tiền mặt/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Thu chuyển khoản/ })).toBeVisible();
  await expect(page.getByLabel("Hiển thị")).toBeVisible();

  await page.goto("/receipts");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("main h1")).toContainText("Phiếu thu");
});

test("attendance calendar exposes previous and future month navigation", async ({ page }) => {
  await seedAuth(page);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/attendance");
  await page.waitForLoadState("networkidle");
  const classSelect = page.locator("select").first();
  const optionCount = await classSelect.locator("option").count();
  test.skip(optionCount < 2, "No class data is available for attendance month navigation smoke.");
  await classSelect.selectOption({ index: 1 });
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("button", { name: "← 3 tháng" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Tháng trước" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Hôm nay" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tháng sau" })).toBeVisible();
  await expect(page.getByRole("button", { name: "3 tháng →" })).toBeVisible();
});

test("template designer loads an editable canvas surface", async ({ page, request }) => {
  const response = await request.get("/api/templates", {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  const templateId = body.data?.templates?.[0]?.id;
  expect(templateId).toBeTruthy();

  await seedAuth(page);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(`/templates/${templateId}/design`);
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Redo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload ảnh" })).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible();
});

test("all protected menu routes load on desktop and mobile", async ({ browser }) => {
  test.setTimeout(240_000);
  const page = await browser.newPage();
  const routeErrors = [];
  const allowedFailedStatus = new Set([401, 403]);

  await seedAuth(page);
  page.on("pageerror", (error) => {
    routeErrors.push({ type: "pageerror", text: error.message });
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      routeErrors.push({ type: "console", text: message.text() });
    }
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400 && !allowedFailedStatus.has(status)) {
      const url = response.url();
      const responseOrigin = new URL(url).origin;
      const pageOrigin = new URL(page.url()).origin;
      if (responseOrigin === pageOrigin) {
        routeErrors.push({ type: "response", status, url });
      }
    }
  });

  for (const path of protectedMenuPaths) {
    routeErrors.length = 0;
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.locator(`aside a[href="${path}"]`).first().click();
    await page.waitForLoadState("networkidle");
    expect(new URL(page.url()).pathname).toBe(path);
    await expect(page.locator("main")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect(routeErrors, `desktop route ${path}`).toEqual([]);
  }

  for (const path of protectedMenuPaths) {
    routeErrors.length = 0;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.locator("header button").first().click();
    await page.locator(`aside a[href="${path}"]`).first().click();
    await page.waitForLoadState("networkidle");
    expect(new URL(page.url()).pathname).toBe(path);
    await expect(page.locator("main")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect(routeErrors, `mobile route ${path}`).toEqual([]);
  }

  await page.close();
});

test("dashboard uses the production operations contract without overflow", async ({ page, request }) => {
  const response = await request.get("/api/reports/dashboard", {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.data).toEqual(
    expect.objectContaining({
      stats: expect.any(Object),
      recent_transactions: expect.any(Array),
      unpaid_students: expect.any(Array),
      today_attendance: expect.any(Object),
      attention_items: expect.any(Array),
      quick_metrics: expect.any(Object),
    })
  );

  await seedAuth(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("main")).toContainText("Production online");
  await expectNoHorizontalOverflow(page);
});

test("reports page exposes student tuition matrix without overflow", async ({ page, request }) => {
  const response = await request.get("/api/reports/student-fees?from=2026-05&to=2026-06", {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.data).toEqual(
    expect.objectContaining({
      months: expect.any(Array),
      students: expect.any(Array),
      summary: expect.objectContaining({
        student_count: expect.any(Number),
        total_paid: expect.any(Number),
        total_expected: expect.any(Number),
        outstanding_amount: expect.any(Number),
        anomaly_count: expect.any(Number),
      }),
    })
  );

  await seedAuth(page);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/reports");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Báo cáo vận hành trung tâm")).toBeVisible();
  await expect(page.getByText("Theo dõi học phí theo học viên")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: "output/playwright/reports-student-fees.png", fullPage: true });
});

test("template designer renders canvas and upgraded tools", async ({ page, request }) => {
  const response = await request.get("/api/templates", {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  const templates = Array.isArray(body.data) ? body.data : body.data?.templates || [];
  test.skip(!templates[0], "No template data is available for designer smoke.");

  await seedAuth(page);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(`/templates/${templates[0].id}/design`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Thành phần")).toBeVisible();
  await expect(page.getByText("Hình ảnh")).toBeVisible();
  await expect(page.getByText("Dữ liệu động")).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible();
  await page.screenshot({ path: "output/playwright/template-designer.png", fullPage: true });
});

test("receipt PDF endpoint returns a real PDF payload", async ({ request }, testInfo) => {
  const listResponse = await request.get("/api/receipts", {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  expect(listResponse.ok()).toBeTruthy();
  const listBody = await listResponse.json();
  const receipts = Array.isArray(listBody.data) ? listBody.data : listBody.data?.receipts || [];
  let receipt = receipts[0];
  let createdReceiptId = null;

  if (!receipt) {
    const baseURL = String(testInfo.project.use.baseURL || "");
    const isLocalTarget = baseURL.includes("127.0.0.1") || baseURL.includes("localhost");
    test.skip(!isLocalTarget, "No receipt data is available and production mutation is disabled.");

    const studentsResponse = await request.get("/api/students", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const templatesResponse = await request.get("/api/templates", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(studentsResponse.ok()).toBeTruthy();
    expect(templatesResponse.ok()).toBeTruthy();
    const studentsBody = await studentsResponse.json();
    const templatesBody = await templatesResponse.json();
    const students = Array.isArray(studentsBody.data) ? studentsBody.data : studentsBody.data?.students || [];
    const templates = Array.isArray(templatesBody.data) ? templatesBody.data : templatesBody.data?.templates || [];
    const defaultReceiptTemplate = templates.find((template) => template.type === "receipt" && template.is_default);

    test.skip(!students[0] || !defaultReceiptTemplate, "Local reference data lacks students or a receipt template.");

    const createResponse = await request.post("/api/receipts", {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        student_id: students[0].id,
        month: "2026-05",
        days_count: 1,
        fee_per_day: 1500000,
        amount: 1500000,
        payment_method: "cash",
        template_id: defaultReceiptTemplate.id,
        notes: "UX PDF smoke",
      },
    });
    expect(createResponse.ok()).toBeTruthy();
    const createBody = await createResponse.json();
    receipt = createBody.data;
    createdReceiptId = receipt.id;
  }

  try {
    const pdfResponse = await request.get(`/api/receipts/${receipt.id}/pdf`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(pdfResponse.ok()).toBeTruthy();
    expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");
    const buffer = await pdfResponse.body();
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(10_000);
  } finally {
    if (createdReceiptId) {
      await request.delete(`/api/receipts/${createdReceiptId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
    }
  }
});
