import { motion } from "framer-motion";
import { StandupMatrix } from "../components/StandupMatrix";

export const StandupsPage = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 pb-8 max-w-full"
    >
      <div className="flex flex-col gap-1 border-b border-base-content/8 pb-3">
        <h1 className="text-xl font-bold tracking-tight text-base-content">
          Daily Standups
        </h1>
        <p className="text-xs text-base-content/50">
          Monitor your team's daily progress, tasks, and blockers.
        </p>
      </div>

      <div className="min-w-0">
        <StandupMatrix title="Standups Overview" />
      </div>
    </motion.div>
  );
};

export default StandupsPage;
