import { useEffect, useRef } from "react";
import { queryClient } from "./config/queryClient";
import { Toaster } from "sonner";
import AppRouter from "./router/AppRouter";
import { applyDocumentLanguage, getDirection, getLanguage, LANGUAGE_STORAGE_KEY, t, useLocale, useLocaleStore } from "../i18n/locale";

export const LocaleApplication = () => {
  const locale = useLocale();
  const previousLocale = useRef(locale);
  useEffect(() => { applyDocumentLanguage(locale); }, [locale]);
  useEffect(() => {
    if (previousLocale.current !== locale) {
      previousLocale.current = locale;
      void queryClient.invalidateQueries();
    }
  }, [locale]);
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
  return <><AppRouter /><Toaster richColors dir={direction} position={direction === "rtl" ? "bottom-left" : "bottom-right"} closeButton containerAriaLabel={t("Notifications")} toastOptions={{ closeButtonAriaLabel: t("Close notification") }} /></>;
};
