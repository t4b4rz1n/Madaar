import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import { Toaster } from "sonner";
import { ErrorFallback } from "./components/ErrorFallback";
import { queryClient } from "./core/config/queryClient";
import AppRouter from "./core/router/AppRouter";
import "./index.css";

async function enableMocking() {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK !== "false") {
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
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => window.location.reload()}
      >
        <QueryClientProvider client={queryClient}>
          <AppRouter />
          <Toaster richColors position="bottom-right" />
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
});