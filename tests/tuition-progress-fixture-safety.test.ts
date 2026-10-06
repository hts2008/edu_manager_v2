import assert from "node:assert/strict";
import test from "node:test";
import { assertIntegrationFixtureCleanup, cleanupBusinessFixtures, fixtureIds } from "./helpers/tuition-progress-http.js";

test("HTTP cleanup cannot accept a browser or legacy unmarked fixture", async () => {
  const browser = fixtureIds("browser");
  assert.throws(() => assertIntegrationFixtureCleanup(browser), /HTTP-owned/);
  await assert.rejects(cleanupBusinessFixtures({} as any, {} as any, browser), /HTTP-owned/);
  const old = { ...fixtureIds(), run: "c" + "a".repeat(32) };
  assert.throws(() => assertIntegrationFixtureCleanup(old), /ownership marker/);
});

test("HTTP cleanup requires exact owned tenant identities", () => {
  const ids = fixtureIds();
  assert.doesNotThrow(() => assertIntegrationFixtureCleanup(ids));
  assert.throws(() => assertIntegrationFixtureCleanup({ ...ids, tenants: ["foreign", ids.tenants[1]] }));
});
