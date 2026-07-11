import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  fetchTemplateImage,
  parseTemplateRenderContract,
  validateTemplateImage,
} from "../lib/template-render-contract.js";
import {
  onePixelPngBase64,
  onePixelPngDataUri,
  validV2Config,
} from "./fixtures/template-render-v2.js";

describe("template render contract v2", () => {
  it("accepts a full-page background and absolute binding overlays", () => {
    const contract = parseTemplateRenderContract(validV2Config());
    assert.equal(contract.version, 2);
    assert.equal(contract.background.src, onePixelPngDataUri);
    assert.deepEqual(contract.bindings[0], {
      field: "student.name",
      x: 20,
      y: 30,
      width: 80,
      height: 10,
      fontSize: 12,
      color: "#111827",
      align: "left",
    });
  });

  it("rejects malformed v2 contracts instead of omitting invalid content", () => {
    assert.throws(
      () => parseTemplateRenderContract({ version: 2, bindings: [] }),
      (error: any) => error?.code === "INVALID_TEMPLATE_RENDER_CONTRACT"
    );
    assert.throws(
      () =>
        parseTemplateRenderContract({
          version: 2,
          background: { src: onePixelPngDataUri },
          bindings: [{ field: "student.name", x: -1, y: 0 }],
        }),
      (error: any) => error?.code === "INVALID_TEMPLATE_RENDER_CONTRACT"
    );
  });

  it("validates declared type, size, and binary image signature", () => {
    const png = Buffer.from(onePixelPngBase64, "base64");
    assert.equal(validateTemplateImage(png, "image/png"), "image/png");
    assert.throws(
      () => validateTemplateImage(Buffer.from("not-an-image"), "image/png"),
      (error: any) => error?.code === "INVALID_IMAGE_SIGNATURE"
    );
    assert.throws(
      () => validateTemplateImage(png, "image/svg+xml"),
      (error: any) => error?.code === "INVALID_FILE_TYPE"
    );
  });

  it("fetches allowlisted HTTPS images with a bounded response", async () => {
    const png = Buffer.from(onePixelPngBase64, "base64");
    const fetchImpl = async () =>
      new Response(png, {
        status: 200,
        headers: { "content-type": "image/png", "content-length": String(png.length) },
      });

    const image = await fetchTemplateImage(
      "https://assets.public.blob.vercel-storage.com/template.png",
      { fetchImpl }
    );
    assert.match(image, /^data:image\/png;base64,/);

    await assert.rejects(
      fetchTemplateImage("https://example.com/template.png", { fetchImpl }),
      (error: any) => error?.code === "IMAGE_HOST_NOT_ALLOWED"
    );
  });
});
