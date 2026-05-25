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

export const classCreateSchema = z.object({
  class_name: z.string().trim().min(1, "class_name is required"),
  schedule_days: z.unknown().optional().nullable(),
  schedule_required: z.coerce.boolean().optional().default(false),
  sessions_per_week: optionalNumber,
  session_required: z.coerce.boolean().optional().default(false),
  start_time: z.string().trim().min(1, "start_time is required"),
  end_time: z.string().trim().min(1, "end_time is required"),
  fee_per_day: z.coerce.number().positive("fee_per_day must be greater than 0"),
  max_students: z.coerce.number().int().positive().optional().default(50),
  teacher_id: optionalNullableText,
  notes: optionalNullableText,
  student_ids: z.array(z.string().trim().min(1)).optional().default([]),
});

export const classUpdateSchema = classCreateSchema
  .extend({
    status: z.enum(["active", "inactive"]).optional(),
  })
  .partial();

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
