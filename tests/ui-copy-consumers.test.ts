import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { UI_COPY_REGISTRY } from "../lib/ui-experience.js";

test("every editable published copy key has an operational consumer", () => {
  const paths = ["components/layout/Sidebar.jsx", "pages/StudentProgressReportPage.jsx",
    "components/student-progress/ProgressRosterWorkspace.jsx"];
  const source = paths.map(path => readFileSync(new URL(`../frontend/src/${path}`, import.meta.url), "utf8")).join("\n");
  for (const item of UI_COPY_REGISTRY.filter(item => !item.protected)) {
    assert.ok(source.includes(`text('${item.key}'`) || source.includes(`text("${item.key}"`), `Unused editable key: ${item.key}`);
  }
});
