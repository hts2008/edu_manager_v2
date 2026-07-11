import assert from "node:assert/strict";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";
import router from "../api/router.js";
import {
  createTestRequest,
  createTestResponse,
} from "../lib/request-response-adapter.js";

const databaseUrl = process.env.TEST_DATABASE_URL;

test("real router and isolated Postgres harness are reachable", { skip: !databaseUrl }, async () => {
  const parsed = new URL(databaseUrl!);
  assert.ok(
    ["127.0.0.1", "localhost", "postgres"].includes(parsed.hostname),
    "TEST_DATABASE_URL must target the isolated CI/local Postgres host"
  );

  const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    const rows = await db.$queryRawUnsafe<Array<{ value: number }>>(
      "SELECT 1 AS value"
    );
    assert.deepEqual(rows, [{ value: 1 }]);
  } finally {
    await db.$disconnect();
  }

  const req = createTestRequest({ method: "GET", query: { path: "does-not-exist" } });
  const response = createTestResponse();
  await router(req, response.res);
  assert.equal(response.state.statusCode, 404);
});
