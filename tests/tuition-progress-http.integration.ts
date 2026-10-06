import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { resolveTuitionProgressTestTarget, bindTuitionProgressTestTarget } from "../lib/tuition-progress-test-target.js";
import { assertDatabaseTarget, assertEffectiveTrackParity, assertGraderRejections,
  cleanupBusinessFixtures, expectJson, fixtureIds, httpRequest,
  loginFixture, seedBusinessFixtures, startBusinessHttp } from "./helpers/tuition-progress-http.js";

const target = resolveTuitionProgressTestTarget(process.env);
if (target) bindTuitionProgressTestTarget(process.env, target);

test("authenticated tuition/progress business flows on isolated PostgreSQL", {
  skip: target ? false : "NOT RUN: isolated TEST_DATABASE_URL absent (development only)", timeout: 120_000,
}, async t => {
  assert.ok(target);
  assert.equal(globalThis.prisma, undefined, "Target must be bound before runtime Prisma initialization");
  process.env.TENANCY_MODE = "enforced";
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient({ datasources: { db: { url: target.url } } });
  const { prisma: routerDb } = await import("../lib/prisma.js");
  const { setAuthConfigForTests } = await import("../lib/auth-config.js");
  const ids = fixtureIds();
  let http: Awaited<ReturnType<typeof startBusinessHttp>> | undefined;
  let ownsFixtures = false;
  try {
    assert.notEqual(db, routerDb);
    await assertDatabaseTarget(db, target);
    await assertDatabaseTarget(routerDb, target);
    setAuthConfigForTests({ secret: randomUUID() + randomUUID(), issuer: "tpr-business-test",
      audience: "tpr-business-test", algorithm: "HS256" });
    const password = randomUUID();
    await seedBusinessFixtures(db, ids, password);
    ownsFixtures = true;
    http = await startBusinessHttp();
    const admin = await loginFixture(http.base, db, ids, 0, password);
    const receptionist = await loginFixture(http.base, db, ids, 1, password);
    const request = (path: string, token = admin, method = "GET", body?: unknown) =>
      httpRequest(http!.base, path, token, method, body);
    const identity = { student_id: ids.students[0], class_id: ids.classId, month: "2026-06" };
    const query = new URLSearchParams(identity).toString();
    const daily = (score: number, month = "2026-06") => ({ ...identity, month: undefined,
      entry_date: `${month}-01`, note: "Isolated HTTP evidence fixture",
      entries: [{ entry_type: "skill_assessment", skill_key: "listening", score,
        exam_set_level: "movers", difficulty_level: "medium", graded_by_teacher_id: ids.teacher }] });
    const monthRow = (month = "2026-06") => db.studentProgressMonth.findFirstOrThrow({
      where: { tenantId: ids.tenants[0], studentId: ids.students[0], classId: ids.classId, month },
      include: { dailyEntries: true, revisions: { orderBy: { revisionNumber: "asc" } } },
    });
    let revision: any;
    const assertActivity = async (action: string, entityId: string, userId: string, count = 1) => {
      const rows = await db.activityLog.findMany({ where: { tenantId: ids.tenants[0],
        entityType: "student_progress", entityId, action, userId } });
      assert.equal(rows.length, count, "Independent DB observes exactly the committed progress activity");
      for (const row of rows) assert.equal(row.ipAddress, "127.0.0.1");
    };

    await t.test("authenticated calculator prices regular90k plus default extra90k", async () => {
      const path = `attendance/calculate-fee?student_id=${ids.students[0]}&month=2026-06`;
      assert.equal((await httpRequest(http!.base, path)).status, 401);
      for (const token of [admin, receptionist]) {
        const { data } = await expectJson(await request(path, token));
        assert.equal(data.total_fee, 180_000);
        assert.equal(data.days_count, 2);
        assert.equal(data.items[0].fee_amount, 180_000);
        assert.equal(data.items[0].billing_mode, "per_session");
      }
      assert.equal(await db.monthlyFee.count({ where: { tenantId: ids.tenants[0] } }), 0);
    });

    await t.test("settings OCC rejects stale config version without writes and commits matching version once", async () => {
      const tenantId = ids.tenants[0];
      const key = "finance.extra_session_policy";
      const listed = await expectJson(await request("admin/settings?group=finance&effective_month=2026-11"));
      const oldVersion = listed.data.configVersion;
      assert.ok(Number.isSafeInteger(oldVersion));
      const readback = () => Promise.all([
        db.settingValue.findMany({ where: { tenantId }, orderBy: { id: "asc" } }),
        db.settingRevision.findMany({ where: { tenantId }, orderBy: { id: "asc" } }),
        db.activityLog.findMany({ where: { tenantId, entityType: "setting_value" }, orderBy: { id: "asc" } }),
      ]);
      const before = await readback();
      await db.tenant.update({ where: { id: tenantId }, data: { configVersion: { increment: 1 } } });
      const conflict = await expectJson(await request(`admin/settings/${key}`, admin, "PUT", {
        value: "derive_monthly", effective_from_month: "2026-11", expectedConfigVersion: oldVersion,
        change_note: "Stale isolated HTTP settings update",
      }), [409]);
      assert.equal(conflict.error.code, "SETTING_CONFIG_CONFLICT");
      assert.deepEqual(await readback(), before, "Rejected OCC writes no setting, revision or setting business activity");
      assert.equal((await db.tenant.findUniqueOrThrow({ where: { id: tenantId } })).configVersion, oldVersion + 1);
      await expectJson(await request(`admin/settings/${key}`, admin, "PUT", {
        value: "derive_monthly", effective_from_month: "2026-11", expectedConfigVersion: oldVersion + 1,
        change_note: "Matching isolated HTTP settings update",
      }));
      const settings = await db.settingValue.findMany({ where: { tenantId, key }, include: { revisions: true } });
      assert.equal(settings.length, 1);
      assert.equal(settings[0].value, "derive_monthly");
      assert.equal(settings[0].effectiveFromMonth, "2026-11");
      assert.equal(settings[0].revision, 1);
      assert.equal(settings[0].revisions.length, 1);
      assert.equal(settings[0].revisions[0].changedById, ids.users[0]);
      const activities = await db.activityLog.findMany({ where: { tenantId,
        entityType: "setting_value", entityId: settings[0].id } });
      assert.equal(activities.length, 1);
      assert.equal(activities[0].userId, ids.users[0]);
      assert.equal(JSON.parse(activities[0].action).type, "setting.update");
      assert.equal((await db.tenant.findUniqueOrThrow({ where: { id: tenantId } })).configVersion, oldVersion + 2);
    });

    await t.test("invalid stored finance policy returns typed409 and creates no ledger rows", async () => {
      const tenantId = ids.tenants[0];
      const settingId = `${ids.run}invalidfinance`;
      const ledgerRows = () => Promise.all([
        db.monthlyFee.findMany({ where: { tenantId } }),
        db.monthlyFeeLine.findMany({ where: { tenantId } }),
        db.monthlyFeeLineRevision.findMany({ where: { tenantId } }),
        db.receipt.findMany({ where: { tenantId } }),
        db.receiptLine.findMany({ where: { tenantId } }),
      ]);
      const before = await ledgerRows();
      assert.ok(before.every(rows => rows.length === 0));
      await db.$transaction(async tx => {
        // Persist corrupt historical configuration directly; the settings write API rightly rejects it.
        await tx.settingValue.create({ data: { id: settingId, tenantId,
          key: "finance.extra_session_policy", value: "invalid_fixture_policy",
          effectiveFromMonth: "2026-06", revision: 1, updatedById: ids.users[0] } });
        await tx.tenant.update({ where: { id: tenantId }, data: { configVersion: { increment: 1 } } });
      });
      try {
        const calculated = await expectJson(await request(
          `attendance/calculate-fee?student_id=${ids.students[0]}&month=2026-06`), [409]);
        assert.equal(calculated.error.code, "INVALID_SETTING_VALUE");
        const generated = await expectJson(await request("monthly-fees/generate", admin, "POST",
          { month: "2026-06", dry_run: false }), [409]);
        assert.equal(generated.error.code, "INVALID_SETTING_VALUE");
        assert.deepEqual(await ledgerRows(), before, "Rejected configuration cannot create or mutate ledger/receipt rows");
      } finally {
        await db.$transaction(async tx => {
          await tx.settingValue.deleteMany({ where: { id: settingId, tenantId } });
          await tx.tenant.update({ where: { id: tenantId }, data: { configVersion: { increment: 1 } } });
        });
      }
    });

    await t.test("generation respects lock/plan prerequisites then persists an idempotent 180k ledger", async () => {
      await expectJson(await request("monthly-fees/generate", admin, "POST", { month: "2026-06", dry_run: false }));
      assert.equal(await db.monthlyFee.count({ where: { tenantId: ids.tenants[0] } }), 0,
        "Open attendance and plan must prevent ledger writes");
      await db.classMonthPlan.updateMany({ where: { tenantId: ids.tenants[0], classId: ids.classId },
        data: { state: "frozen", revision: { increment: 1 }, frozenAt: new Date(), frozenById: ids.users[0] } });
      await db.attendancePeriod.updateMany({ where: { tenantId: ids.tenants[0], classId: ids.classId },
        data: { status: "locked", lockedAt: new Date(), lockedById: ids.users[0] } });
      for (let retry = 0; retry < 2; retry++) {
        await expectJson(await request("monthly-fees/generate", admin, "POST", { month: "2026-06", dry_run: false }));
        const fees = await db.monthlyFee.findMany({ where: { tenantId: ids.tenants[0], month: "2026-06" }, include: { lines: true } });
        assert.equal(fees.length, 1);
        assert.equal(fees[0].totalAmount, 180_000);
        assert.equal(fees[0].lines.length, 1);
        assert.equal(fees[0].lines[0].amount, 180_000);
        assert.equal(fees[0].lines[0].chargedSessions, 2);
        const snapshot = fees[0].lines[0].calculationSnapshot as any;
        assert.equal(snapshot.ledger.find((row: any) => row.id === ids.extra).amount, 90_000);
      }
    });

    await t.test("receptionist daily Listening80 survives admin finalize without manual skills", async progressTest => {
      const saved = await expectJson(await request("student-progress/daily", receptionist, "PUT", daily(80)));
      assert.equal(saved.data.progress_month.progress_score, 80);
      assert.equal((await monthRow()).dailyEntries[0].score, 80);
      await assertActivity("REPLACE_STUDENT_PROGRESS_DAILY", (await monthRow()).id, ids.users[1]);
      const before = await expectJson(await request(`student-progress?${query}`));
      assert.equal(before.data.progress_months[0].progress_score, 80);
      await progressTest.test("open monthly and daily GET ignore persisted stale progressScore100 and return raw80", async () => {
        const original = await monthRow();
        assert.equal(original.finalizedAt, null);
        const changed = await db.studentProgressMonth.updateMany({
          where: { id: original.id, tenantId: ids.tenants[0], finalizedAt: null },
          data: { progressScore: 100 },
        });
        assert.equal(changed.count, 1);
        try {
          assert.equal((await monthRow()).progressScore, 100, "Independent DB confirms stale cache fixture");
          const response = await expectJson(await request(`student-progress?${query}`));
          const open = response.data.progress_months[0];
          assert.equal(open.progress_score, 80);
          assert.equal(open.score_source, "daily_raw");
          assert.equal(open.rubric_snapshot.scoreEvidence.skillScores
            .find((skill: any) => skill.key === "listening").score, 80);
          for (const scope of [query, `${query}&entry_date=2026-06-01`]) {
            const dailyRead = await expectJson(await request(`student-progress/daily?${scope}`));
            assert.equal(dailyRead.data.progress_month.progress_score, 80);
            assert.equal(dailyRead.data.progress_month.score_source, "daily_raw");
            assert.equal(dailyRead.data.daily_entries.find((entry: any) => entry.entry_type === "skill_assessment").score, 80);
          }
          assert.equal((await monthRow()).progressScore, 100, "GET recomputes response without mutating stored cache");
        } finally {
          const restored = await db.studentProgressMonth.updateMany({
            where: { id: original.id, tenantId: ids.tenants[0], finalizedAt: null },
            data: { progressScore: original.progressScore },
          });
          assert.equal(restored.count, 1);
        }
      });
      assert.equal((await request("student-progress", receptionist, "PUT", { ...identity, finalized: true })).status, 403);
      const finalized = await expectJson(await request("student-progress", admin, "PUT", { ...identity, finalized: true }), [200, 201]);
      assert.equal(finalized.data.progress_month.progress_score, 80);
      assert.equal(finalized.data.progress_month.score_source, "daily_raw");
      assert.equal(finalized.data.assessment.skillScores.find((skill: any) => skill.key === "listening").score, 80);
      const stored = await monthRow();
      assert.equal(stored.progressScore, 80);
      assert.ok(stored.finalizedAt);
      await assertActivity("UPSERT_STUDENT_PROGRESS", stored.id, ids.users[0]);
      assert.equal(stored.revisions.length, 1);
      revision = stored.revisions[0];
      assert.equal(revision.eventType, "finalized");
      assert.equal(revision.snapshot.progress_score, 80);
      assert.equal(revision.snapshot.score_source, "daily_raw");
      assert.equal(revision.snapshot.daily_entries.find((entry: any) => entry.entry_type === "skill_assessment").score, 80);
      const reloaded = await expectJson(await request(`student-progress?${query}`));
      assert.equal(reloaded.data.progress_months[0].progress_score, 80);
      assert.equal(reloaded.data.progress_months[0].score_source, "daily_raw");
      assert.equal(reloaded.data.progress_months[0].rubric_snapshot.scoreEvidence.skillScores
        .find((skill: any) => skill.key === "listening").score, 80);
    });

    await t.test("finalized edits denied; PDF delivers binary with private headers", async () => {
      for (const token of [admin, receptionist]) {
        const denied = await expectJson(await request("student-progress/daily", token, "PUT", daily(20)), [409]);
        assert.equal(denied.error.code, "PROGRESS_MONTH_FINALIZED");
      }
      const deniedMonth = await expectJson(await request("student-progress", admin, "PUT", { ...identity, skills: [] }), [409]);
      assert.equal(deniedMonth.error.code, "PROGRESS_MONTH_FINALIZED");
      assert.deepEqual((await monthRow()).revisions[0], revision);
      assert.equal((await monthRow()).dailyEntries[0].score, 80);
      const pdf = await request(`student-progress/pdf?student_id=${ids.students[0]}&class_id=${ids.classId}&from=2026-06-01&to=2026-06-30`, receptionist);
      assert.equal(pdf.status, 200);
      assert.match(pdf.headers.get("content-type") || "", /^application\/pdf/);
      assert.match(pdf.headers.get("content-disposition") || "", /inline;.*\.pdf/);
      assert.equal(pdf.headers.get("cache-control"), "private, no-store");
      const bytes = Buffer.from(await pdf.arrayBuffer());
      assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
      assert.ok(bytes.length > 1_000);
      assert.match(bytes.subarray(-100).toString(), /%%EOF/);
    });

    await t.test("cross tenant calculator and daily write fail closed with 404", async () => {
      assert.equal((await request(`attendance/calculate-fee?student_id=${ids.students[1]}&month=2026-06`)).status, 404);
      const foreign = await expectJson(await request("student-progress/daily", admin, "PUT", {
        ...daily(80), student_id: ids.students[1],
      }), [404]);
      assert.ok(!JSON.stringify(foreign).includes(ids.students[1]), "Foreign identity must not leak");
      assert.equal(await db.studentProgressMonth.count({ where: { tenantId: ids.tenants[1] } }), 0);
    });

    await t.test("only admin can reopen with reason; original revision remains immutable", async () => {
      const body = { ...identity, action: "reopen", reason: "Correct isolated test evidence" };
      assert.equal((await request("student-progress", receptionist, "PUT", body)).status, 403);
      assert.equal((await request("student-progress", admin, "PUT", { ...body, reason: "short" })).status, 400);
      await expectJson(await request("student-progress", admin, "PUT", body));
      const reopened = await monthRow();
      assert.equal(reopened.finalizedAt, null);
      assert.equal(reopened.revisionNumber, 2);
      assert.equal(reopened.revisions[1].eventType, "reopened");
      assert.equal(reopened.revisions[1].reason, body.reason);
      assert.deepEqual(reopened.revisions[0], revision);
      await assertActivity("REOPEN_STUDENT_PROGRESS", reopened.id, ids.users[0]);
      await expectJson(await request("student-progress/daily", receptionist, "PUT", daily(90)));
      assert.equal((await monthRow()).progressScore, 90);
      assert.deepEqual((await monthRow()).revisions[0], revision);
      await assertActivity("REPLACE_STUDENT_PROGRESS_DAILY", reopened.id, ids.users[1], 2);
    });

    await t.test("daily DELETE persists its activity with the committed evidence deletion", async () => {
      await expectJson(await request("student-progress/daily", receptionist, "PUT", daily(80, "2026-10")));
      const before = await monthRow("2026-10");
      assert.equal(before.dailyEntries.filter(entry => entry.entryType === "skill_assessment").length, 1);
      await assertActivity("REPLACE_STUDENT_PROGRESS_DAILY", before.id, ids.users[1]);
      const deleteQuery = new URLSearchParams({
        student_id: ids.students[0], class_id: ids.classId, entry_date: "2026-10-01",
      });
      await expectJson(await request(`student-progress/daily?${deleteQuery}`, receptionist, "DELETE"));
      const after = await monthRow("2026-10");
      assert.equal(after.dailyEntries.length, 0);
      await assertActivity("DELETE_STUDENT_PROGRESS_DAILY", before.id, ids.users[1]);
    });

    await t.test("wrong or inactive grader is rejected without changing evidence row counts or values", async () => {
      await assertGraderRejections(db, ids, request, receptionist, daily(80));
    });

    await t.test("effective tenant keywords give matching daily/monthly tracks and persisted revisions", async () => {
      await assertEffectiveTrackParity(db, ids, request, receptionist, daily(80));
    });

    await t.test("concurrent daily replacement and finalize produce one consistent snapshot or explicit conflict", async () => {
      await expectJson(await request("student-progress/daily", receptionist, "PUT", daily(80, "2026-07")));
      const responses = await Promise.all([
        request("student-progress/daily", receptionist, "PUT", daily(90, "2026-07")),
        request("student-progress", admin, "PUT", { ...identity, month: "2026-07", finalized: true }),
      ]);
      const bodies = await Promise.all(responses.map(response => expectJson(response, [200, 201, 409, 503])));
      assert.ok(responses.some(response => response.status < 300), "At least one concurrent writer succeeds");
      for (const [i, response] of responses.entries()) if (response.status >= 400) {
        if (response.status === 503) {
          assert.equal(bodies[i].error?.code, "SERIALIZABLE_TRANSACTION_CONFLICT");
          assert.equal(bodies[i].error?.details?.retryable, true);
        } else {
          assert.ok(["PROGRESS_MONTH_FINALIZED", "SERIALIZABLE_TRANSACTION_CONFLICT"]
            .includes(bodies[i].error?.code), "Conflict must identify finalization or serialization");
        }
      }
      let stored = await monthRow("2026-07");
      if (!stored.finalizedAt) {
        await expectJson(await request("student-progress", admin, "PUT", { ...identity, month: "2026-07", finalized: true }), [200, 201]);
        stored = await monthRow("2026-07");
      }
      const assessments = stored.dailyEntries.filter(entry => entry.entryType === "skill_assessment");
      assert.equal(assessments.length, 1);
      assert.ok([80, 90].includes(stored.progressScore));
      assert.equal(stored.progressScore, assessments[0].score);
      assert.equal(stored.revisions.length, 1);
      const snapshot = stored.revisions[0].snapshot as any;
      assert.equal(snapshot.progress_score, stored.progressScore);
      assert.equal(snapshot.daily_entries.find((entry: any) => entry.entry_type === "skill_assessment").score, assessments[0].score);
      assert.equal(snapshot.score_source, "daily_raw");
    });
  } finally {
    try { await http?.close(); } finally {
      try { if (ownsFixtures) await cleanupBusinessFixtures(db, target, ids); } finally {
        setAuthConfigForTests(null);
        await Promise.all([db.$disconnect(), routerDb.$disconnect()]);
      }
    }
  }
});
