import { useTranslation } from "../../../i18n/locale";
import { motion } from "motion/react";
import { StandupMatrix } from "../components/StandupMatrix";

export const StandupsPage = () => {
  const t = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 pb-8 max-w-full"
    >
      <div className="heledone-page-heading flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-base-content">
          {t("Daily Standups")}</h1>
        <p className="text-xs text-heledone-ink-muted">
          {t("Monitor your team's daily progress, tasks, and blockers.")}</p>
      </div>

      <div className="min-w-0">
        <StandupMatrix title={t("Standups Overview")} />
      </div>
    </motion.div>
  );
};

export default StandupsPage;
