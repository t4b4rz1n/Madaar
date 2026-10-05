import { t as translate, useTranslation } from "../../../i18n/locale";
import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AuthLayout } from "../components/AuthLayout";
import { AuthForm } from "../components/AuthForm";
import { useRegister } from "../hooks/useAuth";
import {
  registerSchema,
  type RegisterFormData,
} from "../validation/authSchema";

const registerFields = [
  { name: "first_name", get label() { return translate("نام"); }, get placeholder() { return translate("نام خود را وارد کنید"); } },
  { name: "last_name", get label() { return translate("نام خانوادگی"); }, get placeholder() { return translate("نام خانوادگی خود را وارد کنید"); } },
  { name: "username", get label() { return translate("نام کاربری"); }, get placeholder() { return translate("یک نام کاربری انتخاب کنید"); } },
  { name: "email", get label() { return translate("ایمیل"); }, type: "email", placeholder: "you@example.com" },
  { name: "password", get label() { return translate("رمز عبور"); }, type: "password", get placeholder() { return translate("حداقل ۸ نویسه"); } },
  { name: "password_confirm", get label() { return translate("تکرار رمز عبور"); }, type: "password", get placeholder() { return translate("رمز عبور را دوباره وارد کنید"); } },
];

const RegisterPage: React.FC = () => {
  const t = useTranslation();
  const { mutate: registerUser, isPending } = useRegister();
  const {
    register,
    trigger,
    handleSubmit,
    formState: { errors, isSubmitted },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  React.useEffect(() => {
    if (isSubmitted) void trigger();
  }, [t, isSubmitted, trigger]);

  return (
    <AuthLayout>
        <AuthForm
          title={t("شروع یک همکاری تازه")}
          fields={registerFields}
          onSubmit={registerUser as any}
          buttonText={t("ساخت حساب")}
          footerText={t("قبلاً حساب ساخته‌اید؟")}
          footerLink="/login"
          footerLinkText={t("ورود به حساب")}
          isLoading={isPending}
          register={register as any}
          handleSubmit={(fn) => handleSubmit(fn as any) as any}
          errors={errors}
        />
    </AuthLayout>
  );
};

export default RegisterPage;
