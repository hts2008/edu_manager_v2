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

test("redesigned navigation groups primary and secondary menus", async ({ page }) => {
  await seedAuth(page);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/receipts");
  await page.waitForLoadState("networkidle");

  const sidebar = page.locator("aside");
  await expect(sidebar.getByText("Menu chính")).toBeVisible();
  await expect(sidebar.getByText("Menu phụ")).toBeVisible();
  await expect(sidebar.getByRole("button", { name: "Vận hành" })).toBeVisible();
  await expect(sidebar.getByRole("button", { name: "Tài chính" })).toBeVisible();
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
  await page.goto("/receipts");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Mở menu" }).click();
  const sidebar = page.locator("aside");
  await expect(sidebar.getByText("Menu chính")).toBeVisible();
  await expect(sidebar.getByText("Menu phụ")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.screenshot({ path: "output/playwright/ux-redesign-mobile.png", fullPage: true });
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
