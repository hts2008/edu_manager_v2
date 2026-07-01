import { expect, test } from "@playwright/test";

const token = "mock-admin-token";

async function setupAuth(page) {
  await page.addInitScript((authToken) => {
    window.localStorage.setItem("token", authToken);
    window.localStorage.setItem("refreshToken", "");
  }, token);

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

function progressPayload() {
  return {
    success: true,
    data: {
      summary: {},
      charts: { monthly: [], tracks: [], readiness: [] },
      students: [],
      pagination: { page: 1, page_size: 25, total_items: 0, total_pages: 1 },
      meta: {
        classes: [
          { id: "class-a", class_name: "Starter A1" },
          { id: "class-b", class_name: "Mover B1" },
        ],
      },
      framework: {
        tracks: {
          starters: { label: "Pre A1 Starters" },
          movers: { label: "A1 Movers" },
        },
      },
    },
  };
}

test("attendance class selector delays busy UI and retries an error", async ({ page }) => {
  await setupAuth(page);

  let requests = 0;
  await page.route("**/api/classes", async (route) => {
    requests += 1;
    if (requests <= 2) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: { message: "classes unavailable" } }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { classes: [{ id: "class-a", class_name: "Starter A1" }] },
      }),
    });
  });

  await page.goto("/attendance");
  const field = page.getByTestId("attendance-class-field");
  await expect(field.getByRole("status")).toHaveCount(0);
  await page.waitForTimeout(320);
  await expect(field.getByRole("status")).toContainText(/Đang tải|Dang tai/);
  await expect(field.getByRole("button", { name: /Thử lại|Thu lai/ })).toBeVisible();
  await field.getByRole("button", { name: /Thử lại|Thu lai/ }).click();
  await expect(field.getByLabel("Chon lop")).toBeEnabled();
  await expect(field.getByLabel("Chon lop")).toContainText("Starter A1");
});

test("attendance class selector reports an empty ready state", async ({ page }) => {
  await setupAuth(page);
  await page.route("**/api/classes", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { classes: [] } }),
    });
  });

  await page.goto("/attendance");
  const field = page.getByTestId("attendance-class-field");
  await expect(field.getByRole("status")).toContainText(/Chưa có lớp|Chua co lop/);
  await expect(field.getByLabel("Chon lop")).toBeDisabled();
});

test("attendance class selector keeps native semantics and a 44px mobile target", async ({ page }) => {
  await setupAuth(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/classes", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          classes: [
            { id: "class-a", class_name: "Starter A1" },
            { id: "class-b", class_name: "Mover B1" },
          ],
        },
      }),
    });
  });

  await page.goto("/attendance");
  const select = page.getByTestId("attendance-class-field").getByLabel("Chon lop");
  await expect(select).toBeEnabled();
  await expect(select).toHaveJSProperty("tagName", "SELECT");
  const target = await select.boundingBox();
  expect(target?.height).toBeGreaterThanOrEqual(44);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(2);
});

test("progress class selector preserves selection while data refreshes", async ({ page }) => {
  await setupAuth(page);

  let requests = 0;
  await page.route("**/api/reports/student-progress**", async (route) => {
    requests += 1;
    if (requests > 1) {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(progressPayload()),
    });
  });

  await page.goto("/student-progress");
  const field = page.getByTestId("progress-class-field");
  const select = field.getByLabel("Lop hoc");
  await expect(select).toBeEnabled();
  await select.selectOption("class-b");
  await expect(select).toHaveValue("class-b");
  await expect(field.getByRole("status")).toHaveCount(0);
  await page.waitForTimeout(320);
  await expect(field.getByRole("status")).toContainText(/Đang cập nhật|Dang cap nhat/);
  await expect(select).toHaveValue("class-b");
  await expect(select).toBeEnabled();
  await expect(field.getByRole("status")).toHaveCount(0);
  expect(requests).toBeGreaterThan(1);
});
