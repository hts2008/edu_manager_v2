import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRouterHandler } from "../api/router.js";
import {
  createTestRequest,
  createTestResponse,
} from "../lib/request-response-adapter.js";

function routerFor(statusCode: number, actorId = "actor-1") {
  const audits: unknown[][] = [];
  const handler = createRouterHandler({
    resolve: () => ({
      load: async () => ({
        default: async (req, res) => {
          (req as any).user = { id: actorId, userId: actorId, role: "admin" };
          res.status(statusCode).json({ statusCode });
        },
      }),
    }),
    writeAudit: async (...args: unknown[]) => {
      audits.push(args);
    },
  });
  return { audits, handler };
}

describe("router mutation audit", () => {
  it("records succeeded from the final 2xx response and authenticated request actor", async () => {
    const { audits, handler } = routerFor(201);
    const req = createTestRequest({ method: "POST", query: { path: "classes" } });
    const response = createTestResponse();

    await handler(req, response.res);

    assert.equal(response.state.statusCode, 201);
    assert.equal(audits.length, 1);
    assert.equal(audits[0][1], "actor-1");
    assert.equal(audits[0][2], "API_POST_SUCCEEDED");
    assert.equal(audits[0][4], "/api/classes#201");
  });

  it("records failed from the final error response status", async () => {
    const { audits, handler } = routerFor(422);
    const req = createTestRequest({ method: "PATCH", query: { path: "classes/id" } });
    const response = createTestResponse();

    await handler(req, response.res);

    assert.equal(audits.length, 1);
    assert.equal(audits[0][2], "API_PATCH_FAILED");
    assert.equal(audits[0][4], "/api/classes/id#422");
  });

  it("records failed with the status emitted for a thrown API error", async () => {
    const audits: unknown[][] = [];
    const handler = createRouterHandler({
      resolve: () => ({
        load: async () => ({
          default: async (req) => {
            (req as any).user = { id: "actor-2", userId: "actor-2", role: "admin" };
            throw Object.assign(new Error("conflict"), {
              code: "CONFLICT",
              status: 409,
            });
          },
        }),
      }),
      writeAudit: async (...args: unknown[]) => {
        audits.push(args);
      },
    });
    const req = createTestRequest({ method: "DELETE", query: { path: "classes/id" } });
    const response = createTestResponse();

    await handler(req, response.res);

    assert.equal(response.state.statusCode, 409);
    assert.equal(audits[0][1], "actor-2");
    assert.equal(audits[0][2], "API_DELETE_FAILED");
    assert.equal(audits[0][4], "/api/classes/id#409");
  });

  it("does not audit read requests", async () => {
    const { audits, handler } = routerFor(200);
    const req = createTestRequest({ method: "GET", query: { path: "classes" } });
    const response = createTestResponse();

    await handler(req, response.res);

    assert.deepEqual(audits, []);
  });
});
