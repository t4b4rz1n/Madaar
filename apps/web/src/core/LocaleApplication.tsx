import { useEffect } from "react";
import { Toaster } from "sonner";
import AppRouter from "./router/AppRouter";
import { applyDocumentLanguage, getDirection, getLanguage, LANGUAGE_STORAGE_KEY, useLocale, useLocaleStore } from "../i18n/locale";

export const LocaleApplication = () => {
  const locale = useLocale();
  useEffect(() => { applyDocumentLanguage(locale); }, [locale]);
  useEffect(() => {
    const syncLanguage = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY) {
        useLocaleStore.setState({ locale: getLanguage(event.newValue ?? "fa").code });
      }
    };
    window.addEventListener("storage", syncLanguage);
    return () => window.removeEventListener("storage", syncLanguage);
  }, []);
  const direction = getDirection();
  return <><AppRouter /><Toaster richColors dir={direction} position={direction === "rtl" ? "bottom-left" : "bottom-right"} closeButton /></>;
};
