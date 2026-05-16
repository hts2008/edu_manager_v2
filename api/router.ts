import type { VercelRequest, VercelResponse } from "../lib/vercel-types.js";
import { errorResponse, handleCors, verifyAuth } from "../lib/auth.js";
import { logActivity } from "../lib/api-utils.js";
import {
  getRequestId,
  logApiError,
  logApiEvent,
  setSecurityHeaders,
} from "../lib/observability.js";

type Handler = (
  req: VercelRequest,
  res: VercelResponse
) => Promise<unknown> | unknown;

type Loader = () => Promise<{ default: Handler }>;

type RouteMatch = {
  load: Loader;
  params?: Record<string, string>;
};

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const routes = {
  activityLogsIndex: () => import("../server/api/activity-logs/index.js"),
  attendanceBulk: () => import("../server/api/attendance/bulk.js"),
  attendanceCalculateFee: () => import("../server/api/attendance/calculate-fee.js"),
  attendanceIndex: () => import("../server/api/attendance/index.js"),
  attendanceInsights: () => import("../server/api/attendance/insights.js"),
  attendanceMonth: () => import("../server/api/attendance/month.js"),
  attendancePeriodById: () => import("../server/api/attendance-periods/[id]/index.js"),
  attendancePeriodsIndex: () => import("../server/api/attendance-periods/index.js"),
  authChangePassword: () => import("../server/api/auth/change-password.js"),
  authLogin: () => import("../server/api/auth/login.js"),
  authLogout: () => import("../server/api/auth/logout.js"),
  authMe: () => import("../server/api/auth/me.js"),
  centerSettingsIndex: () => import("../server/api/center-settings/index.js"),
  classesIndex: () => import("../server/api/classes/index.js"),
  monthlyFeeCancel: () => import("../server/api/monthly-fees/[id]/cancel.js"),
  monthlyFeeConfirm: () => import("../server/api/monthly-fees/[id]/confirm.js"),
  monthlyFeeById: () => import("../server/api/monthly-fees/[id]/index.js"),
  monthlyFeePay: () => import("../server/api/monthly-fees/[id]/pay.js"),
  monthlyFeesCalculate: () => import("../server/api/monthly-fees/calculate.js"),
  monthlyFeesIndex: () => import("../server/api/monthly-fees/index.js"),
  parentsIndex: () => import("../server/api/parents/index.js"),
  paymentById: () => import("../server/api/payments/[id]/index.js"),
  paymentPdf: () => import("../server/api/payments/[id]/pdf.js"),
  paymentsIndex: () => import("../server/api/payments/index.js"),
  receiptById: () => import("../server/api/receipts/[id]/index.js"),
  receiptPdf: () => import("../server/api/receipts/[id]/pdf.js"),
  receiptsIndex: () => import("../server/api/receipts/index.js"),
  reportsDashboard: () => import("../server/api/reports/dashboard.js"),
  reportsFinancial: () => import("../server/api/reports/financial.js"),
  reportsUnpaidStudents: () => import("../server/api/reports/unpaid-students.js"),
  studentsIndex: () => import("../server/api/students/index.js"),
  teachersIndex: () => import("../server/api/teachers/index.js"),
  templateById: () => import("../server/api/templates/[id]/index.js"),
  templateSetDefault: () => import("../server/api/templates/[id]/set-default.js"),
  templateDefaultByType: () => import("../server/api/templates/default/[type].js"),
  templatesIndex: () => import("../server/api/templates/index.js"),
  templateUpload: () => import("../server/api/templates/upload.js"),
  templateUploadImage: () => import("../server/api/templates/upload-image.js"),
} satisfies Record<string, Loader>;

function pathParts(req: VercelRequest) {
  const raw = req.query.path;
  const parts = Array.isArray(raw) ? raw : raw ? String(raw).split("/") : [];
  return parts.map((part) => decodeURIComponent(part)).filter(Boolean);
}

function exact(parts: string[], expected: string[], load: Loader): RouteMatch | null {
  if (parts.length !== expected.length) return null;
  return parts.every((part, index) => part === expected[index]) ? { load } : null;
}

function resolveRoute(parts: string[]): RouteMatch | null {
  const [resource, id, action] = parts;

  return (
    exact(parts, ["auth", "login"], routes.authLogin) ||
    exact(parts, ["activity-logs"], routes.activityLogsIndex) ||
    exact(parts, ["auth", "me"], routes.authMe) ||
    exact(parts, ["auth", "logout"], routes.authLogout) ||
    exact(parts, ["auth", "change-password"], routes.authChangePassword) ||
    exact(parts, ["center-settings"], routes.centerSettingsIndex) ||
    exact(parts, ["students"], routes.studentsIndex) ||
    exact(parts, ["parents"], routes.parentsIndex) ||
    exact(parts, ["teachers"], routes.teachersIndex) ||
    exact(parts, ["classes"], routes.classesIndex) ||
    exact(parts, ["attendance"], routes.attendanceIndex) ||
    exact(parts, ["attendance", "bulk"], routes.attendanceBulk) ||
    exact(parts, ["attendance", "insights"], routes.attendanceInsights) ||
    exact(parts, ["attendance", "month"], routes.attendanceMonth) ||
    exact(parts, ["attendance", "calculate-fee"], routes.attendanceCalculateFee) ||
    exact(parts, ["attendance-periods"], routes.attendancePeriodsIndex) ||
    (resource === "attendance-periods" && parts.length === 2
      ? { load: routes.attendancePeriodById, params: { id } }
      : null) ||
    exact(parts, ["reports", "dashboard"], routes.reportsDashboard) ||
    exact(parts, ["reports", "financial"], routes.reportsFinancial) ||
    exact(parts, ["reports", "unpaid-students"], routes.reportsUnpaidStudents) ||
    exact(parts, ["receipts"], routes.receiptsIndex) ||
    (resource === "receipts" && parts.length === 2
      ? { load: routes.receiptById, params: { id } }
      : null) ||
    (resource === "receipts" && action === "pdf" && parts.length === 3
      ? { load: routes.receiptPdf, params: { id } }
      : null) ||
    exact(parts, ["payments"], routes.paymentsIndex) ||
    (resource === "payments" && parts.length === 2
      ? { load: routes.paymentById, params: { id } }
      : null) ||
    (resource === "payments" && action === "pdf" && parts.length === 3
      ? { load: routes.paymentPdf, params: { id } }
      : null) ||
    exact(parts, ["templates"], routes.templatesIndex) ||
    exact(parts, ["templates", "upload"], routes.templateUpload) ||
    exact(parts, ["templates", "upload-image"], routes.templateUploadImage) ||
    (resource === "templates" && id === "default" && parts.length === 3
      ? { load: routes.templateDefaultByType, params: { type: action } }
      : null) ||
    (resource === "templates" && action === "set-default" && parts.length === 3
      ? { load: routes.templateSetDefault, params: { id } }
      : null) ||
    (resource === "templates" && parts.length === 2
      ? { load: routes.templateById, params: { id } }
      : null) ||
    exact(parts, ["monthly-fees"], routes.monthlyFeesIndex) ||
    exact(parts, ["monthly-fees", "calculate"], routes.monthlyFeesCalculate) ||
    (resource === "monthly-fees" && action === "confirm" && parts.length === 3
      ? { load: routes.monthlyFeeConfirm, params: { id } }
      : null) ||
    (resource === "monthly-fees" && action === "pay" && parts.length === 3
      ? { load: routes.monthlyFeePay, params: { id } }
      : null) ||
    (resource === "monthly-fees" && action === "cancel" && parts.length === 3
      ? { load: routes.monthlyFeeCancel, params: { id } }
      : null) ||
    (resource === "monthly-fees" && parts.length === 2
      ? { load: routes.monthlyFeeById, params: { id } }
      : null)
  );
}

async function recordMutationAudit(
  req: VercelRequest,
  requestId: string,
  routePath: string
) {
  const method = req.method?.toUpperCase();
  if (!method || !MUTATION_METHODS.has(method)) return;

  const user = verifyAuth(req);
  if (!user) return;

  try {
    await logActivity(req, user.userId, `API_${method}`, "api_route", routePath);
  } catch (error) {
    logApiError(
      error,
      {
        requestId,
        method,
        path: routePath,
      },
      "api_audit_log_failed"
    );
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = getRequestId(req);
  setSecurityHeaders(res);
  res.setHeader("X-Request-Id", requestId);

  if (handleCors(req, res)) return;

  const startedAt = Date.now();
  const parts = pathParts(req);
  const routePath = `/api/${parts.join("/")}`;
  const match = resolveRoute(parts);
  if (!match) {
    logApiEvent("warn", "api_route_not_found", {
      requestId,
      method: req.method,
      path: routePath,
    });
    return errorResponse(res, "NOT_FOUND", "API route not found", 404);
  }

  delete req.query.path;
  Object.assign(req.query, match.params || {});
  try {
    const module = await match.load();
    const result = await module.default(req, res);
    await recordMutationAudit(req, requestId, routePath);
    logApiEvent("info", "api_request_handled", {
      requestId,
      method: req.method,
      path: routePath,
      durationMs: Date.now() - startedAt,
    });
    return result;
  } catch (error) {
    logApiError(error, {
      requestId,
      method: req.method,
      path: routePath,
      durationMs: Date.now() - startedAt,
    });
    return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
  }
}
