import React from "react";

interface InputFieldProps {
  name: string;
  placeholder?: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: React.ReactNode;
  className?: string;
  classNameInput?: string;
}

const InputField = ({
  name,
  placeholder = "",
  type = "text",
  value,
  onChange,
  icon,
  className = "",
  classNameInput = "",
}: InputFieldProps) => {
  return (
    <div className={`relative w-full ${className}`}>
      {icon && (
        <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none text-heledone-ink-muted">
          {icon}
        </div>
      )}

      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full bg-base-100 text-base-content border border-base-content/15 rounded-xl px-4 py-3 placeholder:text-heledone-ink-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow duration-200 shadow-sm ${
          icon ? "ps-10" : ""
        } ${classNameInput}`}
      />
    </div>
  );
};

export default InputField;
