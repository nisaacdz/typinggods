export const DefaultPageSize = 15;
export const DefaultPage = 1;

import { z } from "zod";

export const UsernameSchema = z.object({
  username: z
    .string()
    .min(5, "Username must be at least 5 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
});

export const EmailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const PasswordSchema = z.object({
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(/[a-zA-Z]/, "Must contain at least one letter") 
    .regex(/[0-9]/, "Must contain at least one number"),
});

export type UsernameUpdate = z.infer<typeof UsernameSchema>;
export type EmailUpdate = z.infer<typeof EmailSchema>;
export type PasswordUpdate = z.infer<typeof PasswordSchema>;