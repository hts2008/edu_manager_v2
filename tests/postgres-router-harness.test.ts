import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";
import { resolveTuitionProgressTestTarget, bindTuitionProgressTestTarget,
  assertTuitionProgressDatabaseIdentity } from "../lib/tuition-progress-test-target.js";
import {
  createTestRequest,
  createTestResponse,
} from "../lib/request-response-adapter.js";

const target = resolveTuitionProgressTestTarget(process.env);
if (target) bindTuitionProgressTestTarget(process.env, target);

test("real HTTP login persists session; tenant teacher read and revocation fail closed", {
  skip: target ? false : "NOT RUN: isolated TEST_DATABASE_URL absent (development only)", timeout: 60_000,
}, async () => {
  assert.ok(target);
  assert.equal(globalThis.prisma, undefined, "Runtime Prisma initialized before target binding");
  process.env.TENANCY_MODE = "enforced";
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient({ datasources: { db: { url: target.url } } });
  const { prisma: routerDb } = await import("../lib/prisma.js");
  const prefix = `tpr-${randomUUID()}`;
  const tenants = [`${prefix}-a`, `${prefix}-b`];
  const teachers = [`${prefix}-teacher-a`, `${prefix}-teacher-b`];
  let cleanup: (() => Promise<void>) | undefined;
  let close: (() => Promise<void>) | undefined;
  try {
    assert.notEqual(db, routerDb);
    for (const client of [db, routerDb]) {
      const rows = await client.$queryRaw<Array<{ database: string; schema: string }>>`
        SELECT current_database() AS database, current_schema() AS schema`;
      assertTuitionProgressDatabaseIdentity(rows, target);
    }
    const { setAuthConfigForTests } = await import("../lib/auth-config.js");
    setAuthConfigForTests({ secret: randomUUID() + randomUUID(), issuer: "tpr-test", audience: "tpr-test", algorithm: "HS256" });
    const { default: router } = await import("../api/router.js");
    const { default: bcrypt } = await import("bcryptjs");
    const password = randomUUID();
    cleanup = async () => {
      await db.authSession.deleteMany({ where: { userId: prefix } });
      await db.teacher.deleteMany({ where: { id: { in: teachers }, tenantId: { in: tenants } } });
      await db.user.deleteMany({ where: { id: prefix } });
      await db.tenant.deleteMany({ where: { id: { in: tenants } } });
      const tables = await db.$queryRaw<Array<{ name: string | null }>>`SELECT to_regclass('auth_rate_limit')::text AS name`;
      if (tables[0]?.name) {
        const bucket = `login:127.0.0.1:${prefix}`;
        await db.$executeRaw`DELETE FROM auth_rate_limit WHERE bucket_key = ${bucket}`;
        const remaining = await db.$queryRaw<Array<{ count: bigint }>>`
          SELECT count(*) AS count FROM auth_rate_limit WHERE bucket_key = ${bucket}`;
        assert.equal(remaining[0].count, 0n);
      }
      assert.equal(await db.tenant.count({ where: { id: { in: tenants } } }), 0);
      assert.equal(await db.user.count({ where: { id: prefix } }), 0);
      assert.equal(await db.teacher.count({ where: { id: { in: teachers } } }), 0);
      assert.equal(await db.authSession.count({ where: { userId: prefix } }), 0);
      setAuthConfigForTests(null);
    };
    await db.$transaction(async tx => {
      for (const id of tenants) await tx.tenant.create({ data: { id, slug: id, name: id } });
      await tx.user.create({ data: { id: prefix, tenantId: tenants[0], username: prefix,
        fullName: prefix, passwordHash: await bcrypt.hash(password, 10), role: "admin" } });
      for (const [i, id] of teachers.entries()) await tx.teacher.create({ data: {
        id, tenantId: tenants[i], fullName: id, phone: id, salaryType: "hourly", salaryAmount: 0,
      } });
    });
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
        outgoing.writeHead(response.state.statusCode, { ...response.headers, "content-type": "application/json" });
        outgoing.end(JSON.stringify(response.state.body));
      } catch {
        outgoing.writeHead(500);
        outgoing.end('{"error":"Test HTTP adapter failure"}');
      }
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    close = () => new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const base = `http://127.0.0.1:${address.port}/api`;
    const login = await fetch(`${base}/auth/login`, { method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "127.0.0.1" },
      body: JSON.stringify({ username: prefix, password, tenant_slug: tenants[0] }),
      signal: AbortSignal.timeout(10_000),
    });
    assert.equal(login.status, 200, "Real fixture login must succeed");
    const { data } = await login.json() as { data: { token: string } };
    assert.equal(typeof data.token, "string");
    const sessions = await db.authSession.findMany({ where: { userId: prefix } });
    assert.equal(sessions.length, 1, "Independent client observes login session write");
    assert.equal(sessions[0].tenantId, tenants[0]);
    assert.ok((await db.user.findUniqueOrThrow({ where: { id: prefix } })).lastLogin);
    const get = (id: string, token?: string) => fetch(`${base}/teachers?id=${id}`, {
      headers: token ? { authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(10_000),
    });
    assert.equal((await get(teachers[0])).status, 401);
    const own = await get(teachers[0], data.token);
    assert.equal(own.status, 200);
    const body = await own.json() as { data: { id: string; full_name: string } };
    const persisted = await db.teacher.findUniqueOrThrow({ where: { id: teachers[0] } });
    assert.equal(body.data.id, persisted.id);
    assert.equal(body.data.full_name, persisted.fullName);
    const foreign = await get(teachers[1], data.token);
    assert.equal(foreign.status, 404);
    assert.ok(!(await foreign.text()).includes(teachers[1]), "Foreign fixture must not leak");
    await db.authSession.update({ where: { id: sessions[0].id }, data: { revokedAt: new Date() } });
    assert.equal((await get(teachers[0], data.token)).status, 401);
  } finally {
    try { await close?.(); } finally {
      try { await cleanup?.(); } finally {
        await Promise.all([db.$disconnect(), routerDb.$disconnect()]);
      }
    }
  }
});
