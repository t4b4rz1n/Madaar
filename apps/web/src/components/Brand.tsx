import { useTranslation } from "../i18n/locale";
/** Three syncopated beats carry Heledone's identity without decorating work content. */
export const BrandBeats = ({ className = "" }: { className?: string }) => (
  <span className={`heledone-beats ${className}`} aria-hidden="true">
    <span /><span /><span />
  </span>
);

export const Brand = ({ compact = false }: { compact?: boolean }) => {
  const t = useTranslation();
  return (
  <span className="heledone-brand" aria-label={t("هله‌دان")}>
    <BrandBeats />
    {!compact && <span className="flex flex-col"><span className="heledone-brand-name">{t("هله‌دان")}</span><span className="heledone-brand-latin" lang="en" dir="ltr">{t("heledone")}</span></span>}
  </span>
  );
};

export const BrandWave = () => (
  <svg className="heledone-wave" viewBox="0 0 480 28" fill="none" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 14C40 0 80 0 120 14S200 28 240 14S320 0 360 14S440 28 480 14" stroke="currentColor" strokeWidth="2" />
  </svg>
);
