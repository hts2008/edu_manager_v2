import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import jwt from "jsonwebtoken";
import { getAuthConfig, setAuthConfigForTests } from "../lib/auth-config.js";
import { verifySessionToken } from "../lib/auth-session.js";

const TEST_CONFIG = {
  secret: "test-secret-long-enough-for-auth-contracts",
  issuer: "edu-manager-test",
  audience: "edu-manager-test-api",
  algorithm: "HS256" as const,
};

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

test("auth config has no fallback secret and only permits test injection", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSecret = process.env.JWT_SECRET;
  process.env.NODE_ENV = "test";
  setAuthConfigForTests(null);
  delete process.env.JWT_SECRET;
  assert.throws(() => getAuthConfig(), /JWT_SECRET is required/);

  process.env.JWT_SECRET = "too-short";
  assert.throws(() => getAuthConfig(), /at least 32 characters/);

  process.env.NODE_ENV = "production";
  assert.throws(() => setAuthConfigForTests(TEST_CONFIG), /only available in tests/);

  restoreEnv("NODE_ENV", previousNodeEnv);
  restoreEnv("JWT_SECRET", previousSecret);
});

test("login handlers use distributed rate limiting and typed 429 headers", () => {
  const login = readFileSync("server/api/auth/login.ts", "utf8");
  const parentLogin = readFileSync("server/api/parent-portal/login.ts", "utf8");

  for (const handler of [login, parentLogin]) {
    assert.match(handler, /checkDistributedRateLimit/);
    assert.match(handler, /getLoginRateLimitConfig/);
    assert.match(handler, /setRateLimitHeaders/);
  }
  assert.doesNotMatch(login, /console\.(?:log|error)/);
});

test("session tokens require issuer, audience, algorithm and session claims", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";
  setAuthConfigForTests(TEST_CONFIG);

  const valid = jwt.sign({ typ: "user", ver: 3, role: "admin" }, TEST_CONFIG.secret, {
    algorithm: "HS256",
    issuer: TEST_CONFIG.issuer,
    audience: TEST_CONFIG.audience,
    subject: "user-1",
    jwtid: "session-1",
    expiresIn: "5m",
  });
  const decoded = verifySessionToken(valid, "user");
  assert.equal(decoded.sub, "user-1");
  assert.equal(decoded.jti, "session-1");
  assert.equal(decoded.ver, 3);

  const wrongAudience = jwt.sign({ typ: "user", ver: 3 }, TEST_CONFIG.secret, {
    algorithm: "HS256",
    issuer: TEST_CONFIG.issuer,
    audience: "wrong",
    subject: "user-1",
    jwtid: "session-1",
  });
  assert.throws(() => verifySessionToken(wrongAudience, "user"));
  assert.throws(() => verifySessionToken(valid, "parent"));

  setAuthConfigForTests(null);
  restoreEnv("NODE_ENV", previousNodeEnv);
});

test("auth handlers enforce DB sessions, version invalidation and indexed parent lookup", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const auth = readFileSync("lib/auth.ts", "utf8");
  const login = readFileSync("server/api/auth/login.ts", "utf8");
  const logout = readFileSync("server/api/auth/logout.ts", "utf8");
  const changePassword = readFileSync("server/api/auth/change-password.ts", "utf8");
  const resetPassword = readFileSync("server/api/users/[id]/reset-password.ts", "utf8");
  const parentLogin = readFileSync("server/api/parent-portal/login.ts", "utf8");

  assert.match(schema, /model AuthSession/);
  assert.match(schema, /tokenVersion\s+Int\s+@default\(0\)/);
  assert.match(schema, /phoneNormalized\s+String\?\s+@unique/);
  assert.match(auth, /getActiveSession\(decoded\)/);
  assert.match(login, /createSessionToken/);
  assert.match(logout, /revokeSession\(req\.authToken\.jti\)/);
  assert.match(changePassword, /tokenVersion: \{ increment: 1 \}/);
  assert.match(changePassword, /authSession\.updateMany/);
  assert.match(resetPassword, /tokenVersion: \{ increment: 1 \}/);
  assert.match(resetPassword, /authSession\.updateMany/);
  assert.doesNotMatch(parentLogin, /parent\.findMany/);
  assert.match(parentLogin, /parent\.findUnique/);
  assert.match(parentLogin, /phoneNormalized/);
  assert.match(parentLogin, /checkDistributedRateLimit/);
});

test("frontend keeps staff token on transient me failures and calls parent logout API", () => {
  const context = readFileSync("frontend/src/context/AuthContext.jsx", "utf8");
  const fetchCurrentUser = context.slice(
    context.indexOf("const fetchCurrentUser"),
    context.indexOf("// Login function")
  );
  const api = readFileSync("frontend/src/services/api.js", "utf8");

  assert.doesNotMatch(fetchCurrentUser, /removeItem\(['\"]token['\"]\)/);
  assert.match(api, /parentPortalRequest\("\/parent-portal\/logout"/);
});
