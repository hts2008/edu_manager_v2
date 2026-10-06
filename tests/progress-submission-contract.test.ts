import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { submissionSchema, submissionClock, assertSubmissionMonth, submissionRequestHash,
  countSubmissionOperations, appendProgressSubmission, createSubmissionMonth } from "../lib/progress-submission-contract.js";
import { runSerializableProgressTransaction } from "../lib/student-progress-finalization.js";

const body = { student_id: "s", class_id: "c", month: "2026-10",
  expected_evidence_version: "a".repeat(64), operation_id: "835575cb-88f7-449a-a5ae-5b9186cf4d73",
  scores: { homework: 0, reading: 80 } };
const now = new Date("2026-10-06T00:00:00Z");

test("contract clock import cannot initialize Prisma before isolated target binding", () => {
  const contractUrl = new URL("../lib/progress-submission-contract.ts", import.meta.url).href;
  execFileSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e",
    `await import(${JSON.stringify(contractUrl)}); if (globalThis.prisma !== undefined) throw new Error("Premature Prisma");`],
    { stdio: "pipe" });
});

test("strict submission accepts zero and rejects dates, null, empty and invalid scores", () => {
  assert.equal(submissionSchema.parse(body).scores.homework, 0);
  for (const patch of [{ entry_date: "2026-10-01" }, { scores: {} }, { scores: { homework: null } },
    { scores: { homework: -1 } }, { scores: { homework: 101 } }, { scores: { grammar: 80 } },
    { scores: { homework: "5" } }, { operation_id: "x" }, { month: "2026-13" }]) {
    assert.equal(submissionSchema.safeParse({ ...body, ...patch }).success, false);
  }
});

test("business date rolls over at Vietnam midnight and rejects a stale report month", () => {
  assert.equal(submissionClock(new Date("2026-10-31T16:59:59Z")).current_date, "2026-10-31");
  const clock = submissionClock(new Date("2026-10-31T17:00:00Z"));
  assert.equal(clock.current_date, "2026-11-01");
  assert.throws(() => assertSubmissionMonth("2026-10", clock), /current server month/);
  assertSubmissionMonth(undefined, clock);
});

function fixture() {
  const logs: any[] = [], entries: any[] = [];
  let version = "a".repeat(64), finalized = false, rollups = 0;
  const record = { id: "m", finalizedAt: null };
  const tx: any = {
    activityLog: {
      findFirst: async ({ where }: any) => logs.find(log => Object.entries(where).every(([key, value]) => log[key] === value)),
      findMany: async ({ where }: any) => logs.filter(log => log.tenantId === where.tenantId && log.entityType === where.entityType),
      create: async ({ data }: any) => { logs.push(data); return data; },
    },
    studentProgressDailyEntry: { create: async ({ data }: any) => { entries.push(data); return data; } },
  };
  const context = async () => ({ record: { ...record, finalizedAt: finalized ? now : null },
    assignment: { teacherId: "teacher", teacher: { status: "active" } },
    row: { evidence_version: version, track_key: "movers", class_type: "standard" } });
  return { tx, logs, entries, context,
    rollup: async () => { rollups++; version = "b".repeat(64); },
    get rollups() { return rollups; }, finalize: () => { finalized = true; } };
}

async function submit(f: ReturnType<typeof fixture>, payload = body, actor = "actor", time = now) {
  return appendProgressSubmission({ tx: f.tx, tenantId: "tenant", actorId: actor,
    body: submissionSchema.parse(payload), now: time, loadContext: f.context, recompute: f.rollup, ipAddress: "test" });
}

test("same-day submissions append, count operations rather than skills, and retry exactly once", async () => {
  const f = fixture();
  const first = await submit(f);
  assert.equal(first.submission_count, 1);
  assert.equal(f.entries.length, 2);
  assert.equal(f.entries[0].score, 0);
  assert.equal(f.entries[0].entryDate.toISOString(), "2026-10-06T00:00:00.000Z");
  assert.deepEqual(await submit(f), first);
  assert.equal(f.rollups, 1);
  const second = await submit(f, { ...body, expected_evidence_version: "b".repeat(64),
    operation_id: "835575cb-88f7-449a-a5ae-5b9186cf4d74" });
  assert.equal(second.submission_count, 2);
  assert.equal(f.entries.length, 4);
  assert.equal(f.rollups, 2);
  assert.equal(second.server_timestamp, now.toISOString());
});

test("conflicting evidence, reused UUID payload and finalized months cannot append", async () => {
  const f = fixture();
  await submit(f);
  await assert.rejects(submit(f, { ...body, scores: { homework: 1, reading: 80 } }), /different request/);
  await assert.rejects(submit(f, { ...body, operation_id: "835575cb-88f7-449a-a5ae-5b9186cf4d74" }), /reload/);
  f.finalize();
  await assert.rejects(submit(f, { ...body, expected_evidence_version: "b".repeat(64),
    operation_id: "835575cb-88f7-449a-a5ae-5b9186cf4d75" }));
  assert.equal(f.entries.length, 2);
});

test("retry after month rollover returns stored success; new stale-month operation is rejected", async () => {
  const f = fixture(), first = await submit(f);
  assert.deepEqual(await submit(f, body, "actor", new Date("2026-11-01T00:00:00Z")), first);
  await assert.rejects(submit(f, { ...body, operation_id: "835575cb-88f7-449a-a5ae-5b9186cf4d74" },
    "actor", new Date("2026-11-01T00:00:00Z")), /current server month/);
});

test("count scopes tenant, student, class, month and deduplicates actor operation IDs", async () => {
  const f = fixture();
  await submit(f);
  f.logs.push(f.logs[0], { ...f.logs[0], tenantId: "other" }, { ...f.logs[0], action: JSON.stringify({
    student_id: "other", class_id: "c", month: "2026-10" }) });
  assert.equal(await countSubmissionOperations(f.tx, "tenant", "s", "c", "2026-10"), 1);
  assert.equal(submissionRequestHash(submissionSchema.parse(body)),
    submissionRequestHash(submissionSchema.parse({ ...body, scores: { reading: 80, homework: 0 } })));
});

test("count query uses Vietnam month UTC bounds and ignores invalid UUID or timestamp logs", async () => {
  const logs = [
    { userId: "actor", entityId: body.operation_id, action: JSON.stringify({
      student_id: "s", class_id: "c", month: "2026-10", submitted_at: "2026-09-30T17:00:00Z" }) },
    { userId: "actor", entityId: "invalid", action: JSON.stringify({
      student_id: "s", class_id: "c", month: "2026-10", submitted_at: now.toISOString() }) },
    { userId: "actor", entityId: body.operation_id, action: JSON.stringify({
      student_id: "s", class_id: "c", month: "2026-10", submitted_at: "2026-10-31T17:00:00Z" }) },
    { userId: "actor", entityId: body.operation_id, action: "{broken" },
    { userId: "actor", entityId: body.operation_id, action: JSON.stringify({
      student_id: "s", class_id: "c", month: "2026-10", submitted_at: "invalid" }) },
  ];
  const db = { activityLog: { findMany: async ({ where }: any) => {
    assert.equal(where.createdAt.gte.toISOString(), "2026-09-30T17:00:00.000Z");
    assert.equal(where.createdAt.lt.toISOString(), "2026-10-31T17:00:00.000Z");
    assert.equal(where.tenantId, "tenant");
    return logs;
  } } };
  assert.equal(await countSubmissionOperations(db, "tenant", "s", "c", "2026-10"), 1);
});

test("serializable retry retries transaction conflicts before returning", async () => {
  let attempts = 0;
  const db: any = { $transaction: async (work: any, options: any) => {
    assert.equal(options.isolationLevel, "Serializable");
    if (++attempts === 1) throw Object.assign(new Error("retry"), { code: "P2034" });
    return work({});
  } };
  assert.equal(await runSerializableProgressTransaction(db, async () => 42, { isolationLevel: "Serializable" }), 42);
  assert.equal(attempts, 2);
});

test("same UUID is scoped to actor and a second actor creates an independent submission", async () => {
  const f = fixture();
  await submit(f);
  const second = await submit(f, { ...body, expected_evidence_version: "b".repeat(64) }, "second-actor");
  assert.equal(second.submission_count, 2);
  assert.equal(f.entries.length, 4);
  assert.deepEqual(f.logs.map(log => log.userId), ["actor", "second-actor"]);
  assert.ok(f.logs.every(log => log.createdAt.toISOString() === now.toISOString()));
});

test("month creation unique race restarts Serializable and reads winner replay without appending", async () => {
  const f = fixture(), winner = await submit(f);
  const race = Object.assign(new Error("concurrent month creation"), { code: "P2002",
    meta: { modelName: "StudentProgressMonth", target: ["tenant_id", "student_id", "class_id", "month"] } });
  let attempts = 0;
  const db: any = { $transaction: async (work: any, options: any) => {
    assert.equal(options.isolationLevel, "Serializable");
    attempts++;
    if (attempts === 1) return work({ studentProgressMonth: { create: async () => { throw race; } } });
    return work(f.tx);
  } };
  const response = await runSerializableProgressTransaction(db, async tx => {
    if (attempts === 1) await createSubmissionMonth(tx, {});
    return submit(f);
  }, { isolationLevel: "Serializable" });
  assert.deepEqual(response, winner);
  assert.equal(attempts, 2);
  assert.equal(f.entries.length, 2);
  assert.equal(f.logs.length, 1);
});

test("month creation retries only the exact compound unique conflict and remains bounded", async () => {
  const target = ["tenantId", "studentId", "classId", "month"];
  for (const meta of [{ target: ["id"] }, { target: ["tenant_id", "progress_month_id", "skill_key"] },
    { target, modelName: "OtherModel" }, { target: "unknown_constraint" }, undefined]) {
    const error = Object.assign(new Error("unrelated unique"), { code: "P2002", meta });
    await assert.rejects(createSubmissionMonth({ studentProgressMonth: { create: async () => { throw error; } } }, {}),
      actual => actual === error);
  }
  let attempts = 0;
  const db: any = { $transaction: async (work: any) => {
    attempts++;
    return work({ studentProgressMonth: { create: async () => { throw Object.assign(new Error("race"),
      { code: "P2002", meta: { target } }); } } });
  } };
  await assert.rejects(runSerializableProgressTransaction(db, tx => createSubmissionMonth(tx, {}),
    { isolationLevel: "Serializable" }), (error: any) => error.code === "PROGRESS_CONFLICT" && error.status === 409);
  assert.equal(attempts, 3);
});
