import { z } from "zod";

// --- User Roles ---
export const UserRoleSchema = z.enum(["user", "admin", "superadmin"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserRole = {
  User: "user" as const,
  Admin: "admin" as const,
  SuperAdmin: "superadmin" as const,
} as const;

// --- User Profile ---
export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string().email("Invalid email address"),
  username: z.string().min(1, "Username is required"),
  name: z.string().min(1, "Name is required"),
  role: UserRoleSchema,
  image: z.string().optional(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

// --- Auth Requests ---
export const LoginInputSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const RegisterInputSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  image: z.string().optional(),
});
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const ChangePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordInputSchema>;

// --- Auth Response ---
export const AuthResponseSchema = z.object({
  user: UserProfileSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
  sessionId: z.string(),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// --- Weather Data ---
export const SensorReadingSchema = z.object({
  id: z.string(),
  temperature: z.number(),
  humidity: z.number(),
  pressure: z.number(),
  createdAt: z.date(),
});
export type SensorReading = z.infer<typeof SensorReadingSchema>;

export const SensorReportInputSchema = z.object({
  temperature: z.number({ required_error: "Temperature is required" }),
  humidity: z.number({ required_error: "Humidity is required" }),
  pressure: z.number({ required_error: "Pressure is required" }),
});
export type SensorReportInput = z.infer<typeof SensorReportInputSchema>;

// --- System Settings ---
export const SystemSettingsSchema = z.object({
  id: z.string(),
  esp32Address: z.string().min(1, "ESP32 address is required"),
  updatedAt: z.date(),
});
export type SystemSettings = z.infer<typeof SystemSettingsSchema>;

export const UpdateSettingsInputSchema = z.object({
  esp32Address: z.string().min(1, "ESP32 address is required"),
});
export type UpdateSettingsInput = z.infer<typeof UpdateSettingsInputSchema>;
