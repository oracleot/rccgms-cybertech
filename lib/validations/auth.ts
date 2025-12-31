/**
 * Auth validation schemas
 */

import { z } from "zod"

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export type LoginInput = z.infer<typeof loginSchema>

// Signup/Register schema
export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
  name: z.string().min(2, "Name must be at least 2 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

export type RegisterInput = z.infer<typeof registerSchema>

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

// Reset password schema
export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

// Invite user schema (admin only)
export const inviteUserSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["admin", "leader", "volunteer"]),
  department_id: z.string().uuid().optional(),
})

export type InviteUserInput = z.infer<typeof inviteUserSchema>

// Update profile schema
export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{9,14}$/, "Please enter a valid phone number")
    .optional()
    .nullable(),
  departmentId: z.string().uuid().optional().nullable(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

// Update notification preferences schema
export const updateNotificationPreferencesSchema = z.object({
  notificationType: z.string(),
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  reminderTiming: z.enum(["same_day", "1_day", "2_days", "3_days", "1_week"]).optional(),
})

export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>

// Assign user to multiple departments schema (admin/leader only)
export const assignUserDepartmentsSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  departments: z.array(z.object({
    departmentId: z.string().uuid("Invalid department ID"),
    isPrimary: z.boolean().optional().default(false),
  })).min(0),
})

export type AssignUserDepartmentsInput = z.infer<typeof assignUserDepartmentsSchema>

// Single department assignment
export const addUserDepartmentSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  departmentId: z.string().uuid("Invalid department ID"),
  isPrimary: z.boolean().optional().default(false),
})

export type AddUserDepartmentInput = z.infer<typeof addUserDepartmentSchema>

// Remove user from department
export const removeUserDepartmentSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  departmentId: z.string().uuid("Invalid department ID"),
})

export type RemoveUserDepartmentInput = z.infer<typeof removeUserDepartmentSchema>

// Set primary department
export const setPrimaryDepartmentSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  departmentId: z.string().uuid("Invalid department ID"),
})

export type SetPrimaryDepartmentInput = z.infer<typeof setPrimaryDepartmentSchema>

// Magic link login schema
export const magicLinkSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  redirectTo: z.string().optional().default("/dashboard"),
})

export type MagicLinkInput = z.infer<typeof magicLinkSchema>

// Profile completion schema (for first-time invited users)
export const completeProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
})

export type CompleteProfileInput = z.infer<typeof completeProfileSchema>
