import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const cardSource = readFileSync(new URL("../src/console/SettingEditorCard.jsx", import.meta.url), "utf8");
const apiSource = readFileSync(new URL("../src/services/api.js", import.meta.url), "utf8");

describe("Admin Console setting simulation", () => {
  it("exposes the dry-run API through the shared client", () => {
    assert.match(apiSource, /simulate: \(data\)/);
    assert.match(apiSource, /\/admin\/settings\/simulate/);
  });

  it("requires a fresh old/new/delta preview before saving engine settings", () => {
    assert.match(cardSource, /Mô phỏng tác động/);
    assert.match(cardSource, /simulation\.rows/);
    assert.match(cardSource, /old/);
    assert.match(cardSource, /new/);
    assert.match(cardSource, /delta/);
    assert.match(cardSource, /simulationStale/);
    assert.match(cardSource, /adminSettingsService/);
    assert.match(cardSource, /settingsService\.simulate/);
  });
});
