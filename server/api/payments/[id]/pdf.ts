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

const categoryLabels: Record<string, string> = {
  salary: "Lương giáo viên",
  utility: "Điện/Nước",
  office: "Văn phòng phẩm",
  other: "Khác",
};

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
    return errorResponse(res, "METHOD_NOT_ALLOWED", "Only GET allowed", 405);
  }

  try {
    const id = getRequiredString(req.query.id, "id");
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { template: true },
    });

    if (!payment) throw new ApiError("NOT_FOUND", "Payment not found", 404);

    const data = {
      type: "payment",
      id: payment.id,
      payment_id: payment.id,
      payment_date: payment.createdAt.toLocaleDateString("vi-VN"),
      category: categoryLabels[payment.category] || payment.category,
      recipient_name: payment.recipientName,
      recipient_phone: payment.recipientPhone || "",
      amount: payment.amount,
      total_amount: payment.amount,
      amount_in_words: numberToWords(payment.amount),
      notes: payment.notes || "",
    };

    const buffer = await generatePdf(payment.template, data);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="payment-${payment.id}.pdf"`
    );
    return res.status(200).send(buffer);
  } catch (error) {
    return sendApiError(res, error, "PAYMENT_PDF_ERROR");
  }
}

export default requireAuth(handler);
