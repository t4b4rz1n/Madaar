import { useTranslation } from "../../../i18n/locale";
import { motion } from "motion/react";
import { StandupMatrix } from "../components/StandupMatrix";
import { PageHeading } from "../../../components/PageHeading";

export const StandupsPage = () => {
  const t = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 pb-8 max-w-full"
    >
      <PageHeading title={t("Daily Standups")} description={t("Monitor your team's daily progress, tasks, and blockers.")} />

      <div className="min-w-0">
        <StandupMatrix title={t("Standups Overview")} />
      </div>
    </motion.div>
  );
};

export default StandupsPage;
