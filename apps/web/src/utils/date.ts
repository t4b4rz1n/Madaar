import { useAuthStore } from "../features/auth/store/authStore";
import { getIntlLocale } from "../i18n/locale";

/** Language controls names/digits; the account's calendar preference controls the calendar. */
export const formatDisplayDate = (
  date: Date | string,
  pattern = "yyyy-MM-dd",
  calendar = useAuthStore.getState().user?.calendar_preference || "gregorian",
  locale = getIntlLocale(),
): string => {
  if (!date) return "";
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return "";
  const options: Intl.DateTimeFormatOptions = { calendar: calendar === "jalali" ? "persian" : "gregory" };
  if (/y/.test(pattern)) options.year = "numeric";
  if (/M/.test(pattern)) options.month = /MMMM/.test(pattern) ? "long" : /MMM/.test(pattern) ? "short" : /MM/.test(pattern) ? "2-digit" : "numeric";
  if (/d/.test(pattern)) options.day = /dd/.test(pattern) ? "2-digit" : "numeric";
  if (/E/.test(pattern)) options.weekday = /EEEE/.test(pattern) ? "long" : "short";
  if (/H/.test(pattern)) { options.hour = "2-digit"; options.hourCycle = "h23"; }
  if (/m/.test(pattern)) options.minute = "2-digit";
  const formatter = new Intl.DateTimeFormat(locale, options);
  if (pattern === "yyyy-MM-dd") {
    const parts = formatter.formatToParts(value);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  }
  return formatter.format(value);
};
