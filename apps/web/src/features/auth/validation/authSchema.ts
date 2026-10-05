import { t } from "../../../i18n/locale";
import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, { error: () => t("نام کاربری را وارد کنید") }),
  password: z.string().min(1, { error: () => t("رمز عبور را وارد کنید") }),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    first_name: z.string().trim().optional().or(z.literal("")),
    last_name: z.string().trim().optional().or(z.literal("")),
    username: z
      .string()
      .trim()
      .min(3, { error: () => t("نام کاربری باید حداقل ۳ نویسه باشد") })
      .regex(/^[\w/-]+$/, { error: () => t("از حروف لاتین، عدد و نشانه‌های - / _ استفاده کنید") }),
    email: z.string().trim().email({ error: () => t("ایمیل معتبر وارد کنید") }),
    password: z
      .string()
      .min(8, { error: () => t("رمز عبور باید حداقل ۸ نویسه باشد") })
      .regex(/[A-Z]/, { error: () => t("رمز عبور باید حداقل یک حرف بزرگ لاتین داشته باشد") }),
    password_confirm: z.string().min(1, { error: () => t("رمز عبور را دوباره وارد کنید") }),
  })
  .refine((data) => data.password === data.password_confirm, {
    error: () => t("دو رمز عبور یکسان نیستند"),
    path: ["password_confirm"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;
