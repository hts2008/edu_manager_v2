#!/usr/bin/env node

const expressBase = process.env.EXPRESS_API_BASE || "http://localhost:5000/api";
const vercelBase = process.env.VERCEL_API_BASE || "http://localhost:3000/api";
const username = process.env.PARITY_USERNAME || "admin";
const password = process.env.PARITY_PASSWORD || "admin123";
const strictParity = process.env.STRICT_PARITY === "1";

const month =
  process.env.PARITY_MONTH || new Date().toISOString().slice(0, 7);
const studentId = process.env.PARITY_STUDENT_ID || "missing";

const checks = [
  {
    method: "GET",
    path: "/receipts",
    required: ["success", "data.receipts", "data.total"],
  },
  {
    method: "GET",
    path: "/payments",
    required: ["success", "data.payments", "data.total"],
  },
  {
    method: "GET",
    path: "/templates",
    required: ["success", "data.templates"],
  },
  {
    method: "GET",
    path: "/reports/financial",
    required: [
      "success",
      "data.receipts",
      "data.payments",
      "data.paymentsByCategory",
      "data.summary",
    ],
  },
  {
    method: "GET",
    path: "/reports/unpaid-students",
    required: ["success", "data.month", "data.students"],
  },
  {
    method: "GET",
    path: `/attendance/calculate-fee?student_id=${studentId}&month=${month}`,
    required: [
      "success",
      "data.items",
      "data.total",
      "data.days_count",
      "data.fee_per_day",
      "data.total_fee",
    ],
  },
  {
    method: "GET",
    path: `/monthly-fees?month=${month}`,
    required: ["success", "data.fees", "data.summary"],
  },
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

function getPath(value, path) {
  return path.split(".").reduce((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return current[key];
    }
    return undefined;
  }, value);
}

function hasRequiredShape(body, required) {
  return required.every((path) => getPath(body, path) !== undefined);
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

  const expressHealthy = expressResult.status < 500;
  const vercelHealthy = vercelResult.status < 500;
  const vercelContractOk = hasRequiredShape(vercelResult.body, check.required);
  const strictOk =
    !strictParity || sameShape(expressResult.body, vercelResult.body);
  const ok = expressHealthy && vercelHealthy && vercelContractOk && strictOk;

  if (!ok) failed += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"} ${check.method} ${check.path} | express=${expressResult.status} vercel=${vercelResult.status}`
  );
  if (!ok) {
    if (!vercelContractOk) {
      console.log(
        "  missing contract keys:",
        check.required.filter((path) => getPath(vercelResult.body, path) === undefined)
      );
    }
    if (strictParity) {
      console.log("  express shape:", JSON.stringify(shape(expressResult.body)));
      console.log("  vercel shape: ", JSON.stringify(shape(vercelResult.body)));
    }
  }
}

if (failed) {
  console.error(`Parity/contract failed: ${failed}/${checks.length}`);
  process.exit(1);
}

console.log(`Parity/contract passed: ${checks.length}/${checks.length}`);
