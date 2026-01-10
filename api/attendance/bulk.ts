import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../../lib/prisma.js";
import {
  handleCors,
  verifyAuth,
  errorResponse,
  successResponse,
} from "../../lib/auth.js";

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
    const { records } = req.body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return errorResponse(
        res,
        "MISSING_RECORDS",
        "Records array required",
        400
      );
    }

    // Collect unique class IDs and date range for efficient deletion
    const classIds = new Set<string>();
    const dates = new Set<string>();
    const validStatuses = ["present", "absent_with_fee", "absent_no_fee"];

    // Filter and transform valid records
    const validRecords = records
      .filter(
        (r: any) =>
          r.status &&
          validStatuses.includes(r.status) &&
          r.student_id &&
          r.class_id &&
          r.attendance_date
      )
      .map((r: any) => {
        classIds.add(r.class_id);
        dates.add(r.attendance_date);
        return {
          studentId: r.student_id,
          classId: r.class_id,
          attendanceDate: new Date(r.attendance_date),
          status: r.status as "present" | "absent_with_fee" | "absent_no_fee",
          reason: r.reason || null,
          createdById: authUser.userId,
        };
      });

    if (validRecords.length === 0) {
      return successResponse(res, {
        message: "No valid records to save",
        count: 0,
      });
    }

    // Convert dates to Date objects for query
    const dateObjects = Array.from(dates).map((d) => new Date(d));

    // Use transaction for atomic delete + insert (2 queries instead of N+1)
    await prisma.$transaction(async (tx) => {
      // 1. Delete existing records for these class/date combinations
      await tx.attendance.deleteMany({
        where: {
          classId: { in: Array.from(classIds) },
          attendanceDate: { in: dateObjects },
        },
      });

      // 2. Insert all valid records at once
      await tx.attendance.createMany({
        data: validRecords,
      });
    });

    return successResponse(res, {
      message: `Saved ${validRecords.length} attendance records`,
      count: validRecords.length,
    });
  } catch (error) {
    console.error("Bulk attendance error:", error);
    return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
  }
}
