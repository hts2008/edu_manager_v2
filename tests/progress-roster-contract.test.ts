import assert from "node:assert/strict";
import { test } from "node:test";
import { rosterPatchSchema, progressRosterVersion, planRosterChanges } from "../lib/progress-roster-contract.js";

const payload = { student_id: "student", class_id: "class", entry_date: "2026-11-01",
  expected_evidence_version: "a".repeat(64), operation_id: "835575cb-88f7-449a-a5ae-5b9186cf4d73", changes: { listening: 0 } };

test("roster payload accepts zero, null, seven skills and plain-text notes", () => {
  assert.equal(rosterPatchSchema.parse(payload).changes.listening, 0);
  assert.ok(rosterPatchSchema.safeParse({ ...payload, changes: { listening: null } }).success);
  assert.ok(rosterPatchSchema.safeParse({ ...payload, changes: {}, note: "<b>plain text</b>" }).success);
  assert.ok(rosterPatchSchema.safeParse({ ...payload, changes: { listening: 1, speaking: 2, reading: 3,
    writing: 4, homework: 5, daily_practice: 6, mock_test: 7 } }).success);
  assert.ok(rosterPatchSchema.safeParse({ ...payload, entry_date: "2028-02-29" }).success);
});

test("roster payload rejects unknown fields, invalid civil dates and unsafe scores", () => {
  for (const patch of [{ changes: {} }, { changes: { grammar: 50 } }, { extra: true },
    { changes: { listening: 101 } }, { changes: { listening: -1 } }, { changes: { listening: "80" } },
    { changes: { listening: NaN } }, { entry_date: "2026-02-29" }, { entry_date: "2026-04-31" },
    { entry_date: "2026-01-01T00:00:00Z" }, { entry_date: "0000-01-01" },
    { operation_id: "not-uuid" }, { expected_evidence_version: "z".repeat(64) },
    { student_id: " " }, { class_id: "" }, { note: "a".repeat(2001) }]) {
    assert.equal(rosterPatchSchema.safeParse({ ...payload, ...patch }).success, false, JSON.stringify(patch));
  }
});

test("optional assessment context is strict and never injects defaults into omitted context", () => {
  assert.equal(rosterPatchSchema.parse(payload).assessment_context, undefined);
  for (const exam_set_level of ["starters", "movers", "flyers", "ket", "pet", null]) {
    for (const difficulty_level of ["easy", "medium", "hard"]) {
      const assessment_context = { exam_set_level, difficulty_level };
      assert.deepEqual(rosterPatchSchema.parse({ ...payload, assessment_context }).assessment_context, assessment_context);
    }
  }
  for (const assessment_context of [{ exam_set_level: "unknown", difficulty_level: "hard" },
    { exam_set_level: "flyers", difficulty_level: "expert" }, { exam_set_level: null },
    { difficulty_level: "medium" }, { exam_set_level: null, difficulty_level: "medium", extra: true }]) {
    assert.equal(rosterPatchSchema.safeParse({ ...payload, assessment_context }).success, false);
  }
});

const record = { id: "m", teacherNote: "note", trackKey: "movers", finalizedAt: null,
  updatedAt: new Date("2026-11-01T00:00:00Z"), rubricSnapshot: { source: "daily_raw" } };
const entries = [{ id: "b", entryType: "note", note: "keep", entryDate: "2026-11-02" },
  { id: "a", entryType: "skill_assessment", skillKey: "listening", score: 80, maxScore: 100, source: "teacher_input" }];
const skills = [{ id: "s", skillKey: "speaking", score: 60, maxScore: 100, source: "teacher_input" }];

test("fingerprint is SHA256, deterministic across row/key/settings permutations", () => {
  const settings = { settings: [{ key: "academic.score_blend", value: { skill: .8, attendance: .1, consistency: .1 } },
    { key: "academic.difficulty_weights", value: { delta: .1, min: .5, max: 1.5 } }] };
  const version = progressRosterVersion(record, settings, entries, skills, { graders: ["b", "a"] });
  assert.match(version, /^[a-f0-9]{64}$/);
  assert.equal(version, progressRosterVersion({ ...record, rubricSnapshot: { source: "daily_raw" } },
    { settings: [...settings.settings].reverse() }, [...entries].reverse(), [...skills].reverse(), { graders: ["a", "b"] }));
  assert.equal(progressRosterVersion(null, null, [], []), progressRosterVersion(null, null, [], []));
});

test("fingerprint changes for every score-affecting snapshot, evidence, setting and basis change", () => {
  const baseline = progressRosterVersion(record, null, entries, skills, { active: true });
  for (const patch of [{ teacherNote: "new" }, { trackKey: "flyers" }, { finalizedAt: new Date() },
    { updatedAt: new Date("2026-11-02") }, { rubricSnapshot: { source: "manual" } }, { progressScore: 100 }]) {
    assert.notEqual(progressRosterVersion({ ...record, ...patch }, null, entries, skills, { active: true }), baseline);
  }
  assert.notEqual(progressRosterVersion(record, null, [{ ...entries[1], score: 90 }, entries[0]], skills, { active: true }), baseline);
  assert.notEqual(progressRosterVersion(record, null, entries, [{ ...skills[0], maxScore: 80 }], { active: true }), baseline);
  assert.notEqual(progressRosterVersion(record, null, entries, [{ ...skills[0], source: "manual" }], { active: true }), baseline);
  assert.notEqual(progressRosterVersion(record, { "academic.score_blend": { skill: .5, attendance: .3, consistency: .2 } }, entries, skills, { active: true }), baseline);
  assert.notEqual(progressRosterVersion(record, null, entries, skills, { active: false }), baseline);
});

test("fingerprint ignores settings configVersion/presentation metadata and normalizes defaults", () => {
  const values = [{ key: "academic.score_blend", value: { skill: .8, attendance: .1, consistency: .1 } }];
  const first = progressRosterVersion(record, { configVersion: 1, label: "old", settings: values }, entries, skills);
  const second = progressRosterVersion(record, { configVersion: 99, label: "new",
    settings: values.map(row => ({ ...row, revision: 99, updatedAt: new Date(), label: "display" })) }, entries, skills);
  assert.equal(first, second);
  assert.equal(progressRosterVersion(record, null, entries, skills), progressRosterVersion(record, {}, entries, skills));
  assert.equal(first, progressRosterVersion(record, { "academic.score_blend": values[0].value }, entries, skills));
});

test("planner updates zero, clears exact assessment and preserves other evidence without mutation", () => {
  const day = [{ id: "a", entryType: "skill_assessment", skillKey: "listening", score: 80 },
    { id: "h", entryType: "homework", skillKey: "listening", score: 70 },
    { id: "s", entryType: "shield", shieldCount: 2 }, { id: "n", entryType: "note", note: "keep" }];
  const before = structuredClone(day);
  assert.deepEqual(planRosterChanges(day, { listening: 0, speaking: 50 }), {
    deleteIds: [], updates: [{ id: "a", score: 0 }], creates: [{ skill_key: "speaking", score: 50 }] });
  assert.deepEqual(planRosterChanges(day, { listening: null, speaking: null }), { deleteIds: ["a"], updates: [], creates: [] });
  assert.deepEqual(day, before);
});

test("planner handles note create/update/delete only when requested", () => {
  assert.deepEqual(planRosterChanges([], {}, "new").noteOperation, { type: "create", note: "new" });
  const day = [{ id: "n", entry_type: "note", note: "old" }];
  assert.deepEqual(planRosterChanges(day, {}, "<b>text</b>").noteOperation, { type: "update", id: "n", note: "<b>text</b>" });
  assert.deepEqual(planRosterChanges(day, {}, "").noteOperation, { type: "delete", id: "n" });
  assert.equal(planRosterChanges(day, {}).noteOperation, undefined);
});

test("planner rejects ambiguous assessments/notes instead of editing an average", () => {
  const duplicate = [{ id: "a", entry_type: "skill_assessment", skill_key: "listening", score: 70 },
    { id: "b", entry_type: "skill_assessment", skill_key: "listening", score: 90 }];
  assert.throws(() => planRosterChanges(duplicate, { listening: 80 }), { code: "MULTIPLE_ASSESSMENTS", status: 409 });
  assert.throws(() => planRosterChanges(duplicate, { listening: null }), { code: "MULTIPLE_ASSESSMENTS", status: 409 });
  assert.doesNotThrow(() => planRosterChanges(duplicate, { speaking: 80 }));
  assert.throws(() => planRosterChanges([{ id: "n1", entryType: "note" }, { id: "n2", entryType: "note" }], {}, "new"),
    { code: "MULTIPLE_NOTES", status: 409 });
});
