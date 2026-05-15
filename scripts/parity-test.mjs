#!/usr/bin/env node

const expressBase = process.env.EXPRESS_API_BASE || "http://localhost:5000/api";
const vercelBase = process.env.VERCEL_API_BASE || "http://localhost:3000/api";
const username = process.env.PARITY_USERNAME || "admin";
const password = process.env.PARITY_PASSWORD || "admin123";

const checks = [
  { method: "GET", path: "/receipts" },
  { method: "GET", path: "/payments" },
  { method: "GET", path: "/templates" },
  { method: "GET", path: "/reports/financial" },
  { method: "GET", path: "/reports/unpaid-students" },
  { method: "GET", path: `/attendance/calculate-fee?student_id=${process.env.PARITY_STUDENT_ID || "missing"}&month=${process.env.PARITY_MONTH || new Date().toISOString().slice(0, 7)}` },
  { method: "GET", path: `/monthly-fees?month=${process.env.PARITY_MONTH || new Date().toISOString().slice(0, 7)}` },
];

async function request(base, path, token, method = "GET") {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = { nonJson: true };
  }
  return { status: response.status, body };
}

async function login(base) {
  const response = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = await response.json();
  if (!response.ok || !body?.success || !body?.data?.token) {
    throw new Error(`Login failed for ${base}: ${response.status}`);
  }
  return body.data.token;
}

function shape(value) {
  if (Array.isArray(value)) return value.length ? [shape(value[0])] : [];
  if (!value || typeof value !== "object") return typeof value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, shape(value[key])])
  );
}

function sameShape(a, b) {
  return JSON.stringify(shape(a)) === JSON.stringify(shape(b));
}

const expressToken = await login(expressBase);
const vercelToken = await login(vercelBase);
let failed = 0;

for (const check of checks) {
  const [expressResult, vercelResult] = await Promise.all([
    request(expressBase, check.path, expressToken, check.method),
    request(vercelBase, check.path, vercelToken, check.method),
  ]);
  const ok =
    expressResult.status < 500 &&
    vercelResult.status < 500 &&
    sameShape(expressResult.body, vercelResult.body);

  if (!ok) failed += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"} ${check.method} ${check.path} | express=${expressResult.status} vercel=${vercelResult.status}`
  );
  if (!ok) {
    console.log("  express shape:", JSON.stringify(shape(expressResult.body)));
    console.log("  vercel shape: ", JSON.stringify(shape(vercelResult.body)));
  }
}

if (failed) {
  console.error(`Parity failed: ${failed}/${checks.length}`);
  process.exit(1);
}

console.log(`Parity passed: ${checks.length}/${checks.length}`);
