import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const fixturePath = fileURLToPath(
  new URL("../scripts/student-progress-e2e-fixture.ts", import.meta.url),
);
const confirmation = "student-progress-local-test";

function runGuard(overrides: NodeJS.ProcessEnv) {
  return spawnSync(
    process.execPath,
    ["--import", "tsx", fixturePath, "--check-guard-only"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_URL: "",
        TEST_DATABASE_URL: "",
        E2E_FIXTURE_ALLOW_MUTATION: "",
        ...overrides,
      },
    },
  );
}

test("Student Progress fixture rejects execution without explicit opt-in", () => {
  const url = "postgresql://postgres:postgres@127.0.0.1:5432/edu_manager_e2e";
  const result = runGuard({ DATABASE_URL: url, TEST_DATABASE_URL: url });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /E2E_FIXTURE_ALLOW_MUTATION/);
});

test("Student Progress fixture rejects a production Neon database even with opt-in", () => {
  const url = "postgresql://user:secret@ep-production.neon.tech/edu_manager_prod";
  const result = runGuard({
    DATABASE_URL: url,
    TEST_DATABASE_URL: url,
    E2E_FIXTURE_ALLOW_MUTATION: confirmation,
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /restricted to a loopback PostgreSQL database/);
  assert.doesNotMatch(result.stderr, /user:secret/);
});

test("Student Progress fixture rejects mismatched test database confirmation", () => {
  const result = runGuard({
    DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/edu_manager_e2e",
    TEST_DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/other_e2e",
    E2E_FIXTURE_ALLOW_MUTATION: confirmation,
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /DATABASE_URL === TEST_DATABASE_URL/);
});

test("Student Progress fixture accepts an explicitly confirmed local E2E database", () => {
  const url = "postgresql://postgres:postgres@localhost:5432/edu_manager_e2e";
  const result = runGuard({
    DATABASE_URL: url,
    TEST_DATABASE_URL: url,
    E2E_FIXTURE_ALLOW_MUTATION: confirmation,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /fixture guard passed/);
});
