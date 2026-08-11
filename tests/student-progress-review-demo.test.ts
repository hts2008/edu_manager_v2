import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  assertStudentProgressDemoDatabase,
  studentProgressDemoEndpointId,
} from "../lib/student-progress-demo-safety.js";

const source = readFileSync("scripts/student-progress-review-demo.ts", "utf8");
const reviewData = JSON.parse(
  readFileSync("docs/artifacts/student-progress-2026-08-10/review-demo-data.json", "utf8"),
);

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
    expectedDatabase: "edu_manager_preview",
    actualEndpoint: "ep-review-branch-123",
    actualDatabase: "edu_manager_preview",
  }));
  assert.throws(
    () => assertStudentProgressDemoDatabase({
      target: "preview",
      expectedEndpoint: "ep-review-branch-123",
      expectedDatabase: "edu_manager_preview",
      actualEndpoint: "ep-other-branch-456",
      actualDatabase: "edu_manager_preview",
    }),
    /identity mismatch/,
  );
  assert.throws(
    () => assertStudentProgressDemoDatabase({
      target: "preview",
      expectedEndpoint: "ep-review-branch-123",
      expectedDatabase: "neondb",
      actualEndpoint: "ep-review-branch-123",
      actualDatabase: "neondb",
    }),
    /database whose name contains review, preview, demo, or test/,
  );
});

test("student progress review fixture accepts a named loopback review database only", () => {
  assert.doesNotThrow(() => assertStudentProgressDemoDatabase({
    target: "local",
    expectedEndpoint: "localhost",
    expectedDatabase: "edu_manager_review",
    actualEndpoint: "localhost",
    actualDatabase: "edu_manager_review",
  }));
  assert.throws(
    () => assertStudentProgressDemoDatabase({
      target: "local",
      expectedEndpoint: "db.internal",
      expectedDatabase: "edu_manager_review",
      actualEndpoint: "db.internal",
      actualDatabase: "edu_manager_review",
    }),
    /loopback PostgreSQL database/,
  );
  assert.throws(
    () => assertStudentProgressDemoDatabase({
      target: "local",
      expectedEndpoint: "localhost",
      expectedDatabase: "neondb",
      actualEndpoint: "localhost",
      actualDatabase: "neondb",
    }),
    /database whose name contains review, preview, demo, or test/,
  );
});

test("student progress review fixture preserves loopback hosts while normalizing Neon endpoints", () => {
  assert.equal(
    studentProgressDemoEndpointId("postgresql://review:secret@127.0.0.1:55439/edu_manager_review"),
    "127.0.0.1",
  );
  assert.equal(
    studentProgressDemoEndpointId("postgresql://review:secret@localhost:55439/edu_manager_review"),
    "localhost",
  );
  assert.equal(
    studentProgressDemoEndpointId("postgresql://review:secret@ep-review-branch-123-pooler.us-east-2.aws.neon.tech/edu_manager_preview"),
    "ep-review-branch-123",
  );
});

test("student progress review fixture covers all five Cambridge tracks and separate evidence semantics", () => {
  assert.match(source, /scenario: "Tiến bộ tốt"/);
  assert.match(source, /scenario: "Ổn định"/);
  assert.match(source, /scenario: "Cần hỗ trợ"/);
  for (const track of ["starters", "movers", "flyers", "ket", "pet"]) {
    assert.match(source, new RegExp(`trackKey: "${track}"`));
  }
  assert.match(source, /const examSetLevel = profile\.examSetHistory\[monthIndex\]/);
  assert.match(source, /entry_label: `\[DEMO\] \$\{examSetLabel\} - Bộ đề \$\{dayIndex \+ 1\}`/);
  assert.match(source, /examSetHistory: \["flyers", "flyers", "ket"\]/);
  assert.match(source, /const difficulty = \["easy", "medium", "medium", "hard"\]/);
  assert.match(source, /\? "present"/);
  assert.match(source, /"absent_no_fee"/);
  assert.match(source, /progressMonths: 15/);
  assert.match(source, /entries: 420/);
  assert.match(source, /attendance: 60/);
  assert.match(source, /Demo verification failed/);

  assert.equal(reviewData.students.length, 5);
  assert.deepEqual(
    reviewData.tracks.map((track: { exam_set_level: string }) => track.exam_set_level),
    ["starters", "movers", "flyers", "ket", "pet"],
  );
  for (const student of reviewData.students) {
    assert.equal(student.monthly_scores.length, 3);
    assert.equal(student.daily_template.length, 4);
    assert.ok(student.monthly_scores.every((row: { overall: number }) => row.overall > 0));
    assert.deepEqual(
      student.daily_template.map((row: { difficulty_level: string }) => row.difficulty_level),
      ["easy", "medium", "medium", "hard"],
    );
  }
});
