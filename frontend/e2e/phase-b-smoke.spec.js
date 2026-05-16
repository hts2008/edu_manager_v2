import { expect, test } from "@playwright/test";

const username = process.env.E2E_USERNAME || "admin";
const password = process.env.E2E_PASSWORD || "admin123";
const allowMutation = process.env.E2E_ALLOW_MUTATION === "1";

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

async function login(page) {
  await page.goto("/login");
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Học viên", exact: true })).toBeVisible();
}

async function seedAuth(page) {
  await page.addInitScript((token) => {
    window.localStorage.setItem("token", token);
    window.localStorage.setItem("refreshToken", "");
  }, authToken);
}

async function attachRuntimeGuards(page) {
  const errors = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console: ${message.text()}`);
    }
  });

  page.on("requestfailed", (request) => {
    if (request.url().includes("/api/")) {
      const failureText = request.failure()?.errorText || "";
      if (failureText.includes("ERR_ABORTED")) return;
      errors.push(`requestfailed: ${request.method()} ${request.url()}`);
    }
  });

  page.on("response", (response) => {
    const url = response.url();
    if (url.includes("/api/") && response.status() >= 500) {
      errors.push(`api-${response.status()}: ${url}`);
    }
  });

  return errors;
}

async function expectHealthyPage(page, path, headingSelector) {
  const errors = await attachRuntimeGuards(page);
  await page.goto(path);
  await page.waitForLoadState("networkidle");

  await expect(page).not.toHaveURL(/\/login$/);
  await expect(page.getByText("Đã xảy ra lỗi")).toHaveCount(0);
  await expect(page.getByText("Network Error")).toHaveCount(0);
  await expect(page.locator(headingSelector)).toBeVisible();
  expect(errors).toEqual([]);
}

test("auth flow logs in and protects the dashboard", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("link", { name: "Báo cáo", exact: true })).toBeVisible();
});

test("student onboarding surface opens without mutating data", async ({ page }) => {
  await seedAuth(page);
  await expectHealthyPage(page, "/students", 'main h1:has-text("Học viên")');

  await page.getByRole("button", { name: "Thêm học viên" }).click();
  await expect(page.getByRole("heading", { name: "Thêm học viên mới" })).toBeVisible();
  await expect(page.locator('input[type="text"][name="full_name"]')).toBeVisible();
  await expect(page.locator('select[name="parent_id"]')).toBeVisible();
  await page.locator("form").getByRole("button", { name: "Thêm mới" }).click();
  await expect(page.getByText("Vui long nhap ho ten hoc vien")).toBeVisible();
  await page.getByRole("button", { name: "Hủy" }).click();
  await expect(page.getByRole("heading", { name: "Thêm học viên mới" })).toHaveCount(0);
});

test("class creation surface validates before mutation", async ({ page }) => {
  await seedAuth(page);
  await expectHealthyPage(page, "/classes", 'main h1:has-text("Lớp học")');

  await page.getByRole("button", { name: "Thêm lớp học" }).click();
  await expect(page.getByRole("heading", { name: "Thêm lớp học mới" })).toBeVisible();
  await page.locator("form").getByRole("button", { name: "Thêm mới" }).click();
  await expect(page.getByText("Vui long nhap ten lop")).toBeVisible();
  await page.getByRole("button", { name: "Hủy" }).click();
});

test("attendance and fee collection workspaces load", async ({ page }) => {
  await seedAuth(page);
  await expectHealthyPage(page, "/attendance", 'main h1:has-text("Điểm danh")');
  await expect(page.locator("select").first()).toBeVisible();

  await expectHealthyPage(page, "/attendance-periods", 'main h1:has-text("Quản lý chốt điểm danh")');
  await expectHealthyPage(page, "/fee-collection", 'main h1:has-text("Thu học phí")');
  await expect(page.getByRole("button", { name: "Tất cả (0)" }).or(page.getByRole("button", { name: /Tất cả/ }))).toBeVisible();
});

test("payment creation surface validates before mutation", async ({ page }) => {
  await seedAuth(page);
  await expectHealthyPage(page, "/payments", 'main h1:has-text("Chi tiền")');

  await page.getByRole("button", { name: "Tạo phiếu chi" }).click();
  await expect(page.getByRole("heading", { name: "Tạo phiếu chi mới" })).toBeVisible();
  await expect(page.getByPlaceholder("Tên người nhận tiền")).toBeVisible();

  if (!allowMutation) {
    await page.locator("form").getByRole("button", { name: "Tạo phiếu chi" }).click();
    await expect(page.getByText("Vui long nhap nguoi nhan")).toBeVisible();
    await page.getByRole("button", { name: "Hủy" }).click();
    await expect(page.getByRole("heading", { name: "Tạo phiếu chi mới" })).toHaveCount(0);
  }
});

test("receipts and templates surfaces load", async ({ page }) => {
  await seedAuth(page);
  await expectHealthyPage(page, "/receipts", 'main h1:has-text("Thu tiền")');
  await page.getByRole("button", { name: "Tạo phiếu thu" }).click();
  await expect(page.getByRole("heading", { name: "Tạo phiếu thu mới" })).toBeVisible();
  await page.locator("form").getByRole("button", { name: "Tạo phiếu thu" }).click();
  await expect(page.getByText("Vui long chon hoc vien")).toBeVisible();
  await page.getByRole("button", { name: "Hủy" }).click();

  await expectHealthyPage(page, "/templates", 'main h1:has-text("Mẫu in")');
  await expect(page.getByRole("button", { name: "Tạo mẫu mới" })).toBeVisible();
});

test("reports page and financial API contract are available", async ({ page, request }) => {
  await seedAuth(page);
  await expectHealthyPage(page, "/reports", 'main h1:has-text("Báo cáo tài chính")');

  const financialResponse = await request.get("/api/reports/financial?from=2026-05-01&to=2026-05-31", {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  expect(financialResponse.ok()).toBeTruthy();
  const body = await financialResponse.json();
  expect(Array.isArray(body.data?.receipts)).toBeTruthy();
  expect(Array.isArray(body.data?.payments)).toBeTruthy();
  expect(body.data?.paymentsByCategory).toBeTruthy();
  expect(body.data?.summary).toBeTruthy();
});

test("audit log page and API contract are available", async ({ page, request }) => {
  await seedAuth(page);
  await expectHealthyPage(page, "/audit-logs", 'main h1:has-text("Nhật ký hoạt động")');

  const response = await request.get("/api/activity-logs?limit=5", {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(Array.isArray(body.data?.logs)).toBeTruthy();
  expect(typeof body.data?.total).toBe("number");
});

test("center settings page and API contract are available", async ({ page, request }) => {
  await seedAuth(page);
  await expectHealthyPage(page, "/settings", 'main h1:has-text("Cài đặt trung tâm")');
  await expect(page.getByLabel("Tên trung tâm")).toBeVisible();

  const response = await request.get("/api/center-settings", {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.data?.center_name).toBeTruthy();
});

test("attendance insights page and API contract are available", async ({ page, request }) => {
  await seedAuth(page);
  await expectHealthyPage(page, "/attendance-insights", 'main h1:has-text("Insight điểm danh")');
  await expect(page.getByRole("heading", { name: "Heatmap 365 ngày" })).toBeVisible();

  const response = await request.get("/api/attendance/insights", {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(Array.isArray(body.data?.days)).toBeTruthy();
  expect(body.data?.summary).toBeTruthy();
});
