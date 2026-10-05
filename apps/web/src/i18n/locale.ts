import { create } from "zustand";
import { useCallback } from "react";
import fa from "./locales/fa";
import en from "./locales/en";

export type MessageCatalog = Record<string, string>;
export interface LanguageDefinition {
  code: string;
  nativeName: string;
  intlLocale: string;
  direction: "rtl" | "ltr";
  messages: MessageCatalog;
  productName: string;
}

/** Register another catalog here; Settings and direction handling use this registry. */
export const languages: LanguageDefinition[] = [
  { code: "fa", nativeName: "فارسی", intlLocale: "fa-IR", direction: "rtl", messages: fa, productName: "هله‌دان" },
  { code: "en", nativeName: "English", intlLocale: "en-US", direction: "ltr", messages: en, productName: "Heledone" },
];
export const LANGUAGE_STORAGE_KEY = "heledone.language";
export const getLanguage = (code: string) => languages.find((language) => language.code === code) ?? languages[0];

function readLanguage(): string {
  try {
    return getLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? "fa").code;
  } catch {
    return "fa";
  }
}

export function applyDocumentLanguage(code: string): void {
  if (typeof document === "undefined") return;
  const language = getLanguage(code);
  document.documentElement.lang = language.code;
  document.documentElement.dir = language.direction;
  document.title = language.productName;
}

export const useLocaleStore = create<{ locale: string; setLocale: (code: string) => void }>((set) => ({
  locale: readLanguage(),
  setLocale: (code) => {
    const language = getLanguage(code);
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, language.code); } catch { /* Session preference still works when storage is unavailable. */ }
    applyDocumentLanguage(language.code);
    set({ locale: language.code });
  },
}));

/** Subscribe every translated component so switching languages preserves component state. */
export const useLocale = () => useLocaleStore((state) => state.locale);
export const getIntlLocale = () => getLanguage(useLocaleStore.getState().locale).intlLocale;
export const getDirection = () => getLanguage(useLocaleStore.getState().locale).direction;

/** Source messages are stable catalog keys; interpolation never translates user content. */
export function t(message: string, values: Record<string, string | number | null | undefined> = {}): string {
  return translateMessage(useLocaleStore.getState().locale, message, values);
}

function translateMessage(locale: string, message: string, values: Record<string, string | number | null | undefined> = {}): string {
  const catalog = getLanguage(locale).messages;
  const translated = catalog[message] ?? en[message as keyof typeof en] ?? message;
  return translated.replace(/\{(\w+)\}/g, (token, name: string) => {
    if (!Object.hasOwn(values, name)) return token;
    const value = values[name];
    return typeof value === "number"
      ? new Intl.NumberFormat(getLanguage(locale).intlLocale, { useGrouping: false, maximumFractionDigits: 2 }).format(value)
      : String(value ?? "");
  });
}

export const useTranslation = () => {
  const locale = useLocale();
  return useCallback((message: string, values?: Record<string, string | number | null | undefined>) =>
    translateMessage(locale, message, values), [locale]);
};

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(getIntlLocale(), options).format(value);
}

/** Keep API/form values ASCII while accepting Persian and Arabic keyboard digits. */
export function normalizeNumericInput(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[٬,\s\u200e\u200f]/g, "")
    .replace(/٫/g, ".");
}

export function formatRelativeTime(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = (date.getTime() - Date.now()) / 1000;
  if (Math.abs(seconds) < 60) return t("Just now");
  const [unit, divisor]: [Intl.RelativeTimeFormatUnit, number] = Math.abs(seconds) < 3600
    ? ["minute", 60] : Math.abs(seconds) < 86400 ? ["hour", 3600] : ["day", 86400];
  return new Intl.RelativeTimeFormat(getIntlLocale(), { numeric: "auto" }).format(Math.round(seconds / divisor), unit);
}
