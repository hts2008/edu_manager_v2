import type { VercelRequest, VercelResponse } from "./vercel-types.js";
import type { TemplateType } from "@prisma/client";
import prisma from "./prisma.js";
import { errorResponse } from "./auth.js";

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function sendApiError(
  res: VercelResponse,
  error: unknown,
  fallbackCode = "SERVER_ERROR",
  fallbackMessage = "Internal server error"
) {
  if (error instanceof ApiError) {
    return errorResponse(res, error.code, error.message, error.status);
  }

  console.error(fallbackCode, error);
  return errorResponse(res, fallbackCode, fallbackMessage, 500);
}

export function getString(value: unknown): string | undefined {
  if (Array.isArray(value)) return value[0] ? String(value[0]) : undefined;
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

export function getNumber(value: unknown): number | undefined {
  const str = getString(value);
  if (!str) return undefined;
  const num = Number(str);
  return Number.isFinite(num) ? num : undefined;
}

export function getRequiredString(value: unknown, field: string): string {
  const str = getString(value);
  if (!str) throw new ApiError("MISSING_FIELD", `${field} is required`, 400);
  return str;
}

export function parseMonthRange(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new ApiError("INVALID_MONTH", "month must be YYYY-MM", 400);
  }

  const [year, monthNumber] = month.split("-").map(Number);
  return {
    startDate: new Date(year, monthNumber - 1, 1),
    endDate: new Date(year, monthNumber, 0, 23, 59, 59, 999),
  };
}

export function toIsoDate(date: Date | string | null | undefined) {
  if (!date) return null;
  const value = date instanceof Date ? date : new Date(date);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

export function toDateOnly(date: Date | string | null | undefined) {
  const iso = toIsoDate(date);
  return iso ? iso.split("T")[0] : null;
}

export function parseJsonConfig(value: unknown) {
  if (!value) return { objects: [], version: "1.0" };
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return { objects: [], version: "1.0" };
    }
  }
  return value;
}

export function templateToDto(template: any, includeConfig = true) {
  const dto: Record<string, unknown> = {
    id: template.id,
    template_name: template.templateName,
    type: template.type,
    paper_size: template.paperSize,
    orientation: template.orientation,
    is_default: template.isDefault ? 1 : 0,
    created_by: template.createdById,
    created_at: template.createdAt,
    updated_at: template.updatedAt,
  };

  if (includeConfig) {
    dto.json_config =
      typeof template.jsonConfig === "string"
        ? template.jsonConfig
        : JSON.stringify(template.jsonConfig || { objects: [], version: "1.0" });
  }

  return dto;
}

export async function resolveTemplateId(
  type: TemplateType,
  templateId?: string | null
) {
  const useDefault =
    !templateId ||
    templateId === "TPL_DEFAULT_RECEIPT" ||
    templateId === "TPL_DEFAULT_PAYMENT";

  if (!useDefault) {
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      select: { id: true, type: true },
    });
    if (!template || template.type !== type) {
      throw new ApiError("TEMPLATE_NOT_FOUND", "Template not found", 404);
    }
    return template.id;
  }

  const defaultTemplate = await prisma.template.findFirst({
    where: { type, isDefault: true },
    select: { id: true },
  });

  if (!defaultTemplate) {
    throw new ApiError(
      "TEMPLATE_NOT_CONFIGURED",
      `Default ${type} template is not configured`,
      500
    );
  }

  return defaultTemplate.id;
}

export async function logActivity(
  req: VercelRequest,
  userId: string,
  action: string,
  entityType?: string,
  entityId?: string
) {
  await prisma.activityLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      ipAddress:
        getString(req.headers["x-forwarded-for"]) ||
        getString(req.headers["x-real-ip"]),
      userAgent: getString(req.headers["user-agent"]),
    },
  });
}
