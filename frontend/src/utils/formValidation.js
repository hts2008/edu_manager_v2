import { z } from "zod";

const optionalText = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().optional()
);

const optionalNullableText = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().trim().nullable().optional()
);

const positiveNumber = (fieldName) =>
  z.coerce.number().positive(`${fieldName} must be greater than 0`);

const dateOnly = (fieldName) =>
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${fieldName} phai theo dinh dang YYYY-MM-DD`)
    .refine((value) => {
      const [year, month, day] = value.split("-").map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
      );
    }, `${fieldName} khong phai ngay hop le`);

export const paymentFormSchema = z.object({
  category: z.enum(["salary", "utility", "office", "other"]),
  recipient_name: z.string().trim().min(1, "Vui long nhap nguoi nhan"),
  recipient_phone: optionalNullableText,
  amount: positiveNumber("So tien"),
  notes: optionalNullableText,
});

export const receiptFormSchema = z.object({
  student_id: z.string().trim().min(1, "Vui long chon hoc vien"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Thang khong hop le").refine((value) => {
    const month = Number(value.slice(5, 7));
    return month >= 1 && month <= 12;
  }, "Thang khong hop le"),
  monthly_fee_id: optionalText,
  days_count: z.coerce.number().int().min(0).default(0),
  fee_per_day: z.coerce.number().min(0).default(0),
  amount: positiveNumber("So tien"),
  payment_method: z.enum(["cash", "transfer"]),
  notes: optionalNullableText,
});

export const studentFormSchema = z.object({
  full_name: z.string().trim().min(1, "Vui long nhap ho ten hoc vien"),
  date_of_birth: z.string().trim().min(1, "Vui long nhap ngay sinh"),
  gender: z.enum(["male", "female", "other"]),
  parent_id: z.string().trim().min(1, "Vui long chon phu huynh"),
  notes: optionalNullableText,
  status: z.enum(["active", "inactive"]).optional(),
});

export const classFormSchema = z
  .object({
    class_name: z.string().trim().min(1, "Vui long nhap ten lop"),
    teacher_id: optionalText,
    enrollment_effective_date: dateOnly("Ngay ghi danh hieu luc"),
    adjust_existing_enrollment_start: z.boolean().optional().default(false),
    enrollment_backdate_reason: optionalNullableText,
    start_time: z.string().trim().min(1, "Vui long nhap gio bat dau"),
    end_time: z.string().trim().min(1, "Vui long nhap gio ket thuc"),
    fee_per_day: positiveNumber("Hoc phi"),
    max_students: z.coerce.number().int().positive("So hoc vien toi da khong hop le"),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .superRefine((data, context) => {
    const now = new Date();
    const localToday = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 10);
    if (
      (data.adjust_existing_enrollment_start ||
        data.enrollment_effective_date < localToday) &&
      !data.enrollment_backdate_reason?.trim()
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["enrollment_backdate_reason"],
        message: "Vui long nhap ly do ghi danh hoi to",
      });
    }
  });
