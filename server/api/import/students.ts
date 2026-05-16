import type { VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  AuthedRequest,
  errorResponse,
  handleCors,
  requireAuth,
  successResponse,
} from "../../../lib/auth.js";
import { ApiError, logActivity, sendApiError } from "../../../lib/api-utils.js";
import {
  commitStudentImport,
  previewStudentImport,
} from "../../../lib/import-students.js";

function readCsv(body: any) {
  const csv = body?.csv || body?.csv_content || body?.content;
  if (typeof csv !== "string" || !csv.trim()) {
    throw new ApiError("CSV_REQUIRED", "csv content is required", 400);
  }
  return csv;
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }

  try {
    const mode = req.body?.mode === "commit" ? "commit" : "preview";
    const csv = readCsv(req.body);

    if (mode === "preview") {
      const preview = await previewStudentImport(prisma, csv);
      return successResponse(res, preview);
    }

    const result = await commitStudentImport(prisma, csv);
    if (!result.ok) {
      return res.status(400).json({
        success: false,
        error: {
          code: result.code,
          message: result.message,
          details: result.preview,
        },
      });
    }

    try {
      await logActivity(
        req,
        req.user.id,
        "IMPORT_STUDENTS",
        "students",
        `${result.committed.summary.created_students}`
      );
    } catch {
      // Router-level audit remains the primary write audit.
    }

    return successResponse(
      res,
      {
        mode: "commit",
        students: result.committed.students,
        summary: result.committed.summary,
        preview_summary: result.preview.summary,
      },
      201
    );
  } catch (error) {
    return sendApiError(res, error, "IMPORT_STUDENTS_ERROR");
  }
}

export default requireAuth(handler, ["admin"]);
