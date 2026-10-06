import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import type { PrismaClient } from "@prisma/client";
import { assertTuitionProgressDatabaseIdentity, type TestTarget } from "../../lib/tuition-progress-test-target.js";
import { createTestRequest, createTestResponse } from "../../lib/request-response-adapter.js";

export async function startBusinessHttp() {
  const { default: router } = await import("../../api/router.js");
  const server = createServer(async (incoming, outgoing) => {
    try {
      const url = new URL(incoming.url!, "http://127.0.0.1");
      const chunks: Buffer[] = [];
      for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
      const response = createTestResponse();
      await router(createTestRequest({ method: incoming.method, headers: incoming.headers,
        query: { ...Object.fromEntries(url.searchParams), path: url.pathname.replace(/^\/api\//, "") },
        body: chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : undefined,
      }), response.res);
      const body = response.state.body;
      const binary = Buffer.isBuffer(body) || body instanceof Uint8Array;
      outgoing.writeHead(response.state.statusCode, {
        ...(!response.headers["content-type"] && !binary ? { "content-type": "application/json" } : {}),
        ...response.headers,
      });
      outgoing.end(binary || typeof body === "string" ? body : JSON.stringify(body));
    } catch {
      outgoing.writeHead(500, { "content-type": "application/json" });
      outgoing.end(JSON.stringify({ error: { code: "TEST_HTTP_ADAPTER_FAILURE" } }));
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return {
    base: `http://127.0.0.1:${address.port}/api`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
      server.closeAllConnections();
    }),
  };
}

export function httpRequest(base: string, path: string, token?: string, method = "GET", body?: unknown) {
  return fetch(`${base}/${path}`, { method,
    headers: { "content-type": "application/json", "x-forwarded-for": "127.0.0.1",
      ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20_000),
  });
}

export async function expectJson(response: Response, statuses: number[] = [200]) {
  const body = await response.json() as any;
  assert.ok(statuses.includes(response.status), `HTTP ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

export async function assertDatabaseTarget(db: PrismaClient, target: TestTarget) {
  const identity = await db.$queryRaw<Array<{ database: string; schema: string }>>`
    SELECT current_database() AS database, current_schema() AS schema`;
  assertTuitionProgressDatabaseIdentity(identity, target);
}

export function fixtureIds(purpose: "http" | "browser" = "http") {
  const run = `c${randomUUID().replaceAll("-", "")}${purpose}`;
  return { run, purpose, tenants: [`${run}a`, `${run}b`], users: [`${run}admin`, `${run}desk`],
    teacher: `${run}teacher`, classId: `${run}class`, students: [`${run}student`, `${run}foreign`],
    parents: [`${run}parent`, `${run}foreignparent`], regular: `${run}regular`, extra: `${run}extra` };
}
export type FixtureIds = ReturnType<typeof fixtureIds>;

export async function seedBusinessFixtures(db: PrismaClient, ids: FixtureIds, password: string) {
  const { default: bcrypt } = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(password, 10);
  const tenantId = ids.tenants[0];
  await db.$transaction(async tx => {
    for (const id of ids.tenants) await tx.tenant.create({ data: { id, slug: id,
      name: ids.purpose === "browser" ? "TPR browser fixture" : "TPR HTTP fixture" } });
    for (const [i, id] of ids.users.entries()) await tx.user.create({ data: {
      id, tenantId, username: id, fullName: "TPR fixture staff", passwordHash,
      role: i === 0 ? "admin" : "receptionist",
    } });
    await tx.teacher.create({ data: { id: ids.teacher, tenantId, fullName: "TPR teacher",
      phone: ids.teacher, salaryType: "hourly", salaryAmount: 0 } });
    await tx.class.create({ data: { id: ids.classId, tenantId, className: "Movers TPR fixture",
      teacherId: ids.teacher, startTime: "09:00", endTime: "10:00", feePerDay: 90_000,
      billingPolicy: "per_session", scheduleDays: [1, 3], sessionsPerWeek: 2 } });
    for (const [i, id] of ids.parents.entries()) await tx.parent.create({ data: {
      id, tenantId: ids.tenants[i], fullName: "TPR parent", phone: id, relationship: "mother",
    } });
    for (const [i, id] of ids.students.entries()) await tx.student.create({ data: {
      id, tenantId: ids.tenants[i], fullName: "TPR student", parentId: ids.parents[i],
      dateOfBirth: new Date("2015-01-01T00:00:00Z"), gender: "other",
      enrollmentDate: new Date("2026-06-01T00:00:00Z"),
    } });
    await tx.studentClass.create({ data: { tenantId, studentId: ids.students[0], classId: ids.classId,
      enrollmentDate: new Date("2026-06-01T00:00:00Z") } });
    await tx.enrollmentPeriod.create({ data: { tenantId, studentId: ids.students[0], classId: ids.classId,
      startedAt: new Date("2026-06-01T00:00:00Z"), source: "tpr_http_fixture" } });
    for (const [i, id] of [ids.regular, ids.extra].entries()) {
      const date = new Date(`2026-06-${i === 0 ? "01" : "03"}T00:00:00Z`);
      await tx.classSession.create({ data: { id, tenantId, classId: ids.classId, sessionDate: date,
        billingMonth: "2026-06", kind: i === 0 ? "regular" : "extra", status: "held",
        extraFeeMode: i === 0 ? "included" : "surcharge", createdById: ids.users[0] } });
      await tx.attendance.create({ data: { tenantId, studentId: ids.students[0], classId: ids.classId,
        classSessionId: id, attendanceDate: date, status: "present", createdById: ids.users[0] } });
    }
    await tx.classMonthPlan.create({ data: { tenantId, classId: ids.classId,
      billingMonth: "2026-06", state: "open", createdById: ids.users[0] } });
    await tx.attendancePeriod.create({ data: { tenantId, classId: ids.classId,
      periodMonth: "2026-06", status: "open" } });
  });
}

export async function loginFixture(base: string, db: PrismaClient, ids: FixtureIds, index: number, password: string) {
  const { data } = await expectJson(await httpRequest(base, "auth/login", undefined, "POST", {
    username: ids.users[index], password, tenant_slug: ids.tenants[0],
  }));
  assert.equal(typeof data.token, "string");
  const sessions = await db.authSession.findMany({ where: { tenantId: ids.tenants[0], userId: ids.users[index] } });
  assert.equal(sessions.length, 1, "Independent client observes authenticated session");
  assert.equal(sessions[0].revokedAt, null);
  return data.token as string;
}

export async function cleanupBusinessFixtures(db: PrismaClient, target: TestTarget, ids: FixtureIds) {
  assertIntegrationFixtureCleanup(ids);
  await assertDatabaseTarget(db, target);
  const tenants = await db.tenant.findMany({ where: { id: { in: ids.tenants } }, select: { id: true, name: true } });
  assert.ok(tenants.every(tenant => tenant.name === "TPR HTTP fixture"), "Refusing cleanup of non-owned browser or unknown fixtures");
  const where = { tenantId: { in: ids.tenants } };
  const auditHistory = await db.settingRevision.findMany({ where, orderBy: { id: "asc" } });
  if (auditHistory.length) {
    const { createHash } = await import("node:crypto");
    const fingerprint = (rows: unknown) => createHash("sha256").update(JSON.stringify(rows)).digest("hex");
    const before = fingerprint(auditHistory);
    const after = fingerprint(await db.settingRevision.findMany({ where, orderBy: { id: "asc" } }));
    assert.equal(after, before, "Append-only fixture history must be preserved, not trigger-bypassed");
    console.log(JSON.stringify({ event: "test_fixture_retained", purpose: "http", reason: "append_only_setting_history",
      tenantCount: tenants.length, revisionCount: auditHistory.length, fingerprint: before }));
    return;
  }
  // Child rows precede parent rows; every deletion is limited to this run's two tenants.
  await db.$transaction(async tx => {
    await tx.activityLog.deleteMany({ where });
    await tx.settingRevision.deleteMany({ where });
    await tx.settingValue.deleteMany({ where });
    await tx.studentProgressRevision.deleteMany({ where });
    await tx.studentProgressDailyEntry.deleteMany({ where });
    await tx.studentProgressSkill.deleteMany({ where });
    await tx.studentProgressMonth.deleteMany({ where });
    await tx.monthlyFeeLineRevision.deleteMany({ where });
    await tx.receiptLine.deleteMany({ where });
    await tx.monthlyFeeLine.deleteMany({ where });
    await tx.monthlyFee.deleteMany({ where });
    await tx.receipt.deleteMany({ where });
    await tx.attendance.deleteMany({ where });
    await tx.classMonthPlanRevision.deleteMany({ where });
    await tx.classMonthPlan.deleteMany({ where });
    await tx.attendancePeriod.deleteMany({ where });
    await tx.classSession.deleteMany({ where });
    await tx.enrollmentPeriod.deleteMany({ where });
    await tx.studentClass.deleteMany({ where });
    await tx.student.deleteMany({ where });
    await tx.class.deleteMany({ where });
    await tx.teacher.deleteMany({ where });
    await tx.parent.deleteMany({ where });
    await tx.authSession.deleteMany({ where });
    await tx.user.deleteMany({ where });
    await tx.tenant.deleteMany({ where: { id: { in: ids.tenants } } });
  });
  const table = await db.$queryRaw<Array<{ name: string | null }>>`SELECT to_regclass('auth_rate_limit')::text AS name`;
  if (table[0]?.name) for (const username of ids.users) {
    const bucket = `login:127.0.0.1:${username}`;
    await db.$executeRaw`DELETE FROM auth_rate_limit WHERE bucket_key = ${bucket}`;
    const rows = await db.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) AS count FROM auth_rate_limit WHERE bucket_key = ${bucket}`;
    assert.equal(rows[0].count, 0n);
  }
  assert.equal(await db.tenant.count({ where: { id: { in: ids.tenants } } }), 0);
  for (const model of [db.user, db.student, db.studentProgressMonth, db.studentProgressRevision,
    db.monthlyFee, db.monthlyFeeLine, db.authSession, db.activityLog]) {
    assert.equal(await (model as any).count({ where }), 0, "Fixture cleanup leaves no owned rows");
  }
}

export function assertIntegrationFixtureCleanup(ids: FixtureIds) {
  assert.equal(ids.purpose, "http", "Only an HTTP-owned fixture may be cleaned by this helper");
  assert.ok(/^c[0-9a-f]{32}http$/.test(ids.run), "Fixture cleanup requires explicit HTTP ownership marker");
  assert.deepEqual(ids.tenants, [`${ids.run}a`, `${ids.run}b`]);
}

type BusinessRequest = (path: string, token?: string, method?: string, body?: unknown) => Promise<Response>;

export async function assertGraderRejections(db: PrismaClient, ids: FixtureIds, request: BusinessRequest,
  token: string, dailyBody: { entries: Array<Record<string, unknown>> }) {
  const tenantId = ids.tenants[0];
  const wrongTeacher = await db.teacher.create({ data: { tenantId, fullName: "Unassigned fixture grader",
    phone: `${ids.run}wronggrader`, salaryType: "hourly", salaryAmount: 0 } });
  const readback = () => db.studentProgressMonth.findMany({ where: { tenantId }, orderBy: { id: "asc" },
    include: { dailyEntries: { orderBy: { id: "asc" } }, skills: { orderBy: { id: "asc" } },
      revisions: { orderBy: { id: "asc" } } } });
  const before = await readback();
  const denied = await expectJson(await request("student-progress/daily", token, "PUT", {
    ...dailyBody, entries: dailyBody.entries.map(entry => ({ ...entry, graded_by_teacher_id: wrongTeacher.id })),
  }), [400]);
  assert.equal(denied.error.code, "GRADER_NOT_ASSIGNED");
  assert.deepEqual(await readback(), before, "Wrong grader changes neither rows nor rollup/revision values");
  await db.teacher.update({ where: { id: ids.teacher }, data: { status: "inactive" } });
  try {
    const inactive = await expectJson(await request("student-progress/daily", token, "PUT", dailyBody), [400]);
    assert.equal(inactive.error.code, "GRADER_NOT_ASSIGNED");
    assert.deepEqual(await readback(), before, "Inactive grader changes neither rows nor rollup/revision values");
  } finally {
    await db.teacher.update({ where: { id: ids.teacher }, data: { status: "active" } });
  }
}

export async function assertEffectiveTrackParity(db: PrismaClient, ids: FixtureIds, request: BusinessRequest,
  token: string, dailyBody: Record<string, unknown>) {
  const tenantId = ids.tenants[0];
  const { getSettingDefinition } = await import("../../lib/settings-registry.js");
  const defaults = getSettingDefinition("academic.track_catalog").defaultValue as Array<Record<string, unknown>>;
  const catalog = (track: string) => defaults.map(row => ({ ...row,
    keywords: row.key === track ? ["tprsignature"] : row.keywords,
  }));
  const oldClass = await db.class.findUniqueOrThrow({ where: { id: ids.classId } });
  const settingIds = [`${ids.run}trackaug`, `${ids.run}tracksep`, `${ids.run}foreigntrack`];
  await db.$transaction(async tx => {
    await tx.class.update({ where: { id: ids.classId }, data: { className: "TPRsignature cohort" } });
    for (const [i, id] of settingIds.entries()) await tx.settingValue.create({ data: {
      id, tenantId: i === 2 ? ids.tenants[1] : tenantId, key: "academic.track_catalog",
      value: catalog(i === 0 ? "movers" : i === 1 ? "flyers" : "pet") as any,
      effectiveFromMonth: i === 1 ? "2026-09" : "2026-08", revision: 1, updatedById: ids.users[0],
    } });
    for (const id of ids.tenants) await tx.tenant.update({ where: { id }, data: { configVersion: { increment: 1 } } });
  });
  try {
    for (const [month, track] of [["2026-08", "movers"], ["2026-09", "flyers"]]) {
      const identity = { student_id: ids.students[0], class_id: ids.classId, month };
      const saved = await expectJson(await request("student-progress/daily", token, "PUT", {
        ...dailyBody, entry_date: `${month}-01`,
      }));
      assert.equal(saved.data.progress_month.track_key, track, "Daily resolves tenant keyword for effective month");
      const finalized = await expectJson(await request("student-progress", undefined, "PUT", {
        ...identity, finalized: true,
      }), [200, 201]);
      assert.equal(finalized.data.progress_month.track_key, track);
      assert.equal(finalized.data.assessment.trackKey, track, "Monthly uses the same effective tenant track");
      assert.equal(finalized.data.progress_month.progress_score, 80);
      const stored = await db.studentProgressMonth.findFirstOrThrow({
        where: { tenantId, studentId: ids.students[0], classId: ids.classId, month }, include: { revisions: true },
      });
      assert.equal(stored.trackKey, track);
      assert.equal(stored.revisions.length, 1);
      assert.equal((stored.revisions[0].snapshot as any).track_key, track);
      const reload = await expectJson(await request(`student-progress?${new URLSearchParams(identity)}`));
      assert.equal(reload.data.progress_months[0].track_key, track);
    }
  } finally {
    await db.$transaction(async tx => {
      await tx.settingValue.deleteMany({ where: { id: { in: settingIds }, tenantId: { in: ids.tenants } } });
      await tx.class.update({ where: { id: ids.classId }, data: { className: oldClass.className } });
      for (const id of ids.tenants) await tx.tenant.update({ where: { id }, data: { configVersion: { increment: 1 } } });
    });
  }
}
