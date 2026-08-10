import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assertStudentProgressDemoDatabase } from "../lib/student-progress-demo-safety.js";

const source = readFileSync("scripts/student-progress-review-demo.ts", "utf8");

test("student progress review fixture is namespaced, reversible, and preview-first", () => {
  assert.match(source, /demo-sp-review-v1/);
  assert.match(source, /STUDENT_PROGRESS_DEMO_TARGET/);
  assert.match(source, /STUDENT_PROGRESS_DEMO_ENDPOINT_ID/);
  assert.match(source, /STUDENT_PROGRESS_DEMO_DATABASE_NAME/);
  assert.match(source, /assertStudentProgressDemoDatabase/);
  assert.match(source, /async function cleanup/);
  assert.match(source, /new Set\(\["apply", "verify", "cleanup"\]\)/);
  assert.match(source, /TransactionIsolationLevel\.Serializable/);
});

test("student progress review fixture rejects the production endpoint independently", () => {
  assert.throws(
    () => assertStudentProgressDemoDatabase({
      target: "preview",
      expectedEndpoint: "ep-silent-queen-aoujb3oc",
      expectedDatabase: "neondb",
      actualEndpoint: "ep-silent-queen-aoujb3oc",
      actualDatabase: "neondb",
    }),
    /production Neon endpoint/,
  );
});

test("student progress review fixture accepts only an exact non-production preview identity", () => {
  assert.doesNotThrow(() => assertStudentProgressDemoDatabase({
    target: "preview",
    expectedEndpoint: "ep-review-branch-123",
    expectedDatabase: "neondb",
    actualEndpoint: "ep-review-branch-123",
    actualDatabase: "neondb",
  }));
  assert.throws(
    () => assertStudentProgressDemoDatabase({
      target: "preview",
      expectedEndpoint: "ep-review-branch-123",
      expectedDatabase: "neondb",
      actualEndpoint: "ep-other-branch-456",
      actualDatabase: "neondb",
    }),
    /identity mismatch/,
  );
});

test("student progress review fixture creates three review scenarios and separate evidence semantics", () => {
  assert.match(source, /Tiến bộ tốt|targets: \[61, 73, 84\]/);
  assert.match(source, /Ổn định|targets: \[75, 77, 78\]/);
  assert.match(source, /Cần hỗ trợ|targets: \[71, 63, 56\]/);
  assert.match(source, /exam_set_level: "flyers"/);
  assert.match(source, /const difficulty = \["easy", "medium", "medium", "hard"\]/);
  assert.match(source, /status: "present"/);
  assert.match(source, /progressMonths: 9/);
  assert.match(source, /attendance: 36/);
  assert.match(source, /Demo verification failed/);
});
