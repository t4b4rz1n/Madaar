import type { ReactNode } from "react";

interface TodayEmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}

export const TodayEmptyState = ({
  icon,
  title,
  description,
  action,
  compact = false,
}: TodayEmptyStateProps) => (
  <div className={`flex flex-col items-center justify-center px-6 text-center ${compact ? "py-8" : "py-12"}`}>
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-base-200 text-base-content/35">
      {icon}
    </div>
    <h3 className="mt-4 text-sm font-bold text-base-content">{title}</h3>
    <p className="mt-1 max-w-sm text-xs leading-5 text-base-content/50">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const TodaySkeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-2xl border border-base-content/8 bg-base-100 p-5 ${className}`}>
    <div className="h-4 w-28 rounded-full bg-base-200" />
    <div className="mt-4 h-8 w-2/3 rounded-lg bg-base-200" />
    <div className="mt-3 h-3 w-full rounded-full bg-base-200" />
    <div className="mt-2 h-3 w-4/5 rounded-full bg-base-200" />
  </div>
);
