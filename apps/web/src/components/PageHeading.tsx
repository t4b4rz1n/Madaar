import type { ReactNode } from "react";
import { BrandBeats } from "./Brand";

type PageHeadingProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  illustration?: "coastal-house" | "palm-sunset";
  children?: ReactNode;
};

/** Keep brand decoration in the heading so work surfaces stay quiet. */
export function PageHeading({ title, description, actions, illustration, children }: PageHeadingProps) {
  return (
    <header className="heledone-page-heading" data-coastal-scene={illustration}>
      <div className="relative z-10 min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-3">
          <BrandBeats className="heledone-heading-beats" />
          <h1>{title}</h1>
          {children}
        </div>
        {description && <p className="text-sm text-heledone-ink-muted">{description}</p>}
      </div>
      {actions && <div className="heledone-heading-actions relative z-10 flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}
