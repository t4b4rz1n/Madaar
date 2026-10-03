import React from "react";
import { motion } from "motion/react";

interface ContentLoaderProps {
  message?: string;
  variant?: "skeleton" | "spinner";
}

export const ContentLoader: React.FC<ContentLoaderProps> = ({
  message,
  variant = "skeleton",
}) => {
  if (variant === "spinner") {
    return (
      <div className="flex h-72 w-full flex-col items-center justify-center gap-3">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        {message && (
          <span className="text-xs font-medium text-heledone-ink-muted">
            {message}
          </span>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="w-full space-y-6"
    >
      {/* Page Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-base-300/80 animate-pulse" />
          <div className="h-4 w-72 rounded-md bg-base-300/50 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-24 rounded-xl bg-base-300/60 animate-pulse" />
          <div className="h-10 w-32 rounded-xl bg-primary/20 animate-pulse" />
        </div>
      </div>

      {/* Metrics / KPI Cards Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-2xl border border-base-content/5 bg-base-100 p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 rounded bg-base-300/60 animate-pulse" />
              <div className="h-8 w-8 rounded-lg bg-base-300/40 animate-pulse" />
            </div>
            <div className="h-7 w-28 rounded-md bg-base-300/80 animate-pulse" />
            <div className="h-3 w-36 rounded bg-base-300/40 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="rounded-2xl border border-base-content/5 bg-base-100 p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between border-b border-base-content/5 pb-4">
          <div className="h-5 w-36 rounded bg-base-300/70 animate-pulse" />
          <div className="flex gap-2">
            <div className="h-8 w-20 rounded-lg bg-base-300/50 animate-pulse" />
            <div className="h-8 w-20 rounded-lg bg-base-300/50 animate-pulse" />
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl bg-base-200/50 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-base-300/70 animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-4 w-40 rounded bg-base-300/80 animate-pulse" />
                  <div className="h-3 w-24 rounded bg-base-300/50 animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden h-6 w-20 rounded-full bg-base-300/50 animate-pulse sm:block" />
                <div className="h-8 w-8 rounded-lg bg-base-300/40 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default ContentLoader;
