import { t } from "../../../i18n/locale";
import { z } from "zod";

export const notificationSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, { error: () => t("Text is required") })
    .max(255, { error: () => t("Text cannot exceed 255 characters") }),
  link: z.string().optional(),
});

export type NotificationFormData = z.infer<typeof notificationSchema>;
