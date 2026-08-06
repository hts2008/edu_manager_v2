import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = readFileSync(new URL("../src/utils/pdfPrint.js", import.meta.url), "utf8");

describe("authenticated PDF preview lifecycle", () => {
  it("keeps object URLs alive until the preview window closes", () => {
    assert.match(source, /revokeObjectUrlsWhenPopupCloses/);
    assert.match(source, /popup\.addEventListener\('beforeunload'/);
    assert.match(source, /popup\.addEventListener\('pagehide'/);
    assert.doesNotMatch(source, /60_000|120_000/);
  });

  it("still revokes object URLs immediately when a multi-PDF request fails", () => {
    assert.match(source, /catch \(error\) \{\s*objectUrls\.forEach\(\(url\) => URL\.revokeObjectURL\(url\)\)/s);
  });
});
