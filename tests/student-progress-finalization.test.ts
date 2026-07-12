import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  assertProgressMonthEditable,
  buildProgressRevisionSnapshot,
  normalizeReopenReason,
} from "../lib/student-progress-finalization.js";

const source = (path: string) => fs.readFileSync(path, "utf8");

test("AUD-RM-007 blocks silent edits to a finalized progress month", () => {
  assert.doesNotThrow(() => assertProgressMonthEditable(null));
  assert.throws(
    () => assertProgressMonthEditable(new Date("2026-06-30T12:00:00.000Z")),
    (error: any) =>
      error.code === "PROGRESS_MONTH_FINALIZED" &&
      error.statusCode === 409 &&
      /reopen/i.test(error.message)
  );
});

test("AUD-RM-007 requires a meaningful admin reason to reopen", () => {
  assert.equal(normalizeReopenReason("  Correct teacher entry  "), "Correct teacher entry");
  assert.throws(() => normalizeReopenReason("   "), /reason/i);
  assert.throws(() => normalizeReopenReason("short"), /reason/i);
});

test("AUD-RM-007 revision snapshot preserves missing input and additive daily history", () => {
  const snapshot = buildProgressRevisionSnapshot({
    id: "pm_1",
    studentId: "student_1",
    classId: "class_1",
    month: "2026-06",
    finalizedAt: new Date("2026-06-30T12:00:00.000Z"),
    academicInputStatus: "missing_input",
    skills: [
      {
        skillKey: "listening",
        skillLabel: "Listening",
        score: null,
        status: "missing_input",
      },
    ],
    dailyEntries: [
      {
        id: "daily_1",
        entryDate: new Date("2026-06-10T00:00:00.000Z"),
        entryType: "daily_practice",
        skillKey: "listening",
        score: null,
        shieldCount: 0,
        note: "Observed, no score entered",
      },
      {
        id: "daily_2",
        entryDate: new Date("2026-06-17T00:00:00.000Z"),
        entryType: "skill_assessment",
        skillKey: "speaking",
        score: 82,
        shieldCount: 1,
        note: null,
      },
    ],
  });

  assert.equal(snapshot.academic_input_status, "missing_input");
  assert.equal(snapshot.skills[0].score, null);
  assert.equal(snapshot.skills[0].status, "missing_input");
  assert.equal(snapshot.daily_entries.length, 2);
  assert.equal(snapshot.daily_entries[0].entry_date, "2026-06-10");
  assert.equal(snapshot.daily_entries[1].score, 82);
});

test("AUD-RM-007 wires revision persistence and transactional mutation guards", () => {
  const schema = source("prisma/schema.prisma");
  const monthlyApi = source("server/api/student-progress/index.ts");
  const dailyApi = source("server/api/student-progress/daily.ts");

  assert.match(schema, /model StudentProgressRevision/);
  assert.match(schema, /snapshot\s+Json/);
  assert.match(schema, /@@unique\(\[progressMonthId, revisionNumber\]\)/);
  assert.match(monthlyApi, /eventType: "finalized"/);
  assert.match(monthlyApi, /eventType: "reopened"/);
  assert.match(monthlyApi, /isolationLevel: "Serializable"/);
  assert.match(dailyApi, /assertProgressMonthEditable\(existing\?\.finalizedAt\)/);
  assert.match(dailyApi, /assertProgressMonthEditable\(current\.finalizedAt\)/);
});

test("AUD-RM-007 exposes an explicit reopen control and snake_case request", () => {
  const service = source("frontend/src/services/api.js");
  const page = source("frontend/src/pages/StudentProgressReportPage.jsx");
  const panel = source("frontend/src/components/student-progress/ProgressInputPanel.jsx");

  assert.match(service, /reopenMonth/);
  assert.match(page, /student_id: selectedRow\.student_id/);
  assert.match(page, /class_id: selectedRow\.class_id/);
  assert.match(panel, /data-testid="progress-finalized-lock"/);
  assert.match(panel, /data-testid="reopen-progress"/);
  assert.match(panel, /<fieldset disabled=\{finalized\}/);
});
