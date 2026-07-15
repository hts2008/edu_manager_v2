import { z } from "zod";
import { ApiError } from "./api-utils.js";

const optionalText = z
  .preprocess((value) => (value === "" ? undefined : value), z.string().trim().optional());

const optionalNullableText = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().trim().nullable().optional()
);

const optionalNumber = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().optional()
);

const dateOnlySchema = (fieldName: string) => z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, `${fieldName} must be YYYY-MM-DD`)
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, `${fieldName} must be a valid calendar date`);

function firstIssueMessage(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) return "Invalid request body";
  const path = issue.path.length ? `${issue.path.join(".")}: ` : "";
  return `${path}${issue.message}`;
}

export function validateBody<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown
): z.infer<T> {
  const result = schema.safeParse(body || {});
  if (!result.success) {
    throw new ApiError("VALIDATION_ERROR", firstIssueMessage(result.error), 400);
  }
  return result.data;
}

export const paymentCreateSchema = z.object({
  category: z.enum(["salary", "utility", "office", "other"]),
  amount: z.coerce.number().positive("amount must be greater than 0"),
  recipient_name: z.string().trim().min(1, "recipient_name is required"),
  recipient_phone: optionalNullableText,
  template_id: optionalText,
  notes: optionalNullableText,
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, "username is required"),
  password: z.string().min(1, "password is required"),
});

export const receiptCreateSchema = z
  .object({
    student_id: z.string().trim().min(1, "student_id is required"),
    monthly_fee_id: optionalText,
    month: z.string().regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM"),
    days_count: z.coerce.number().int().min(0).default(0),
    fee_per_day: z.coerce.number().min(0).default(0),
    amount: z.coerce.number().positive("amount must be greater than 0"),
    payment_method: z.enum(["cash", "transfer"]),
    template_id: optionalText,
    notes: optionalNullableText,
  })
  .superRefine((data, ctx) => {
    if (!data.monthly_fee_id && data.amount > 0 && data.days_count <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["days_count"],
        message: "days_count must be greater than 0 for direct tuition receipts",
      });
    }
  });

export const studentCreateSchema = z.object({
  full_name: z.string().trim().min(1, "full_name is required"),
  date_of_birth: z.string().trim().min(1, "date_of_birth is required"),
  gender: z.enum(["male", "female", "other"]),
  parent_id: z.string().trim().min(1, "parent_id is required"),
  phone: optionalNullableText,
  email: optionalNullableText,
  address: optionalNullableText,
  enrollment_date: z.string().trim().min(1, "enrollment_date is required"),
  notes: optionalNullableText,
  class_ids: z.array(z.string().trim().min(1)).optional().default([]),
});

export const studentUpdateSchema = studentCreateSchema
  .omit({ enrollment_date: true })
  .extend({
    status: z.enum(["active", "inactive"]).optional(),
    class_ids: z.array(z.string().trim().min(1)).optional(),
  })
  .partial();

const classFieldsSchema = z.object({
  class_name: z.string().trim().min(1, "class_name is required"),
  schedule_days: z.unknown().optional().nullable(),
  schedule_required: z.coerce.boolean().optional(),
  sessions_per_week: optionalNumber,
  session_required: z.coerce.boolean().optional(),
  start_time: z.string().trim().min(1, "start_time is required"),
  end_time: z.string().trim().min(1, "end_time is required"),
  fee_per_day: z.coerce.number().positive("fee_per_day must be greater than 0"),
  billing_policy: z.enum(["monthly_prorated", "per_session"]).optional(),
  max_students: z.coerce.number().int().positive().optional(),
  teacher_id: optionalNullableText,
  notes: optionalNullableText,
  student_ids: z.array(z.string().trim().min(1)).optional(),
  enrollment_effective_date: dateOnlySchema("enrollment_effective_date").optional(),
  adjust_existing_enrollment_start: z.boolean().optional(),
  enrollment_backdate_reason: optionalNullableText,
});

function requireEnrollmentBackdateReason(
  data: {
    adjust_existing_enrollment_start?: boolean;
    enrollment_backdate_reason?: string | null;
  },
  ctx: z.RefinementCtx,
) {
  if (
    data.adjust_existing_enrollment_start &&
    !data.enrollment_backdate_reason?.trim()
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["enrollment_backdate_reason"],
      message: "enrollment_backdate_reason is required when adjusting enrollment start",
    });
  }
}

export const classCreateSchema = classFieldsSchema.superRefine(
  requireEnrollmentBackdateReason,
);

export const classUpdateSchema = classFieldsSchema
  .extend({
    status: z.enum(["active", "inactive"]).optional(),
  })
  .partial()
  .superRefine(requireEnrollmentBackdateReason);

export const classEnrollmentActionSchema = z
  .object({
    action: z.enum(["enroll", "bulk_enroll"]),
    student_id: optionalText,
    student_ids: z.array(z.string().trim().min(1)).optional().default([]),
    enrollment_effective_date: dateOnlySchema("enrollment_effective_date").optional(),
    adjust_existing_enrollment_start: z.boolean().optional().default(false),
    enrollment_backdate_reason: optionalNullableText,
  })
  .superRefine((data, ctx) => {
    requireEnrollmentBackdateReason(data, ctx);
    if (!data.student_id && data.student_ids.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["student_ids"],
        message: "student_id or student_ids is required",
      });
    }
  });

export const centerSettingsSchema = z.object({
  center_name: z.string().trim().min(1, "center_name is required").optional(),
  center_address: optionalNullableText,
  center_phone: optionalNullableText,
  center_email: optionalNullableText,
  center_logo: optionalNullableText,
});

export const userCreateSchema = z.object({
  username: z.string().trim().min(1, "username is required"),
  password: z.string().min(6, "password must be at least 6 characters"),
  full_name: z.string().trim().min(1, "full_name is required"),
  role: z.enum(["admin", "receptionist"]),
  email: optionalNullableText,
  phone: optionalNullableText,
  status: z.enum(["active", "inactive"]).optional().default("active"),
});

export const userUpdateSchema = z
  .object({
    full_name: z.string().trim().min(1, "full_name is required").optional(),
    role: z.enum(["admin", "receptionist"]).optional(),
    email: optionalNullableText,
    phone: optionalNullableText,
    status: z.enum(["active", "inactive"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "at least one field is required");

export const userResetPasswordSchema = z.object({
  password: z.string().min(6, "password must be at least 6 characters"),
});

export const bulkActionSchema = z.object({
  resource: z.enum(["students", "parents", "receipts", "payments"]),
  action: z.enum(["archive", "delete"]),
  ids: z
    .array(z.string().trim().min(1, "id is required"))
    .min(1, "ids must include at least one id")
    .max(100, "bulk actions are limited to 100 records"),
});

export const recycleBinActionSchema = z.object({
  resource: z.enum(["students", "parents", "receipts", "payments"]),
  action: z.enum(["restore", "purge"]),
  id: z.string().trim().min(1, "id is required"),
});

const progressSkillKeySchema = z.enum([
  "listening",
  "speaking",
  "reading",
  "writing",
  "homework",
  "daily_practice",
  "mock_test",
]);

const progressScoreSchema = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.coerce.number().min(0).max(100).nullable().optional()
);

const progressMaxScoreSchema = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? 100 : value),
  z.coerce.number().min(1).max(1000).optional()
);

const progressDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "entry_date must be YYYY-MM-DD")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "entry_date must be a valid calendar date");

const progressMonthSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM")
  .refine((value) => {
    const month = Number(value.slice(5, 7));
    return month >= 1 && month <= 12;
  }, "month must contain a valid month number");

export const studentProgressUpsertSchema = z.object({
  student_id: z.string().trim().min(1, "student_id is required"),
  class_id: z.string().trim().min(1, "class_id is required"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM"),
  track_key: z
    .enum(["starters", "movers", "flyers", "ket", "pet", "unknown"])
    .optional(),
  class_type: z.enum(["communicative", "exam_prep", "mixed"]).optional(),
  focus_skill_key: progressSkillKeySchema.nullable().optional(),
  focus_skill_label: optionalNullableText,
  teacher_note: optionalNullableText,
  parent_summary: optionalNullableText,
  mock_test_score: progressScoreSchema,
  finalized: z.coerce.boolean().optional().default(false),
  skills: z
    .array(
      z.object({
        skill_key: progressSkillKeySchema,
        skill_label: optionalNullableText,
        score: progressScoreSchema,
        max_score: progressMaxScoreSchema.default(100),
        weight: optionalNumber.optional(),
        status: z.enum(["missing_input", "available"]).optional(),
        note: optionalNullableText,
        source: optionalNullableText,
        sort_order: z.coerce.number().int().optional(),
      })
    )
    .optional()
    .default([]),
});

const studentProgressDailyIdentitySchema = z.object({
  student_id: z.string().trim().min(1, "student_id is required"),
  class_id: z.string().trim().min(1, "class_id is required"),
  entry_date: progressDateSchema,
});

const studentProgressDailyEntrySchema = z
  .object({
    entry_type: z.enum([
      "homework",
      "daily_practice",
      "skill_assessment",
      "mock_test",
      "shield",
      "note",
    ]),
    skill_key: progressSkillKeySchema.nullable().optional(),
    score: progressScoreSchema,
    shield_count: z.coerce.number().int().min(0).optional().default(0),
    note: optionalNullableText,
  })
  .superRefine((entry, context) => {
    if (entry.entry_type === "skill_assessment" && !entry.skill_key) {
      context.addIssue({
        code: "custom",
        path: ["skill_key"],
        message: "skill_key is required for skill_assessment",
      });
    }
  });

export const studentProgressDailyQuerySchema = z
  .object({
    student_id: z.string().trim().min(1, "student_id is required"),
    class_id: z.string().trim().min(1, "class_id is required"),
    month: progressMonthSchema.optional(),
    entry_date: progressDateSchema.optional(),
  })
  .superRefine((query, context) => {
    if (!query.month && !query.entry_date) {
      context.addIssue({
        code: "custom",
        path: ["month"],
        message: "month or entry_date is required",
      });
    }
    if (query.month && query.entry_date && !query.entry_date.startsWith(`${query.month}-`)) {
      context.addIssue({
        code: "custom",
        path: ["entry_date"],
        message: "entry_date must be inside month",
      });
    }
  });

export const studentProgressDailyPutSchema = studentProgressDailyIdentitySchema.extend({
  note: optionalNullableText,
  entries: z.array(studentProgressDailyEntrySchema).max(100).optional().default([]),
});

export const studentProgressDailyDeleteSchema = studentProgressDailyIdentitySchema;
