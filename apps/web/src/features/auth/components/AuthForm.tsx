import {
  type SubmitHandler,
  type FieldValues,
  type UseFormRegister,
  type FieldErrors,
} from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { InputField } from "./InputField";

interface FieldDef {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
}

interface AuthFormProps {
  title: string;
  fields: FieldDef[];
  onSubmit: SubmitHandler<FieldValues>;
  buttonText: string;
  footerText?: string;
  footerLink?: string;
  footerLinkText?: string;
  isLoading?: boolean;
  register: UseFormRegister<FieldValues>;
  handleSubmit: (
    handler: SubmitHandler<FieldValues>
  ) => (e?: React.BaseSyntheticEvent) => Promise<void>;
  errors: FieldErrors<FieldValues>;
}

const btnVariants = {
  idle: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

export const AuthForm = ({
  title,
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto"
    >
      <header className="mb-8 text-center flex flex-col items-center gap-3">
        {/* Ensure this path exists or import the logo */}
        <img src="/images/base-logo.svg" className="w-20 h-20" alt="Logo" />
        <h1 className="text-3xl font-bold text-base-content">{title}</h1>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {fields.map((f, i) => (
          <InputField
            key={f.name}
            name={f.name as any}
            label={f.label}
            type={f.type}
            placeholder={f.placeholder}
            register={register}
            error={errors[f.name]?.message as any}
            index={i}
            showPasswordToggle={f.type === "password"}
          />
        ))}

        <motion.div
          className="mt-8 pt-2"
          initial="idle"
          whileHover="hover"
          whileTap="tap"
          variants={btnVariants}
        >
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn btn-primary btn-lg rounded-xl text-primary-content font-bold text-lg shadow-lg shadow-primary/30"
          >
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.span
                  key="load"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <span className="loading loading-spinner loading-md" />
                </motion.span>
              ) : (
                <motion.span
                  key="text"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {buttonText}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </motion.div>

        {footerText && footerLink && (
          <p className="text-center text-sm text-base-content/70 mt-6">
            {footerText}{" "}
            <Link
              to={footerLink}
              className="text-primary font-semibold hover:underline"
            >
              {footerLinkText}
            </Link>
          </p>
        )}
      </form>
    </motion.div>
  );
};
