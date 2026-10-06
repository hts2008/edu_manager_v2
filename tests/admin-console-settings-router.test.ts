import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const routerSource = readFileSync(new URL("../api/router.ts", import.meta.url), "utf8");

describe("Admin Console settings router contract", () => {
  it("registers list, item, history and rollback handlers", () => {
    assert.match(routerSource, /adminSettingsIndex/);
    assert.match(routerSource, /adminSettingByKey/);
    assert.match(routerSource, /adminSettingRevisions/);
    assert.match(routerSource, /adminSettingRollback/);
  });

  it("maps the dynamic setting key without confusing it with the action segment", () => {
    assert.match(routerSource, /params:\s*\{\s*key:\s*action\s*\}/);
    assert.match(routerSource, /parts\[3\]\s*===\s*"revisions"/);
    assert.match(routerSource, /parts\[3\]\s*===\s*"rollback"/);
  });
});
