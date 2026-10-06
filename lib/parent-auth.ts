import jwt from "jsonwebtoken";
import type { VercelRequest } from "./vercel-types.js";
import { ApiError } from "./api-utils.js";
import prisma from "./prisma.js";
import type { PrismaClient } from "@prisma/client";
import {
  createSessionToken,
  getActiveSession,
  verifySessionToken,
  type SessionTokenPayload,
} from "./auth-session.js";
import { getBearerToken } from "./auth.js";
import { getTenantClient } from "./prisma-tenant.js";
import { assertTenantIdentity, getTenancyMode } from "./tenancy.js";

export type ParentAuth = {
  parentId: string;
  tenantId: string;
  type: "parent_portal";
  token: SessionTokenPayload;
  db: PrismaClient;
};

export function normalizePhone(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/[^\d+]/g, "");
}

export async function signParentToken(
  parentId: string,
  tokenVersion: number,
  tenantId: string,
) {
  const session = await createSessionToken({
    subjectId: parentId,
    subjectType: "parent",
    tokenVersion,
    tenantId,
  });
  return session.token;
}

export async function verifyParentToken(req: VercelRequest): Promise<ParentAuth> {
  const token = getBearerToken(req);
  if (!token) {
    throw new ApiError("UNAUTHORIZED", "Parent portal token is required", 401);
  }

  try {
    const decoded = verifySessionToken(token, "parent");
    const [session, parent] = await Promise.all([
      getActiveSession(decoded),
      prisma.parent.findFirst({
        where: { id: decoded.sub, tenantId: decoded.tid },
        select: { id: true, tenantId: true, tokenVersion: true, deletedAt: true },
      }),
    ]);
    if (
      !session ||
      !parent ||
      !parent.tenantId ||
      parent.deletedAt ||
      parent.tokenVersion !== decoded.ver
    ) {
      throw new ApiError("TOKEN_INVALID", "Invalid parent portal token", 401);
    }
    assertTenantIdentity({
      mode: getTenancyMode(),
      tokenTenantId: decoded.tid,
      sessionTenantId: session.tenantId,
      subjectTenantId: parent.tenantId,
    });
    return {
      parentId: decoded.sub,
      tenantId: parent.tenantId,
      type: "parent_portal",
      token: decoded,
      db: getTenantClient(parent.tenantId),
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError("TOKEN_EXPIRED", "Parent portal token expired", 401);
    }
    throw new ApiError("TOKEN_INVALID", "Invalid parent portal token", 401);
  }
}

export function toDateOnly(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().split("T")[0];
}
