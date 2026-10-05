import { useTranslation } from "../i18n/locale";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { CoastalArtwork } from "./CoastalEmptyState";

interface ErrorFallbackProps {
  error: unknown;
  resetErrorBoundary: () => void;
}

export const ErrorFallback = ({
  error,
  resetErrorBoundary,
}: ErrorFallbackProps) => {
  const t = useTranslation();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const isModuleLoadError = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk .+ failed/i.test(errorMessage);

  return (
    <div className="min-h-96 flex items-center justify-center p-4">
      <div className="max-w-md w-full p-6 text-center">
        <CoastalArtwork motif="waves" className="mx-auto mb-4" />
        <div className="w-16 h-16 bg-error/10 text-error rounded-2xl flex items-center justify-center mx-auto mb-6">
          <TriangleAlert size={32} />
        </div>
        <h2 className="text-xl font-bold text-base-content mb-2">
          {t("Something went wrong")}</h2>
        <p className="text-sm text-heledone-ink-muted mb-6 bg-base-200 p-3 rounded-xl font-mono text-start overflow-auto max-h-32">
          {isModuleLoadError ? t("بارگذاری صفحه کامل نشد. برای دریافت نسخهٔ تازه، دوباره تلاش کنید.") : errorMessage}
        </p>
        <button
          onClick={() => {
            // React.lazy remembers a rejected import; resetting the boundary alone cannot retry it.
            if (isModuleLoadError) window.location.reload();
            else resetErrorBoundary();
          }}
          className="btn btn-primary w-full rounded-xl gap-2"
        >
          <RefreshCw size={20} />
          {t("Try Again")}</button>
      </div>
    </div>
  );
};
