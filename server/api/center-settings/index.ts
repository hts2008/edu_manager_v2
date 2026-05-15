import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  errorResponse,
  handleCors,
  requireAuth,
  successResponse,
} from "../../../lib/auth.js";
import { logActivity, sendApiError } from "../../../lib/api-utils.js";
import { centerSettingsSchema, validateBody } from "../../../lib/validation.js";

function settingsToDto(settings: any) {
  return {
    id: settings.id,
    center_name: settings.centerName,
    center_address: settings.centerAddress,
    center_phone: settings.centerPhone,
    center_email: settings.centerEmail,
    center_logo: settings.centerLogo,
    updated_at: settings.updatedAt,
  };
}

async function ensureSettings() {
  return prisma.centerSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method === "GET") {
    try {
      const settings = await ensureSettings();
      return successResponse(res, settingsToDto(settings));
    } catch (error) {
      return sendApiError(res, error, "CENTER_SETTINGS_GET_ERROR");
    }
  }

  if (req.method === "PUT") {
    if (req.user.role !== "admin") {
      return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
    }

    try {
      const body = validateBody(centerSettingsSchema, req.body);
      const current = await ensureSettings();
      const settings = await prisma.centerSettings.update({
        where: { id: 1 },
        data: {
          centerName: body.center_name ?? current.centerName,
          centerAddress:
            body.center_address === undefined
              ? current.centerAddress
              : body.center_address,
          centerPhone:
            body.center_phone === undefined ? current.centerPhone : body.center_phone,
          centerEmail:
            body.center_email === undefined ? current.centerEmail : body.center_email,
          centerLogo:
            body.center_logo === undefined ? current.centerLogo : body.center_logo,
        },
      });

      await logActivity(req, req.user.id, "UPDATE_CENTER_SETTINGS", "center_settings", "1");
      return successResponse(res, settingsToDto(settings));
    } catch (error) {
      return sendApiError(res, error, "CENTER_SETTINGS_UPDATE_ERROR");
    }
  }

  return errorResponse(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

export default requireAuth(handler);
