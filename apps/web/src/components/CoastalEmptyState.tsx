import type { ReactNode } from "react";

export type CoastalMotif = "boat" | "palm" | "coast" | "waves" | "tasks" | "tickets" | "music";

const artwork: Record<CoastalMotif, string> = {
  boat: "teams-coastal-v1",
  palm: "palm-corner",
  coast: "organizations-coastal-v1",
  waves: "sea-divider",
  tasks: "tasks-coastal-v1",
  tickets: "tickets-coastal-v1",
  music: "notifications-coastal-v1",
};

export function CoastalArtwork({ motif = "boat", className = "" }: { motif?: CoastalMotif; className?: string }) {
  return <img src={`/images/heledone-assets/${artwork[motif]}.png`} alt="" aria-hidden="true" data-motif={motif} draggable={false} decoding="async" className={`heledone-coastal-artwork ${className}`} />;
}

export function CoastalDivider() {
  return (
    <div className="heledone-sea-divider" aria-hidden="true">
      <CoastalArtwork motif="waves" />
    </div>
  );
}

export function CoastalEmptyState({ title, description, motif = "boat", children }: {
  title: string;
  description?: string;
  motif?: CoastalMotif;
  children?: ReactNode;
}) {
  return (
    <div className="heledone-coastal-empty">
      <CoastalArtwork motif={motif} />
      <h3 className="text-lg font-bold text-base-content">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-heledone-ink-muted">{description}</p>}
      {children && <div className="mt-5 flex max-w-full flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
