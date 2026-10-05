import { useTranslation } from "../i18n/locale";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { CoastalArtwork } from "../components/CoastalEmptyState";

const NotFoundPage = () => {
  const t = useTranslation();
  const reducedMotion = useReducedMotion();
  return (
    <div className=" h-full flex flex-col items-center justify-center p-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full p-6"
      >
        <CoastalArtwork motif="boat" className="mx-auto mb-5" />
        <h1 className="text-5xl font-black text-primary mb-2">404</h1>
        <h2 className="text-2xl font-bold text-base-content mb-2">
          {t("Page Not Found")}</h2>
        <p className="text-heledone-ink-muted mb-8">
          {t("The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.")}</p>

        <Link to="/" className="btn btn-primary rounded-xl w-full gap-2">
          <ArrowLeft size={20} className="rtl:rotate-180" />
          {t("Back to Dashboard")}</Link>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
