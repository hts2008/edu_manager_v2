import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  assertProgressMonthEditable,
  buildProgressRevisionSnapshot,
  normalizeReopenReason,
  runSerializableProgressTransaction,
  appendProgressActivity,
} from "../lib/student-progress-finalization.js";

const source = (path: string) => fs.readFileSync(path, "utf8");

test("progress audit uses the transaction and propagates audit failure", async () => {
  const req = { user: { id: "actor", tenantId: "tenant" }, headers: {} } as any;
  const calls: any[] = [];
  await appendProgressActivity({ activityLog: { create: async (value: any) => { calls.push(value); } } } as any,
    req, "REOPEN_STUDENT_PROGRESS", "month");
  assert.equal(calls[0].data.tenantId, "tenant");
  assert.equal(calls[0].data.entityId, "month");
  const failure = new Error("audit unavailable");
  await assert.rejects(appendProgressActivity({ activityLog: { create: async () => { throw failure; } } } as any,
    req, "REPLACE_STUDENT_PROGRESS_DAILY", "month"), error => error === failure);
  await assert.rejects(appendProgressActivity({} as any, { user: { id: "actor" }, headers: {} } as any,
    "DELETE_STUDENT_PROGRESS_DAILY", "month"), (error: any) => error.code === "TENANT_REQUIRED");
});

test("serialization retries re-read evidence and return typed conflict after three attempts", async () => {
  let attempts = 0;
  const db = { $transaction: async (operation: any, options: any) => {
    assert.equal(options.isolationLevel, "Serializable");
    if (++attempts < 3) throw { code: "P2034" };
    return operation({ evidence: "fresh" });
  } };
  assert.equal(await runSerializableProgressTransaction(db as any, async (tx: any) => tx.evidence,
    { isolationLevel: "Serializable" }), "fresh");
  assert.equal(attempts, 3);
  attempts = 0;
  await assert.rejects(runSerializableProgressTransaction({ $transaction: async () => {
    attempts++; throw { code: "P2034" };
  } } as any, async () => true, { isolationLevel: "Serializable" }),
  (error: any) => error.code === "PROGRESS_CONFLICT" && error.statusCode === 409);
  assert.equal(attempts, 3);
});

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
  assert.match(schema, /@@unique\(\[tenantId, progressMonthId, revisionNumber\]/);
  assert.match(monthlyApi, /eventType: "finalized"/);
  assert.match(monthlyApi, /eventType: "reopened"/);
  assert.match(monthlyApi, /isolationLevel: "Serializable"/);
  assert.match(dailyApi, /assertProgressMonthEditable\(existing\?\.finalizedAt\)/);
  assert.match(dailyApi, /assertProgressMonthEditable\(current\.finalizedAt\)/);
  assert.match(monthlyApi, /assertAdminAction\(req,\s*"reopen"\)/);
  assert.match(monthlyApi, /assertAdminAction\(req,\s*"finalize"\)/);
  assert.match(monthlyApi, /exam_set_level:\s*progressEntryExamSet\(entry\)/);
  assert.match(monthlyApi, /difficulty_level:\s*progressEntryDifficulty\(entry\)/);
  assert.match(monthlyApi, /entry_label:\s*entry\.entryLabel/);
  assert.match(monthlyApi, /graded_by_teacher_id:\s*entry\.gradedByTeacherId/);
});

test("AUD-RM-007 keeps the aggregate report read-only and preserves the reusable reopen control", () => {
  const service = source("frontend/src/services/api.js");
  const page = source("frontend/src/pages/StudentProgressReportPage.jsx");
  const detail = source("frontend/src/pages/StudentProgressDetailPage.jsx");
  const panel = source("frontend/src/components/student-progress/ProgressInputPanel.jsx");

  assert.match(service, /reopenMonth/);
  assert.doesNotMatch(page, /ProgressInputPanel/);
  assert.match(page, /Mở dashboard học viên/);
  assert.match(detail, /student_id: studentId/);
  assert.match(detail, /class_id: classId/);
  assert.match(panel, /data-testid="progress-finalized-lock"/);
  assert.match(panel, /data-testid="reopen-progress"/);
  assert.match(panel, /<fieldset disabled=\{finalized\}/);
});
