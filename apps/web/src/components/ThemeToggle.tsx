import { useTranslation } from "../i18n/locale";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type ThemeMode = "light" | "dark";

const getInitialTheme = (): ThemeMode => {
  if (typeof window === "undefined") {
    return "light";
  }

  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return "light";
};

const ThemeToggle = () => {
  const t = useTranslation();
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
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
      <div className="h-10 w-10 shrink-0 rounded-xl border border-base-300 bg-base-200/80 sm:h-11 sm:w-11" />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? t("نمای روشن") : t("نمای تیره")}
      aria-pressed={isDark}
      title={isDark ? t("نمای روشن") : t("نمای تیره")}
      className="motion-interactive inline-flex h-10 w-10 items-center justify-center rounded-xl border border-base-content/10 bg-base-100/70 text-base-content/70 shadow-sm hover:border-primary/35 hover:bg-base-100 hover:text-primary sm:h-11 sm:w-11"
    >
      {isDark ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
    </button>
  );
};

export default ThemeToggle;
