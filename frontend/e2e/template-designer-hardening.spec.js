import { expect, test } from "@playwright/test";

const templateId = "tpl-template-designer-hardening";
const token = "mock-admin-token";
const pngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR4nGP8z0ADYCJG0ahC6ikEALQ8AhV3i2m9AAAAAElFTkSuQmCC";
const backgroundSvgBase64 = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#22c55e"/><path d="M0 0L512 512M512 0L0 512" stroke="#14532d" stroke-width="32"/></svg>'
).toString("base64");

const baseTemplate = {
  id: templateId,
  template_name: "Mock Receipt Template",
  type: "receipt",
  paper_size: "a4",
  orientation: "portrait",
  is_default: 1,
  json_config: JSON.stringify({ version: "1.0", elements: [] }),
};

async function seedAuth(page) {
  await page.addInitScript((authToken) => {
    window.localStorage.setItem("token", authToken);
    window.localStorage.setItem("refreshToken", "");
  }, token);
}

async function mockDesignerApi(page, state) {
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          user: {
            id: "user-admin",
            username: "admin",
            role: "admin",
            full_name: "Admin",
          },
        },
      }),
    });
  });

  await page.route(`**/api/templates/${templateId}`, async (route) => {
    const method = route.request().method();

    if (method === "PUT") {
      const payload = route.request().postDataJSON();
      state.savedJsonConfig = payload.json_config;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            template: {
              ...baseTemplate,
              ...payload,
              json_config: state.savedJsonConfig,
            },
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          template: {
            ...baseTemplate,
            json_config: state.savedJsonConfig || baseTemplate.json_config,
          },
        },
      }),
    });
  });

  await page.route("**/api/templates/upload-image", async (route) => {
    state.uploadCalls += 1;
    await new Promise((resolve) => setTimeout(resolve, 250));

    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          url:
            state.uploadCalls === 1
              ? `data:image/png;base64,${pngBase64}`
              : `data:image/svg+xml;base64,${backgroundSvgBase64}`,
          path: `mock/template-${state.uploadCalls}.png`,
        },
      }),
    });
  });
}

async function setUploadFile(fileChooser) {
  await fileChooser.setFiles({
    name: "logo.png",
    mimeType: "image/png",
    buffer: Buffer.from(pngBase64, "base64"),
  });
}

async function canvasMetrics(page) {
  return page.getByTestId("template-canvas").evaluate((canvas) => {
    const context = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const stepX = Math.max(1, Math.floor(width / 40));
    const stepY = Math.max(1, Math.floor(height / 40));
    let nonWhitePixels = 0;
    let checksum = 0;

    for (let y = 0; y < height; y += stepY) {
      for (let x = 0; x < width; x += stepX) {
        const [red, green, blue, alpha] = context.getImageData(x, y, 1, 1).data;
        checksum = (checksum + red * 3 + green * 5 + blue * 7 + alpha * 11 + x + y) % 1000000007;
        if (alpha > 0 && (red < 245 || green < 245 || blue < 245)) {
          nonWhitePixels += 1;
        }
      }
    }

    return {
      width: canvas.width,
      height: canvas.height,
      nonWhitePixels,
      checksum,
    };
  });
}

async function visibleCanvasMetrics(page) {
  return page.evaluate(() => {
    const canvases = [...document.querySelectorAll("[data-fabric='wrapper'] canvas")];
    return canvases.map((canvas) => {
      const style = getComputedStyle(canvas);
      const context = canvas.getContext("2d");
      const width = canvas.width;
      const height = canvas.height;
      const stepX = Math.max(1, Math.floor(width / 24));
      const stepY = Math.max(1, Math.floor(height / 24));
      let nonTransparentPixels = 0;
      let nonWhitePixels = 0;

      for (let y = 0; y < height; y += stepY) {
        for (let x = 0; x < width; x += stepX) {
          const [red, green, blue, alpha] = context.getImageData(x, y, 1, 1).data;
          if (alpha > 0) nonTransparentPixels += 1;
          if (alpha > 0 && (red < 245 || green < 245 || blue < 245)) {
            nonWhitePixels += 1;
          }
        }
      }

      return {
        className: canvas.className,
        backgroundColor: style.backgroundColor,
        width,
        height,
        nonTransparentPixels,
        nonWhitePixels,
      };
    });
  });
}

function expectCanvasChanged(after, before) {
  expect(after.nonWhitePixels).toBeGreaterThan(0);
  expect(after.checksum).not.toBe(before.checksum);
}

function attachRuntimeGuards(page, ignoredConsolePatterns = []) {
  const errors = [];

  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (ignoredConsolePatterns.some((pattern) => pattern.test(text))) return;
    errors.push(`console: ${text}`);
  });
  page.on("response", (response) => {
    const url = response.url();
    if (!url.includes("/api/")) return;
    if (response.status() >= 500) {
      errors.push(`api ${response.status()}: ${url}`);
    }
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    if (!url.includes("/api/")) return;
    errors.push(`request failed: ${url} ${request.failure()?.errorText || ""}`.trim());
  });

  return () => {
    expect(errors).toEqual([]);
  };
}

async function assertUpperCanvasTransparent(page) {
  const metrics = await visibleCanvasMetrics(page);
  const upper = metrics.find((canvas) => String(canvas.className).includes("upper-canvas"));
  expect(upper).toBeTruthy();
  expect(upper.backgroundColor === "rgba(0, 0, 0, 0)" || upper.backgroundColor === "transparent").toBeTruthy();
}

test("template designer tools visibly add/select objects and save/reload", async ({ page }) => {
  const assertNoRuntimeErrors = attachRuntimeGuards(page);
  const state = {
    savedJsonConfig: "",
    uploadCalls: 0,
  };

  await seedAuth(page);
  await mockDesignerApi(page, state);

  await page.goto(`/templates/${templateId}/design`);
  await expect(page.getByTestId("designer-status")).toContainText("Canvas san sang");
  await expect(page.getByTestId("template-canvas")).toBeVisible();
  await assertUpperCanvasTransparent(page);

  const initialMetrics = await canvasMetrics(page);
  expect(initialMetrics.width).toBeGreaterThan(700);
  expect(initialMetrics.height).toBeGreaterThan(1000);
  expect(initialMetrics.nonWhitePixels).toBeGreaterThan(0);

  const initialCount = Number((await page.getByTestId("canvas-object-count").innerText()).match(/\d+/)?.[0] || 0);

  await page.getByTestId("tool-text").click();
  await expect(page.getByTestId("selection-summary")).toContainText("Text");
  await expect(page.getByTestId("tool-text")).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(100);
  const afterTextMetrics = await canvasMetrics(page);
  expectCanvasChanged(afterTextMetrics, initialMetrics);

  await page.getByTestId("field-receipt_id").click();
  await expect(page.getByTestId("selection-summary")).toContainText("Field: receipt_id");
  await page.waitForTimeout(100);
  const afterFieldMetrics = await canvasMetrics(page);
  expectCanvasChanged(afterFieldMetrics, afterTextMetrics);

  await page.getByTestId("tool-rect").click();
  await expect(page.getByTestId("selection-summary")).toContainText("Rectangle");
  await expect(page.getByTestId("tool-rect")).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(100);
  const afterRectMetrics = await canvasMetrics(page);
  expectCanvasChanged(afterRectMetrics, afterFieldMetrics);

  const afterToolCount = Number((await page.getByTestId("canvas-object-count").innerText()).match(/\d+/)?.[0] || 0);
  expect(afterToolCount).toBeGreaterThan(initialCount);

  const imageChooserPromise = page.waitForEvent("filechooser");
  await page.getByTestId("upload-image").click();
  await setUploadFile(await imageChooserPromise);
  await expect(page.getByTestId("upload-status")).toContainText("Dang upload anh");
  await expect(page.getByTestId("upload-status")).toContainText("Da them anh");
  await expect(page.getByTestId("selection-summary")).toContainText("Image");
  await page.waitForTimeout(100);
  const afterImageMetrics = await canvasMetrics(page);
  expectCanvasChanged(afterImageMetrics, afterRectMetrics);

  const backgroundChooserPromise = page.waitForEvent("filechooser");
  await page.getByTestId("upload-background").click();
  await setUploadFile(await backgroundChooserPromise);
  await expect(page.getByTestId("upload-status")).toContainText("Dang upload anh nen");
  await expect(page.getByTestId("upload-status")).toContainText("Da them anh nen");
  await expect(page.getByTestId("selection-summary")).toContainText("Background image");
  await page.waitForTimeout(100);
  const afterBackgroundMetrics = await canvasMetrics(page);
  expectCanvasChanged(afterBackgroundMetrics, afterImageMetrics);

  await page.getByTestId("save-template").click();
  await expect(page.getByTestId("designer-status")).toContainText("Da luu mau");
  expect(state.savedJsonConfig).toBeTruthy();

  const savedObjects = JSON.parse(state.savedJsonConfig).objects || [];
  const savedJsonText = JSON.stringify(savedObjects);
  expect(savedObjects.length).toBeGreaterThan(initialCount);
  expect(savedJsonText).toContain("receipt_id");
  expect(savedJsonText).toMatch(/data:image|template-logo|image/i);
  expect(
    savedObjects.some((object) => {
      const source = String(object.imageUrl || object.src || "");
      return source.includes("data:image/svg+xml") && Number(object.opacity || 0) >= 0.7;
    })
  ).toBeTruthy();
  expect(
    savedObjects.some((object) => String(object.type).toLowerCase().includes("rect") || object.width === 220)
  ).toBeTruthy();

  await page.reload();
  await expect(page.getByTestId("designer-status")).toContainText("Canvas san sang");
  await assertUpperCanvasTransparent(page);
  const reloadedCount = Number((await page.getByTestId("canvas-object-count").innerText()).match(/\d+/)?.[0] || 0);
  expect(reloadedCount).toBeGreaterThanOrEqual(savedObjects.length);
  const reloadedMetrics = await canvasMetrics(page);
  expect(reloadedMetrics.checksum).not.toBe(initialMetrics.checksum);
  assertNoRuntimeErrors();
});
