import { useTranslation } from "../../../i18n/locale";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface InputFieldProps<T extends Record<string, any>> {
  name: keyof T & string;
  label: string;
  type?: string;
  placeholder?: string;
  register: any;
  error?: string | undefined | null;
  autoComplete?: string;
  showPasswordToggle?: boolean;
}

export const InputField = <T extends Record<string, any>>({
  name,
  label,
  type = "text",
  placeholder = "",
  register,
  error,
  autoComplete,
  showPasswordToggle = false,
}: InputFieldProps<T>) => {
  const t = useTranslation();
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const fieldAutoComplete = autoComplete ?? ({
    username: "username",
    email: "email",
    first_name: "given-name",
    last_name: "family-name",
    password: "new-password",
    password_confirm: "new-password",
  } as Record<string, string>)[name];

  return (
    <div className="heledone-auth-field">
      <label htmlFor={name}>{label}</label>
      <div className="heledone-auth-input-wrap">
        <input
          id={name}
          {...register(name)}
          type={isPassword ? (show ? "text" : "password") : type}
          placeholder={placeholder}
          autoComplete={fieldAutoComplete}
          autoCapitalize={name === "username" || type === "email" || isPassword ? "none" : "words"}
          spellCheck={name !== "username" && type !== "email" && !isPassword}
          dir={name === "username" || type === "email" || isPassword ? "ltr" : undefined}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          className={`heledone-auth-input ${showPasswordToggle && isPassword ? "has-password-toggle" : ""}`}
        />
        {showPasswordToggle && isPassword && (
          <button
            type="button"
            aria-label={show ? t("پنهان کردن رمز عبور") : t("نمایش رمز عبور")}
            title={show ? t("پنهان کردن رمز عبور") : t("نمایش رمز عبور")}
            aria-pressed={show}
            onClick={() => setShow((value) => !value)}
            className="heledone-auth-password-toggle"
          >
            {show ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
          </button>
        )}
      </div>
      {error && <p id={`${name}-error`} className="heledone-auth-field-error" role="alert">{error}</p>}
    </div>
  );
};
