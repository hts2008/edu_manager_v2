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

test("advanced reports page and API contract are available", async ({ page, request }) => {
  await seedAuth(page);
  await expectHealthyPage(page, "/advanced-reports", 'main h1:has-text("Báo cáo nâng cao")');
  await expect(page.getByRole("heading", { name: "Xu hướng doanh thu" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hiệu suất giáo viên" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cohort học viên" })).toBeVisible();

  const response = await request.get("/api/reports/advanced?from=2026-05-01&to=2026-05-31", {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(Array.isArray(body.data?.revenue_trend)).toBeTruthy();
  expect(Array.isArray(body.data?.teacher_utilization)).toBeTruthy();
  expect(Array.isArray(body.data?.retention_cohort)).toBeTruthy();
  expect(body.data?.summary).toBeTruthy();
});

test("user management page and API contract are available", async ({ page, request }) => {
  await seedAuth(page);
  await expectHealthyPage(page, "/users", 'main h1:has-text("Quản lý người dùng")');
  await expect(page.getByRole("heading", { name: "Danh sách người dùng" })).toBeVisible();

  await page.getByRole("button", { name: "Thêm người dùng" }).click();
  await expect(page.getByRole("heading", { name: "Thêm người dùng" })).toBeVisible();
  await page.getByRole("button", { name: "Lưu" }).click();
  await expect(page.getByText("username is required")).toBeVisible();
  await page.getByRole("button", { name: "Hủy" }).click();

  const response = await request.get("/api/users", {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(Array.isArray(body.data?.users)).toBeTruthy();
  expect(typeof body.data?.total).toBe("number");
});

test("bulk action selection surfaces and API validation are available", async ({ page, request }) => {
  await seedAuth(page);

  for (const path of ["/students", "/parents", "/receipts", "/payments"]) {
    await expectHealthyPage(page, path, "main h1");
    const firstRowSelect = page.getByTestId("row-select").first();
    if ((await firstRowSelect.count()) === 0) continue;

    await firstRowSelect.check();
    await expect(page.getByTestId("bulk-action-bar")).toBeVisible();
    await expect(page.getByText("1 selected")).toBeVisible();
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.getByTestId("bulk-action-bar")).toHaveCount(0);
  }

  const response = await request.post("/api/bulk-actions", {
    headers: { Authorization: `Bearer ${authToken}` },
    data: { resource: "students", action: "archive", ids: [] },
  });
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.success).toBe(false);
  expect(body.error?.code).toBeTruthy();
});

test("monthly fee automation dry-run API contract is available", async ({ request }) => {
  const response = await request.post("/api/monthly-fees/generate", {
    headers: { Authorization: `Bearer ${authToken}` },
    data: { month: "2026-05", dry_run: true },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.data?.month).toBe("2026-05");
  expect(body.data?.dry_run).toBe(true);
  expect(Array.isArray(body.data?.items)).toBeTruthy();
  expect(body.data?.summary).toBeTruthy();
});

test("student CSV import preview page and API contract are available", async ({ page, request }) => {
  await seedAuth(page);
  await expectHealthyPage(page, "/imports", 'main h1:has-text("Import CSV")');

  const suffix = String(Date.now()).slice(-8);
  const csv = [
    "student_full_name,date_of_birth,gender,parent_full_name,parent_phone,relationship,enrollment_date",
    `C2 Preview ${suffix},2015-01-02,male,Parent ${suffix},09${suffix},mother,2026-05-01`,
    `C2 Invalid ${suffix},,male,Parent ${suffix} B,08${suffix},father,2026-05-01`,
  ].join("\n");

  await page.getByLabel("CSV content").fill(csv);
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByText("Preview ready")).toBeVisible();
  await expect(page.getByTestId("import-summary")).toBeVisible();
  await expect(page.getByTestId("import-preview-table")).toContainText(`C2 Preview ${suffix}`);
  await expect(page.getByTestId("import-preview-table")).toContainText("date_of_birth: REQUIRED");

  const response = await request.post("/api/import/students", {
    headers: { Authorization: `Bearer ${authToken}` },
    data: { mode: "preview", csv },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.data?.summary?.total_rows).toBe(2);
  expect(body.data?.summary?.valid_rows).toBe(1);
  expect(body.data?.summary?.invalid_rows).toBe(1);
});

test("operations pages for reminders, backups, and recycle bin are available", async ({ page, request }) => {
  await seedAuth(page);
  await expectHealthyPage(page, "/fee-reminders", 'main h1:has-text("Fee Reminders")');
  await expect(page.getByRole("button", { name: "Preview" })).toBeVisible();

  const reminders = await request.get("/api/fee-reminders?month=2026-05", {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  expect(reminders.ok()).toBeTruthy();
  const remindersBody = await reminders.json();
  expect(Array.isArray(remindersBody.data?.items)).toBeTruthy();
  expect(remindersBody.data?.summary).toBeTruthy();

  await expectHealthyPage(page, "/backups", 'main h1:has-text("Backups")');
  const backup = await request.post("/api/backups", {
    headers: { Authorization: `Bearer ${authToken}` },
    data: { action: "run", dry_run: true },
  });
  expect(backup.ok()).toBeTruthy();
  const backupBody = await backup.json();
  expect(backupBody.data?.dry_run).toBe(true);
  expect(backupBody.data?.counts).toBeTruthy();

  await expectHealthyPage(page, "/recycle-bin", 'main h1:has-text("Recycle Bin")');
  const recycle = await request.get("/api/recycle-bin", {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  expect(recycle.ok()).toBeTruthy();
  const recycleBody = await recycle.json();
  expect(Array.isArray(recycleBody.data?.items)).toBeTruthy();
  expect(recycleBody.data?.by_resource).toBeTruthy();
});

test("parent portal login rejects invalid credentials and exposes read-only login surface", async ({ page, request }) => {
  await page.goto("/parent-login");
  await expect(page.getByRole("heading", { name: "Parent Portal" })).toBeVisible();
  await page.getByLabel("Parent phone").fill("0999999999");
  await page.getByLabel("Student date of birth").fill("2010-01-01");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByText("Invalid parent credentials")).toBeVisible();

  const response = await request.post("/api/parent-portal/login", {
    data: {
      parent_phone: "0999999999",
      student_date_of_birth: "2010-01-01",
    },
  });
  expect(response.status()).toBe(401);
});
