const EMPTY_STATUS = Object.freeze({
  appVersion: "Không xác định",
  environment: [],
  crons: [],
  cronConfigReadable: false,
  legacyLinks: [],
});

export function normalizeSystemStatus(payload) {
  const source = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  if (!source || typeof source !== "object") return { ...EMPTY_STATUS };
  return {
    appVersion: typeof source.appVersion === "string" ? source.appVersion : EMPTY_STATUS.appVersion,
    environment: Array.isArray(source.environment) ? source.environment : [],
    crons: Array.isArray(source.crons) ? source.crons : [],
    cronConfigReadable: source.cronConfigReadable === true,
    legacyLinks: Array.isArray(source.legacyLinks) ? source.legacyLinks : [],
  };
}

export function summarizeEnvironment(environment) {
  const items = Array.isArray(environment) ? environment : [];
  const configured = items.filter((item) => item?.configured === true).length;
  return { configured, missing: items.length - configured, total: items.length };
}

export function formatLastRun(value) {
  if (!value) return "Chưa có dữ liệu";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có dữ liệu";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export async function fetchSystemStatus({ signal } = {}) {
  return normalizeSystemStatus(await adminSystemService.getStatus({ signal }));
}
import { adminSystemService } from "../services/api.js";
