import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AuthForm } from "../components/AuthForm";
import { useRegister } from "../hooks/useAuth";
import {
  registerSchema,
  type RegisterFormData,
} from "../validation/authSchema";

const registerFields = [
  { name: "first_name", label: "First name", placeholder: "Enter your first name" },
  { name: "last_name", label: "Last name", placeholder: "Enter your last name" },
  { name: "username", label: "Username", placeholder: "Choose a username" },
  { name: "email", label: "Email", type: "email", placeholder: "you@example.com" },
  { name: "password", label: "Password", type: "password", placeholder: "At least 8 characters" },
  { name: "password_confirm", label: "Confirm password", type: "password", placeholder: "Enter your password again" },
];

const RegisterPage: React.FC = () => {
  const { mutate: registerUser, isPending } = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 px-4 py-10 font-sans relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />
      </div>
      <div className="relative w-full max-w-xl bg-base-100 rounded-3xl shadow-xl p-6 sm:p-10 border border-base-300">
        <AuthForm
          title="Create your account"
          fields={registerFields}
          onSubmit={registerUser as any}
          buttonText="Create account"
          footerText="Already have an account?"
          footerLink="/login"
          footerLinkText="Sign in"
          isLoading={isPending}
          register={register as any}
          handleSubmit={(fn) => handleSubmit(fn as any) as any}
          errors={errors}
        />
      </div>
    </div>
  );
};

export default RegisterPage;