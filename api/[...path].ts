import type { VercelRequest, VercelResponse } from "@vercel/node";
import { errorResponse, handleCors } from "../lib/auth.js";

import attendanceBulk from "../server/api/attendance/bulk.js";
import attendanceCalculateFee from "../server/api/attendance/calculate-fee.js";
import attendanceIndex from "../server/api/attendance/index.js";
import attendanceMonth from "../server/api/attendance/month.js";
import attendancePeriodById from "../server/api/attendance-periods/[id]/index.js";
import attendancePeriodsIndex from "../server/api/attendance-periods/index.js";
import authChangePassword from "../server/api/auth/change-password.js";
import authLogin from "../server/api/auth/login.js";
import authLogout from "../server/api/auth/logout.js";
import authMe from "../server/api/auth/me.js";
import classesIndex from "../server/api/classes/index.js";
import monthlyFeeCancel from "../server/api/monthly-fees/[id]/cancel.js";
import monthlyFeeConfirm from "../server/api/monthly-fees/[id]/confirm.js";
import monthlyFeeById from "../server/api/monthly-fees/[id]/index.js";
import monthlyFeePay from "../server/api/monthly-fees/[id]/pay.js";
import monthlyFeesCalculate from "../server/api/monthly-fees/calculate.js";
import monthlyFeesIndex from "../server/api/monthly-fees/index.js";
import parentsIndex from "../server/api/parents/index.js";
import paymentById from "../server/api/payments/[id]/index.js";
import paymentPdf from "../server/api/payments/[id]/pdf.js";
import paymentsIndex from "../server/api/payments/index.js";
import receiptById from "../server/api/receipts/[id]/index.js";
import receiptPdf from "../server/api/receipts/[id]/pdf.js";
import receiptsIndex from "../server/api/receipts/index.js";
import reportsDashboard from "../server/api/reports/dashboard.js";
import reportsFinancial from "../server/api/reports/financial.js";
import reportsUnpaidStudents from "../server/api/reports/unpaid-students.js";
import studentsIndex from "../server/api/students/index.js";
import teachersIndex from "../server/api/teachers/index.js";
import templateById from "../server/api/templates/[id]/index.js";
import templateSetDefault from "../server/api/templates/[id]/set-default.js";
import templateDefaultByType from "../server/api/templates/default/[type].js";
import templatesIndex from "../server/api/templates/index.js";
import templateUpload from "../server/api/templates/upload.js";
import templateUploadImage from "../server/api/templates/upload-image.js";

type Handler = (
  req: VercelRequest,
  res: VercelResponse
) => Promise<unknown> | unknown;

type RouteMatch = {
  handler: Handler;
  params?: Record<string, string>;
};

function pathParts(req: VercelRequest) {
  const raw = req.query.path;
  const parts = Array.isArray(raw) ? raw : raw ? String(raw).split("/") : [];
  return parts.map((part) => decodeURIComponent(part)).filter(Boolean);
}

function exact(parts: string[], expected: string[], handler: Handler): RouteMatch | null {
  if (parts.length !== expected.length) return null;
  return parts.every((part, index) => part === expected[index]) ? { handler } : null;
}

function resolveRoute(parts: string[]): RouteMatch | null {
  const [resource, id, action] = parts;

  return (
    exact(parts, ["auth", "login"], authLogin) ||
    exact(parts, ["auth", "me"], authMe) ||
    exact(parts, ["auth", "logout"], authLogout) ||
    exact(parts, ["auth", "change-password"], authChangePassword) ||
    exact(parts, ["students"], studentsIndex) ||
    exact(parts, ["parents"], parentsIndex) ||
    exact(parts, ["teachers"], teachersIndex) ||
    exact(parts, ["classes"], classesIndex) ||
    exact(parts, ["attendance"], attendanceIndex) ||
    exact(parts, ["attendance", "bulk"], attendanceBulk) ||
    exact(parts, ["attendance", "month"], attendanceMonth) ||
    exact(parts, ["attendance", "calculate-fee"], attendanceCalculateFee) ||
    exact(parts, ["attendance-periods"], attendancePeriodsIndex) ||
    (resource === "attendance-periods" && parts.length === 2
      ? { handler: attendancePeriodById, params: { id } }
      : null) ||
    exact(parts, ["reports", "dashboard"], reportsDashboard) ||
    exact(parts, ["reports", "financial"], reportsFinancial) ||
    exact(parts, ["reports", "unpaid-students"], reportsUnpaidStudents) ||
    exact(parts, ["receipts"], receiptsIndex) ||
    (resource === "receipts" && parts.length === 2
      ? { handler: receiptById, params: { id } }
      : null) ||
    (resource === "receipts" && action === "pdf" && parts.length === 3
      ? { handler: receiptPdf, params: { id } }
      : null) ||
    exact(parts, ["payments"], paymentsIndex) ||
    (resource === "payments" && parts.length === 2
      ? { handler: paymentById, params: { id } }
      : null) ||
    (resource === "payments" && action === "pdf" && parts.length === 3
      ? { handler: paymentPdf, params: { id } }
      : null) ||
    exact(parts, ["templates"], templatesIndex) ||
    exact(parts, ["templates", "upload"], templateUpload) ||
    exact(parts, ["templates", "upload-image"], templateUploadImage) ||
    (resource === "templates" && id === "default" && parts.length === 3
      ? { handler: templateDefaultByType, params: { type: action } }
      : null) ||
    (resource === "templates" && action === "set-default" && parts.length === 3
      ? { handler: templateSetDefault, params: { id } }
      : null) ||
    (resource === "templates" && parts.length === 2
      ? { handler: templateById, params: { id } }
      : null) ||
    exact(parts, ["monthly-fees"], monthlyFeesIndex) ||
    exact(parts, ["monthly-fees", "calculate"], monthlyFeesCalculate) ||
    (resource === "monthly-fees" && action === "confirm" && parts.length === 3
      ? { handler: monthlyFeeConfirm, params: { id } }
      : null) ||
    (resource === "monthly-fees" && action === "pay" && parts.length === 3
      ? { handler: monthlyFeePay, params: { id } }
      : null) ||
    (resource === "monthly-fees" && action === "cancel" && parts.length === 3
      ? { handler: monthlyFeeCancel, params: { id } }
      : null) ||
    (resource === "monthly-fees" && parts.length === 2
      ? { handler: monthlyFeeById, params: { id } }
      : null)
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  const match = resolveRoute(pathParts(req));
  if (!match) {
    return errorResponse(res, "NOT_FOUND", "API route not found", 404);
  }

  delete req.query.path;
  Object.assign(req.query, match.params || {});
  return match.handler(req, res);
}
