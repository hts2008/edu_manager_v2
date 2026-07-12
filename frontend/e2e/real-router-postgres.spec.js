import { expect, test } from "@playwright/test";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the real E2E suite`);
  return value;
}

const username = required("E2E_ADMIN_USERNAME");
const password = required("E2E_ADMIN_PASSWORD");

test("real UI persists auth and updates center settings through router/Postgres", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);

  const loginResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/auth/login") && response.request().method() === "POST"
  );
  await page.locator("form button[type='submit']").click();
  await expect((await loginResponse).status()).toBe(200);
  await expect(page).not.toHaveURL(/\/login$/);

  await page.reload();
  await expect(page).not.toHaveURL(/\/login$/);
  const persistedMe = await page.evaluate(async () => {
    const token = localStorage.getItem("token");
    const response = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { status: response.status, body: await response.json() };
  });
  expect(persistedMe.status).toBe(200);
  expect(persistedMe.body.data.user.username).toBe(username);

  await page.goto("/settings");
  const centerName = `AUD-RM-009 ${Date.now()}`;
  await page.locator("#center_name").fill(centerName);

  const updateResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/center-settings") && response.request().method() === "PUT"
  );
  await page.locator("form button[type='submit']").click();
  await expect((await updateResponse).status()).toBe(200);

  await page.reload();
  await expect(page.locator("#center_name")).toHaveValue(centerName);
});
