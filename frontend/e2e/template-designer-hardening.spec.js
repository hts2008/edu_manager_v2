import { expect, test } from "@playwright/test";

const templateId = "tpl-template-designer-hardening";
const token = "mock-admin-token";
const pngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

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

    if (state.uploadCalls === 1) {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            url: `data:image/png;base64,${pngBase64}`,
            path: "mock/template-logo.png",
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        error: {
          code: "UPLOAD_FAILED",
          message: "Mock background upload failed",
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
    const width = Math.min(canvas.width, 180);
    const height = Math.min(canvas.height, 180);
    const pixels = context.getImageData(0, 0, width, height).data;
    let nonWhitePixels = 0;

    for (let index = 0; index < pixels.length; index += 16) {
      const alpha = pixels[index + 3];
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      if (alpha > 0 && (red < 245 || green < 245 || blue < 245)) {
        nonWhitePixels += 1;
      }
    }

    return {
      width: canvas.width,
      height: canvas.height,
      nonWhitePixels,
    };
  });
}

test("template designer tools visibly add/select objects and save/reload", async ({ page }) => {
  const state = {
    savedJsonConfig: "",
    uploadCalls: 0,
  };

  await seedAuth(page);
  await mockDesignerApi(page, state);

  await page.goto(`/templates/${templateId}/design`);
  await expect(page.getByTestId("designer-status")).toContainText("Canvas san sang");
  await expect(page.getByTestId("template-canvas")).toBeVisible();

  const initialMetrics = await canvasMetrics(page);
  expect(initialMetrics.width).toBeGreaterThan(700);
  expect(initialMetrics.height).toBeGreaterThan(1000);
  expect(initialMetrics.nonWhitePixels).toBeGreaterThan(0);

  const initialCount = Number((await page.getByTestId("canvas-object-count").innerText()).match(/\d+/)?.[0] || 0);

  await page.getByTestId("tool-text").click();
  await expect(page.getByTestId("selection-summary")).toContainText("Text");
  await expect(page.getByTestId("tool-text")).toHaveAttribute("aria-pressed", "true");

  await page.getByTestId("field-receipt_id").click();
  await expect(page.getByTestId("selection-summary")).toContainText("Field: receipt_id");

  await page.getByTestId("tool-rect").click();
  await expect(page.getByTestId("selection-summary")).toContainText("Rectangle");
  await expect(page.getByTestId("tool-rect")).toHaveAttribute("aria-pressed", "true");

  const afterToolCount = Number((await page.getByTestId("canvas-object-count").innerText()).match(/\d+/)?.[0] || 0);
  expect(afterToolCount).toBeGreaterThan(initialCount);

  const imageChooserPromise = page.waitForEvent("filechooser");
  await page.getByTestId("upload-image").click();
  await setUploadFile(await imageChooserPromise);
  await expect(page.getByTestId("upload-status")).toContainText("Dang upload anh");
  await expect(page.getByTestId("upload-status")).toContainText("Da them anh");
  await expect(page.getByTestId("selection-summary")).toContainText("Image");

  const backgroundChooserPromise = page.waitForEvent("filechooser");
  await page.getByTestId("upload-background").click();
  await setUploadFile(await backgroundChooserPromise);
  await expect(page.getByTestId("upload-status")).toContainText("Dang upload anh nen");
  await expect(page.getByTestId("upload-status")).toContainText("Mock background upload failed");

  await page.getByTestId("save-template").click();
  await expect(page.getByTestId("designer-status")).toContainText("Da luu mau");
  expect(state.savedJsonConfig).toBeTruthy();

  const savedObjects = JSON.parse(state.savedJsonConfig).objects || [];
  const savedJsonText = JSON.stringify(savedObjects);
  expect(savedObjects.length).toBeGreaterThan(initialCount);
  expect(savedJsonText).toContain("receipt_id");
  expect(savedJsonText).toMatch(/data:image|template-logo|image/i);
  expect(
    savedObjects.some((object) => String(object.type).toLowerCase().includes("rect") || object.width === 220)
  ).toBeTruthy();

  await page.reload();
  await expect(page.getByTestId("designer-status")).toContainText("Canvas san sang");
  const reloadedCount = Number((await page.getByTestId("canvas-object-count").innerText()).match(/\d+/)?.[0] || 0);
  expect(reloadedCount).toBeGreaterThanOrEqual(savedObjects.length);
});
