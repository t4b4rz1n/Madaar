import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

export const TopProgressBar: React.FC = () => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // When route changes, trigger a quick progress sweep
    setIsVisible(true);
    setProgress(30);

    const t1 = setTimeout(() => {
      setProgress(75);
    }, 60);

    const t2 = setTimeout(() => {
      setProgress(100);
    }, 180);

    const t3 = setTimeout(() => {
      setIsVisible(false);
      setProgress(0);
    }, 350);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [location.pathname]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="pointer-events-none fixed start-0 end-0 top-0 z-[100] h-[2.5px] overflow-hidden bg-transparent">
          <motion.div
            className="h-full bg-gradient-to-r from-primary via-secondary to-accent shadow-[0_0_8px_var(--color-primary)]"
            initial={{ width: "0%", opacity: 1 }}
            animate={{ width: `${progress}%`, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ ease: "easeOut", duration: 0.15 }}
          />
        </div>
      )}
    </AnimatePresence>
  );
};

export default TopProgressBar;
