import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import { MotionConfig } from "motion/react";
import { ErrorFallback } from "./components/ErrorFallback";
import { queryClient } from "./core/config/queryClient";
import "./index.css";
import { applyDocumentLanguage, useLocaleStore } from "./i18n/locale";
import { LocaleApplication } from "./core/LocaleApplication";

async function enableMocking() {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === "true") {
    const { worker } = await import("./mocks/browser");
    return worker.start({
      onUnhandledRequest: "bypass",
      serviceWorker: {
        url: "/mockServiceWorker.js",
      },
    });
  }
}

enableMocking().finally(() => {
  const getPreferredTheme = () => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      return storedTheme;
    }

    return "light";
  };

  document.documentElement.setAttribute("data-theme", getPreferredTheme());
  applyDocumentLanguage(useLocaleStore.getState().locale);

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => window.location.reload()}
      >
        <QueryClientProvider client={queryClient}>
          <MotionConfig reducedMotion="user">
            <LocaleApplication />
          </MotionConfig>
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
});
