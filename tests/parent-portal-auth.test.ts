import assert from "node:assert/strict";
import { describe, it } from "node:test";
import prisma from "../lib/prisma.js";
import { setAuthConfigForTests } from "../lib/auth-config.js";
import { createTestRequest, createTestResponse } from "../lib/request-response-adapter.js";
import loginHandler from "../server/api/parent-portal/login.js";
import meHandler from "../server/api/parent-portal/me.js";
import logoutHandler from "../server/api/parent-portal/logout.js";

const AUTH = {
  secret: "audit-v2-parent-test-secret-long-enough",
  issuer: "edu-manager-audit-v2",
  audience: "edu-manager-audit-v2-api",
  algorithm: "HS256" as const,
};
process.env.NODE_ENV = "test";
setAuthConfigForTests(AUTH);

function stub(t: any, target: any, method: string, implementation: any) {
  const original = target[method];
  target[method] = implementation;
  t.after(() => { target[method] = original; });
}

const student = {
  id: "student-1",
  fullName: "Student One",
  dateOfBirth: new Date("2015-04-12T00:00:00.000Z"),
  status: "active",
  deletedAt: null,
  attendance: [],
  monthlyFees: [],
  receipts: [],
};
const parent = {
  id: "parent-1",
  fullName: "Parent One",
  phone: "0901234567",
  phoneNormalized: "0901234567",
  email: null,
  relationship: "mother",
  deletedAt: null,
  tokenVersion: 0,
  students: [student],
};

function mockRateLimit(t: any) {
  stub(t, prisma as any, "$transaction", async (work: any) => work({
    $executeRaw: async () => 1,
    $queryRaw: async () => [{ count: 1, reset_at: new Date(Date.now() + 60_000) }],
  }));
}

describe("parent portal stateful authentication", () => {
  it("rejects a correct phone paired with the wrong student date of birth", async (t) => {
    mockRateLimit(t);
    stub(t, prisma.parent as any, "findUnique", async () => parent);
    const response = createTestResponse();

    await loginHandler(createTestRequest({
      method: "POST",
      body: { parent_phone: "0901234567", student_date_of_birth: "2015-04-13" },
    }), response.res);

    assert.equal(response.state.statusCode, 401);
    assert.equal((response.state.body as any).error.code, "PARENT_PORTAL_LOGIN_FAILED");
  });

  it("supports login, me, logout, then rejects the revoked token", async (t) => {
    mockRateLimit(t);
    let session: any;
    let revoked = false;
    stub(t, prisma.authSession as any, "create", async ({ data }: any) => {
      session = { id: "parent-session", ...data };
      return session;
    });
    stub(t, prisma.authSession as any, "findFirst", async ({ where }: any) =>
      !revoked && session?.tokenId === where.tokenId ? session : null
    );
    stub(t, prisma.authSession as any, "updateMany", async ({ where }: any) => {
      if (session?.tokenId === where.tokenId) revoked = true;
      return { count: revoked ? 1 : 0 };
    });
    stub(t, prisma.parent as any, "findUnique", async (args: any) =>
      args?.select ? { id: parent.id, tokenVersion: 0, deletedAt: null } : parent
    );
    stub(t, prisma.parent as any, "findFirst", async () => parent);

    const loginResponse = createTestResponse();
    await loginHandler(createTestRequest({
      method: "POST",
      body: { phone: "0901234567", date_of_birth: "2015-04-12" },
    }), loginResponse.res);
    assert.equal(loginResponse.state.statusCode, 200);
    const token = (loginResponse.state.body as any).data.token;
    assert.equal(typeof token, "string");

    const authRequest = (method: string) => createTestRequest({
      method,
      headers: { authorization: `Bearer ${token}` },
    });
    const meResponse = createTestResponse();
    await meHandler(authRequest("GET"), meResponse.res);
    assert.equal(meResponse.state.statusCode, 200);
    assert.equal((meResponse.state.body as any).data.parent.id, "parent-1");

    const logoutResponse = createTestResponse();
    await logoutHandler(authRequest("POST"), logoutResponse.res);
    assert.equal(logoutResponse.state.statusCode, 200);
    assert.equal(revoked, true);

    const revokedResponse = createTestResponse();
    await meHandler(authRequest("GET"), revokedResponse.res);
    assert.equal(revokedResponse.state.statusCode, 401);
    assert.equal((revokedResponse.state.body as any).error.code, "TOKEN_INVALID");
  });
});
