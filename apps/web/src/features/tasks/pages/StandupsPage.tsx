import { useTranslation } from "../../../i18n/locale";
import { motion } from "motion/react";
import { StandupMatrix } from "../components/StandupMatrix";
import { CoastalDivider } from "../../../components/CoastalEmptyState";

export const StandupsPage = () => {
  const t = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-[1200px] space-y-4 pb-8"
    >
      <div className="heledone-page-heading flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-base-content">{t("گزارش روزانه")}</h1>
          <p className="text-xs text-heledone-ink-muted mt-1">{t("مشاهده و بررسی گزارش‌های روزانه اعضای سازمان")}</p>
        </div>
      </div>

      <CoastalDivider />

      <div className="min-w-0">
        <StandupMatrix title={t("Standups Overview")} />
      </div>
    </motion.div>
  );
};

export default StandupsPage;
