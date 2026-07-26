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
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-base-content/50">
          {icon}
        </div>
      )}

      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full bg-base-100 text-base-content border border-base-content/15 rounded-xl px-4 py-3 placeholder:text-base-content/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow duration-200 shadow-sm ${
          icon ? "pl-10" : ""
        } ${classNameInput}`}
      />
    </div>
  );
};

export default InputField;
