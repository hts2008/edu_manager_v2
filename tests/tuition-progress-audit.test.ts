import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { auditFingerprint, auditRecord, auditProtection, parseAuditArguments,
  classifyFinance, classifyAcademic, inventoryTuitionProgress } from "../lib/tuition-progress-audit.js";

// Domain modules transitively instantiate Prisma; pin even unit workers to a nonremote target.
process.env.DATABASE_URL = process.env.DIRECT_URL =
  "postgresql://unit:unit@127.0.0.1:15432/tpr_test_unit?schema=tpr_test_unit";
process.env.NODE_ENV = "test";
const env = { TEST_DATABASE_URL: process.env.DATABASE_URL,
  TPR_TEST_DATABASE: "tpr_test_unit", TPR_TEST_SCHEMA: "tpr_test_unit" };
const scope = { id: "private-line", tenantId: "private-tenant", studentId: "private-student",
  classId: "private-class", month: "2026-06" };
const settings = { configVersion: 1, settings: [] };
const row: any = { student_id: scope.studentId, student_name: "Private Student Name",
  class_id: scope.classId, class_name: "Movers", month: scope.month, expected_sessions: 2,
  recorded_sessions: 2, actual_sessions: 2, actual_present_rate: 100,
  chargeable_rate: 100, record_completion_rate: 100,
  risk_flags: [],
  status_counts: { present: 2, absent_with_fee: 0, absent_no_fee: 0, holiday: 0, make_up: 0 } };
const academic = () => ({ ...scope, progressScore: 30, trackKey: "movers", classType: "communicative",
  finalizedAt: null, rubricSnapshot: { scoreEvidence: { formulaVersion: "TP-1", source: "daily_raw" } },
  dailyScoreDelta: null, skills: [], dailyEntries: [{ id: "daily-private", tenantId: scope.tenantId,
    entryDate: new Date("2026-06-03"), entryType: "skill_assessment", skillKey: "listening", score: 80 }] });
const finance = () => ({ line: { ...scope, amount: 90_000, feePerSession: 90_000,
  billingMode: "per_session", status: "ready", receiptLines: [] },
  classData: { id: scope.classId, tenantId: scope.tenantId, billingPolicy: "per_session", feePerDay: 90_000 },
  enrollments: [{ tenantId: scope.tenantId, startedAt: new Date("2026-06-01"), endedAt: null }],
  sessions: ["regular", "extra"].map((kind, i) => ({ id: `session-${i}`, tenantId: scope.tenantId,
    classId: scope.classId, sessionDate: new Date(`2026-06-0${i + 1}`), kind, status: "held", extraFeeMode: "surcharge" })),
  attendance: [0, 1].map(i => ({ tenantId: scope.tenantId, classSessionId: `session-${i}`,
    attendanceDate: new Date(`2026-06-0${i + 1}`), status: "present" })), settings });

test("canonical fingerprints and anomaly IDs are deterministic, scoped and redacted", () => {
  assert.equal(auditFingerprint({ z: 2, a: new Date("2026-06-01") }),
    auditFingerprint({ a: new Date("2026-06-01"), z: 2 }));
  const finding = { finding: "R1" as const, classification: "difference" as const, reason: "amount_mismatch" };
  const first = auditRecord(scope, { category: "mutable_draft", protection: [], findings: [finding] }, { amount: 1 });
  const again = auditRecord({ ...scope }, { category: "mutable_draft", protection: [], findings: [finding] }, { amount: 1 });
  assert.deepEqual(first, again);
  const changed = auditRecord(scope, { category: "mutable_draft", protection: [], findings: [finding] }, { amount: 2 });
  assert.equal(first.findings[0].id, changed.findings[0].id);
  assert.notEqual(first.sourceFingerprint, changed.sourceFingerprint);
  assert.doesNotMatch(JSON.stringify(first), /private-line|private-tenant|private-student|private-class/);
});

test("confirmed, paid, inherited fee protection and receipt links are immutable categories", () => {
  for (const line of [{ status: "confirmed" }, { status: "paid" }, { receiptId: "r" },
    { receiptLines: [{ id: "r" }] }, { paidAt: new Date() }, { monthlyFee: { status: "paid" } }]) {
    assert.ok(auditProtection(line).length > 0);
  }
  assert.deepEqual(auditProtection({ status: "ready", receiptLines: [] }), []);
  assert.deepEqual(auditProtection({ finalizedAt: new Date() }), ["finalized_academic"]);
});

test("R1 invokes current calculator with real input shape, preserving protected source", async () => {
  const input = finance();
  input.line.status = "paid";
  const before = auditFingerprint(input);
  const result = await classifyFinance(input);
  assert.equal(result.category, "protected_financial");
  assert.ok(result.findings.some(f => f.finding === "R1" && f.canonical === 180_000));
  assert.ok(result.findings.some(f => f.classification === "unknown"));
  assert.equal(auditFingerprint(input), before);
});

test("incomplete finance input yields unknown with no fabricated result", async () => {
  const input = finance(); input.attendance = [];
  const result = await classifyFinance(input);
  assert.ok(result.findings.some(f => f.reason === "finance_inputs_incomplete"));
  assert.ok(result.findings.every(f => f.canonical === undefined));
});

test("R3 detects persisted open score against canonical operational assessment", async () => {
  const record = academic(); const before = auditFingerprint(record);
  const result = await classifyAcademic({ record, row, settings });
  assert.ok(result.findings.some(f => f.finding === "R3" && f.stored === 30 && f.canonical === 80));
  assert.equal(result.category, "mutable_draft");
  assert.equal(auditFingerprint(record), before);
});

test("finalized legacy provenance, unknown class and invalid settings are explicit", async () => {
  const record: any = academic(); record.finalizedAt = new Date(); record.rubricSnapshot = null;
  assert.equal((await classifyAcademic({ record, row, settings })).category, "finalized_academic");
  record.finalizedAt = null; record.classType = null;
  assert.ok((await classifyAcademic({ record, row, settings })).findings.some(f => f.reason === "class_unknown"));
  const invalid = { settings: [{ key: "academic.score_blend", value: {}, warnings: [{}] }] };
  assert.equal((await classifyAcademic({ record: academic(), row, settings: invalid })).category, "invalid_configuration");
});

test("R2/R4/R5 read-model findings never propose source overwrites", async () => {
  const record: any = academic(); record.progressScore = 80; record.dailyScoreDelta = -40;
  record.dailyEntries.push({ entryDate: new Date("2026-06-04"), entryType: "skill_assessment", skillKey: "speaking", score: 50 });
  record.dailyEntries[0].examSetLevel = "flyers";
  const result = await classifyAcademic({ record, row, settings,
    previous: { value: 100, source: "operational_proxy", signature: "different" } });
  for (const finding of ["R2", "R4", "R5"]) assert.ok(result.findings.some(f => f.finding === finding));
  assert.ok(result.findings.filter(f => f.finding !== "R3").every(f => f.classification === "read_model_only"));
});

test("CLI rejects apply, production, absent and remote configuration without secrets", () => {
  assert.equal(parseAuditArguments([], env).mode, "dry-run");
  for (const args of [["--apply"], ["--apply=true"], ["--unknown"]]) assert.throws(() => parseAuditArguments(args, env));
  assert.throws(() => parseAuditArguments([], { ...env, NODE_ENV: "production" }));
  assert.throws(() => parseAuditArguments([], {}), /required/);
  assert.throws(() => parseAuditArguments([], { ...env, TEST_DATABASE_URL: "postgresql://secret@remote/prod" }), /loopback/);
});

test("empty inventory includes zero/no-op counts, repeats identically and calls only reads", async () => {
  const reads: string[] = [];
  const db: any = new Proxy({}, { get: (_, model: string) => new Proxy({}, { get: (_, method: string) => {
    if (!["findMany", "count"].includes(method)) throw new Error(`Forbidden capability: ${method}`);
    return async () => { reads.push(`${model}.${method}`); return method === "count" ? 0 : []; };
  } }) });
  const cutoff = new Date("2026-10-05T00:00:00Z");
  const first = await inventoryTuitionProgress(db, cutoff);
  assert.deepEqual(await inventoryTuitionProgress(db, cutoff), first);
  assert.equal(first.counts.fee_lines, 0);
  assert.equal(first.counts.progress_months, 0);
  assert.equal(first.counts.no_op, 0);
  assert.equal(first.writes, 0);
  assert.equal(first.verifiedCounts, true);
  assert.ok(reads.length > 0);
});

test("CLI --apply fails before loading Prisma or reading configuration files", () => {
  const childEnv = { ...process.env }; delete childEnv.NODE_TEST_CONTEXT;
  delete childEnv.TEST_DATABASE_URL; delete childEnv.DATABASE_URL; delete childEnv.DIRECT_URL;
  const result = spawnSync(process.execPath, ["--import", "tsx",
    fileURLToPath(new URL("../scripts/audit-tuition-progress.ts", import.meta.url)), "--apply"],
  { env: childEnv, encoding: "utf8", timeout: 15_000 });
  assert.ifError(result.error); assert.equal(result.status, 1);
  assert.match(result.stderr, /read-only/);
  assert.doesNotMatch(result.stderr, /Prisma|postgresql:\/\//);
});

test("nonempty read-only inventory uses operational loader and verifies no-op and redaction", async () => {
  const progress = academic(); progress.progressScore = 80;
  const storage: Record<string, any[]> = {
    tenant: [{ id: scope.tenantId, configVersion: 1 }], studentProgressMonth: [progress],
    studentProgressSkill: [], studentProgressDailyEntry: progress.dailyEntries,
    enrollmentPeriod: [{ id: "private-enrollment", tenantId: scope.tenantId,
      startedAt: new Date("2026-06-01"), endedAt: null,
      student: { fullName: "Private Student Name" },
      class: { className: "Movers", feePerDay: 90_000, scheduleDays: [1, 2], sessionsPerWeek: 2 } }],
    classSession: [1, 2].map(i => ({ tenantId: scope.tenantId, classId: scope.classId,
      billingMonth: scope.month, sessionDate: new Date(`2026-06-0${i}`), kind: "regular", status: "held" })),
    attendance: [1, 2].map(i => ({ tenantId: scope.tenantId, studentId: scope.studentId,
      classId: scope.classId, attendanceDate: new Date(`2026-06-0${i}`), status: "present", isMakeUp: false })),
  };
  const calls: Array<{ model: string; args: any }> = [];
  const db: any = new Proxy({}, { get: (_, model: string) => new Proxy({}, { get: (_, method: string) => {
    assert.ok(["findMany", "findFirst", "findUnique", "count"].includes(method), "No write capability allowed");
    return async (args: any) => {
      calls.push({ model, args }); const rows = storage[model] || [];
      return method === "count" ? rows.length : method === "findMany" ? rows : rows[0] || null;
    };
  } }) });
  const before = auditFingerprint(storage);
  const first = await inventoryTuitionProgress(db, new Date("2026-10-05T00:00:00Z"));
  assert.deepEqual(await inventoryTuitionProgress(db, new Date("2026-10-05T00:00:00Z")), first);
  assert.equal(first.counts.progress_months, 1);
  assert.equal(first.counts.no_op, 1);
  assert.equal(first.records[0].category, "unaffected");
  assert.equal(first.writes, 0);
  assert.equal(auditFingerprint(storage), before);
  assert.doesNotMatch(JSON.stringify(first), /Private Student Name|private-student|private-enrollment/);
  assert.ok(calls.some(c => c.model === "enrollmentPeriod" && c.args?.where?.tenantId === scope.tenantId));
});
