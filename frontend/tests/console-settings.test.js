import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  formatSettingValue,
  normalizeSettingsPayload,
  parseSettingDraft,
} from "../src/console/consoleSettingsModel.js";

const pageSource = readFileSync(
  new URL("../src/console/ConsoleSettingsPage.jsx", import.meta.url),
  "utf8",
);
const editorSource = readFileSync(
  new URL("../src/console/SettingEditorCard.jsx", import.meta.url),
  "utf8",
);
const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

describe("Admin Console settings editor", () => {
  it("normalizes the API envelope without manufacturing settings", () => {
    assert.deepEqual(normalizeSettingsPayload({ settings: [{ key: "finance.limit" }] }), [
      { key: "finance.limit" },
    ]);
    assert.deepEqual(normalizeSettingsPayload({ items: [{ key: "academic.blend" }] }), [
      { key: "academic.blend" },
    ]);
    assert.deepEqual(normalizeSettingsPayload(null), []);
  });

  it("flattens registry definitions and derives default provenance from the API contract", () => {
    assert.deepEqual(
      normalizeSettingsPayload({
        settings: [{
          key: "finance.limit",
          value: 500,
          provenance: "registry_default",
          definition: { labelVi: "Giới hạn", readOnly: false },
        }],
      }),
      [{
        key: "finance.limit",
        value: 500,
        provenance: "registry_default",
        definition: { labelVi: "Giới hạn", readOnly: false },
        labelVi: "Giới hạn",
        readOnly: false,
        isDefault: true,
      }],
    );
  });

  it("round-trips scalar and structured setting drafts", () => {
    assert.equal(formatSettingValue(true), "true");
    assert.equal(parseSettingDraft("false", true), false);
    assert.equal(parseSettingDraft("42", 1), 42);
    assert.deepEqual(parseSettingDraft('{"enabled":true}', {}), { enabled: true });
    assert.deepEqual(parseSettingDraft('["present"]', []), ["present"]);
  });

  it("renders real async, empty, provenance, effective month and save states", () => {
    assert.match(pageSource, /<AsyncBoundary/);
    assert.match(pageSource, /Chưa có tham số cấu hình/);
    assert.match(editorSource, /effectiveFromMonth/);
    assert.match(editorSource, /Mặc định hệ thống/);
    assert.match(editorSource, /Đang lưu/);
    assert.match(pageSource, /adminSettingsService/);
  });

  it("routes configurable console modules to the settings page", () => {
    assert.match(appSource, /ConsoleSettingsPage/);
    assert.match(appSource, /path="finance" element={<RequirePermission permission="console\.finance\.edit"><ConsoleSettingsPage \/><\/RequirePermission>}/);
    assert.match(appSource, /path="academic" element={<RequirePermission permission="console\.academic\.edit"><ConsoleSettingsPage \/><\/RequirePermission>}/);
  });
});
