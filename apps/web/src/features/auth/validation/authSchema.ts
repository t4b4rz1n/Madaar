import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    first_name: z.string().trim().min(2, "First name must be at least 2 characters"),
    last_name: z.string().trim().min(2, "Last name must be at least 2 characters"),
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters")
      .regex(/^[\w/-]+$/, "Use only letters, numbers, -, / or _"),
    email: z.string().trim().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    password_confirm: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: "Passwords do not match",
    path: ["password_confirm"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;
