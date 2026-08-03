import { expect } from "@playwright/test";

export const BULK_PAYMENT_STORAGE_KEY =
  "edu-manager:monthly-fees:bulk-payment";

const value = (name) => process.env[name]?.trim() || "";

export function phase4RuntimeRequirements(required = []) {
  const aliases = {
    E2E_ADMIN_USERNAME: value("E2E_ADMIN_USERNAME") || value("E2E_USERNAME"),
    E2E_ADMIN_PASSWORD: value("E2E_ADMIN_PASSWORD") || value("E2E_PASSWORD"),
  };
  const resolved = Object.fromEntries(
    required.map((name) => [name, aliases[name] || value(name)])
  );
  const missing = required.filter((name) => !resolved[name]);

  if (!value("TEST_DATABASE_URL")) missing.unshift("TEST_DATABASE_URL");
  if (!value("E2E_BASE_URL")) missing.unshift("E2E_BASE_URL");
  if (value("E2E_ALLOW_MUTATION") !== "1") {
    missing.push("E2E_ALLOW_MUTATION=1");
  }

  return {
    ready: missing.length === 0,
    reason: missing.length
      ? `Audit Phase 4 requires an isolated runtime; missing: ${[
          ...new Set(missing),
        ].join(", ")}`
      : "",
    values: resolved,
  };
}

export async function loginAsAdmin(request, username, password) {
  const response = await request.post("/api/auth/login", {
    data: { username, password },
  });
  await expectApiSuccess(response, "admin login");
  const body = await response.json();
  expect(body.data?.token, "admin login must return a token").toBeTruthy();
  expect(body.data?.user?.role, "Phase 4 lifecycle requires an admin").toBe(
    "admin"
  );
  return { token: body.data.token, user: body.data.user };
}

export function authHeaders(token, extra = {}) {
  return { Authorization: `Bearer ${token}`, ...extra };
}

export async function expectApiSuccess(response, context, statuses = [200]) {
  const status = response.status();
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  expect(
    statuses.includes(status),
    `${context}: expected ${statuses.join("/")}, received ${status}: ${JSON.stringify(body)}`
  ).toBeTruthy();
  expect(body?.success, `${context}: API envelope`).toBe(true);
  return body;
}

export async function getAttendancePeriod(request, token, classId, month) {
  const response = await request.get(
    `/api/attendance-periods?class_id=${encodeURIComponent(
      classId
    )}&month=${encodeURIComponent(month)}`,
    { headers: authHeaders(token) }
  );
  const body = await expectApiSuccess(response, "load attendance period");
  return body.data?.periods?.[0] || null;
}

export async function transitionAttendancePeriod(
  request,
  token,
  periodId,
  action,
  data = undefined
) {
  const response = await request.post(
    `/api/attendance-periods/${encodeURIComponent(
      periodId
    )}?action=${encodeURIComponent(action)}`,
    { headers: authHeaders(token), ...(data ? { data } : {}) }
  );
  await expectApiSuccess(response, `attendance period ${action}`);
}

export function studentIsEnrolledOn(student, date) {
  const periods = student.enrollment_periods || [];
  if (periods.length) {
    return periods.some(
      (period) =>
        period.started_at <= date &&
        (!period.ended_at || date < period.ended_at)
    );
  }
  return (
    student.enrollment_status === "active" &&
    (!student.enrollment_date || student.enrollment_date <= date)
  );
}

export async function pollBulkPaymentBatch(
  request,
  token,
  batchId,
  { attempts = 20, delayMs = 250 } = {}
) {
  let latest;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await request.get(
      `/api/monthly-fees/bulk-pay/${encodeURIComponent(batchId)}`,
      { headers: authHeaders(token) }
    );
    const body = await expectApiSuccess(response, "bulk-payment reconciliation");
    latest = body.data;
    if (latest?.status === "completed") return latest;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  expect(latest?.status, "bulk-payment batch must reach completed").toBe(
    "completed"
  );
  return latest;
}

export async function seedAuthenticatedPage(page, token, bulkResume = null) {
  await page.addInitScript(
    ({ authToken, resume }) => {
      localStorage.setItem("token", authToken);
      localStorage.removeItem("refreshToken");
      if (resume) {
        localStorage.setItem(
          "edu-manager:monthly-fees:bulk-payment",
          JSON.stringify(resume)
        );
      }
    },
    { authToken: token, resume: bulkResume }
  );
}
