import type { VercelResponse } from "@vercel/node";
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
    const receipt = await prisma.receipt.findUnique({
      where: { id },
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
      },
    });

    if (!receipt) throw new ApiError("NOT_FOUND", "Receipt not found", 404);

    const data = {
      type: "receipt",
      id: receipt.id,
      receipt_id: receipt.id,
      receipt_date: receipt.createdAt.toLocaleDateString("vi-VN"),
      student_name: receipt.student.fullName,
      parent_name: receipt.student.parent?.fullName || "",
      parent_phone: receipt.student.parent?.phone || "",
      class_name:
        receipt.student.studentClasses
          .map((studentClass) => studentClass.class.className)
          .join(", ") || "",
      month: receipt.month,
      days_count: receipt.daysCount,
      fee_per_day: receipt.feePerDay,
      amount: receipt.amount,
      total_amount: receipt.amount,
      payment_method: receipt.paymentMethod === "cash" ? "Tiền mặt" : "Chuyển khoản",
      amount_in_words: numberToWords(receipt.amount),
      notes: receipt.notes || "",
    };

    const buffer = await generatePdf(receipt.template, data);
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
