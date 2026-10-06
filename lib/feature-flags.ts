import { ApiError } from "./api-utils.js";
import { getSetting } from "./settings.js";

const SUPPORTED_REMINDER_VARIABLES = new Set(["ten", "thang", "sotien"]);

export interface FeatureRuntime {
  parentPortal: {
    enabled: boolean;
    provenance: string;
  };
  feeReminders: {
    tenantEnabled: boolean;
    environmentEnabled: boolean;
    endpointConfigured: boolean;
    liveSendEnabled: boolean;
    messageTemplate: string;
    provenance: {
      enabled: string;
      messageTemplate: string;
    };
  };
}

function hasConfiguredEndpoint() {
  return Boolean(
    process.env.REMINDER_WEBHOOK_URL?.trim() || process.env.SMS_WEBHOOK_URL?.trim(),
  );
}

export async function resolveFeatureRuntime(db: any, tenantId: string): Promise<FeatureRuntime> {
  if (!tenantId) {
    throw new ApiError("TENANT_CONTEXT_REQUIRED", "Tenant context is required", 409);
  }
  const [parentPortal, feeReminders, messageTemplate] = await Promise.all([
    getSetting(db, { tenantId, key: "flags.parent_portal_enabled" }),
    getSetting(db, { tenantId, key: "flags.fee_reminders_enabled" }),
    getSetting(db, { tenantId, key: "finance.reminder_message_template" }),
  ]);
  const environmentEnabled = process.env.REMINDER_SEND_ENABLED === "true";
  const endpointConfigured = hasConfiguredEndpoint();
  const tenantEnabled = feeReminders.value === true;
  const validatedMessageTemplate = validateReminderTemplate(String(messageTemplate.value));

  return {
    parentPortal: {
      enabled: parentPortal.value === true,
      provenance: parentPortal.provenance,
    },
    feeReminders: {
      tenantEnabled,
      environmentEnabled,
      endpointConfigured,
      liveSendEnabled: tenantEnabled && environmentEnabled,
      messageTemplate: validatedMessageTemplate,
      provenance: {
        enabled: feeReminders.provenance,
        messageTemplate: messageTemplate.provenance,
      },
    },
  };
}

export function assertParentPortalEnabled(runtime: FeatureRuntime) {
  if (!runtime.parentPortal.enabled) {
    throw new ApiError(
      "PARENT_PORTAL_DISABLED",
      "Parent portal is disabled for this tenant",
      403,
    );
  }
}

export function renderReminderMessage(
  template: string,
  input: { studentName: string; month: string; amount: number },
) {
  validateReminderTemplate(template);
  const values: Record<string, string> = {
    ten: input.studentName,
    thang: input.month,
    sotien: new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(input.amount || 0),
  };
  return template.replace(/{{\s*([^{}]+?)\s*}}/g, (_match, variable: string) => values[variable]);
}

export function validateReminderTemplate(template: string) {
  const variables = [...template.matchAll(/{{\s*([^{}]+?)\s*}}/g)].map((match) => match[1]);
  const unsupported = variables.filter((variable) => !SUPPORTED_REMINDER_VARIABLES.has(variable));
  if (unsupported.length > 0) {
    throw new ApiError(
      "INVALID_REMINDER_TEMPLATE",
      `Unsupported reminder template variable: ${unsupported[0]}`,
      400,
    );
  }
  return template;
}
