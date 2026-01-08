import type { VercelRequest, VercelResponse } from "@vercel/node";
import prisma from "../../lib/prisma";
import {
  handleCors,
  verifyAuth,
  errorResponse,
  successResponse,
} from "../../lib/auth";

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

    // Group records by class_id and date for efficient deletion
    const deleteKeys = new Set<string>();
    records.forEach((r: any) => {
      if (r.class_id && r.attendance_date) {
        deleteKeys.add(`${r.class_id}|${r.attendance_date}`);
      }
    });

    // Delete existing records for each class/date combination
    for (const key of deleteKeys) {
      const [classId, date] = key.split("|");
      await prisma.attendance.deleteMany({
        where: {
          classId,
          attendanceDate: new Date(date),
        },
      });
    }

    // Insert new records
    let counter = 0;
    const validStatuses = ["present", "absent_with_fee", "absent_no_fee"];

    for (const r of records) {
      if (
        r.status &&
        validStatuses.includes(r.status) &&
        r.student_id &&
        r.class_id &&
        r.attendance_date
      ) {
        counter++;
        await prisma.attendance.create({
          data: {
            studentId: r.student_id,
            classId: r.class_id,
            attendanceDate: new Date(r.attendance_date),
            status: r.status,
            reason: r.reason || null,
            createdById: authUser.userId,
          },
        });
      }
    }

    return successResponse(res, {
      message: `Saved ${counter} attendance records`,
    });
  } catch (error) {
    console.error("Bulk attendance error:", error);
    return errorResponse(res, "SERVER_ERROR", "Internal server error", 500);
  }
}
