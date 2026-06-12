import { expect, test } from "@playwright/test";

const token = "mock-admin-token";

async function seedAuth(page) {
  await page.addInitScript((authToken) => {
    window.localStorage.setItem("token", authToken);
    window.localStorage.setItem("refreshToken", "");
  }, token);
}

async function mockAuth(page) {
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
}

test("admin secondary surfaces expose retry, progress and shared confirmations", async ({ page }) => {
  await seedAuth(page);
  await mockAuth(page);
  await page.setViewportSize({ width: 390, height: 844 });

  let userFailuresRemaining = 2;
  await page.route("**/api/users**", async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { id: "u1" } }),
      });
      return;
    }
    if (userFailuresRemaining > 0) {
      userFailuresRemaining -= 1;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: { message: "users unavailable" } }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          users: [
            {
              id: "u1",
              username: "staff",
              full_name: "Staff User",
              role: "receptionist",
              status: "active",
              last_login: null,
            },
          ],
          total: 1,
        },
      }),
    });
  });

  await page.goto("/users");
  const usersError = page.getByText("users unavailable");
  await expect(usersError).toBeVisible();
  await usersError.locator("..").getByRole("button").click();
  await expect(page.getByText("Staff User")).toBeVisible();
  await page.getByRole("button").filter({ hasText: /kh/i }).last().click();
  const deactivateDialog = page.getByRole("dialog").filter({ hasText: /kh/i });
  await expect(deactivateDialog).toBeVisible();
  await deactivateDialog.getByRole("button").filter({ hasText: /h/i }).first().click();

  await page.route("**/api/import/students", async (route) => {
    const payload = route.request().postDataJSON();
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: payload.mode === "preview"
          ? {
              summary: {
                total_rows: 1,
                valid_rows: 1,
                invalid_rows: 0,
                will_create_parents: 1,
                will_reuse_parents: 0,
                will_create_students: 1,
              },
              rows: [
                {
                  row_number: 1,
                  valid: true,
                  data: { student_full_name: "Phase Six Student", parent_phone: "0900000001" },
                  parent_action: "create",
                  errors: [],
                  warnings: [],
                },
              ],
            }
          : { summary: { created_students: 1 } },
      }),
    });
  });

  await page.goto("/imports");
  await page.getByRole("button", { name: "Load sample" }).click();
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.locator("body")).toContainText(/Đang kiểm tra file CSV/i);
  await expect(page.getByTestId("import-summary")).toBeVisible();
  await page.getByRole("button", { name: "Commit import" }).click();
  const importDialog = page.getByRole("dialog").filter({ hasText: /import/i });
  await expect(importDialog).toBeVisible();
  await importDialog.getByRole("button").filter({ hasText: /import/i }).click();
  await expect(page.locator("body")).toContainText(/Đang ghi dữ liệu import/i);
  await expect(page.getByText("Imported 1 students")).toBeVisible();

  await page.route("**/api/recycle-bin**", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { ok: true } }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          by_resource: { students: [{ id: "s1" }], parents: [], receipts: [], payments: [] },
          items: [
            {
              id: "s1",
              resource: "students",
              label: "Deleted Student",
              parent_name: "Parent",
              deleted_at: "2026-06-01T00:00:00.000Z",
            },
          ],
        },
      }),
    });
  });

  await page.goto("/recycle-bin");
  await expect(page.getByText("Deleted Student")).toBeVisible();
  await page.getByRole("button", { name: "Purge" }).click();
  await expect(page.getByRole("dialog").filter({ hasText: /x/i })).toBeVisible();

  await page.route("**/api/fee-reminders**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          summary: { total: 1, total_amount: 500000, sent: 0 },
          items: [
            {
              fee_id: "f1",
              student_name: "Phase Six Student",
              parent_name: "Parent",
              parent_phone: "0900000001",
              total_amount: 500000,
              status: "ready",
            },
          ],
        },
      }),
    });
  });

  await page.goto("/fee-reminders");
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.locator("body")).toContainText(/Đang tạo preview/i);
  await expect(page.getByText("Phase Six Student")).toBeVisible();
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("dialog").filter({ hasText: /provider|opt-in|send/i })).toBeVisible();

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 2);
});

test("parent portal uses a mobile-first read-only loading flow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  let releaseLogin;
  const loginGate = new Promise((resolve) => {
    releaseLogin = resolve;
  });

  await page.route("**/api/parent-portal/login", async (route) => {
    await loginGate;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { token: "parent-token" } }),
    });
  });

  await page.route("**/api/parent-portal/me", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          parent: { full_name: "Parent Phase 6" },
          students: [
            {
              id: "student-1",
              full_name: "Student Phase 6",
              status: "active",
              fees: [{ id: "fee-1", month: "2026-06", total_amount: 500000, status: "ready" }],
              receipts: [{ id: "receipt-1", month: "2026-05", amount: 500000, payment_method: "cash" }],
              attendance: [{ id: "att-1", date: "2026-06-01", status: "present" }],
            },
          ],
        },
      }),
    });
  });

  await page.goto("/parent-login");
  const inputs = page.locator("input");
  await inputs.nth(0).fill("0900000001");
  await inputs.nth(1).fill("2015-01-01");
  await page.getByRole("button").filter({ hasText: /ng nh/i }).click();
  await expect(page.getByRole("button")).toContainText("...");
  releaseLogin();
  await expect(page.locator("body")).toContainText(/dang tai giao dien|Parent Phase 6/i);
  await expect(page.getByText("Parent Phase 6")).toBeVisible();
  await expect(page.getByText("Student Phase 6")).toBeVisible();
  await expect(page.locator("body")).toContainText("2026-06");
  await expect(page.locator("body")).toContainText("2026-05");
  await expect(page.locator("body")).toContainText("present");
  await expect(page.locator("body")).not.toContainText(/quan ly nguoi dung/i);
});
