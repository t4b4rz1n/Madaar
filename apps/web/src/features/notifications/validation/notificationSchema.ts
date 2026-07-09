import { z } from "zod";

export const notificationSchema = z.object({
  text: z
    .string()
    .min(1, "Text is required")
    .max(500, "Text cannot exceed 500 characters"),
  link: z.string().optional(),
});

export type NotificationFormData = z.infer<typeof notificationSchema>;
