import assert from "node:assert/strict";
import { describe, it } from "node:test";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { setAuthConfigForTests } from "../lib/auth-config.js";
import { createTestRequest, createTestResponse } from "../lib/request-response-adapter.js";
import templatesHandler from "../server/api/templates/index.js";
import templateHandler from "../server/api/templates/[id]/index.js";
import setDefaultHandler from "../server/api/templates/[id]/set-default.js";
import uploadImageHandler from "../server/api/templates/upload-image.js";

const AUTH = {
  secret: "audit-v2-templates-test-secret-long-enough",
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

const template = {
  id: "template-1",
  templateName: "Receipt A5",
  type: "receipt",
  paperSize: "a5",
  orientation: "portrait",
  jsonConfig: { version: "1.0", objects: [] },
  isDefault: false,
  createdById: "admin-1",
  createdAt: new Date("2026-08-03T00:00:00.000Z"),
  updatedAt: new Date("2026-08-03T00:00:00.000Z"),
};

describe("template CRUD authorization and upload validation", () => {
  it("allows authenticated staff to list templates", async (t) => {
    mockAuth(t, "receptionist");
    stub(t, prisma.template as any, "findMany", async () => [template]);
    const response = createTestResponse();

    await templatesHandler(request("GET", "receptionist"), response.res);

    assert.equal(response.state.statusCode, 200);
    assert.equal((response.state.body as any).data.templates[0].template_name, "Receipt A5");
  });

  it("allows an admin to create and update a template", async (t) => {
    mockAuth(t, "admin");
    stub(t, prisma.activityLog as any, "create", async () => ({ id: 1 }));
    stub(t, prisma.template as any, "create", async ({ data }: any) => ({ ...template, ...data }));
    stub(t, prisma.template as any, "findUnique", async () => template);
    stub(t, prisma.template as any, "update", async ({ data }: any) => ({ ...template, ...data }));

    const createResponse = createTestResponse();
    await templatesHandler(request("POST", "admin", {
      template_name: "Receipt A5",
      type: "receipt",
      paper_size: "a5",
      orientation: "portrait",
      json_config: { version: "1.0", objects: [] },
    }), createResponse.res);
    assert.equal(createResponse.state.statusCode, 201);

    const updateResponse = createTestResponse();
    await templateHandler(request("PUT", "admin", {
      template_name: "Updated receipt",
      orientation: "landscape",
    }, "template-1"), updateResponse.res);
    assert.equal(updateResponse.state.statusCode, 200);
    assert.equal((updateResponse.state.body as any).data.template.template_name, "Updated receipt");
  });

  it("sets a default template and deletes an unused template", async (t) => {
    mockAuth(t, "admin");
    stub(t, prisma.template as any, "findUnique", async () => template);
    stub(t, prisma.template as any, "updateMany", async () => ({ count: 1 }));
    stub(t, prisma.template as any, "update", async () => ({ ...template, isDefault: true }));
    stub(t, prisma.template as any, "delete", async () => template);
    stub(t, prisma.receipt as any, "count", async () => 0);
    stub(t, prisma.payment as any, "count", async () => 0);
    stub(t, prisma.activityLog as any, "create", async () => ({ id: 1 }));
    stub(t, prisma as any, "$transaction", async (operations: Promise<unknown>[]) =>
      Promise.all(operations)
    );

    const defaultResponse = createTestResponse();
    await setDefaultHandler(request("POST", "admin", undefined, "template-1"), defaultResponse.res);
    assert.equal(defaultResponse.state.statusCode, 200);

    const deleteResponse = createTestResponse();
    await templateHandler(request("DELETE", "admin", undefined, "template-1"), deleteResponse.res);
    assert.equal(deleteResponse.state.statusCode, 200);
    assert.equal((deleteResponse.state.body as any).data.message, "Template deleted");
  });

  it("rejects template mutations for a receptionist", async (t) => {
    mockAuth(t, "receptionist");
    for (const [handler, req] of [
      [templatesHandler, request("POST", "receptionist", {})],
      [templateHandler, request("DELETE", "receptionist", undefined, "template-1")],
      [setDefaultHandler, request("POST", "receptionist", undefined, "template-1")],
      [uploadImageHandler, request("POST", "receptionist", {})],
    ] as const) {
      const response = createTestResponse();
      await handler(req, response.res);
      assert.equal(response.state.statusCode, 403);
      assert.equal((response.state.body as any).error.code, "FORBIDDEN");
    }
  });

  it("rejects malformed base64 before attempting storage upload", async (t) => {
    mockAuth(t, "admin");
    const response = createTestResponse();

    await uploadImageHandler(request("POST", "admin", {
      filename: "logo.png",
      contentType: "image/png",
      base64: "not-valid-%%base64",
    }), response.res);

    assert.equal(response.state.statusCode, 400);
    assert.equal((response.state.body as any).error.code, "INVALID_BASE64");
  });
});
