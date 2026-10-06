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
      {/* Coastal header image */}
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ height: "180px" }}>
        <img
          src="/images/heledone-assets/standups-coastal-v1.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-black/50 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-end justify-end gap-1 p-6">
          <h1 className="text-xl font-bold text-white sm:text-2xl" dir="rtl">
            {t("گزارشات کاربران")}
          </h1>
          <p className="text-sm text-white/75" dir="rtl">
            {t("پیشرفت روزانه، تسک‌ها و موانع تیم را رصد کنید.")}
          </p>
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
