import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

const getInitialTheme = (): ThemeMode => {
  if (typeof window === "undefined") {
    return "light";
  }

  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
};

const ThemeToggle = () => {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const initialTheme = getInitialTheme();
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme, isMounted]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  if (!isMounted) {
    return (
      <div className="h-10 w-10 rounded-full border border-base-300 bg-base-200/80 sm:h-11 sm:w-[116px]" />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="group relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-base-300 bg-base-100 text-base-content shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-md hover:shadow-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:h-11 sm:w-[116px] sm:justify-between sm:rounded-full sm:px-2"
    >
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <span
        className={`absolute  h-8 w-8 rounded-full bg-primary shadow-md transition-all duration-300 sm:top-1.5 sm:h-8 sm:w-8 ${
          isDark ? "sm:left-[calc(100%-2.5rem)]" : "left-1"
        }`}
      />

      <span className="relative z-10 hidden w-full items-center justify-between sm:flex">
        <span
          className={`flex items-center gap-1 text-xs font-semibold transition-colors duration-300 ${
            !isDark ? "text-gray-700" : "text-base-content/60"
          }`}
        >
          <SunIcon className="h-4 w-4" />
          Light
        </span>

        <span
          className={`flex items-center gap-1 text-xs font-semibold transition-colors duration-300 ${
            isDark ? "text-primary-content" : "text-base-content/60"
          }`}
        >
          Dark
          <MoonIcon className="h-4 w-4" />
        </span>
      </span>

      <span className="relative z-10 sm:hidden">
        {isDark ? (
          <SunIcon className="h-5 w-5 text-primary-content" />
        ) : (
          <MoonIcon className="h-5 w-5 text-base-content" />
        )}
      </span>
    </button>
  );
};

type IconProps = {
  className?: string;
};

const SunIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2.5" />
    <path d="M12 19.5V22" />
    <path d="M4.93 4.93l1.77 1.77" />
    <path d="M17.3 17.3l1.77 1.77" />
    <path d="M2 12h2.5" />
    <path d="M19.5 12H22" />
    <path d="M4.93 19.07l1.77-1.77" />
    <path d="M17.3 6.7l1.77-1.77" />
  </svg>
);

const MoonIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3c0 0 0 0 0 0A7 7 0 0 0 21 12.79z" />
  </svg>
);

export default ThemeToggle;
