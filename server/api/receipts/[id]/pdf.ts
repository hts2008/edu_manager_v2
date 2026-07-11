import type { VercelResponse } from "../../../../lib/vercel-types.js";
import prisma from "../../../../lib/prisma.js";
import {
  AuthedRequest,
  handleCors,
  requireAuth,
  errorResponse,
} from "../../../../lib/auth.js";
import {
  ApiError,
  getRequiredString,
  sendApiError,
} from "../../../../lib/api-utils.js";
import { generatePdf, numberToWords } from "../../../../lib/pdf.js";

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  try {
    const id = getRequiredString(req.query.id, "id");
    const receipt = await prisma.receipt.findFirst({
      where: { id, deletedAt: null },
      include: {
        student: {
          include: {
            parent: { select: { fullName: true, phone: true } },
            studentClasses: {
              where: { status: "active" },
              include: { class: { select: { className: true } } },
            },
          },
        },
        template: true,
        receiptLines: {
          include: {
            class: { include: { teacher: true } },
            monthlyFeeLine: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!receipt) throw new ApiError("NOT_FOUND", "Receipt not found", 404);

    const receiptLines =
      receipt.receiptLines?.map((line) => ({
        class_name: line.classNameSnapshot || line.class?.className || "",
        teacher_name: line.teacherNameSnapshot || line.class?.teacher?.fullName || "",
        days_count: line.daysCount,
        expected_sessions: line.expectedSessions || line.monthlyFeeLine?.expectedSessions || 0,
        fee_per_day: line.feePerDay,
        amount: line.amount,
        notes: line.notes || "",
      })) || [];
    const fallbackClassName =
      receipt.student.studentClasses
        .map((studentClass) => studentClass.class.className)
        .join(", ") || "";
    const className =
      receiptLines.map((line) => line.class_name).filter(Boolean).join(", ") ||
      fallbackClassName;

    const data = {
      type: "receipt",
      id: receipt.id,
      receipt_id: receipt.id,
      receipt_date: receipt.createdAt.toLocaleDateString("vi-VN"),
      student_name: receipt.student.fullName,
      parent_name: receipt.student.parent?.fullName || "",
      parent_phone: receipt.student.parent?.phone || "",
      class_name: className,
      month: receipt.month,
      days_count: receipt.daysCount,
      fee_per_day: receipt.feePerDay,
      amount: receipt.amount,
      total_amount: receipt.amount,
      payment_method: receipt.paymentMethod === "cash" ? "Tiền mặt" : "Chuyển khoản",
      amount_in_words: numberToWords(receipt.amount),
      notes: receipt.notes || "",
      items: receiptLines,
    };

    let buffer: Buffer;
    try {
      buffer = await generatePdf(receipt.template, data);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("PDF_RENDER_FAILED", "Receipt PDF could not be rendered", 500);
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="receipt-${receipt.id}.pdf"`
    );
    return res.status(200).send(buffer);
  } catch (error) {
    return sendApiError(res, error, "RECEIPT_PDF_ERROR");
  }
}

export default requireAuth(handler);
