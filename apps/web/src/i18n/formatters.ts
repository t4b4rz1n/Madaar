import { formatNumber, t } from "./locale";

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  return t("{hours}h {minutes}m", {
    hours: formatNumber(Math.floor(total / 3600), { useGrouping: false }),
    minutes: formatNumber(Math.floor((total % 3600) / 60), { useGrouping: false }),
  });
}
