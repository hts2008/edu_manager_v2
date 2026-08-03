import assert from "node:assert/strict";
import { describe, it } from "node:test";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { setAuthConfigForTests } from "../lib/auth-config.js";
import { createTestRequest, createTestResponse } from "../lib/request-response-adapter.js";
import paymentsHandler from "../server/api/payments/index.js";
import paymentHandler from "../server/api/payments/[id]/index.js";

const AUTH = {
  secret: "audit-v2-payments-test-secret-long-enough",
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

function token(role: "admin" | "receptionist") {
  return jwt.sign({ typ: "user", ver: 0, role }, AUTH.secret, {
    algorithm: AUTH.algorithm,
    issuer: AUTH.issuer,
    audience: AUTH.audience,
    subject: `${role}-1`,
    jwtid: `${role}-session`,
    expiresIn: "5m",
  });
}

function mockAuth(t: any, role: "admin" | "receptionist") {
  stub(t, prisma.authSession as any, "findFirst", async () => ({ id: "session" }));
  stub(t, prisma.user as any, "findUnique", async () => ({
    id: `${role}-1`, username: role, fullName: role, email: null, phone: null,
    role, status: "active", lastLogin: null, tokenVersion: 0,
  }));
}

function request(method: string, role: "admin" | "receptionist", body?: unknown, id?: string) {
  return createTestRequest({
    method,
    headers: { authorization: `Bearer ${token(role)}` },
    query: id ? { id } : {},
    body,
  });
}

const payment = {
  id: "payment-1", category: "utility", amount: 750000, recipientName: "Power Co",
  recipientPhone: null, templateId: "template-1", notes: "August bill", pdfPath: null,
  createdById: "admin-1", createdAt: new Date("2026-08-03T00:00:00.000Z"), deletedAt: null,
  template: { templateName: "Default payment" },
};

describe("payment CRUD authorization", () => {
  it("allows a receptionist to list payments", async (t) => {
    mockAuth(t, "receptionist");
    stub(t, prisma.payment as any, "findMany", async () => [payment]);
    stub(t, prisma.payment as any, "count", async () => 1);
    const response = createTestResponse();

    await paymentsHandler(request("GET", "receptionist"), response.res);

    assert.equal(response.state.statusCode, 200);
    assert.equal((response.state.body as any).data.total, 1);
    assert.equal((response.state.body as any).data.payments[0].id, "payment-1");
  });

  it("allows only an admin to create a payment", async (t) => {
    mockAuth(t, "admin");
    stub(t, prisma.template as any, "findUnique", async () => ({ id: "template-1", type: "payment" }));
    stub(t, prisma.payment as any, "create", async () => payment);
    stub(t, prisma.activityLog as any, "create", async () => ({ id: 1 }));
    const response = createTestResponse();

    await paymentsHandler(request("POST", "admin", {
      category: "utility",
      amount: 750000,
      recipient_name: "Power Co",
      template_id: "template-1",
      notes: "August bill",
    }), response.res);

    assert.equal(response.state.statusCode, 201);
    assert.equal((response.state.body as any).data.amount, 750000);
  });

  it("rejects payment creation and deletion for a receptionist", async (t) => {
    mockAuth(t, "receptionist");
    for (const [handler, req] of [
      [paymentsHandler, request("POST", "receptionist", {})],
      [paymentHandler, request("DELETE", "receptionist", undefined, "payment-1")],
    ] as const) {
      const response = createTestResponse();
      await handler(req, response.res);
      assert.equal(response.state.statusCode, 403);
      assert.equal((response.state.body as any).error.code, "FORBIDDEN");
    }
  });

  it("allows an admin to soft-delete a payment", async (t) => {
    mockAuth(t, "admin");
    let deletedAt: Date | undefined;
    stub(t, prisma.payment as any, "findFirst", async () => payment);
    stub(t, prisma.payment as any, "update", async ({ data }: any) => {
      deletedAt = data.deletedAt;
      return { ...payment, ...data };
    });
    stub(t, prisma.activityLog as any, "create", async () => ({ id: 1 }));
    const response = createTestResponse();

    await paymentHandler(request("DELETE", "admin", undefined, "payment-1"), response.res);

    assert.equal(response.state.statusCode, 200);
    assert.ok(deletedAt instanceof Date);
    assert.equal((response.state.body as any).data.message, "Payment moved to recycle bin");
  });
});
