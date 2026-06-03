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

test("fee collection rows render at most one class chip or name", async ({ page }) => {
  await seedAuth(page);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/fee-collection");
  await page.waitForLoadState("networkidle");

  await expect(page).not.toHaveURL(/\/login$/);
  await expect(page.locator("main h1")).toBeVisible();

  const table = page.locator("table").first();
  await expect(table).toBeVisible();

  const audit = await table.evaluate((tableElement) => {
    const normalizeHeader = (text) =>
      text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    const squash = (text) => text.replace(/\s+/g, " ").trim();
    const headers = Array.from(tableElement.querySelectorAll("thead th"));
    const classColumnIndex = headers.findIndex((header) =>
      normalizeHeader(header.textContent || "").includes("lop")
    );
    const rows = Array.from(tableElement.querySelectorAll("tbody tr")).filter(
      (row) => !row.querySelector("td[colspan]")
    );

    const violations = rows.flatMap((row, index) => {
      const cell = row.children[classColumnIndex];
      const rawText = squash(cell?.textContent || "");
      const innerLines = (cell?.innerText || "")
        .split(/\n+/)
        .map(squash)
        .filter((line) => line && line !== "-");
      const chipTexts = Array.from(cell?.querySelectorAll("span") || [])
        .map((chip) => squash(chip.textContent || ""))
        .filter((text) => text && text !== "-");
      if (chipTexts.length <= 1 && innerLines.length <= 1) {
        return [];
      }

      return [
        {
          rowNumber: index + 1,
          text: rawText,
          chipTexts,
          lineCount: innerLines.length,
        },
      ];
    });

    return {
      classColumnIndex,
      rowCount: rows.length,
      violations,
    };
  });

  expect(audit.classColumnIndex).toBeGreaterThanOrEqual(0);
  test.skip(audit.rowCount === 0, "No fee collection rows available for line-split regression.");
  expect(audit.violations).toEqual([]);
});
