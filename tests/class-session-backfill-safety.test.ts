import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = readFileSync(new URL("../scripts/backfill-class-sessions.ts", import.meta.url), "utf8");

describe("Class-session backfill safety", () => {
  it("requires an explicit override for low-confidence production writes", () => {
    assert.match(source, /--allow-low-confidence/);
    assert.match(source, /Refusing to apply/);
  });
});
