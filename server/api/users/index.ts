import bcrypt from "bcryptjs";
import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  errorResponse,
  handleCors,
  requireAuth,
  successResponse,
} from "../../../lib/auth.js";
import { ApiError, getString, sendApiError } from "../../../lib/api-utils.js";
import { userCreateSchema, validateBody } from "../../../lib/validation.js";
import { userToDto } from "./shared.js";

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  try {
    if (req.method === "GET") {
      const search = getString(req.query.search)?.trim();
      const role = getString(req.query.role);
      const status = getString(req.query.status);

      const users = await prisma.user.findMany({
        where: {
          ...(role ? { role: role as any } : {}),
          ...(status ? { status: status as any } : {}),
          ...(search
            ? {
                OR: [
                  { username: { contains: search, mode: "insensitive" } },
                  { fullName: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                  { phone: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      });

      return successResponse(res, { users: users.map(userToDto), total: users.length });
    }

    if (req.method === "POST") {
      const payload = validateBody(userCreateSchema, req.body);
      const existing = await prisma.user.findUnique({
        where: { username: payload.username },
        select: { id: true },
      });
      if (existing) {
        throw new ApiError("USERNAME_EXISTS", "username already exists", 409);
      }

      const passwordHash = await bcrypt.hash(payload.password, 10);
      const user = await prisma.user.create({
        data: {
          username: payload.username,
          passwordHash,
          fullName: payload.full_name,
          role: payload.role,
          email: payload.email || null,
          phone: payload.phone || null,
          status: payload.status,
        },
      });

      return successResponse(res, { user: userToDto(user) }, 201);
    }

    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET and POST allowed", 405);
  } catch (error) {
    return sendApiError(res, error, "USERS_ERROR");
  }
}

export default requireAuth(handler, ["admin"]);
