import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import prisma from "./prisma.js";
import { getAuthConfig } from "./auth-config.js";

export type AuthSubjectType = "user" | "parent";

export type SessionTokenPayload = jwt.JwtPayload & {
  sub: string;
  jti: string;
  typ: AuthSubjectType;
  ver: number;
  role?: "admin" | "receptionist";
  username?: string;
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
}) {
  const config = getAuthConfig();
  const tokenId = randomUUID();
  const ttl = TOKEN_TTL_SECONDS[input.subjectType];
  const expiresAt = new Date(Date.now() + ttl * 1000);

  await prisma.authSession.create({
    data: {
      tokenId,
      subjectType: input.subjectType,
      userId: input.subjectType === "user" ? input.subjectId : null,
      parentId: input.subjectType === "parent" ? input.subjectId : null,
      tokenVersion: input.tokenVersion,
      expiresAt,
    },
  });

  const token = jwt.sign(
    {
      typ: input.subjectType,
      ver: input.tokenVersion,
      role: input.role,
      username: input.username,
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
  return prisma.authSession.findFirst({
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
}

export async function revokeSession(tokenId: string) {
  await prisma.authSession.updateMany({
    where: { tokenId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
