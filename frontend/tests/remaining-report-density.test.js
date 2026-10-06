import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const pages = Object.fromEntries([
  "AttendanceInsightsPage", "AttendancePeriodsPage", "AdvancedReportsPage", "AuditLogsPage",
].map((name) => [name, readFileSync(new URL(`../src/pages/${name}.jsx`, import.meta.url), "utf8")]));

test("remaining reports retain local headings and cards with modest spacing", () => {
  for (const [name, source] of Object.entries(pages)) {
    assert.ok(source.includes("<h1"), name);
    assert.ok(source.includes('className="space-y-4"'), name);
    assert.ok(!/<OperationalPage|<PageIntro|<MetricGrid/.test(source), name);
  }
  assert.ok(pages.AttendancePeriodsPage.includes("Quy trình:"));
});

test("report API requests, filters, reload and export retain their contracts", () => {
  assert.match(pages.AttendanceInsightsPage, /attendanceService\.getInsights\(filters\)/);
  assert.match(pages.AttendanceInsightsPage, /day\.attendance_rate >= 90/);
  assert.match(pages.AdvancedReportsPage, /reportsService\.getAdvanced\(filters\)/);
  assert.match(pages.AdvancedReportsPage, /exportAdvancedReport\(data, filters\)/);
  assert.match(pages.AdvancedReportsPage, /disabled=\{!data\}/);
  assert.match(pages.AuditLogsPage, /activityLogsService\.getAll\(/);
  assert.match(pages.AuditLogsPage, /limit: 100/);
  assert.match(pages.AuditLogsPage, /pageSize=\{20\}/);
  for (const name of ["AttendanceInsightsPage", "AdvancedReportsPage", "AuditLogsPage"]) {
    assert.match(pages[name], /JSON\.stringify\(filters\)/);
    assert.match(pages[name], /onClick=\{reload\}/);
    assert.match(pages[name], /error\.message/);
  }
});

test("period processing remains guarded and recoverable", () => {
  const source = pages.AttendancePeriodsPage;
  assert.match(source, /loadRequestRef\.current !== requestId/);
  assert.match(source, /row\.status === "submitted" && isAdmin\(\)/);
  assert.match(source, /row\.status === "approved" && isAdmin\(\)/);
  assert.match(source, /disabled=\{workflow\.isBusy\}/);
  assert.match(source, /onConfirmLock=\{workflow\.confirmLock\}/);
  assert.match(source, /onConfirm=\{handleUnlockConfirm\}/);
  assert.match(source, /if \(!workflow\.isBusy\) setCorrectionTarget\(null\)/);
  assert.match(source, /onRetry=\{loadData\}/);
  assert.match(source, /periodListError &&/);
  for (const key of ["total", "open", "submitted", "approved", "locked"]) {
    assert.ok(source.includes(`{stats.${key}}`), key);
  }
});
