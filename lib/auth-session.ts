import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import prisma from "./prisma.js";
import { getAuthConfig } from "./auth-config.js";
import {
  assertTenantIdentity,
  DEFAULT_TENANT_ID,
  getTenancyMode,
  tenantIdForWrite,
} from "./tenancy.js";

export type AuthSubjectType = "user" | "parent";

export type SessionTokenPayload = jwt.JwtPayload & {
  sub: string;
  jti: string;
  typ: AuthSubjectType;
  ver: number;
  role?: "admin" | "receptionist";
  username?: string;
  tid?: string;
  pown?: boolean;
};

const TOKEN_TTL_SECONDS: Record<AuthSubjectType, number> = {
  user: 8 * 60 * 60,
  parent: 7 * 24 * 60 * 60,
};

export async function createSessionToken(input: {
  subjectId: string;
  subjectType: AuthSubjectType;
  tokenVersion: number;
  role?: "admin" | "receptionist";
  username?: string;
  tenantId?: string | null;
  isPlatformOwner?: boolean;
}) {
  const config = getAuthConfig();
  const tokenId = randomUUID();
  const ttl = TOKEN_TTL_SECONDS[input.subjectType];
  const expiresAt = new Date(Date.now() + ttl * 1000);
  const effectiveTenantId = tenantIdForWrite(input.tenantId) ?? DEFAULT_TENANT_ID;

  await prisma.authSession.create({
    data: {
      tokenId,
      subjectType: input.subjectType,
      userId: input.subjectType === "user" ? input.subjectId : null,
      parentId: input.subjectType === "parent" ? input.subjectId : null,
      tokenVersion: input.tokenVersion,
      tenantId: effectiveTenantId,
      expiresAt,
    },
  });

  const token = jwt.sign(
    {
      typ: input.subjectType,
      ver: input.tokenVersion,
      role: input.role,
      username: input.username,
      tid: effectiveTenantId ?? undefined,
      pown: input.isPlatformOwner === true,
    },
    config.secret,
    {
      algorithm: config.algorithm,
      audience: config.audience,
      issuer: config.issuer,
      subject: input.subjectId,
      jwtid: tokenId,
      expiresIn: ttl,
    }
  );

  return { token, tokenId, expiresAt };
}

export function verifySessionToken(token: string, expectedType: AuthSubjectType) {
  const config = getAuthConfig();
  const decoded = jwt.verify(token, config.secret, {
    algorithms: [config.algorithm],
    audience: config.audience,
    issuer: config.issuer,
  }) as SessionTokenPayload;

  if (
    decoded.typ !== expectedType ||
    !decoded.sub ||
    !decoded.jti ||
    !Number.isInteger(decoded.ver)
  ) {
    throw new jwt.JsonWebTokenError("Invalid token payload");
  }
  return decoded;
}

export async function getActiveSession(payload: SessionTokenPayload) {
  const session = await prisma.authSession.findFirst({
    where: {
      tokenId: payload.jti,
      subjectType: payload.typ,
      tokenVersion: payload.ver,
      revokedAt: null,
      expiresAt: { gt: new Date() },
      ...(payload.typ === "user"
        ? { userId: payload.sub }
        : { parentId: payload.sub }),
    },
  });
  if (!session) return null;
  assertTenantIdentity({
    mode: getTenancyMode(),
    tokenTenantId: payload.tid,
    sessionTenantId: session.tenantId,
    subjectTenantId: session.tenantId,
  });
  return session;
}

export async function revokeSession(tokenId: string) {
  await prisma.authSession.updateMany({
    where: { tokenId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
