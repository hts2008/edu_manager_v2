import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { ApiError } from "../lib/api-utils.js";
import {
  assertParentPortalEnabled,
  resolveFeatureRuntime,
  renderReminderMessage,
} from "../lib/feature-flags.js";
import { runFeeReminders } from "../lib/fee-reminders.js";

const originalSendEnabled = process.env.REMINDER_SEND_ENABLED;
const originalWebhookUrl = process.env.REMINDER_WEBHOOK_URL;
const originalFetch = globalThis.fetch;

afterEach(() => {
  if (originalSendEnabled === undefined) delete process.env.REMINDER_SEND_ENABLED;
  else process.env.REMINDER_SEND_ENABLED = originalSendEnabled;
  if (originalWebhookUrl === undefined) delete process.env.REMINDER_WEBHOOK_URL;
  else process.env.REMINDER_WEBHOOK_URL = originalWebhookUrl;
  globalThis.fetch = originalFetch;
});

function settingsDb(values: Record<string, unknown>) {
  return {
    tenant: {
      findUnique: async () => ({ id: "tenant-a", configVersion: 1 }),
    },
    settingValue: {
      findMany: async () => Object.entries(values).map(([key, value], index) => ({
        id: `setting-${index}`,
        tenantId: "tenant-a",
        key,
        value,
        effectiveFromMonth: null,
        revision: 1,
        updatedById: "admin-a",
        updatedAt: new Date("2026-08-13T00:00:00.000Z"),
      })),
    },
  };
}

function reminderDb() {
  return {
    monthlyFee: {
      findMany: async () => [{
        id: "fee-1",
        studentId: "student-1",
        month: "2026-08",
        status: "confirmed",
        totalAmount: 900_000,
        student: {
          fullName: "Nguyen Van An",
          parent: { id: "parent-1", fullName: "Nguyen Thi B", phone: "0900000000" },
        },
      }],
    },
  };
}

describe("Admin Console feature runtime", () => {
  it("requires both the tenant flag and environment opt-in for live reminders", async () => {
    process.env.REMINDER_SEND_ENABLED = "true";
    process.env.REMINDER_WEBHOOK_URL = "https://example.invalid/reminder";

    const disabled = await resolveFeatureRuntime(settingsDb({
      "flags.fee_reminders_enabled": false,
    }), "tenant-a");
    assert.equal(disabled.feeReminders.tenantEnabled, false);
    assert.equal(disabled.feeReminders.liveSendEnabled, false);

    const enabled = await resolveFeatureRuntime(settingsDb({
      "flags.fee_reminders_enabled": true,
    }), "tenant-a");
    assert.equal(enabled.feeReminders.tenantEnabled, true);
    assert.equal(enabled.feeReminders.environmentEnabled, true);
    assert.equal(enabled.feeReminders.liveSendEnabled, true);
  });

  it("fails closed when the parent portal feature is disabled", async () => {
    const runtime = await resolveFeatureRuntime(settingsDb({
      "flags.parent_portal_enabled": false,
    }), "tenant-a");

    assert.throws(
      () => assertParentPortalEnabled(runtime),
      (error: unknown) =>
        error instanceof ApiError && error.code === "PARENT_PORTAL_DISABLED" && error.status === 403,
    );
  });

  it("renders only the supported reminder placeholders", () => {
    assert.equal(
      renderReminderMessage("{{ten}} | {{thang}} | {{sotien}}", {
        studentName: "Nguyen Van An",
        month: "2026-08",
        amount: 900_000,
      }),
      "Nguyen Van An | 2026-08 | 900.000 ₫",
    );
    assert.throws(
      () => renderReminderMessage("Hello {{unknown}}", {
        studentName: "Nguyen Van An",
        month: "2026-08",
        amount: 900_000,
      }),
      (error: unknown) => error instanceof ApiError && error.code === "INVALID_REMINDER_TEMPLATE",
    );
  });

  it("keeps live sends disabled when tenant runtime is disabled even if env is enabled", async () => {
    process.env.REMINDER_SEND_ENABLED = "true";
    process.env.REMINDER_WEBHOOK_URL = "https://example.invalid/reminder";

    const result = await runFeeReminders(reminderDb(), {
      month: "2026-08",
      dryRun: false,
      runtime: {
        liveSendEnabled: false,
        messageTemplate: "Hoc phi {{thang}} cua {{ten}}: {{sotien}}",
      },
    });

    assert.equal(result.results[0].send_status, "disabled");
    assert.match(result.items[0].message, /Nguyen Van An/);
    assert.match(result.items[0].message, /900\.000/);
  });

  it("delivers through the resolved tenant integration instead of a global env endpoint", async () => {
    delete process.env.REMINDER_WEBHOOK_URL;
    let calledUrl = "";
    let authorization = "";
    globalThis.fetch = async (input, init) => {
      calledUrl = String(input);
      authorization = String(
        (init?.headers as Record<string, string>)?.Authorization ?? "",
      );
      return new Response(null, { status: 202 });
    };

    const result = await runFeeReminders(reminderDb(), {
      month: "2026-08",
      dryRun: false,
      runtime: {
        liveSendEnabled: true,
        messageTemplate: "Hoc phi {{thang}} cua {{ten}}: {{sotien}}",
        delivery: {
          url: "https://tenant-a.example.test/reminders",
          enabled: true,
          secret: "tenant-a-secret",
        },
      },
    });

    assert.equal(calledUrl, "https://tenant-a.example.test/reminders");
    assert.equal(authorization, "Bearer tenant-a-secret");
    assert.equal(result.results[0].send_status, "sent");
  });
});
