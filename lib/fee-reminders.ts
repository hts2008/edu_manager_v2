import { parseMonthRange } from "./api-utils.js";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export async function buildFeeReminders(prisma: any, month = currentMonth()) {
  parseMonthRange(month);
  const fees = await prisma.monthlyFee.findMany({
    where: {
      month,
      status: { in: ["pending", "ready", "confirmed"] },
      totalAmount: { gt: 0 },
      student: {
        deletedAt: null,
        parent: { deletedAt: null },
      },
    },
    include: {
      student: {
        include: {
          parent: true,
        },
      },
    },
    orderBy: { student: { fullName: "asc" } },
  });

  const items = fees
    .filter((fee: any) => fee.student?.parent?.phone)
    .map((fee: any) => ({
      fee_id: fee.id,
      student_id: fee.studentId,
      student_name: fee.student.fullName,
      parent_id: fee.student.parent.id,
      parent_name: fee.student.parent.fullName,
      parent_phone: fee.student.parent.phone,
      month: fee.month,
      status: fee.status,
      total_amount: fee.totalAmount,
      message: `Trung tam thong bao hoc phi thang ${fee.month} cua ${fee.student.fullName}: ${formatCurrency(fee.totalAmount)}. Vui long thanh toan khi thuan tien. Cam on quy phu huynh.`,
    }));

  return {
    month,
    items,
    summary: {
      total: items.length,
      total_amount: items.reduce((sum: number, item: any) => sum + item.total_amount, 0),
    },
  };
}

async function sendWebhookReminder(item: any) {
  if (process.env.REMINDER_SEND_ENABLED !== "true") {
    return {
      ...item,
      send_status: "disabled",
      provider: "webhook",
      error: "REMINDER_SEND_ENABLED must be true before live sends",
    };
  }

  const url = process.env.REMINDER_WEBHOOK_URL || process.env.SMS_WEBHOOK_URL;
  if (!url) {
    return {
      ...item,
      send_status: "not_configured",
      provider: "webhook",
      error: "REMINDER_WEBHOOK_URL is not configured",
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.REMINDER_WEBHOOK_TOKEN
        ? { Authorization: `Bearer ${process.env.REMINDER_WEBHOOK_TOKEN}` }
        : {}),
    },
    body: JSON.stringify(item),
  });

  return {
    ...item,
    send_status: response.ok ? "sent" : "failed",
    provider: "webhook",
    status_code: response.status,
  };
}

export async function runFeeReminders(
  prisma: any,
  { month = currentMonth(), dryRun = true }: { month?: string; dryRun?: boolean }
) {
  const preview = await buildFeeReminders(prisma, month);
  if (dryRun) {
    return {
      dry_run: true,
      ...preview,
      results: preview.items.map((item: any) => ({
        ...item,
        send_status: "preview",
      })),
    };
  }

  const results = [];
  for (const item of preview.items) {
    results.push(await sendWebhookReminder(item));
  }

  return {
    dry_run: false,
    month,
    items: preview.items,
    results,
    summary: {
      ...preview.summary,
      sent: results.filter((item: any) => item.send_status === "sent").length,
      failed: results.filter((item: any) => item.send_status === "failed").length,
      not_configured: results.filter((item: any) => item.send_status === "not_configured").length,
      disabled: results.filter((item: any) => item.send_status === "disabled").length,
    },
  };
}
