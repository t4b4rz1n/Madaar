import { z } from "zod";

export const ticketSchema = z.object({
  title: z.string().min(1, "Subject is required"),
  ticket_type: z.number({ message: "Category is required" }),
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["open", "answered", "closed"]),
});

export const ticketTypeSchema = z.object({
  name: z.string().min(1, "Category name is required"),
});

export const messageSchema = z.object({
  text: z.string().optional(),
});
