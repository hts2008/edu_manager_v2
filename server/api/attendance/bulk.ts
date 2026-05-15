import type { VercelRequest, VercelResponse } from "../../../lib/vercel-types.js";
import prisma from "../../../lib/prisma.js";
import {
  handleCors,
  verifyAuth,
  errorResponse,
  successResponse,
} from "../../../lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  const authUser = verifyAuth(req);
  if (!authUser) {
    return errorResponse(res, "UNAUTHORIZED", "Authentication required", 401);
  }

  if (req.method !== "POST") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only POST allowed", 405);
  }

  try {
    const { records, class_id, dates } = req.body;

    // Validate required fields
    if (!class_id) {
      return errorResponse(
        res,
        "MISSING_CLASS_ID",
        "class_id is required",
        400
      );
    }

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return errorResponse(
        res,
        "MISSING_DATES",
        "dates array is required",
        400
      );
    }

    // Allow empty records (user cleared all attendance for the week)
    const recordsArray = records || [];
    const validStatuses = ["present", "absent_with_fee", "absent_no_fee"];

    // Filter and transform valid records
    const validRecords = recordsArray
      .filter(
        (r: any) =>
          r.status &&
          validStatuses.includes(r.status) &&
          r.student_id &&
          r.class_id &&
          r.attendance_date
      )
      .map((r: any) => ({
        studentId: r.student_id,
        classId: r.class_id,
        attendanceDate: new Date(r.attendance_date),
        status: r.status as "present" | "absent_with_fee" | "absent_no_fee",
        reason: r.reason || null,
        createdById: authUser.userId,
      }));

    // Convert ALL dates to Date objects for deletion (not just from records)
    const dateObjects = dates.map((d: string) => new Date(d));

    // Use transaction for atomic delete + insert
    await prisma.$transaction(async (tx) => {
      // 1. Delete ALL existing records for this class and these dates
      // This ensures removed attendance cells are properly deleted
      await tx.attendance.deleteMany({
        where: {
          classId: class_id,
          attendanceDate: { in: dateObjects },
        },
      });

      // 2. Insert valid records (if any)
      if (validRecords.length > 0) {
        await tx.attendance.createMany({
          data: validRecords,
        });
      }
    });

    return successResponse(res, {
      message:
        validRecords.length > 0
          ? `Saved ${validRecords.length} attendance records`
          : `Cleared attendance for ${dates.length} dates`,
      count: validRecords.length,
    });
  } catch (error) {
    console.error("Bulk attendance error:", error);
    return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
  }
}
