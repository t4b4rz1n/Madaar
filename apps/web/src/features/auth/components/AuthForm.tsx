import {
  type SubmitHandler,
  type FieldValues,
  type UseFormRegister,
  type FieldErrors,
  type UseFormHandleSubmit,
} from "react-hook-form";
import { motion } from "motion/react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { InputField } from "./InputField";

interface FieldDef {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}

interface AuthFormProps {
  title: string;
  description?: string;
  fields: FieldDef[];
  onSubmit: SubmitHandler<FieldValues>;
  buttonText: string;
  footerText?: string;
  footerLink?: string;
  footerLinkText?: string;
  isLoading?: boolean;
  register: UseFormRegister<FieldValues>;
  handleSubmit: UseFormHandleSubmit<any>;
  errors: FieldErrors<FieldValues>;
}

export const AuthForm = ({
  title,
  description,
  fields,
  onSubmit,
  buttonText,
  footerText,
  footerLink,
  footerLinkText,
  isLoading = false,
  register,
  handleSubmit,
  errors,
}: AuthFormProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="w-full"
    >
      <header className="heledone-auth-form-heading">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </header>

      <form onSubmit={handleSubmit(onSubmit)} noValidate aria-busy={isLoading}>
        <div className="heledone-auth-fields">
        {fields.map((f) => (
          <InputField
            key={f.name}
            name={f.name as any}
            label={f.label}
            type={f.type}
            placeholder={f.placeholder}
            autoComplete={f.autoComplete}
            register={register}
            error={errors[f.name]?.message as any}
            showPasswordToggle={f.type === "password"}
          />
        ))}
        </div>

          <button
            type="submit"
            disabled={isLoading}
            className="heledone-auth-submit"
          >
            <span>{buttonText}</span>
            {isLoading ? <LoaderCircle size={18} className="shrink-0 animate-spin" aria-hidden="true" /> : <ArrowRight size={18} className="shrink-0 rtl:rotate-180" aria-hidden="true" />}
          </button>

        {footerText && footerLink && (
          <p className="heledone-auth-switch">
            <span>{footerText}</span>
            <Link
              to={footerLink}
            >
              {footerLinkText}
            </Link>
          </p>
        )}
      </form>
    </motion.div>
  );
};
