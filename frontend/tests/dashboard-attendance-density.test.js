import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const readPage = (name) => readFileSync(new URL(`../src/pages/${name}.jsx`, import.meta.url), "utf8");
const dashboard = readPage("DashboardPage");
const attendance = readPage("AttendancePage");

test("dashboard and attendance retain their former visual identity with modest spacing", () => {
  for (const page of [dashboard, attendance]) {
    assert.match(page, /<h1/);
    assert.doesNotMatch(page, /<OperationalPage|<PageIntro/);
  }
  assert.match(attendance, /from-violet-950 via-indigo-950 to-sky-900/);
  assert.match(attendance, /SAP Timesheet Style/);
  assert.match(dashboard, /bg-gradient-to-br/);
});

test("dashboard reserves less room for empty charts and keeps worklist action focused", () => {
  assert.match(dashboard, /height=\{hasFinancialData \? 240 : 128\}/);
  assert.doesNotMatch(dashboard, /item\.amount|item\.count|Từ dashboard API hiện tại/);
  assert.match(dashboard, /to=\{item\.to\}/);
});

test("API modes, financial semantics and recovery actions remain wired", () => {
  assert.match(dashboard, /getDashboard\(\{ mode: "summary" \}\)/);
  assert.match(dashboard, /getDashboard\(\{ mode: "full" \}\)/);
  assert.match(dashboard, /payment_coverage \?\? 100/);
  assert.match(dashboard, /action=\{loadDashboard\}/);
  assert.match(dashboard, /detailError &&/);
  assert.match(dashboard, /to="\/attendance"/);
  assert.match(dashboard, /to="\/fee-collection"/);
  assert.match(attendance, /data-testid="attendance-class-field"/);
  assert.match(attendance, /onRetry=\{loadClasses\}/);
  assert.match(attendance, /role="alert"/);
  assert.match(attendance, /aria-busy="true"/);
});
