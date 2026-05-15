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

    if (!contentType.startsWith("image/")) {
      throw new ApiError("INVALID_FILE_TYPE", "Only image uploads are allowed", 400);
    }

    const buffer = Buffer.from(base64, "base64");
    if (!buffer.length) {
      throw new ApiError("EMPTY_FILE", "Uploaded image is empty", 400);
    }

    const data = await uploadImage(buffer, filename, contentType);
    await logActivity(req, req.user.id, "UPLOAD_TEMPLATE_IMAGE", "template_image", data.path);
    return successResponse(res, data, 201);
  } catch (error) {
    return sendApiError(res, error, "TEMPLATE_UPLOAD_ERROR");
  }
}

export default requireAuth(handler, ["admin"]);
