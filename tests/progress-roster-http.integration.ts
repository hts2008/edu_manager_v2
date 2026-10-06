import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { bindTuitionProgressTestTarget, resolveTuitionProgressTestTarget } from "../lib/tuition-progress-test-target.js";
import { assertDatabaseTarget, cleanupBusinessFixtures, expectJson, fixtureIds, httpRequest,
  loginFixture, seedBusinessFixtures, startBusinessHttp } from "./helpers/tuition-progress-http.js";

const target = resolveTuitionProgressTestTarget(process.env);
if (target) bindTuitionProgressTestTarget(process.env, target);

test("real authenticated progress roster CAS and durable replay", {
  skip: target ? false : "NOT RUN: isolated TEST_DATABASE_URL absent (development only)", timeout: 120_000,
}, async t => {
  assert.ok(target);
  assert.equal(globalThis.prisma, undefined);
  process.env.TENANCY_MODE = "enforced";
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient({ datasources: { db: { url: target.url } } });
  const { prisma: routerDb } = await import("../lib/prisma.js");
  const { setAuthConfigForTests } = await import("../lib/auth-config.js");
  const ids = fixtureIds("http");
  const tenantId = ids.tenants[0];
  const permissionId = `${ids.run}deniedgrade`;
  let http: Awaited<ReturnType<typeof startBusinessHttp>> | undefined;
  let ownsFixtures = false;
  try {
    assert.notEqual(db, routerDb);
    await assertDatabaseTarget(db, target);
    await assertDatabaseTarget(routerDb, target);
    setAuthConfigForTests({ secret: randomUUID() + randomUUID(), issuer: "roster-http-test",
      audience: "roster-http-test", algorithm: "HS256" });
    const password = randomUUID();
    await seedBusinessFixtures(db, ids, password);
    ownsFixtures = true;
    http = await startBusinessHttp();
    const admin = await loginFixture(http.base, db, ids, 0, password);
    const receptionist = await loginFixture(http.base, db, ids, 1, password);
    const date = "2026-07-01";
    const route = "student-progress/roster";
    const query = new URLSearchParams({ class_id: ids.classId, month: "2026-07", entry_date: date });
    const request = (path: string, token = admin, method = "GET", body?: unknown) =>
      httpRequest(http!.base, path, token, method, body);
    const readRow = async (token = admin) => {
      const result = await expectJson(await request(`${route}?${query}`, token));
      assert.equal(result.data.total, 1);
      assert.equal(result.data.rows.length, 1);
      const row = result.data.rows[0];
      assert.equal(row.student_id, ids.students[0]);
      assert.match(row.evidence_version, /^[a-f0-9]{64}$/);
      return row;
    };
    const patch = (row: any, changes = { listening: 80 }) => ({ student_id: ids.students[0],
      class_id: ids.classId, entry_date: date, expected_evidence_version: row.evidence_version,
      operation_id: randomUUID(), changes });
    const progressSnapshot = () => db.studentProgressMonth.findMany({ where: { tenantId }, orderBy: { id: "asc" },
      include: { dailyEntries: { orderBy: { id: "asc" } }, skills: { orderBy: { id: "asc" } },
        revisions: { orderBy: { revisionNumber: "asc" } } } });
    const operationLogs = () => db.activityLog.findMany({ where: { tenantId,
      entityType: "progress_grid_operation" }, orderBy: { id: "asc" } });

    await t.test("simultaneous identical operation commits one evidence row and one durable operation log", async () => {
      assert.equal((await httpRequest(http!.base, `${route}?${query}`)).status, 401);
      const original = await readRow();
      const body = { ...patch(original), note: "<b>Plain-text roster fixture</b>" };
      const responses = await Promise.all([request(route, admin, "PATCH", body), request(route, admin, "PATCH", body)]);
      const results = await Promise.all(responses.map(response => expectJson(response)));
      assert.deepEqual(results[0].data.row, results[1].data.row);
      const logs = await db.activityLog.findMany({ where: { tenantId, userId: ids.users[0],
        entityType: "progress_grid_operation", entityId: body.operation_id } });
      assert.equal(logs.length, 1, "Concurrent identical requests persist exactly one operation record");
      assert.equal(JSON.parse(logs[0].action).type, "progress.grid.save");
      assert.equal(logs[0].ipAddress, "127.0.0.1");
      const stored = await progressSnapshot();
      assert.equal(stored.length, 1);
      assert.equal(stored[0].dailyEntries.filter(e => e.entryType === "skill_assessment").length, 1);
      assert.equal(stored[0].dailyEntries.find(e => e.entryType === "skill_assessment")!.score, 80);
      assert.equal(stored[0].dailyEntries.find(e => e.entryType === "skill_assessment")!.examSetLevel, null);
      assert.equal(stored[0].dailyEntries.find(e => e.entryType === "skill_assessment")!.difficultyLevel, null);
      assert.equal(stored[0].dailyEntries.filter(e => e.entryType === "note").length, 1);
      assert.equal(stored[0].progressScore, 80);
      const replay = await expectJson(await request(route, admin, "PATCH", body));
      assert.deepEqual(replay.data.row, results[0].data.row);
      assert.deepEqual(await progressSnapshot(), stored, "Durable later replay does not touch evidence or timestamps");
      assert.equal((await operationLogs()).length, 1);
      const reused = await expectJson(await request(route, admin, "PATCH", { ...body, changes: { listening: 90 } }), [409]);
      assert.equal(reused.error.code, "ROSTER_OPERATION_REUSED");
      assert.deepEqual(await progressSnapshot(), stored);
      await db.class.update({ where: { id: ids.classId, tenantId }, data: { status: "inactive" } });
      try {
        const ineligibleReplay = await expectJson(await request(route, admin, "PATCH", body));
        assert.deepEqual(ineligibleReplay.data.row, results[0].data.row);
        assert.deepEqual(await progressSnapshot(), stored);
        assert.equal((await operationLogs()).length, 1);
      } finally {
        await db.class.update({ where: { id: ids.classId, tenantId }, data: { status: "active" } });
      }
      await db.teacher.update({ where: { id: ids.teacher, tenantId }, data: { status: "inactive" } });
      try {
        const replay = await expectJson(await request(route, admin, "PATCH", body));
        assert.deepEqual(replay.data.row, results[0].data.row);
        assert.deepEqual(await progressSnapshot(), stored);
        assert.equal((await operationLogs()).length, 1);
      } finally {
        await db.teacher.update({ where: { id: ids.teacher, tenantId }, data: { status: "active" } });
      }
    });

    await t.test("zero and null change exactly the selected assessment without losing other evidence", async () => {
      await expectJson(await request(route, admin, "PATCH", {
        ...patch(await readRow()), changes: { reading: 65, speaking: 75 } }));
      const before = (await progressSnapshot())[0];
      const untouched = before.dailyEntries.filter(e => e.skillKey !== "listening");
      const original = before.dailyEntries.find(e => e.skillKey === "listening")!;
      const zero = await expectJson(await request(route, admin, "PATCH", patch(await readRow(), { listening: 0 })));
      assert.equal(zero.data.row.skills.listening.score, 0);
      const afterZero = (await progressSnapshot())[0];
      assert.deepEqual(afterZero.dailyEntries.filter(e => e.skillKey !== "listening"), untouched);
      const changed = afterZero.dailyEntries.find(e => e.id === original.id)!;
      assert.deepEqual({ ...changed, score: original.score, updatedAt: original.updatedAt }, original);
      const cleared = await expectJson(await request(route, admin, "PATCH", {
        ...patch(await readRow()), changes: { listening: null } }));
      assert.equal(cleared.data.row.skills.listening.count, 0);
      assert.equal(cleared.data.row.skills.listening.score, null);
      assert.deepEqual((await progressSnapshot())[0].dailyEntries, untouched);
    });

    await t.test("different concurrent requests from one snapshot commit once and conflict once", async () => {
      const row = await readRow();
      const before = await operationLogs();
      const responses = await Promise.all([request(route, admin, "PATCH", patch(row, { listening: 31 })),
        request(route, admin, "PATCH", patch(row, { listening: 82 }))]);
      assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
      const winner = await expectJson(responses.find(r => r.status === 200)!);
      const loser = await expectJson(responses.find(r => r.status === 409)!, [409]);
      assert.equal(loser.error.code, "ROSTER_EVIDENCE_CONFLICT");
      assert.deepEqual(await readRow(), winner.data.row);
      assert.equal((await operationLogs()).length, before.length + 1);
    });

    await t.test("finalized month denies patches without evidence or operation writes", async () => {
      const record = (await progressSnapshot())[0];
      await db.studentProgressMonth.update({ where: { id: record.id, tenantId }, data: { finalizedAt: new Date() } });
      try {
        const row = await readRow();
        assert.equal(row.is_finalized, true);
        const before = await progressSnapshot();
        const logs = await operationLogs();
        const rejected = await expectJson(await request(route, admin, "PATCH", patch(row)), [409]);
        assert.equal(rejected.error.code, "PROGRESS_MONTH_FINALIZED");
        assert.deepEqual(await progressSnapshot(), before);
        assert.deepEqual(await operationLogs(), logs);
      } finally {
        await db.studentProgressMonth.update({ where: { id: record.id, tenantId }, data: { finalizedAt: null } });
      }
    });

    await t.test("multiple assessments are read-only and reject update or deletion atomically", async () => {
      const record = (await progressSnapshot())[0];
      const duplicate = await db.studentProgressDailyEntry.create({ data: { tenantId, progressMonthId: record.id,
        entryDate: new Date(`${date}T00:00:00Z`), entryType: "skill_assessment", skillKey: "listening",
        score: 50, createdById: ids.users[0], gradedByTeacherId: ids.teacher } });
      try {
        const row = await readRow();
        assert.equal(row.skills.listening.count, 2);
        assert.equal(row.skills.listening.editable, false);
        const before = await progressSnapshot();
        const logs = await operationLogs();
        for (const score of [0, null]) {
          const rejected = await expectJson(await request(route, admin, "PATCH", {
            ...patch(row), changes: { listening: score, writing: 99 } }), [409]);
          assert.equal(rejected.error.code, "MULTIPLE_ASSESSMENTS");
          assert.deepEqual(await progressSnapshot(), before);
          assert.deepEqual(await operationLogs(), logs);
        }
      } finally {
        await db.studentProgressDailyEntry.deleteMany({ where: { id: duplicate.id, tenantId, progressMonthId: record.id } });
      }
    });

    await t.test("stale effective rubric returns conflict with no evidence or operation writes", async () => {
      const old = await readRow();
      const before = await progressSnapshot();
      const logs = await operationLogs();
      await db.$transaction(async tx => {
        await tx.settingValue.create({ data: { id: `${ids.run}rubric`, tenantId,
          key: "academic.score_blend", effectiveFromMonth: "2026-07", revision: 1,
          value: { skill: .6, attendance: .2, consistency: .2 }, updatedById: ids.users[0] } });
        await tx.tenant.update({ where: { id: tenantId }, data: { configVersion: { increment: 1 } } });
      });
      const current = await readRow();
      assert.notEqual(current.evidence_version, old.evidence_version);
      const rejected = await expectJson(await request(route, admin, "PATCH", patch(old)), [409]);
      assert.equal(rejected.error.code, "ROSTER_EVIDENCE_CONFLICT");
      assert.deepEqual(await progressSnapshot(), before);
      assert.deepEqual(await operationLogs(), logs);
    });

    await t.test("explicit creation calibration persists while score updates preserve original metadata", async () => {
      const entryDate = "2026-07-02";
      const calibrationRow = async () => {
        const result = await expectJson(await request(`${route}?${new URLSearchParams({
          class_id: ids.classId, month: "2026-07", entry_date: entryDate })}`));
        return result.data.rows[0];
      };
      const body = { ...patch(await calibrationRow()), entry_date: entryDate, changes: { reading: 60 },
        note: "Calibration evidence outside an attendance date",
        assessment_context: { exam_set_level: "flyers", difficulty_level: "hard" } };
      await expectJson(await request(route, admin, "PATCH", body));
      const created = await db.studentProgressDailyEntry.findFirstOrThrow({ where: { tenantId,
        entryDate: new Date(`${entryDate}T00:00:00Z`), entryType: "skill_assessment", skillKey: "reading" } });
      assert.equal(created.examSetLevel, "flyers");
      assert.equal(created.difficultyLevel, "hard");
      assert.equal(created.gradedByTeacherId, ids.teacher);
      const updatedBody = { ...patch(await calibrationRow()), entry_date: entryDate, changes: { reading: 0 },
        note: "Calibration evidence outside an attendance date",
        assessment_context: { exam_set_level: "ket", difficulty_level: "easy" } };
      await expectJson(await request(route, admin, "PATCH", updatedBody));
      const updated = await db.studentProgressDailyEntry.findUniqueOrThrow({ where: { id: created.id, tenantId } });
      assert.equal(updated.score, 0);
      assert.equal(updated.examSetLevel, created.examSetLevel);
      assert.equal(updated.difficultyLevel, created.difficultyLevel);
      assert.equal(updated.gradedByTeacherId, created.gradedByTeacherId);
      assert.equal(updated.createdById, created.createdById);
      assert.equal(await db.studentProgressDailyEntry.count({ where: { tenantId,
        entryDate: created.entryDate, entryType: "skill_assessment", skillKey: "reading" } }), 1);
    });

    await t.test("stale active grader assignment conflicts and deactivated grader cannot write", async () => {
      const old = await readRow();
      const before = await progressSnapshot();
      const logs = await operationLogs();
      const teacher = await db.teacher.create({ data: { id: `${ids.run}replacement`, tenantId,
        fullName: "Roster replacement fixture", phone: `${ids.run}replacement`, salaryType: "hourly", salaryAmount: 0 } });
      await db.class.update({ where: { id: ids.classId, tenantId }, data: { teacherId: teacher.id } });
      const current = await readRow();
      assert.equal(current.graded_by_teacher_id, teacher.id);
      assert.notEqual(current.evidence_version, old.evidence_version);
      const stale = await expectJson(await request(route, admin, "PATCH", patch(old)), [409]);
      assert.equal(stale.error.code, "ROSTER_EVIDENCE_CONFLICT");
      await db.teacher.update({ where: { id: teacher.id, tenantId }, data: { status: "inactive" } });
      const inactive = await expectJson(await request(route, admin, "PATCH", patch(current)), [409]);
      assert.equal(inactive.error.code, "GRADER_NOT_ASSIGNED");
      assert.deepEqual(await progressSnapshot(), before);
      assert.deepEqual(await operationLogs(), logs);
      await db.class.update({ where: { id: ids.classId, tenantId }, data: { teacherId: ids.teacher } });
    });

    await t.test("foreign-authored assessments and notes reject update/delete without writes", async () => {
      const entryDate = "2026-07-03";
      const readDay = async (token: string) => (await expectJson(await request(`${route}?${new URLSearchParams({
        class_id: ids.classId, month: "2026-07", entry_date: entryDate })}`, token))).data.rows[0];
      await expectJson(await request(route, receptionist, "PATCH", { ...patch(await readDay(receptionist)),
        entry_date: entryDate, changes: { writing: 70 }, note: "Receptionist-authored evidence context" }));
      const before = await progressSnapshot();
      const logs = await operationLogs();
      for (const mutation of [{ changes: { writing: 90 } }, { changes: { writing: null } },
        { changes: {}, note: "Override another author's note" }, { changes: {}, note: "" }]) {
        const rejected = await expectJson(await request(route, admin, "PATCH", {
          ...patch(await readDay(admin)), entry_date: entryDate, ...mutation }), [403]);
        assert.equal(rejected.error.code, "EVIDENCE_NOT_OWNED");
        assert.deepEqual(await progressSnapshot(), before);
        assert.deepEqual(await operationLogs(), logs);
      }
    });

    await t.test("clearing last contextual note outside attendance rolls back all mutations", async () => {
      const before = await progressSnapshot();
      const logs = await operationLogs();
      const rejected = await expectJson(await request(route, admin, "PATCH", {
        ...patch(await readRow()), changes: { listening: 90 }, note: "" }), [400]);
      assert.equal(rejected.error.code, "NON_ATTENDANCE_NOTE_REQUIRED");
      assert.deepEqual(await progressSnapshot(), before);
      assert.deepEqual(await operationLogs(), logs);
    });

    await t.test("empty owned note on attendance day deletes note but preserves assessment", async () => {
      const entryDate = "2026-06-01";
      const readDay = async () => (await expectJson(await request(`${route}?${new URLSearchParams({
        class_id: ids.classId, month: "2026-06", entry_date: entryDate })}`))).data.rows[0];
      await expectJson(await request(route, admin, "PATCH", { ...patch(await readDay()),
        entry_date: entryDate, changes: { listening: 40 }, note: "Owned attendance-day context" }));
      await expectJson(await request(route, admin, "PATCH", { ...patch(await readDay()),
        entry_date: entryDate, changes: {}, note: "" }));
      const day = await db.studentProgressDailyEntry.findMany({ where: { tenantId,
        entryDate: new Date(`${entryDate}T00:00:00Z`) } });
      assert.equal(day.length, 1);
      assert.equal(day[0].entryType, "skill_assessment");
      assert.equal(day[0].score, 40);
      assert.equal(day[0].examSetLevel, null);
      assert.equal(day[0].difficultyLevel, null);
    });

    await t.test("persisted progress.grade denial allows viewing but prevents any business writes", async () => {
      await db.$transaction(async tx => {
        await tx.rolePermission.create({ data: { id: permissionId, tenantId, role: "receptionist",
          permissionKey: "progress.grade", allowed: false, updatedById: ids.users[0] } });
        await tx.tenant.update({ where: { id: tenantId }, data: { configVersion: { increment: 1 } } });
      });
      const row = await readRow(receptionist);
      const before = await progressSnapshot();
      const logs = await operationLogs();
      const denied = await expectJson(await request(route, receptionist, "PATCH", patch(row)), [403]);
      assert.equal(denied.error.code, "PERMISSION_DENIED");
      assert.deepEqual(await progressSnapshot(), before);
      assert.deepEqual(await operationLogs(), logs);
    });

    await t.test("foreign tenant class GET and student PATCH return404 without leaking or mutating evidence", async () => {
      const foreignClass = `${ids.run}foreignclass`;
      await db.class.create({ data: { id: foreignClass, tenantId: ids.tenants[1], className: "Foreign roster fixture",
        startTime: "09:00", endTime: "10:00", feePerDay: 0, scheduleDays: [1], sessionsPerWeek: 1 } });
      const foreignRead = await expectJson(await request(`${route}?${new URLSearchParams({
        class_id: foreignClass, month: "2026-07", entry_date: date })}`), [404]);
      assert.equal(foreignRead.error.code, "CLASS_NOT_FOUND");
      assert.equal(foreignRead.data, undefined);
      const row = await readRow();
      const before = await progressSnapshot();
      const logs = await operationLogs();
      const denied = await expectJson(await request(route, admin, "PATCH", { ...patch(row), student_id: ids.students[1] }), [404]);
      assert.equal(denied.error.code, "ENROLLMENT_NOT_FOUND");
      const classDenied = await expectJson(await request(route, admin, "PATCH", { ...patch(row), class_id: foreignClass }), [404]);
      assert.equal(classDenied.error.code, "CLASS_NOT_FOUND");
      assert.deepEqual(await progressSnapshot(), before);
      assert.deepEqual(await operationLogs(), logs);
      assert.equal(await db.studentProgressMonth.count({ where: { tenantId: ids.tenants[1] } }), 0);
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
