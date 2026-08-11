import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const layout = readFileSync(
  new URL("../src/components/layout/MainLayout.jsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

describe("authenticated fluid main layout", () => {
  it("does not cap or center the shared authenticated content shell", () => {
    assert.doesNotMatch(layout, /max-w-\[1600px\]/);
    assert.doesNotMatch(layout, /\bmx-auto\b/);
  });

  it("allows the main content track to consume and shrink within available width", () => {
    assert.match(layout, /<main className="[^"]*\bw-full\b[^"]*\bmin-w-0\b/);
  });

  it("uses viewport-adaptive gutters without affecting local page constraints", () => {
    assert.match(
      styles,
      /\.eduflow-main\s*\{[^}]*padding-inline:\s*clamp\(16px,\s*2vw,\s*48px\);/s,
    );
  });
});
