import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Eye, EyeSlash } from "iconsax-reactjs";

interface InputFieldProps<T extends Record<string, any>> {
  name: keyof T & string;
  label: string;
  type?: string;
  placeholder?: string;
  register: any;
  error?: string | undefined | null;
  index?: number;
  showPasswordToggle?: boolean;
}

const fieldVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.06, duration: 0.36 },
  }),
};

const iconVariants = {
  initial: { opacity: 0, scale: 0.7, rotate: -45 },
  animate: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    scale: 0.7,
    rotate: 45,
    transition: { duration: 0.2 },
  },
};

export const InputField = <T extends Record<string, any>>({
  name,
  label,
  type = "text",
  placeholder = "",
  register,
  error,
  index = 0,
  showPasswordToggle = false,
}: InputFieldProps<T>) => {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <motion.div
      custom={index}
      variants={fieldVariants}
      initial="hidden"
      animate="visible"
      className="mb-5"
    >
      <div className={`relative`}>
        <label
          className={`pointer-events-none transform transition-all duration-200 block mb-1.5 ${
            focused ? "text-primary font-medium" : "text-base-content/60"
          }`}
        >
          {label}
        </label>
        <div className="relative">
          <input
            {...register(name as any)}
            type={isPassword ? (show ? "text" : "password") : type}
            placeholder={placeholder}
            onFocus={() => setFocused(true)}
            onBlur={(e) => {
              if (!e.target.value) setFocused(false);
            }}
            aria-invalid={!!error}
            aria-describedby={error ? `${name}-error` : undefined}
            className={`w-full bg-base-100 border rounded-xl pl-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 shadow-sm ${
              // LTR Adjustment: Added pr-12 if password toggle exists to prevent text overlap
              showPasswordToggle && isPassword ? "pr-12" : "pr-4"
            } ${
              error
                ? "border-error focus:border-error focus:ring-error/20"
                : "border-base-300 focus:border-primary"
            }`}
          />
          {showPasswordToggle && isPassword && (
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              // LTR Adjustment: Moved icon to absolute right-3
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm opacity-70 hover:opacity-100 w-8 h-8 flex items-center justify-center text-base-content"
            >
              <AnimatePresence mode="wait" initial={false}>
                {show ? (
                  <motion.div
                    key="slash"
                    variants={iconVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <EyeSlash size="22" className="text-primary" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="eye"
                    variants={iconVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <Eye size="22" className="text-primary" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            id={`${name}-error`}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-2 text-sm text-error font-medium"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
