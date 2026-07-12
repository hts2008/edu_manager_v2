import { z } from "zod";
import { validateBody } from "./validation.js";

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "oldPassword is required"),
  newPassword: z.string().min(6, "newPassword must be at least 6 characters"),
});

const parentPortalLoginSchema = z
  .object({
    parent_phone: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    student_date_of_birth: z.string().trim().optional(),
    date_of_birth: z.string().trim().optional(),
  })
  .transform((value) => ({
    phone: value.parent_phone || value.phone || "",
    dateOfBirth: value.student_date_of_birth || value.date_of_birth || "",
  }))
  .refine((value) => value.phone.length > 0 && value.dateOfBirth.length > 0, {
    message: "parent_phone and student_date_of_birth are required",
  });

export function validateChangePassword(body: unknown) {
  return validateBody(changePasswordSchema, body);
}

export function validateParentPortalLogin(body: unknown) {
  return validateBody(parentPortalLoginSchema, body);
}
