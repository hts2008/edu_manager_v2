import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { test } from "node:test";
import { bindTuitionProgressTestTarget, resolveTuitionProgressTestTarget } from "../lib/tuition-progress-test-target.js";
import { assertDatabaseTarget, cleanupBusinessFixtures, expectJson, fixtureIds, httpRequest,
  loginFixture, seedBusinessFixtures, startBusinessHttp } from "./helpers/tuition-progress-http.js";

const target = resolveTuitionProgressTestTarget(process.env);
if (target) bindTuitionProgressTestTarget(process.env, target);

function conjuncts(where: any): any[] {
  return [where, ...(Array.isArray(where?.AND) ? where.AND : where?.AND ? [where.AND] : [])
    .flatMap(conjuncts)];
}

function condition(where: any, key: string): any {
  const matches = conjuncts(where).filter(part => part && Object.hasOwn(part, key));
  assert.ok(matches.length > 0, `Measured filter requires ${key}`);
  for (const match of matches) assert.deepEqual(match[key], matches[0][key]);
  return matches[0][key];
}

test("owned PostgreSQL roster load: 30/100/500 learners, bounded hydration and paging", {
  skip: target ? false : "NOT RUN: isolated TEST_DATABASE_URL absent", timeout: 120_000,
}, async t => {
  assert.ok(target);
  process.env.TENANCY_MODE = "enforced";
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient({ datasources: { db: { url: target.url } } });
  const { prisma: routerDb } = await import("../lib/prisma.js");
  const { setAuthConfigForTests } = await import("../lib/auth-config.js");
  const ids = fixtureIds("http");
  let http: Awaited<ReturnType<typeof startBusinessHttp>> | undefined;
  let owned = false;
  let capture: Array<{ model: string; action: string; where: any; rows: number }> | undefined;
  // These are measured Prisma operations, not SQL statement counts.
  routerDb.$use(async (params, next) => {
    const bucket = capture;
    const result = await next(params);
    if (bucket && params.model) bucket.push({ model: params.model, action: params.action,
      where: params.args?.where, rows: Array.isArray(result) ? result.length : 0 });
    return result;
  });
  try {
    await assertDatabaseTarget(db, target);
    await assertDatabaseTarget(routerDb, target);
    setAuthConfigForTests({ secret: randomUUID() + randomUUID(), issuer: "roster-load-test",
      audience: "roster-load-test", algorithm: "HS256" });
    const password = randomUUID();
    await seedBusinessFixtures(db, ids, password);
    owned = true;
    http = await startBusinessHttp();
    const admin = await loginFixture(http.base, db, ids, 0, password);
    await db.student.update({ where: { id: ids.students[0] }, data: { fullName: "Load 0000" } });
    const learnerIds = [ids.students[0]];
    const request = (offset: number, limit = 50) => httpRequest(http!.base,
      `student-progress/roster?${new URLSearchParams({ class_id: ids.classId, month: "2026-07",
        entry_date: "2026-07-01", offset: String(offset), limit: String(limit) })}`, admin);

    for (const size of [30, 100, 500]) await t.test(`${size} active learners`, async () => {
      const added = Array.from({ length: size - learnerIds.length }, (_, i) => ({
        id: `${ids.run}load${String(learnerIds.length + i).padStart(4, "0")}`,
        name: `Load ${String(learnerIds.length + i).padStart(4, "0")}`,
      }));
      ids.students.push(...added.map(row => row.id));
      await db.$transaction(async tx => {
        await tx.student.createMany({ data: added.map(row => ({ id: row.id, tenantId: ids.tenants[0],
          fullName: row.name, parentId: ids.parents[0], dateOfBirth: new Date("2015-01-01"),
          gender: "other", enrollmentDate: new Date("2026-06-01") })) });
        await tx.studentClass.createMany({ data: added.map(row => ({ tenantId: ids.tenants[0],
          studentId: row.id, classId: ids.classId, enrollmentDate: new Date("2026-06-01") })) });
        await tx.enrollmentPeriod.createMany({ data: added.map(row => ({ tenantId: ids.tenants[0],
          studentId: row.id, classId: ids.classId, startedAt: new Date("2026-06-01"), source: "tpr_http_fixture" })) });
        const fresh = size === 30 ? [ids.students[0], ...added.map(row => row.id)] : added.map(row => row.id);
        await tx.studentProgressMonth.createMany({ data: fresh.flatMap(studentId => ["2026-06", "2026-07"].map(month => ({
          id: `${studentId}${month}`, tenantId: ids.tenants[0], studentId, classId: ids.classId,
          month, trackKey: "movers", createdById: ids.users[0],
        }))) });
        await tx.studentProgressDailyEntry.createMany({ data: fresh.flatMap(studentId => ["2026-06", "2026-07"].map(month => ({
          tenantId: ids.tenants[0], progressMonthId: `${studentId}${month}`, entryDate: new Date(`${month}-01`),
          entryType: "note" as const, note: month === "2026-07" ? `Owned ${studentId}` : "WRONG MONTH",
          createdById: ids.users[0],
        }))) });
      });
      learnerIds.push(...added.map(row => row.id));
      const samples: number[] = [];
      const bytes: number[] = [];
      const seen: string[] = [];
      const read = async (offset: number, remember = false) => {
        capture = [];
        const started = performance.now();
        const response = await request(offset);
        const raw = await response.text();
        samples.push(performance.now() - started);
        bytes.push(Buffer.byteLength(raw));
        const operations = capture;
        capture = undefined;
        assert.equal(response.status, 200, raw);
        const data = JSON.parse(raw).data;
        const expected = learnerIds.slice(offset, offset + 50);
        assert.equal(data.total, size);
        assert.deepEqual(data.rows.map((row: any) => row.student_id), expected);
        assert.equal(data.next_offset, offset + expected.length < size ? offset + expected.length : null);
        for (const row of data.rows) {
          assert.equal(row.note, `Owned ${row.student_id}`);
          assert.notEqual(row.student_id, ids.students[1], "Foreign seeded student must stay hidden");
        }
        const progress = operations.filter(op => op.model === "StudentProgressMonth");
        assert.equal(progress.length, 1, "One measured batched progress operation per page, no per-row hydration");
        assert.equal(progress[0].action, "findMany");
        assert.equal(condition(progress[0].where, "month"), "2026-07", "Never hydrate every month");
        assert.equal(condition(progress[0].where, "tenantId"), ids.tenants[0]);
        assert.deepEqual(condition(progress[0].where, "studentId").in, expected);
        assert.equal(progress[0].rows, expected.length, "Only this page's progress rows hydrate");
        for (const model of ["Attendance", "MonthlyFeeLine", "MonthlyFee"]) {
          const calls = operations.filter(op => op.model === model && op.action === "findMany");
          assert.equal(calls.length, 1, `${model} must be batched, measured at Prisma boundary`);
          assert.deepEqual(condition(calls[0].where, "studentId").in, expected);
        }
        if (remember) seen.push(...expected);
      };
      for (let offset = 0; offset < size; offset += 50) await read(offset, true);
      assert.deepEqual(seen, learnerIds, "All pages cover every active learner exactly once");
      await read(1);
      await read(size);
      for (let sample = 0; sample < 5; sample++) await read(0);
      await expectJson(await request(0, 51), [400]);
      await expectJson(await request(-1), [400]);
      await expectJson(await request(501), [400]);
      const sorted = [...samples].sort((a, b) => a - b);
      const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
      assert.ok(p95 < 15_000, "Generous local sanity ceiling; not a production SLA");
      assert.ok(Math.max(...bytes) < 1_000_000, "Bounded 50-row response sanity ceiling");
      t.diagnostic(JSON.stringify({ event: "local_roster_load", learners: size, samples_ms: samples,
        p95_ms: p95, payload_bytes: bytes, measurement: "HTTP body complete; Prisma model operations; not SQL query count or production SLA" }));
    });
  } finally {
    capture = undefined;
    try { await http?.close(); } finally {
      try { if (owned) await cleanupBusinessFixtures(db, target, ids); }
      finally { await db.$disconnect(); await routerDb.$disconnect(); }
    }
  }
});
