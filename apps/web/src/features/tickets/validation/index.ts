import { t } from "../../../i18n/locale";
import { z } from "zod";

export const ticketSchema = z.object({
  title: z.string().min(1, { error: () => t("Subject is required") }),
  text: z.string().min(1, { error: () => t("Description is required") }),
  ticket_type: z.string().min(1, { error: () => t("Category is required") }),
  priority: z.enum(["low", "medium", "high"]),
});

export const ticketTypeSchema = z.object({
  name: z.string().min(1, { error: () => t("Category name is required") }),
});

export const messageSchema = z.object({
  text: z.string().optional(),
});
