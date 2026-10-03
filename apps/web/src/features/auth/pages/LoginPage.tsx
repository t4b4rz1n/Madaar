import { useTranslation } from "../../../i18n/locale";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthLayout } from "../components/AuthLayout";
import { AuthForm } from "../components/AuthForm";
import { loginSchema, type LoginFormData } from "../validation/authSchema";
import { useLogin } from "../hooks/useAuth";

const LoginPage: React.FC = () => {
  const t = useTranslation();
  const { mutate: login, isPending: isLoading } = useLogin();

  const {
    register,
    trigger,
    handleSubmit,
    formState: { errors, isSubmitted },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  React.useEffect(() => {
    if (isSubmitted) void trigger();
  }, [t, isSubmitted, trigger]);

  const handleLogin = (data: LoginFormData) => {
    login(data);
  };

  const loginFields = [
    {
      name: "username",
      label: t("نام کاربری"),
      type: "text",
      placeholder: t("نام کاربری خود را وارد کنید"),
    },
    {
      name: "password",
      label: t("رمز عبور"),
      type: "password",
      placeholder: t("رمز عبور خود را وارد کنید"),
    },
  ];

  return (
    <AuthLayout>
        <AuthForm
          title={t("خوش برگشتید")}
          fields={loginFields}
          onSubmit={handleLogin as any}
          buttonText={t("ورود به هله‌دان")}
          footerText={t("تازه به جمع ما می‌پیوندید؟")}
          footerLink="/register"
          footerLinkText={t("ساخت حساب")}
          isLoading={isLoading}
          register={register as any}
          handleSubmit={(fn) => handleSubmit(fn as any) as any}
          errors={errors}
        />
    </AuthLayout>
  );
};

export default LoginPage;
