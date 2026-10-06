import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { buildProgressSubmissionSummary, loadProgressSubmissionOperations } from "../lib/student-progress-report.js";

const row = { student_id: "student-1", class_id: "class-1", month: "2026-06" };
const payload = { ...row, submitted_at: "2026-07-02T09:00:00.123Z", request_hash: "a".repeat(64) };
function operation(id: number, change = {}, scope = {}) {
  return { tenantId: "tenant-1", userId: "actor-1", entityType: "progress_submission_operation",
    entityId: `10000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
    action: JSON.stringify({ ...payload, ...change }), ...scope };
}
const key = "student-1\u0000class-1\u00002026-06";

test("deduplicates actor operation identity but counts another actor using the same UUID", () => {
  const first = operation(1);
  const result = buildProgressSubmissionSummary("tenant-1", [row], [
    first, first, operation(1, {}, { userId: "actor-2" }),
    operation(2, {}, { userId: "" }),
  ]);
  assert.equal(result.get(key)?.assessment_submission_count, 2);
});

test("counts same-day accepted operations independently and multiple skills only once", () => {
  const result = buildProgressSubmissionSummary("tenant-1", [row], [
    operation(1, { skills: ["listening", "speaking", "reading"] }),
    operation(2, { submitted_at: "2026-07-02T10:00:00.456Z" }),
  ]);
  assert.deepEqual(result.get(key), { assessment_submission_count: 2,
    last_submission_at: "2026-07-02T10:00:00.456Z" });
});

test("rejects malformed, legacy and cross-scope logs without inferring submissions", () => {
  const invalid = [
    operation(1, {}, { tenantId: "tenant-2" }), operation(2, { student_id: "student-2" }),
    operation(3, { class_id: "class-2" }), operation(4, { month: "2026-05" }),
    operation(5, {}, { entityType: "progress_grid_operation" }),
    operation(6, {}, { entityId: "bad" }), operation(7, { request_hash: "" }),
    operation(8, { submitted_at: "2026-02-30T09:00:00Z" }),
    operation(9, { submitted_at: "2026-06-01" }),
    operation(10, {}, { action: "{" }), operation(11, {}, { action: "null" }),
    operation(12, {}, { action: "[]" }), operation(13, { month: "2026-13" }),
  ];
  assert.equal(buildProgressSubmissionSummary("tenant-1", [row], invalid).size, 0);
});

test("compares actual instants including offsets, preserving sub-day timestamp precision", () => {
  const result = buildProgressSubmissionSummary("tenant-1", [row], [
    operation(1, { submitted_at: "2026-07-02T10:00:00+07:00" }),
    operation(2, { submitted_at: "2026-07-02T04:00:00.987Z" }),
  ]);
  assert.equal(result.get(key)?.last_submission_at, "2026-07-02T04:00:00.987Z");
});

test("loads one tenant-scoped batch, bounds candidates by students/months and skips empty reports", async () => {
  const calls: unknown[] = [];
  const db = { activityLog: { findMany: async (query: unknown) => { calls.push(query); return []; } } };
  await loadProgressSubmissionOperations(db as never, "tenant-1", [row, { ...row, month: "2026-07" }]);
  assert.deepEqual(calls, [{
    where: { tenantId: "tenant-1", entityType: "progress_submission_operation",
      AND: [{ OR: [{ action: { contains: "student-1" } }] },
        { OR: [{ action: { contains: "2026-06" } }, { action: { contains: "2026-07" } }] }] },
    select: { tenantId: true, userId: true, entityType: true, entityId: true, action: true },
  }]);
  await loadProgressSubmissionOperations(db as never, "tenant-1", []);
  assert.equal(calls.length, 1);
});

test("endpoint passes batched submission metadata separately from daily evidence rollup", () => {
  const source = readFileSync(new URL("../server/api/reports/student-progress.ts", import.meta.url), "utf8");
  assert.match(source, /loadProgressSubmissionOperations\(req\.db, req\.user\.tenantId, filteredRows\)/);
  assert.match(source, /submissionOperations,/);
  assert.match(source, /daily_assessment_count: rollup\.assessmentCount/);
});
