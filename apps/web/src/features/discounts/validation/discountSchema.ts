import { z } from "zod";

export const discountSchema = z.object({
  code: z.string().min(1, "Code is required"),
  description: z.string().min(1, "Description is required"),
  percent: z.preprocess(
    (val) => Number(val),
    z
      .number()
      .min(1, "Percent must be at least 1")
      .max(100, "Percent cannot exceed 100")
  ),
  max_usage: z.preprocess(
    (val) => Number(val),
    z.number().int().min(1, "Max usage must be at least 1")
  ),
  expiration_date: z.string().min(1, "Expiration date is required"),
  is_active: z.boolean(),
});

export type DiscountFormData = z.infer<typeof discountSchema>;
