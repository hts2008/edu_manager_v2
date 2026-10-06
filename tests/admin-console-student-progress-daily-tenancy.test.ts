import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = readFileSync(
  new URL("../server/api/student-progress/daily.ts", import.meta.url),
  "utf8",
);

describe("Student progress daily tenant isolation", () => {
  it("uses the tenant-aware progress-month selector for every business lookup", () => {
    assert.doesNotMatch(source, /\n\s*studentId_classId_month\s*:/);
    assert.ok(
      (source.match(/tenantId_studentId_classId_month\s*:/g) || []).length >= 3,
      "GET, PUT and DELETE must use the tenant-aware month selector",
    );
  });

  it("scopes enrollment and attendance context to the authenticated tenant", () => {
    assert.match(source, /function requireTenantId\([\s\S]*?TENANT_CONTEXT_REQUIRED/);
    assert.match(source, /studentClass\.findFirst\([\s\S]*?tenantId,/);
    assert.match(source, /attendance\.findFirst\([\s\S]*?tenantId,/);
  });

  it("scopes daily-entry reads and deletes and stamps tenant ownership on writes", () => {
    assert.ok(
      (source.match(/studentProgressDailyEntry\.findMany\(\{[\s\S]*?where:\s*\{[\s\S]*?\btenantId(?:\s*:|,)/g) || []).length >= 3,
      "all daily-entry reads must carry a tenant predicate",
    );
    assert.ok(
      (source.match(/studentProgressDailyEntry\.deleteMany\(\{[\s\S]*?where:\s*\{[\s\S]*?\btenantId(?:\s*:|,)/g) || []).length >= 2,
      "replace and delete paths must carry a tenant predicate",
    );
    assert.match(
      source,
      /studentProgressDailyEntry\.createMany\([\s\S]*?tenantId,/,
    );
    assert.match(
      source,
      /studentProgressMonth\.create\([\s\S]*?tenantId,/,
    );
  });
});
