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

async function openFirstRowDialog(page, path) {
  await seedAuth(page);
  await page.goto(path);
  await page.waitForLoadState("networkidle");

  const rowCount = await page.locator("table tbody tr").count();
  test.skip(rowCount === 0, `No table rows available for modal guard smoke on ${path}.`);

  await page.locator("table tbody tr").first().click({ position: { x: 220, y: 24 } });
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  return dialog;
}

async function changeFirstEditableField(dialog) {
  const field = dialog
    .locator(
      'input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="hidden"]):not([disabled]), textarea:not([disabled])'
    )
    .first();
  await expect(field).toBeVisible({ timeout: 10_000 });

  const currentValue = await field.inputValue().catch(() => "");
  await field.fill(`${currentValue || "Test"} guard`);
}

async function expectFocusInsideDialog(page) {
  const insideDialog = await page.evaluate(() => Boolean(document.activeElement?.closest?.('[role="dialog"]')));
  expect(insideDialog).toBeTruthy();
}

test("long edit modal cancel buttons use the unsaved-change guard", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 820 });

  for (const path of ["/classes", "/students", "/parents", "/teachers"]) {
    const dialog = await openFirstRowDialog(page, path);
    await changeFirstEditableField(dialog);

    await dialog.getByRole("button", { name: "Hủy" }).click();
    await expect(dialog.getByText("Dong khong luu")).toBeVisible();

    for (let index = 0; index < 8; index += 1) {
      await page.keyboard.press("Tab");
      await expectFocusInsideDialog(page);
    }

    await dialog.getByRole("button", { name: "Tiep tuc sua" }).click();
    await expect(dialog.getByText("Dong khong luu")).toBeHidden();
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Hủy" }).click();
    await dialog.getByRole("button", { name: "Dong khong luu" }).click();
    await expect(dialog).toBeHidden();
  }
});

test("class edit modal remains viewport bounded on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 640 });
  const dialog = await openFirstRowDialog(page, "/classes");

  const box = await dialog.boundingBox();
  expect(box).toBeTruthy();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.width).toBeLessThanOrEqual(390);
  expect(box.height).toBeLessThanOrEqual(640);

  const submitButton = dialog.locator('button[type="submit"]').last();
  await submitButton.scrollIntoViewIfNeeded();
  await expect(submitButton).toBeInViewport();
});

test("login and dashboard route surfaces render without the old demo credential block", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Đăng nhập" })).toBeVisible();
  await expect(page.getByText("admin123")).toHaveCount(0);

  await seedAuth(page);
  await page.goto("/");
  await expect(page.locator("main h1")).toBeVisible({ timeout: 15_000 });
});
