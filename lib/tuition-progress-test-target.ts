type Env = Record<string, string | undefined>;

export type TestTarget = { url: string; database: string; schema: string };

// Pure guard: no Prisma, dotenv, imports of runtime modules, or network access.
export function resolveTuitionProgressTestTarget(env: Env): TestTarget | null {
  const release = env.TPR_RELEASE_MODE === "true" || env.CI === "true" || env.CI === "1";
  if (env.TPR_RELEASE_MODE && !["true", "false"].includes(env.TPR_RELEASE_MODE)) {
    throw new Error("TPR_RELEASE_MODE must be true or false");
  }
  if (env.NODE_ENV === "production") throw new Error("Production mode is forbidden");
  const raw = env.TEST_DATABASE_URL;
  if (!raw) {
    if (release) throw new Error("TEST_DATABASE_URL is required in release/CI mode");
    return null;
  }
  let parsed: URL;
  try { parsed = new URL(raw); } catch { throw new Error("Invalid test target URL"); }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol) ||
      !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)) {
    throw new Error("Only loopback PostgreSQL test targets are permitted");
  }
  const database = parsed.pathname.slice(1);
  const schemas = parsed.searchParams.getAll("schema");
  const schema = schemas[0];
  if (!/^tpr_test_[a-z0-9_]+$/.test(database) || schemas.length !== 1 ||
      !/^tpr_test_[a-z0-9_]+$/.test(schema || "") ||
      /(?:^|_)(?:prod|production|live)(?:_|$)/.test(`${database}_${schema}`)) {
    throw new Error("Database and explicit schema must use the tpr_test_ namespace");
  }
  if (database !== env.TPR_TEST_DATABASE || schema !== env.TPR_TEST_SCHEMA) {
    throw new Error("Exact TPR_TEST_DATABASE and TPR_TEST_SCHEMA confirmation required");
  }
  if (parsed.hash || [...parsed.searchParams.keys()].some(key =>
    !["schema", "connection_limit", "connect_timeout", "pool_timeout", "sslmode"].includes(key))) {
    throw new Error("Unsupported test target options");
  }
  for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
    if (env[name] && env[name] !== raw) throw new Error(`${name} must equal TEST_DATABASE_URL`);
  }
  return { url: raw, database, schema };
}

export function bindTuitionProgressTestTarget(env: Env, target: TestTarget) {
  const verified = resolveTuitionProgressTestTarget(env);
  if (!verified || verified.url !== target.url || verified.database !== target.database ||
      verified.schema !== target.schema) throw new Error("Test target changed before binding");
  env.DATABASE_URL = target.url;
  env.DIRECT_URL = target.url;
  env.NODE_ENV = "test";
}

export function assertTuitionProgressDatabaseIdentity(
  rows: Array<{ database: string; schema: string }>, target: TestTarget,
) {
  if (rows.length !== 1 || rows[0].database !== target.database || rows[0].schema !== target.schema) {
    throw new Error("Connected database/schema does not match confirmed test target");
  }
}
