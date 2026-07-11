import type { VercelResponse } from "../../../lib/vercel-types.js";
import {
  AuthedRequest,
  handleCors,
  requireAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";
import {
  ApiError,
  getRequiredString,
  logActivity,
  sendApiError,
} from "../../../lib/api-utils.js";
import { uploadImage } from "../../../lib/storage.js";
import { validateTemplateImage } from "../../../lib/template-render-contract.js";

function decodeBase64Image(value: string) {
  const normalized = value.replace(/\s/g, "");
  if (!normalized || !/^[a-z0-9+/]+={0,2}$/i.test(normalized) || normalized.length % 4 !== 0) {
    throw new ApiError("INVALID_BASE64", "Image payload is not valid base64", 400);
  }
  const buffer = Buffer.from(normalized, "base64");
  if (buffer.toString("base64").replace(/=+$/, "") !== normalized.replace(/=+$/, "")) {
    throw new ApiError("INVALID_BASE64", "Image payload is not valid base64", 400);
  }
  return buffer;
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }
  if (req.user.role !== "admin") {
    return errorResponse(res, "FORBIDDEN", "Admin access required", 403);
  }

  try {
    const filename = getRequiredString(req.body?.filename, "filename");
    const contentType = getRequiredString(req.body?.contentType, "contentType");
    const base64 = getRequiredString(req.body?.base64, "base64");

    const buffer = decodeBase64Image(base64);
    validateTemplateImage(buffer, contentType);

    const data = await uploadImage(buffer, filename, contentType);
    await logActivity(req, req.user.id, "UPLOAD_TEMPLATE_IMAGE", "template_image", data.path);
    return successResponse(res, data, 201);
  } catch (error) {
    return sendApiError(res, error, "TEMPLATE_UPLOAD_ERROR");
  }
}

export default requireAuth(handler, ["admin"]);
