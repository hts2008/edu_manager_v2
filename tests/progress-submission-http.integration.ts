import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { submissionClock } from "../lib/progress-submission-contract.js";
import { bindTuitionProgressTestTarget, resolveTuitionProgressTestTarget } from "../lib/tuition-progress-test-target.js";
import { assertDatabaseTarget, cleanupBusinessFixtures, expectJson, fixtureIds, httpRequest,
  loginFixture, seedBusinessFixtures, startBusinessHttp } from "./helpers/tuition-progress-http.js";

const target = resolveTuitionProgressTestTarget(process.env);
if (target) bindTuitionProgressTestTarget(process.env, target);

test("real authenticated append submissions retain same-day evidence and durable CAS replay", {
  skip: target ? false : "NOT RUN: isolated TEST_DATABASE_URL absent (development only)", timeout: 120_000,
}, async t => {
  assert.ok(target);
  assert.equal(globalThis.prisma, undefined);
  process.env.TENANCY_MODE = "enforced";
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient({ datasources: { db: { url: target.url } } });
  const { prisma: routerDb } = await import("../lib/prisma.js");
  const { setAuthConfigForTests } = await import("../lib/auth-config.js");
  const ids = fixtureIds("http"), tenantId = ids.tenants[0];
  const permissionId = `${ids.run}submissiondeny`;
  let http: Awaited<ReturnType<typeof startBusinessHttp>> | undefined, ownsFixtures = false;
  try {
    await assertDatabaseTarget(db, target);
    await assertDatabaseTarget(routerDb, target);
    setAuthConfigForTests({ secret: randomUUID() + randomUUID(), issuer: "submission-http-test",
      audience: "submission-http-test", algorithm: "HS256" });
    const password = randomUUID();
    await seedBusinessFixtures(db, ids, password);
    ownsFixtures = true;
    http = await startBusinessHttp();
    const admin = await loginFixture(http.base, db, ids, 0, password);
    const receptionist = await loginFixture(http.base, db, ids, 1, password);
    const route = "student-progress/roster", clock = submissionClock();
    const query = new URLSearchParams({ mode: "submission", class_id: ids.classId, student_id: ids.students[0] });
    const request = (path: string, method = "GET", body?: unknown, token = admin) =>
      httpRequest(http!.base, path, token, method, body);
    const read = async () => (await expectJson(await request(`${route}?${query}`))).data;
    const payload = (row: any, scores = { homework: 0, reading: 80 }) => ({
      student_id: ids.students[0], class_id: ids.classId, month: clock.month,
      expected_evidence_version: row.evidence_version, operation_id: randomUUID(), scores,
    });
    const snapshot = () => db.studentProgressDailyEntry.findMany({ where: { tenantId }, orderBy: { id: "asc" } });
    const logs = () => db.activityLog.findMany({ where: { tenantId, entityType: "progress_submission_operation" } });

    await t.test("read uses server date, one row, and rejects old months and client dates", async () => {
      assert.equal((await httpRequest(http!.base, `${route}?${query}`)).status, 401);
      const data = await read();
      assert.equal(data.current_date, clock.current_date);
      assert.equal(data.entry_date, clock.current_date);
      assert.equal(data.row.month, clock.month);
      assert.equal(data.row.student_id, ids.students[0]);
      assert.equal(data.submission_count, 0);
      const stale = clock.month === "2000-01" ? "2000-02" : "2000-01";
      assert.equal((await request(`${route}?${query}&month=${stale}`)).status, 409);
      assert.equal((await request(`${route}?${query}&entry_date=${clock.current_date}`)).status, 400);
    });

    await t.test("same UUID concurrent POST appends once without attendance or note", async () => {
      const body = payload((await read()).row);
      const results = await Promise.all([request(route, "POST", body), request(route, "POST", body)]);
      const first = await expectJson(results[0]), retry = await expectJson(results[1]);
      assert.deepEqual(first.data, retry.data);
      assert.equal(first.data.entry_date, clock.current_date);
      assert.equal(first.data.submission_count, 1);
      assert.ok(Number.isFinite(Date.parse(first.data.submitted_at)));
      const entries = await snapshot();
      assert.equal(entries.length, 2);
      assert.equal(entries.find(e => e.skillKey === "homework")!.score, 0);
      assert.ok(entries.every(e => e.entryDate.toISOString().slice(0, 10) === clock.current_date));
      assert.equal((await logs()).length, 1);
      const action = JSON.parse((await logs())[0].action);
      assert.deepEqual([action.student_id, action.class_id, action.month, action.submitted_at],
        [ids.students[0], ids.classId, clock.month, first.data.submitted_at]);
      assert.deepEqual((await expectJson(await request(route, "POST", body))).data, first.data);
      assert.deepEqual(await snapshot(), entries);
      assert.equal((await request(route, "POST", { ...body, scores: { homework: 1 } })).status, 409);
      const second = await expectJson(await request(route, "POST", {
        ...payload((await read()).row), note: "Independent homework submission" }));
      assert.equal(second.data.submission_count, 2);
      const after = await snapshot();
      assert.equal(after.length, 5);
      assert.ok(entries.every(entry => after.some(item => item.id === entry.id &&
        item.score === entry.score && item.updatedAt.getTime() === entry.updatedAt.getTime())));
      assert.equal((await read()).row.skills.homework.count, 2);
      const reportQuery = new URLSearchParams({ from: clock.month, to: clock.month,
        student_id: ids.students[0], class_id: ids.classId });
      const report = await expectJson(await request(`reports/student-progress?${reportQuery}`));
      assert.equal(report.data.students.length, 1);
      const timeline = report.data.students[0].chart_timeline;
      assert.equal(timeline.from, `${clock.month}-01`);
      assert.ok(timeline.days.every((day: any) => day.month === clock.month));
      const today = timeline.days.find((day: any) => day.date === clock.current_date);
      assert.ok(today);
      assert.equal(today.skills.homework.raw_score, 0);
      assert.equal(Object.keys(today.skills).length, 7);
      assert.equal(today.skills.speaking.raw_score, null);
      const expectedPoints = after.reduce((sum, entry) => sum +
        (Number.isFinite(entry.score) ? Number(entry.score) : 0), 0);
      assert.equal(timeline.days.at(-1).cumulative_points, expectedPoints);
      assert.equal(timeline.comparison.current_raw_score, report.data.students[0].alert_comparison.current_raw_score);
      assert.equal(timeline.comparison.previous_raw_score, report.data.students[0].alert_comparison.previous_raw_score);
    });

    await t.test("different concurrent submissions from one version have one winner", async () => {
      const row = (await read()).row, before = (await logs()).length;
      const results = await Promise.all([request(route, "POST", payload(row)),
        request(route, "POST", payload(row, { homework: 40, reading: 90 }))]);
      assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
      assert.equal((await logs()).length, before + 1);
      assert.equal((await read()).submission_count, before + 1);
    });

    await t.test("finalization, teacher, enrollment, tenant and permission protections stay fail closed", async () => {
      const before = await snapshot(), count = (await logs()).length;
      const record = await db.studentProgressMonth.findFirstOrThrow({ where: { tenantId, month: clock.month } });
      await db.studentProgressMonth.update({ where: { id: record.id, tenantId }, data: { finalizedAt: new Date() } });
      assert.equal((await request(route, "POST", payload((await read()).row))).status, 409);
      await db.studentProgressMonth.update({ where: { id: record.id, tenantId }, data: { finalizedAt: null } });
      await db.teacher.update({ where: { id: ids.teacher, tenantId }, data: { status: "inactive" } });
      assert.equal((await request(route, "POST", payload((await read()).row))).status, 409);
      await db.teacher.update({ where: { id: ids.teacher, tenantId }, data: { status: "active" } });
      assert.equal((await request(route, "POST", { ...payload((await read()).row), student_id: ids.students[1] })).status, 404);
      assert.equal((await request(route, "POST", { ...payload((await read()).row), month: "2000-01" })).status, 409);
      assert.equal((await request(route, "POST", { ...payload((await read()).row), scores: { homework: null } })).status, 400);
      await db.$transaction(async tx => {
        await tx.rolePermission.create({ data: { id: permissionId, tenantId, role: "receptionist",
          permissionKey: "progress.grade", allowed: false, updatedById: ids.users[0] } });
        await tx.tenant.update({ where: { id: tenantId }, data: { configVersion: { increment: 1 } } });
      });
      assert.equal((await request(route, "POST", payload((await read()).row), receptionist)).status, 403);
      assert.deepEqual(await snapshot(), before);
      assert.equal((await logs()).length, count);
    });
  } finally {
    try { await http?.close(); } finally {
      try {
        if (ownsFixtures) {
          await assertDatabaseTarget(db, target);
          await db.rolePermission.deleteMany({ where: { id: permissionId, tenantId } });
          await cleanupBusinessFixtures(db, target, ids);
        }
      } finally {
        setAuthConfigForTests(null);
        await Promise.all([db.$disconnect(), routerDb.$disconnect()]);
      }
    }
  }
});
