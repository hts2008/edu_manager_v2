import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const page = readFileSync(
  new URL("../src/pages/FeeCollectionPage.jsx", import.meta.url),
  "utf8",
);

describe("fee collection filter layout", () => {
  it("reserves enough desktop width for independent month and class controls", () => {
    assert.match(page, /xl:grid-cols-\[minmax\(20rem,1\.4fr\)_repeat\(4,minmax\(0,1fr\)\)\]/);
    assert.match(page, /className="eduflow-card min-w-0 p-4"/);
    assert.match(page, /className="grid min-w-0 gap-4"/);
  });

  it("keeps both month navigation buttons and the month input in separate hit targets", () => {
    assert.match(page, /data-testid="fee-month-previous"/);
    assert.match(page, /data-testid="fee-month-input"/);
    assert.match(page, /data-testid="fee-month-next"/);
    assert.match(page, /grid-cols-\[2\.75rem_minmax\(0,1fr\)_2\.75rem\]/);
    assert.match(page, /h-11 w-11/);
  });

  it("keeps the class selector within its own responsive column", () => {
    assert.match(page, /data-testid="fee-class-filter"/);
    assert.match(page, /className="input min-w-0 w-full"/);
  });
});
