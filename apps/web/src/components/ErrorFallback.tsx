import { Refresh, Warning2 } from "iconsax-reactjs";

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export const ErrorFallback = ({
  error,
  resetErrorBoundary,
}: ErrorFallbackProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className="max-w-md w-full bg-base-100 rounded-3xl shadow-xl p-8 border border-error/20 text-center">
        <div className="w-16 h-16 bg-error/10 text-error rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Warning2 size={32} variant="Bold" />
        </div>
        <h2 className="text-xl font-bold text-base-content mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-base-content/60 mb-6 bg-base-200 p-3 rounded-xl font-mono text-left overflow-auto max-h-32">
          {error.message}
        </p>
        <button
          onClick={resetErrorBoundary}
          className="btn btn-primary w-full rounded-xl gap-2"
        >
          <Refresh size={20} />
          Try Again
        </button>
      </div>
    </div>
  );
};
