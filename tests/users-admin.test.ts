import assert from "node:assert/strict";
import { describe, it } from "node:test";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { setAuthConfigForTests } from "../lib/auth-config.js";
import { createTestRequest, createTestResponse } from "../lib/request-response-adapter.js";
import usersHandler from "../server/api/users/index.js";
import userHandler from "../server/api/users/[id]/index.js";
import resetPasswordHandler from "../server/api/users/[id]/reset-password.js";

const AUTH = {
  secret: "audit-v2-users-test-secret-long-enough",
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

function staffToken(role: "admin" | "receptionist", id = `${role}-1`) {
  return jwt.sign({ typ: "user", ver: 0, role, username: role }, AUTH.secret, {
    algorithm: AUTH.algorithm,
    issuer: AUTH.issuer,
    audience: AUTH.audience,
    subject: id,
    jwtid: `${id}-session`,
    expiresIn: "5m",
  });
}

function authUser(role: "admin" | "receptionist", id = `${role}-1`) {
  return {
    id,
    username: role,
    fullName: role,
    email: null,
    phone: null,
    role,
    status: "active",
    lastLogin: null,
    tokenVersion: 0,
    createdAt: new Date("2026-08-03T00:00:00.000Z"),
    updatedAt: new Date("2026-08-03T00:00:00.000Z"),
  };
}

function mockAuth(t: any, role: "admin" | "receptionist", target?: any) {
  stub(t, prisma.authSession as any, "findFirst", async () => ({ id: "session" }));
  stub(t, prisma.user as any, "findUnique", async (args: any) =>
    args?.select?.tokenVersion ? authUser(role) : target ?? null
  );
}

function request(method: string, role: "admin" | "receptionist", body?: unknown, id?: string) {
  return createTestRequest({
    method,
    headers: { authorization: `Bearer ${staffToken(role)}` },
    query: id ? { id } : {},
    body,
  });
}

describe("admin user management", () => {
  it("allows an admin to create a receptionist and hashes the password", async (t) => {
    mockAuth(t, "admin");
    let createData: any;
    stub(t, prisma.user as any, "create", async ({ data }: any) => {
      createData = data;
      return { ...authUser("receptionist", "user-2"), ...data };
    });
    const response = createTestResponse();

    await usersHandler(
      request("POST", "admin", {
        username: "frontdesk",
        password: "secret123",
        full_name: "Front Desk",
        role: "receptionist",
      }),
      response.res
    );

    assert.equal(response.state.statusCode, 201);
    assert.equal((response.state.body as any).data.user.role, "receptionist");
    assert.notEqual(createData.passwordHash, "secret123");
    assert.match(createData.passwordHash, /^\$2/);
  });

  it("allows an admin to update and deactivate another user", async (t) => {
    const target = authUser("receptionist", "user-2");
    mockAuth(t, "admin", target);
    const updates: any[] = [];
    stub(t, prisma.user as any, "update", async ({ data }: any) => {
      updates.push(data);
      return { ...target, ...data };
    });

    const updateResponse = createTestResponse();
    await userHandler(
      request("PUT", "admin", { full_name: "Updated User", status: "active" }, "user-2"),
      updateResponse.res
    );
    assert.equal(updateResponse.state.statusCode, 200);
    assert.equal((updateResponse.state.body as any).data.user.full_name, "Updated User");

    const deleteResponse = createTestResponse();
    await userHandler(request("DELETE", "admin", undefined, "user-2"), deleteResponse.res);
    assert.equal(deleteResponse.state.statusCode, 200);
    assert.deepEqual(updates.at(-1), { status: "inactive" });
  });

  it("resets a password and revokes all active sessions", async (t) => {
    const target = authUser("receptionist", "user-2");
    mockAuth(t, "admin", target);
    let passwordUpdate: any;
    let revokeWhere: any;
    stub(t, prisma.user as any, "update", async ({ data }: any) => {
      passwordUpdate = data;
      return { ...target, passwordHash: data.passwordHash, tokenVersion: 1 };
    });
    stub(t, prisma.authSession as any, "updateMany", async ({ where }: any) => {
      revokeWhere = where;
      return { count: 2 };
    });
    stub(t, prisma as any, "$transaction", async (operations: Promise<unknown>[]) =>
      Promise.all(operations)
    );
    const response = createTestResponse();

    await resetPasswordHandler(
      request("POST", "admin", { password: "new-secret" }, "user-2"),
      response.res
    );

    assert.equal(response.state.statusCode, 200);
    assert.deepEqual(passwordUpdate.tokenVersion, { increment: 1 });
    assert.match(passwordUpdate.passwordHash, /^\$2/);
    assert.deepEqual(revokeWhere, { userId: "user-2", revokedAt: null });
  });

  it("rejects every user-management surface for a receptionist", async (t) => {
    mockAuth(t, "receptionist");
    for (const [handler, req] of [
      [usersHandler, request("POST", "receptionist", {}, undefined)],
      [userHandler, request("PUT", "receptionist", {}, "user-2")],
      [resetPasswordHandler, request("POST", "receptionist", {}, "user-2")],
    ] as const) {
      const response = createTestResponse();
      await handler(req, response.res);
      assert.equal(response.state.statusCode, 403);
      assert.equal((response.state.body as any).error.code, "FORBIDDEN");
    }
  });
});
