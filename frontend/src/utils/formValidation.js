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

export const classFormSchema = z.object({
  class_name: z.string().trim().min(1, "Vui long nhap ten lop"),
  teacher_id: optionalText,
  start_time: z.string().trim().min(1, "Vui long nhap gio bat dau"),
  end_time: z.string().trim().min(1, "Vui long nhap gio ket thuc"),
  fee_per_day: positiveNumber("Hoc phi"),
  max_students: z.coerce.number().int().positive("So hoc vien toi da khong hop le"),
  status: z.enum(["active", "inactive"]).optional(),
});
