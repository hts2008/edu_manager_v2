import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const docs = readFileSync(new URL("../docs/API.md", import.meta.url), "utf8");
const router = readFileSync(new URL("../api/router.ts", import.meta.url), "utf8");

function exactRoutesFromRouter(source: string) {
  const routes = new Set<string>();
  const pattern = /exact\(parts,\s*\[((?:\s*"[^"]+",?)+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source))) {
    const parts = [...match[1].matchAll(/"([^"]+)"/g)].map((part) => part[1]);
    routes.add(`/api/${parts.join("/")}`);
  }

  return routes;
}

const dynamicRoutes = [
  "/api/attendance-periods/:id",
  "/api/receipts/:id",
  "/api/receipts/:id/pdf",
  "/api/receipts/:id/correct",
  "/api/payments/:id",
  "/api/payments/:id/pdf",
  "/api/templates/default/:type",
  "/api/templates/:id/set-default",
  "/api/templates/:id",
  "/api/users/:id/reset-password",
  "/api/users/:id",
  "/api/monthly-fees/:id/confirm",
  "/api/monthly-fees/:id/pay",
  "/api/monthly-fees/:id/cancel",
  "/api/monthly-fees/:id",
];

describe("API documentation", () => {
  it("documents every production route exposed by api/router.ts", () => {
    const productionRoutes = new Set([...exactRoutesFromRouter(router), ...dynamicRoutes]);

    for (const route of productionRoutes) {
      assert.ok(docs.includes(route), `docs/API.md is missing ${route}`);
    }
  });

  it("documents production boundaries and the reference backend explicitly", () => {
    assert.match(docs, /Production Vercel API/);
    assert.match(docs, /Express reference/);
    assert.match(docs, /\{ success, data, error \}/);
    assert.match(docs, /\/api\/kanban/);
    assert.match(docs, /reference-only/);
  });
});
