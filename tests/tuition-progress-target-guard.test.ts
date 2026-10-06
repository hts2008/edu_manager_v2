import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  resolveTuitionProgressTestTarget as resolve,
  bindTuitionProgressTestTarget as bind,
  assertTuitionProgressDatabaseIdentity as identity,
} from "../lib/tuition-progress-test-target.js";

const url = "postgresql://fixture:private@127.0.0.1:5432/tpr_test_groundwork?schema=tpr_test_router";
const config = () => ({ TEST_DATABASE_URL: url, TPR_TEST_DATABASE: "tpr_test_groundwork", TPR_TEST_SCHEMA: "tpr_test_router" });

test("missing target skips only development; release and CI fail closed", () => {
  assert.equal(resolve({}), null);
  for (const env of [{ TPR_RELEASE_MODE: "true" }, { CI: "true" }, { CI: "1", TPR_RELEASE_MODE: "false" }]) {
    assert.throws(() => resolve(env), /required/);
  }
  assert.throws(() => resolve({ TPR_RELEASE_MODE: "yes" }), /must be/);
});

test("accepts only explicit exact loopback test database and schema", () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
    assert.ok(resolve({ ...config(), TEST_DATABASE_URL: url.replace("127.0.0.1", host) }));
  }
  for (const replacement of ["postgres", "db.neon.tech", "127.0.0.1.evil", "0.0.0.0"]) {
    assert.throws(() => resolve({ ...config(), TEST_DATABASE_URL: url.replace("127.0.0.1", replacement), ALLOW_REMOTE_TEST_DATABASE: "true" }), /loopback/);
  }
});

test("rejects production, public/missing/duplicate schema and target overrides", () => {
  const invalid = [
    url.replace("tpr_test_groundwork", "production"),
    url.replace("tpr_test_groundwork", "tpr_test_production"),
    url.replace("tpr_test_router", "public"), url.split("?")[0],
    `${url}&schema=tpr_test_router`, `${url}&host=remote`, `${url}&options=search_path%3Dpublic`,
    url.replace("postgresql:", "https:"), "invalid-secret-url",
  ];
  for (const value of invalid) {
    assert.throws(() => resolve({ ...config(), TEST_DATABASE_URL: value }));
  }
  assert.throws(() => resolve({ ...config(), NODE_ENV: "production" }), /Production/);
  for (const field of ["TPR_TEST_DATABASE", "TPR_TEST_SCHEMA"]) {
    for (const value of ["", "tpr_test_wrong"]) {
      assert.throws(() => resolve({ ...config(), [field]: value }), /confirmation/);
    }
  }
});

test("binds runtime and direct datasource only after rejecting mismatches", () => {
  for (const field of ["DATABASE_URL", "DIRECT_URL"]) {
    const env: Record<string, string | undefined> = { ...config(), [field]: "postgresql://secret@remote/production" };
    assert.throws(() => resolve(env), new RegExp(field));
    assert.equal(env[field], "postgresql://secret@remote/production");
  }
  const env: Record<string, string | undefined> = config();
  const target = resolve(env)!;
  bind(env, target);
  assert.equal(env.DATABASE_URL, url);
  assert.equal(env.DIRECT_URL, url);
  assert.equal(env.NODE_ENV, "test");
  assert.throws(() => bind(env, { ...target, schema: "public" }), /changed/);
});

test("live identity requires both database and schema on each client", () => {
  const target = resolve(config())!;
  identity([{ database: target.database, schema: target.schema }], target);
  for (const rows of [[], [{ database: "other", schema: target.schema }], [{ database: target.database, schema: "public" }]]) {
    assert.throws(() => identity(rows, target), /does not match/);
  }
});

test("guard errors never echo supplied credentials or raw URLs", () => {
  try { resolve({ ...config(), TEST_DATABASE_URL: "postgresql://private-secret@remote/production" }); }
  catch (error) { assert.doesNotMatch(String(error), /private-secret|postgresql:\/\//); return; }
  assert.fail("unsafe URL accepted");
});

test("release harness exits nonzero before runtime imports when DB config is absent", () => {
  const env = { ...process.env, NODE_ENV: "test", TPR_RELEASE_MODE: "true", TEST_DATABASE_URL: "",
    DATABASE_URL: "postgresql://never-connect@remote/production", DIRECT_URL: "" };
  // A nested runner must not inherit the parent's internal test-worker mode.
  delete (env as Record<string, string | undefined>).NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ["--import", "tsx", "--test",
    fileURLToPath(new URL("./postgres-router-harness.test.ts", import.meta.url))], {
    env,
    encoding: "utf8", timeout: 15_000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  assert.match(result.stdout + result.stderr, /TEST_DATABASE_URL is required/);
  assert.doesNotMatch(result.stdout + result.stderr, /never-connect|PrismaClientInitializationError/);
});
