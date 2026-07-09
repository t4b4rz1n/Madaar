import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthForm } from "../components/AuthForm";
import { loginSchema, type LoginFormData } from "../validation/authSchema";
import { useLogin } from "../hooks/useAuth";

const LoginPage: React.FC = () => {
  const { mutate: login, isPending: isLoading } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const handleLogin = (data: LoginFormData) => {
    login(data);
  };

  const loginFields = [
    {
      name: "username",
      label: "Username",
      type: "text",
      placeholder: "Enter your username",
    },
    {
      name: "password",
      label: "Password",
      type: "password",
      placeholder: "Enter your password",
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4 font-sans">
      <div className="w-full max-w-md bg-base-100 rounded-3xl shadow-xl p-8 border border-base-300">
        <AuthForm
          title="Welcome Back"
          fields={loginFields}
          onSubmit={handleLogin as any}
          buttonText="Sign In"
          isLoading={isLoading}
          register={register as any}
          handleSubmit={handleSubmit}
          errors={errors}
        />
      </div>
    </div>
  );
};

export default LoginPage;
