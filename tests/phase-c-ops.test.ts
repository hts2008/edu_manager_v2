import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getCronAuthorization, isCronRequest } from "../lib/cron.js";
import { runFeeReminders } from "../lib/fee-reminders.js";

const originalCronSecret = process.env.CRON_SECRET;
const originalReminderEnabled = process.env.REMINDER_SEND_ENABLED;
const originalReminderUrl = process.env.REMINDER_WEBHOOK_URL;

afterEach(() => {
  if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalCronSecret;

  if (originalReminderEnabled === undefined) delete process.env.REMINDER_SEND_ENABLED;
  else process.env.REMINDER_SEND_ENABLED = originalReminderEnabled;

  if (originalReminderUrl === undefined) delete process.env.REMINDER_WEBHOOK_URL;
  else process.env.REMINDER_WEBHOOK_URL = originalReminderUrl;
});

describe("Phase C operations safeguards", () => {
  it("requires CRON_SECRET for cron authorization", () => {
    delete process.env.CRON_SECRET;
    assert.equal(getCronAuthorization(), null);
    assert.equal(
      isCronRequest({ headers: { authorization: "Bearer anything" } } as any),
      false
    );

    process.env.CRON_SECRET = "phase-c-secret";
    assert.equal(getCronAuthorization(), "Bearer phase-c-secret");
    assert.equal(
      isCronRequest({ headers: { authorization: "Bearer phase-c-secret" } } as any),
      true
    );
  });

  it("keeps live fee reminders disabled without explicit env opt-in", async () => {
    delete process.env.REMINDER_SEND_ENABLED;
    process.env.REMINDER_WEBHOOK_URL = "https://example.invalid/reminder";

    const prisma = {
      monthlyFee: {
        findMany: async () => [
          {
            id: "fee_1",
            studentId: "student_1",
            month: "2026-05",
            status: "confirmed",
            totalAmount: 100000,
            student: {
              id: "student_1",
              fullName: "Student One",
              parent: {
                id: "parent_1",
                fullName: "Parent One",
                phone: "0900000000",
              },
            },
          },
        ],
      },
    };

    const result = await runFeeReminders(prisma, {
      month: "2026-05",
      dryRun: false,
    });

    assert.equal(result.summary.disabled, 1);
    assert.equal(result.results[0].send_status, "disabled");
  });
});
